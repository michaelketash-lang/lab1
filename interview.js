// Interview mode: the site plays the interviewer, with rounds it can check by itself (no AI, no server).
// Each algorithm page opts in with an `interview` object (see algorithms/*.js):
//   { spec, inputs(), orderWhy, complexity: { time, space, why }, followups: [...], bug(states), trace?(states) }
// Rounds: order the pseudocode, spot the wrong step, complexity, follow-up questions, hand-trace.
// Results are kept in localStorage (through the shell's `store`), best score and missed questions per algorithm.
const INTERVIEW_LEVELS = {
  easy: { label: 'Easy', rounds: ['order', 'complexity', 'followups'], followups: 3, spotTries: 2, blurb: 'Order the pseudocode (with indentation), complexity, 3 follow-up questions.' },
  medium: { label: 'Medium', rounds: ['order', 'spot', 'complexity', 'followups'], followups: 4, spotTries: 2, blurb: 'Adds “spot the wrong step”. Indentation is removed from the pseudocode. 4 follow-ups.' },
  hard: { label: 'Hard', rounds: ['order', 'spot', 'complexity', 'followups', 'trace'], followups: 5, spotTries: 1, blurb: 'Everything, with one try to spot the wrong step, 5 follow-ups and a hand-trace round.' },
};

