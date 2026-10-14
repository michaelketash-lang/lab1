// Linked list cycle detection (Floyd's tortoise and hare), played by the step player.
// A state is { slow, fast, caption, rounds, result }. Pointers are node indexes; index n means null.
(function () {
  const NAME = i => String.fromCharCode(65 + i);
  const X = i => 20 + i * 84, NODE_Y = 64;

  function buildStates(n, cycle, target) {
    const next = i => (i < n - 1 ? i + 1 : cycle ? target : n); // n = null
    let slow = 0, fast = 0, rounds = 0;
    const states = [];
    const snap = (caption, result = null) => states.push({ slow, fast, caption, rounds, result });
    snap(`Both pointers start at the head, node A. Each round, slow (the tortoise) moves 1 node and fast (the hare) moves 2.`);
    for (;;) {
      rounds++;
      const s0 = slow;
      slow = next(slow);
      snap(`Round ${rounds}: slow moves 1 step, from ${NAME(s0)} to ${NAME(slow)}.`);
      const f0 = fast, f1 = next(fast);
      fast = f1;
      if (f1 === n) { snap(`Fast is at ${NAME(f0)} and its next node is null, so it has reached the end of the list. A list with a cycle never ends, so there is no cycle.`, 'none'); break; }
      snap(`Fast moves 2 steps: first from ${NAME(f0)} to ${NAME(f1)}…`);
      const f2 = next(f1);
      fast = f2;
      if (f2 === n) { snap(`…and then it reaches null. The list ends, so there is no cycle.`, 'none'); break; }
      if (slow === fast) {
        snap(`…and then from ${NAME(f1)} to ${NAME(f2)}. Slow and fast are both on ${NAME(slow)}: they met, so the list has a cycle! Inside a loop, fast gains one step on slow every round, so it must eventually catch up.`, 'cycle');
        break;
      }
      snap(`…and then from ${NAME(f1)} to ${NAME(f2)}. Slow is on ${NAME(slow)} and fast is on ${NAME(fast)}: different nodes, so keep going.`);
    }
    return states;
  }

  function render(state, n, cycle, target) {
    const w = n * 84 + 96, h = cycle ? 175 : 130;
    const mid = NODE_Y + 20, bottom = NODE_Y + 40;
    const nodes = Array.from({ length: n }, (_, i) => {
      const s = state.slow === i, f = state.fast === i;
      const cls = state.result === 'cycle' && s && f ? 'meet' : s && f ? 'both' : s ? 'slow' : f ? 'fast' : '';
      return `<g class="node ${cls}"><rect x="${X(i)}" y="${NODE_Y}" width="56" height="40" rx="8"/><text x="${X(i) + 28}" y="${NODE_Y + 27}">${NAME(i)}</text></g>`;
    }).join('');
    const links = Array.from({ length: n - 1 }, (_, i) =>
      `<line class="link" x1="${X(i) + 56}" y1="${mid}" x2="${X(i + 1) - 3}" y2="${mid}" marker-end="url(#arrow)"/>`).join('');
    let tail;
    if (cycle) {
      const self = target === n - 1;
      const a = X(n - 1) + 28 - (self ? 12 : 0), b = X(target) + 28 + (self ? 12 : 0);
      tail = `<path class="link" d="M${a} ${bottom} C${a} ${bottom + 65} ${b} ${bottom + 65} ${b} ${bottom + 3}" marker-end="url(#arrow)"/>`;
    } else {
      tail = `<line class="link" x1="${X(n - 1) + 56}" y1="${mid}" x2="${X(n) - 3}" y2="${mid}" marker-end="url(#arrow)"/>
        <g class="null"><rect x="${X(n)}" y="${NODE_Y}" width="56" height="40" rx="8"/><text x="${X(n) + 28}" y="${NODE_Y + 26}">null</text></g>`;
    }
    const ptr = (kind, idx) => {
      const cx = X(idx) + 28 + (state.slow === state.fast ? (kind === 'slow' ? -30 : 30) : 0);
      return `<g class="ptr ${kind}" transform="translate(${cx} 28)"><rect x="-26" y="-2" width="52" height="22" rx="11"/><text y="14">${kind}</text><path d="M-6 20 L6 20 L0 30 Z"/></g>`;
    };
    return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;min-width:${n * 56}px;max-width:${n * 110}px" role="img" aria-label="Linked list with slow and fast pointers">
      <defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0 L10 5 L0 10 Z" class="head"/></marker></defs>
      ${links}${tail}${nodes}${ptr('slow', state.slow)}${ptr('fast', state.fast)}</svg>`;
  }

  function mount(root) {
    root.innerHTML = `
      <div class="controls">
        <label>List length: <b id="nVal">6</b>
          <input id="n" type="range" min="3" max="12" value="6">
        </label>
        <label class="check"><input id="cyc" type="checkbox" checked> List has a cycle</label>
        <label>Last node points back to
          <select id="target"></select>
        </label>
      </div>
      <p class="blurb">Two pointers walk the list. If there is a loop, the faster one laps the slower one and they land on the same node. If there is no loop, the fast one falls off the end.</p>
      <div class="stats"><span>Rounds: <b id="rounds">0</b></span><span>Result: <b id="result">searching…</b></span></div>
      <div class="cyc" id="canvas"></div>
      <ul class="legend">
        <li><i class="sw slow"></i>Slow pointer (1 step)</li><li><i class="sw fast"></i>Fast pointer (2 steps)</li>
        <li><i class="sw meet"></i>They meet: cycle found</li>
      </ul>
      <div id="player"></div>`;
    const $ = id => root.querySelector('#' + id);
    let n = 6, target = 2;

    function fillTargets() {
      $('target').innerHTML = Array.from({ length: n }, (_, i) => `<option value="${i}">${NAME(i)}</option>`).join('');
      target = Math.min(target, n - 1);
      $('target').value = target;
      $('target').disabled = !$('cyc').checked;
    }
    function draw(state) {
      $('canvas').innerHTML = render(state, n, $('cyc').checked, target);
      $('rounds').textContent = state.rounds;
      $('result').textContent = state.result === 'cycle' ? `cycle found at ${NAME(state.slow)}` : state.result === 'none' ? 'no cycle' : 'searching…';
    }
    const player = createStepPlayer($('player'), draw);
    const load = () => player.setStates(buildStates(n, $('cyc').checked, target));
    $('n').oninput = () => { n = +$('n').value; $('nVal').textContent = n; fillTargets(); load(); };
    $('cyc').onchange = () => { $('target').disabled = !$('cyc').checked; load(); };
    $('target').onchange = () => { target = +$('target').value; load(); };
    fillTargets();
    load();
  }

  (window.VIZ = window.VIZ || []).push({
    id: 'cycle',
    category: 'Data structures',
    title: 'Linked list cycle detection',
    summary: 'Floyd’s tortoise and hare: watch a slow and a fast pointer race along a linked list to find out whether it loops.',
    mount,
  });
})();