function mountInterview(root, algoId, params, hooks = {}) {
  const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const algos = window.ALGORITHMS.filter(a => a.interview);
  const $ = sel => root.querySelector(sel);
  const saved = () => (typeof store !== 'undefined' && store.get('interview')) || {};
  const save = data => { if (typeof store !== 'undefined') store.set('interview', data); };
  const fmtTime = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  let algo = algos.find(a => a.id === algoId) || algos[0];
  let level = INTERVIEW_LEVELS[params.get('d')] ? params.get('d') : 'medium';
  let timed = params.get('t') === '1';
  let tick = null, session = null;
  const stopTick = () => { clearInterval(tick); tick = null; };

  // ---------------------------------------------------------------- rounds
  // A round is { key, title, max, limit (seconds), intro, setup(body, api), partial?() }.
  // setup() calls api.finish(points, feedbackHtml, missedKeys) when the round is over, and api.hint(fn) registers its hint.

  function orderRound(ctx) {
    const code = ctx.algo.interview.spec.code, strip = ctx.level !== 'easy';
    return {
      key: 'order', title: 'Put the pseudocode in order', max: 3, limit: 120, keys: ['order'],
      intro: `These are the lines of the pseudocode for ${ctx.algo.title}, shuffled. Use the arrows (or drag a line) to put them in the right order, then press Check. You have 3 tries.${strip ? ' The indentation has been removed.' : ''}`,
      setup(body, api) {
        let order, attempts = 0, checked = false;
        do { order = shuffle(code.map((t, idx) => ({ t, idx }))); } while (code.length > 1 && order.every((x, i) => x.idx === i));
        const draw = marks => {
          body.innerHTML = `<ol class="iv-order" aria-label="Pseudocode lines, shuffled">${order.map((x, i) => `
            <li draggable="true" data-i="${i}" class="${marks ? (x.idx === i ? 'ok' : 'bad') : ''}">
              <code>${esc(strip ? x.t.trim() : x.t)}</code>
              <span class="iv-move"><button type="button" class="btn" data-move="-1" aria-label="Move line ${i + 1} up"${i === 0 ? ' disabled' : ''}>↑</button><button type="button" class="btn" data-move="1" aria-label="Move line ${i + 1} down"${i === order.length - 1 ? ' disabled' : ''}>↓</button></span>
            </li>`).join('')}</ol>
            <div class="iv-actions"><button type="button" class="btn primary" id="ivCheck">Check my order</button><span class="iv-tries">${attempts ? `${3 - attempts} ${3 - attempts === 1 ? 'try' : 'tries'} left` : ''}</span></div>`;
        };
        const move = (i, d) => { const j = i + d; if (j < 0 || j >= order.length) return; [order[i], order[j]] = [order[j], order[i]]; draw(false); const b = body.querySelector(`li[data-i="${j}"] [data-move="${d}"]`) || body.querySelector(`li[data-i="${j}"] button`); if (b) b.focus(); };
        draw(false);
        let dragFrom = null;
        body.addEventListener('click', e => {
          const mv = e.target.closest('[data-move]');
          if (mv && !checked) return move(+mv.closest('li').dataset.i, +mv.dataset.move);
          if (e.target.id !== 'ivCheck' || checked) return;
          attempts++;
          const wrong = order.filter((x, i) => x.idx !== i).length;
          if (!wrong) { checked = true; draw(true); return api.finish(4 - attempts, `Correct${attempts > 1 ? ` on try ${attempts}` : ' on the first try'}! ${esc(ctx.algo.interview.orderWhy)}`); }
          draw(true);
          body.querySelector('.iv-tries').textContent = `${3 - attempts} ${3 - attempts === 1 ? 'try' : 'tries'} left. ${wrong} line${wrong > 1 ? 's are' : ' is'} in the wrong place (shown in red).`;
          if (attempts >= 3) {
            checked = true;
            body.innerHTML = `<p><b>Here is the correct order:</b></p><ol class="iv-order">${code.map(t => `<li class="ok"><code>${esc(t)}</code></li>`).join('')}</ol>`;
            api.finish(0, esc(ctx.algo.interview.orderWhy), ['order']);
          }
        });
        body.addEventListener('dragstart', e => { const li = e.target.closest('li'); if (li) { dragFrom = +li.dataset.i; e.dataTransfer.effectAllowed = 'move'; } });
        body.addEventListener('dragover', e => { if (dragFrom !== null) e.preventDefault(); });
        body.addEventListener('drop', e => {
          const li = e.target.closest('li');
          if (!li || dragFrom === null || checked) return;
          e.preventDefault();
          const to = +li.dataset.i, [item] = order.splice(dragFrom, 1);
          order.splice(to, 0, item); dragFrom = null; draw(false);
        });
        api.hint(() => {
          const i = order.findIndex((x, k) => x.idx !== k);
          return i < 0 ? 'Every line is in the right place already. Press Check.' : `Position ${i + 1} should hold: “${code[i].trim()}”.`;
        });
      },
    };
  }

  function spotRound(ctx) {
    const iv = ctx.algo.interview;
    let res = null;
    for (let t = 0; t < 8 && !res; t++) {
      const states = iv.spec.build(iv.inputs()), found = iv.bug(states);
      if (found && JSON.stringify(found.states[found.wrongIndex], (k, v) => (v === Infinity ? 'inf' : v)) !== JSON.stringify(states[found.wrongIndex], (k, v) => (v === Infinity ? 'inf' : v))) res = found;
    }
    if (!res) return null;
    res.states.forEach(s => { delete s.quiz; });
    const tries = INTERVIEW_LEVELS[ctx.level].spotTries;
    return {
      key: 'spot', title: 'Spot the wrong step', max: 3, limit: 180, keys: ['spot'], _res: res,
      intro: `Below is a replay of ${ctx.algo.title}. In exactly one step, something on screen does not match what the caption says. Step through it (the bar jumps to any step), then press “This step is wrong” on the step that doesn’t add up. You have ${tries} ${tries === 1 ? 'try' : 'tries'}.`,
      setup(body, api) {
        body.innerHTML = `<div id="ivSpotPage"></div><div class="iv-actions"><button type="button" class="btn primary" id="ivWrong">⚠ This step is wrong</button><span class="iv-tries" id="ivSpotInfo" aria-live="polite"></span></div>`;
        let cur = 0, used = 0, over = false;
        const spec = { ...iv.spec, problem: '', controls: [], build: () => res.states, draw: (el, s) => { cur = res.states.indexOf(s); iv.spec.draw(el, s); } };
        const player = createAlgoPage(body.querySelector('#ivSpotPage'), spec);
        body.querySelector('#ivWrong').onclick = () => {
          if (over) return;
          used++;
          if (cur === res.wrongIndex) { over = true; return api.finish(used === 1 ? 3 : 2, `Yes! Step ${cur + 1} is the wrong one. ${esc(res.explanation)}`); }
          if (used >= tries) { over = true; player.goTo(res.wrongIndex); return api.finish(0, `Not that one. The wrong step was step ${res.wrongIndex + 1} (now shown). ${esc(res.explanation)}`, ['spot']); }
          body.querySelector('#ivSpotInfo').textContent = `Step ${cur + 1} looks consistent. ${tries - used} ${tries - used === 1 ? 'try' : 'tries'} left.`;
        };
        api.hint(() => `The wrong step is in the ${res.wrongIndex < res.states.length / 2 ? 'first' : 'second'} half of the replay.`);
      },
    };
  }

  // a block of multiple-choice questions; each question is { q, options, answer (index), why, id }
  function quizBody(body, api, questions, opts = {}) {
    let n = 0, points = 0;
    const missed = [];
    const hintFor = () => { // hide one wrong option of the current question
      const box = body.querySelector('.iv-q:not(.done)');
      if (!box) return null;
      const btn = [...box.querySelectorAll('.iv-opt:not([disabled])')].find(b => +b.dataset.k !== +box.dataset.answer);
      if (!btn) return 'Only the right answer is left.';
      btn.disabled = true; btn.classList.add('gone');
      return 'One wrong answer has been crossed out.';
    };
    const ask = idx => {
      const q = questions[idx], order = shuffle(q.options.map((text, k) => ({ text, k })));
      const block = document.createElement('div');
      block.className = 'iv-q'; block.dataset.answer = order.findIndex(o => o.k === q.answer);
      block.innerHTML = `<p class="iv-qtext"><b>${opts.numbered ? `Question ${idx + 1} of ${questions.length}. ` : ''}${esc(q.q)}</b></p>
        <div class="iv-opts" role="group" aria-label="Answers">${order.map((o, i) => `<button type="button" class="btn iv-opt" data-k="${i}">${esc(o.text)}</button>`).join('')}</div><div class="iv-fb" aria-live="polite"></div>`;
      body.appendChild(block);
      block.addEventListener('click', e => {
        const b = e.target.closest('.iv-opt');
        if (!b || block.classList.contains('done')) return;
        block.classList.add('done');
        const ok = +b.dataset.k === +block.dataset.answer;
        block.querySelectorAll('.iv-opt').forEach(x => { x.disabled = true; x.classList.toggle('right', +x.dataset.k === +block.dataset.answer); x.classList.toggle('wrong', x === b && !ok); });
        if (ok) points++; else missed.push(q.id);
        block.querySelector('.iv-fb').innerHTML = `<b>${ok ? 'Correct!' : 'Not quite.'}</b> ${esc(q.why)}`;
        n++;
        if (n < questions.length) {
          if (opts.sequential) { const nx = document.createElement('button'); nx.type = 'button'; nx.className = 'btn primary'; nx.textContent = 'Next question ›'; nx.onclick = () => { nx.remove(); ask(n); }; block.appendChild(nx); nx.focus(); }
        } else api.finish(points, opts.summary ? opts.summary(points) : '', missed);
      });
      if (opts.sequential) block.querySelector('.iv-opt').focus();
    };
    if (opts.sequential) ask(0); else questions.forEach((_, i) => ask(i));
    api.hint(hintFor);
    api.partial = () => points;
  }

  function complexityRound(ctx) {
    const c = ctx.algo.interview.complexity;
    const qs = [{ id: 'c:time', ...c.time, answerText: c.time.answer }, { id: 'c:space', ...c.space, answerText: c.space.answer }]
      .filter(q => !ctx.only || ctx.only.has(q.id)).map(q => ({ ...q, answer: q.options.indexOf(q.answerText), why: '' }));
    if (!qs.length) return null;
    return {
      key: 'complexity', title: 'Time and space complexity', max: qs.length, limit: 60, keys: qs.map(q => q.id),
      intro: 'An interviewer always asks: how fast is it, and how much memory does it use? Pick the best answer for each.',
      setup(body, api) {
        quizBody(body, api, qs, { summary: () => `${esc(c.why)} <a href="#bigo">See how these growth rates compare</a>.` });
      },
    };
  }

  function followupsRound(ctx) {
    const all = ctx.algo.interview.followups.map((f, i) => ({ ...f, id: 'f:' + i }));
    let list = ctx.only ? all.filter(f => ctx.only.has(f.id)) : all.slice(0, INTERVIEW_LEVELS[ctx.level].followups);
    if (!list.length) return null;
    return {
      key: 'followups', title: 'Follow-up questions', max: list.length, limit: 45 * list.length, keys: list.map(f => f.id),
      intro: 'After the main answer, interviewers ask “what if…?”. One question at a time, with an explanation after each.',
      setup(body, api) { quizBody(body, api, list, { sequential: true, numbered: true }); },
    };
  }

  function traceRound(ctx) {
    const iv = ctx.algo.interview;
    if (!iv.trace) return null;
    let picks = [], states = null;
    for (let t = 0; t < 6 && picks.length < 2; t++) {
      states = iv.spec.build(iv.inputs());
      picks = shuffle(iv.trace(states)).slice(0, 2);
    }
    if (picks.length < 2) return null;
    return {
      key: 'trace', title: 'Trace it by hand', max: 2, limit: 90, keys: ['trace'],
      intro: 'You see the state of the algorithm just before a step. Work out the value the step produces and type it in, the way you would on a whiteboard.',
      setup(body, api) {
        let n = 0, points = 0;
        const next = () => {
          const p = picks[n];
          body.innerHTML = `<p class="iv-qtext"><b>Question ${n + 1} of 2.</b> ${esc(p.prompt)}</p><div class="algo-viz stage-card" id="ivTraceViz"></div>
            <form class="iv-answer"><label>Your answer <input type="number" inputmode="numeric" id="ivNum" required></label><button type="submit" class="btn primary">Check</button></form><div class="iv-fb" aria-live="polite"></div>`;
          iv.spec.draw(body.querySelector('#ivTraceViz'), states[p.index - 1]);
          body.querySelector('#ivNum').focus();
          body.querySelector('form').onsubmit = e => {
            e.preventDefault();
            const ok = Number(body.querySelector('#ivNum').value) === p.answer;
            if (ok) points++;
            iv.spec.draw(body.querySelector('#ivTraceViz'), states[p.index]);
            body.querySelector('form').remove();
            body.querySelector('.iv-fb').innerHTML = `<b>${ok ? 'Correct!' : `Not quite: the answer is ${p.answer}.`}</b> The picture now shows the state after the step. ${esc(states[p.index].caption)}`;
            n++;
            if (n < 2) { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn primary'; b.textContent = 'Next question ›'; b.onclick = next; body.appendChild(b); b.focus(); }
            else api.finish(points, '', points < 2 ? ['trace'] : []);
          };
        };
        next();
        api.hint(() => picks[n < 2 ? n : 1].hint);
        api.partial = () => points;
      },
    };
  }

  const BUILDERS = { order: orderRound, spot: spotRound, complexity: complexityRound, followups: followupsRound, trace: traceRound };

  // ---------------------------------------------------------------- screens
  function renderStart() {
    stopTick(); session = null;
    const data = saved(), mine = data[algo.id] || {}, missed = mine.missed || [];
    const shared = /^(\d+)-(\d+)$/.exec(params.get('s') || '');
    root.innerHTML = `
      <section class="iv-start">
        ${shared ? `<p class="iv-banner">A friend scored <b>${shared[1]} out of ${shared[2]}</b> on this interview. Can you beat it?</p>` : ''}
        <p class="lead">Practice like a real technical interview. The site asks you to order the pseudocode, find a wrong step, give complexities and answer follow-up questions, and checks each answer for you.</p>
        <div class="controls">
          <label>Algorithm<select id="ivAlgo">${algos.map(a => `<option value="${a.id}"${a === algo ? ' selected' : ''}>${a.title}</option>`).join('')}</select></label>
          <label class="check"><input id="ivTimer" type="checkbox"${timed ? ' checked' : ''}> Timer for each round</label>
        </div>
        <fieldset class="iv-levels"><legend>Difficulty</legend>
          ${Object.entries(INTERVIEW_LEVELS).map(([k, v]) => `<label class="iv-level"><input type="radio" name="ivLevel" value="${k}"${k === level ? ' checked' : ''}><span><b>${v.label}</b><br><small>${v.blurb}</small></span></label>`).join('')}
        </fieldset>
        <p class="iv-best">${mine.best ? `Your best on this algorithm: <b>${mine.best.points} / ${mine.best.max}</b> (${INTERVIEW_LEVELS[mine.best.level] ? INTERVIEW_LEVELS[mine.best.level].label : mine.best.level}).` : 'You have not taken this interview yet.'}</p>
        <div class="iv-actions"><button type="button" class="btn primary" id="ivStart">Start interview</button>
          ${missed.length ? `<button type="button" class="btn" id="ivRetry">Retry the ones I missed (${missed.length})</button>` : ''}
          <a class="btn" href="#algorithms/${algo.id}">Back to the algorithm</a></div>
      </section>`;
    $('#ivAlgo').onchange = e => { algo = algos.find(a => a.id === e.target.value); history.replaceState(null, '', '#interview/' + algo.id); renderStart(); };
    $('#ivTimer').onchange = e => { timed = e.target.checked; };
    root.querySelectorAll('input[name=ivLevel]').forEach(r => { r.onchange = () => { level = r.value; }; });
    $('#ivStart').onclick = () => start(null);
    if ($('#ivRetry')) $('#ivRetry').onclick = () => start(new Set(missed));
  }

  function start(only) {
    const ctx = { algo, level, only };
    const rounds = INTERVIEW_LEVELS[level].rounds.map(k => BUILDERS[k](ctx)).filter(Boolean)
      .filter(r => !only || r.keys.some(k => only.has(k)));
    if (!rounds.length) { renderStart(); return; }
    session = { algo, level, timed, only, rounds, results: [], started: Date.now() };
    runRound(0);
  }

  function runRound(i) {
    stopTick();
    const r = session.rounds[i];
    root.innerHTML = `
      <section class="iv-round" aria-labelledby="ivTitle">
        <div class="iv-head"><span class="iv-step">Round ${i + 1} of ${session.rounds.length}</span><span class="iv-timer" id="ivClock" aria-live="off"></span></div>
        <div class="progress" role="progressbar" aria-label="Interview progress" aria-valuemin="0" aria-valuemax="${session.rounds.length}" aria-valuenow="${i}"><div class="progress-fill" style="width:${(i / session.rounds.length) * 100}%"></div></div>
        <h2 id="ivTitle" tabindex="-1">${r.title}</h2>
        <p class="iv-intro">${r.intro}</p>
        <div id="ivBody"></div>
        <div class="iv-actions" id="ivTools"><button type="button" class="btn" id="ivHint">💡 Hint (−1 point)</button><button type="button" class="btn" id="ivSkip">Skip this round</button></div>
        <p class="iv-hinttext" id="ivHintText" aria-live="polite"></p>
        <div class="iv-feedback" id="ivFeedback" aria-live="polite"></div>
        <button type="button" class="btn primary" id="ivNext" hidden>${i + 1 < session.rounds.length ? 'Next round ›' : 'See my scorecard ›'}</button>
      </section>`;
    $('#ivTitle').focus();
    let hints = 0, hintFn = null, finished = false;
    const api = {
      hint: fn => { hintFn = fn; },
      partial: null,
      finish(points, feedback, missedKeys = []) {
        if (finished) return;
        finished = true; stopTick();
        const pts = Math.max(0, Math.min(r.max, points) - hints);
        session.results.push({ key: r.key, title: r.title, max: r.max, points: pts, hints, missed: pts < r.max ? (missedKeys.length ? missedKeys : (r.keys.length === 1 ? r.keys : [])) : [], keys: r.keys });
        $('#ivTools').hidden = true;
        $('#ivFeedback').innerHTML = `<p class="iv-score">You scored <b>${pts} / ${r.max}</b>${hints ? ` (${hints} hint${hints > 1 ? 's' : ''} used)` : ''}.</p>${feedback ? `<p>${feedback}</p>` : ''}`;
        $('#ivNext').hidden = false; $('#ivNext').focus();
      },
    };
    $('#ivHint').onclick = () => {
      if (finished || !hintFn) return;
      const text = hintFn();
      if (text) { hints++; $('#ivHintText').textContent = 'Hint: ' + text; }
    };
    $('#ivSkip').onclick = () => api.finish(0, 'You skipped this round.', r.keys.slice());
    $('#ivNext').onclick = () => (i + 1 < session.rounds.length ? runRound(i + 1) : renderScore());
    r.setup($('#ivBody'), api);
    if (session.timed) {
      let left = r.limit;
      const show = () => { const c = $('#ivClock'); if (c) c.textContent = `⏱ ${fmtTime(left)}`; };
      show();
      tick = setInterval(() => {
        if (!root.isConnected) return stopTick();
        left--; show();
        if (left <= 0 && !finished) { const pts = api.partial ? api.partial() : 0; api.finish(pts, 'Time is up!', r.keys.slice()); }
      }, 1000);
    }
  }

  function renderScore() {
    stopTick();
    const s = session, total = s.results.reduce((a, r) => a + r.points, 0), max = s.results.reduce((a, r) => a + r.max, 0), pct = max ? total / max : 0;
    const passed = pct >= 0.7, secs = Math.round((Date.now() - s.started) / 1000);
    const weak = s.results.filter(r => r.points < r.max);
    // remember best score and what was missed
    const data = saved(), mine = data[s.algo.id] || {};
    const attempted = new Set(s.results.flatMap(r => r.keys)), newMissed = s.results.flatMap(r => r.missed);
    mine.missed = [...new Set([...(mine.missed || []).filter(k => !attempted.has(k)), ...newMissed])];
    if (!s.only && (!mine.best || total / max >= mine.best.points / mine.best.max)) mine.best = { points: total, max, level: s.level };
    if (passed && !s.only) { mine.passed = true; if (hooks.onPass) hooks.onPass(s.algo.id); }
    data[s.algo.id] = mine; save(data);
    const link = (r) => (r.key === 'complexity' ? '#bigo' : `#algorithms/${s.algo.id}`);
    root.innerHTML = `
      <section class="iv-score-card">
        <h2 tabindex="-1" id="ivScoreTitle">Your scorecard: ${s.algo.title}</h2>
        <p class="iv-big ${passed ? 'pass' : 'again'}"><b>${total} / ${max}</b> · ${Math.round(pct * 100)}% · ${passed ? 'Passed!' : 'Not yet: you need 70% to pass.'}</p>
        <p class="iv-meta">${INTERVIEW_LEVELS[s.level].label} · ${s.only ? 'retry of missed questions · ' : ''}time ${fmtTime(secs)}</p>
        <div class="dp-wrap"><table class="iv-table"><thead><tr><th>Round</th><th>Score</th><th>Hints</th></tr></thead><tbody>
          ${s.results.map(r => `<tr><td>${r.title}</td><td>${r.points} / ${r.max}</td><td>${r.hints}</td></tr>`).join('')}</tbody></table></div>
        ${weak.length ? `<h3>Worth reviewing</h3><ul class="iv-weak">${weak.map(r => `<li><a href="${link(r)}">${r.title}</a>: ${r.key === 'complexity' ? 'compare the growth rates on the Big-O page' : `replay ${esc(s.algo.title)} and watch for this`}</li>`).join('')}</ul>` : '<p>No weak spots this time. Nicely done!</p>'}
        <div class="iv-actions">
          ${mine.missed.length ? `<button type="button" class="btn primary" id="ivRetry">Retry the ones I missed (${mine.missed.length})</button>` : ''}
          <button type="button" class="btn" id="ivCopy">Copy result link</button>
          <button type="button" class="btn" id="ivAgain">Start over</button>
          <a class="btn" href="#algorithms/${s.algo.id}">Back to the algorithm</a></div>
        <p class="iv-note" id="ivCopied" aria-live="polite"></p>
      </section>`;
    $('#ivScoreTitle').focus();
    $('#ivAgain').onclick = renderStart;
    if ($('#ivRetry')) $('#ivRetry').onclick = () => start(new Set(mine.missed));
    $('#ivCopy').onclick = () => {
      const url = `${location.href.split('#')[0]}#interview/${s.algo.id}?d=${s.level}&s=${total}-${max}`;
      const ok = () => { $('#ivCopied').textContent = 'Link copied!'; };
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(ok, () => prompt('Copy this link:', url)); else prompt('Copy this link:', url);
    };
  }

  renderStart();
}
