// Knuth-Morris-Pratt string search: find a pattern in a text without ever moving backwards in the text.
(function () {
  const CODE = [
    'lps[0] = 0;  len = 0',
    'for i = 1 .. m-1:',
    '    while len > 0 and P[i] != P[len]:  len = lps[len-1]',
    '    if P[i] == P[len]:  len = len + 1',
    '    lps[i] = len',
    'j = 0',
    'for i = 0 .. n-1:',
    '    while j > 0 and T[i] != P[j]:  j = lps[j-1]     (slide the pattern, keep i)',
    '    if T[i] == P[j]:  j = j + 1',
    '    if j == m:  report a match at i-m+1;  j = lps[j-1]',
  ];
  const PRESETS = [['abxabcabcaby', 'abcaby'], ['aabaabaaabaaab', 'aabaaab'], ['abababcabababc', 'ababc'], ['bacbababaabcbab', 'ababa'], ['mississippimiss', 'issip'], ['aaaaabaaaaab', 'aaab']];
  const clean = max => t => t.toLowerCase().replace(/[^a-z]/g, '').slice(0, max);

  function build(inputs) {
    const T = inputs.text, P = inputs.pat, n = T.length, m = P.length;
    const states = [], lps = Array(m).fill(null), found = [];
    let comps = 0;
    const lpsChips = () => P.split('').map((ch, i) => `<span class="chip">${ch}: ${lps[i] === null ? '?' : lps[i]}</span>`).join(' ');
    const snap = (caption, line, o = {}) => states.push({ caption, line, quiz: o.quiz, T, P, lps: lps.slice(), found: found.slice(), phase: o.phase || 'search', top: o.top ?? null, off: o.off ?? 0, topI: o.topI ?? null, botI: o.botI ?? null, result: o.result || null, matched: o.matched || 0,
      vars: o.vars || [['Text', T], ['Pattern', P]] });
    if (!m || !n) {
      snap(!m ? 'Type a pattern to search for.' : 'Type some text to search in.', [], { phase: 'idle' });
      return states;
    }

    // part 1: the failure table
    lps[0] = 0;
    snap(`Searching for “${P}” in “${T}”. The simple way restarts the comparison from scratch after every mismatch. KMP is smarter: it first studies the pattern itself and builds a table, lps (“longest prefix that is also a suffix”). For each prefix of the pattern, lps says how many letters at its start match letters at its end. After a mismatch, that tells us how far we can slide the pattern without re-reading any text. lps[0] is always 0.`, [0], { phase: 'lps', vars: [['Phase', 'building the lps table'], ['lps', lpsChips()]] });
    let len = 0, i = 1;
    while (i < m) {
      comps++;
      const eq = P[i] === P[len], vars = [['Phase', 'building the lps table'], ['i', i], ['len', len], ['Comparing', `P[${i}] = ${P[i]} with P[${len}] = ${P[len]}`], ['lps', lpsChips()]];
      if (eq) {
        len++; lps[i] = len;
        snap(`Compare P[${i}] = “${P[i]}” with P[${len - 1}] = “${P[len - 1]}”. They match, so the border (a prefix that is also a suffix) grows to length ${len}: lps[${i}] = ${len}.`, [3, 4], { phase: 'lps', top: i, topI: i, botI: len - 1, off: i - (len - 1), result: 'ok', vars });
        i++;
      } else if (len > 0) {
        const nl = lps[len - 1];
        snap(`Compare P[${i}] = “${P[i]}” with P[${len}] = “${P[len]}”. They differ, so the current border cannot grow. But a shorter border might still work. We already know the next best one: lps[${len - 1}] = ${nl}, so we try again with len = ${nl}, without starting over.`, [2], {
          phase: 'lps', top: i, topI: i, botI: len, off: i - len, result: 'bad', vars,
          quiz: { q: `P[${i}] = “${P[i]}” does not match P[${len}] = “${P[len]}”. What will len become?`, options: [...new Set([nl, 0, len - 1].filter(x => x >= 0))].sort((a, b) => a - b).map(String), answer: [...new Set([nl, 0, len - 1].filter(x => x >= 0))].sort((a, b) => a - b).indexOf(nl) } });
        len = nl;
      } else {
        lps[i] = 0;
        snap(`Compare P[${i}] = “${P[i]}” with P[0] = “${P[0]}”. They differ and there is no shorter border to fall back to, so lps[${i}] = 0.`, [2, 4], { phase: 'lps', top: i, topI: i, botI: 0, off: i, result: 'bad', vars });
        i++;
      }
    }
    snap(`The lps table is ready: ${P.split('').map((c, k) => `${c}=${lps[k]}`).join(', ')}. Now the search itself. We compare the text with the pattern letter by letter, and the pointer i in the text will never move backwards.`, [5], { phase: 'search', vars: [['Phase', 'searching'], ['lps', lpsChips()]] });

    // part 2: the search
    let j = 0;
    i = 0;
    while (i < n) {
      comps++;
      const eq = T[i] === P[j];
      const vars = [['Phase', 'searching'], ['i (text)', i], ['j (pattern)', j], ['Comparing', `T[${i}] = ${T[i]} with P[${j}] = ${P[j]}`], ['Matches found at', found.length ? found.join(', ') : 'none yet'], ['lps', lpsChips()]];
      const o = { phase: 'search', top: i, topI: i, botI: j, off: i - j, matched: j, vars };
      if (eq) {
        j++;
        if (j === m) {
          found.push(i - m + 1);
          snap(`T[${i}] = “${T[i]}” matches P[${j - 1}] = “${P[j - 1]}”, and that was the last letter of the pattern: a full match, starting at index ${i - m + 1} of the text! To look for the next one, we do not start over. lps[${m - 1}] = ${lps[m - 1]} tells us the last ${lps[m - 1]} matched letters can be reused.`, [8, 9], { ...o, result: 'found', matched: m, vars: [...vars.slice(0, 4), ['Matches found at', found.join(', ')], vars[5]] });
          j = lps[m - 1];
        } else snap(`Compare T[${i}] = “${T[i]}” with P[${j - 1}] = “${P[j - 1]}”. They match, so we advance both pointers: j = ${j}.`, [6, 8], { ...o, result: 'ok', botI: j - 1, off: i - (j - 1) });
        i++;
      } else if (j > 0) {
        const nj = lps[j - 1], opts = [...new Set([nj, 0, j - 1].filter(x => x >= 0))].sort((a, b) => a - b);
        snap(`Compare T[${i}] = “${T[i]}” with P[${j}] = “${P[j]}”. Mismatch, after ${j} matching letters. We do not go back in the text. The table says lps[${j - 1}] = ${nj}: the pattern's first ${nj} letters already line up with the text just before position ${i}, so we slide the pattern and continue with j = ${nj}.`, [7], {
          ...o, result: 'bad', quiz: { q: `T[${i}] = “${T[i]}” does not match P[${j}] = “${P[j]}” after ${j} matching letters. What will j become?`, options: opts.map(String), answer: opts.indexOf(nj) } });
        j = nj;
      } else {
        snap(`Compare T[${i}] = “${T[i]}” with P[0] = “${P[0]}”. Mismatch with nothing matched yet, so there is nothing to reuse: move on to the next letter of the text.`, [6, 7], { ...o, result: 'bad' });
        i++;
      }
    }
    snap(found.length ? `Finished after ${comps} letter comparisons in total. The pattern was found ${found.length} time${found.length > 1 ? 's' : ''}, at index${found.length > 1 ? 'es' : ''} ${found.join(', ')}. The text pointer never moved backwards.` : `Finished: the pattern does not occur in the text. ${comps} letter comparisons in total, and the text pointer never moved backwards.`, [6], { phase: 'search', vars: [['Phase', 'done'], ['Matches found at', found.length ? found.join(', ') : 'none'], ['Comparisons', comps], ['lps', lpsChips()]] });
    return states;
  }

  function draw(el, s) {
    if (s.phase === 'idle') { el.innerHTML = '<p class="dp-note">Type a pattern and some text above.</p>'; return; }
    const lps = s.phase === 'lps';
    const cells = (str, hi, kind, off, okRange) => `<div class="krow" style="margin-left:calc(${off} * (var(--cw) + 2px))">${str.split('').map((ch, i) => {
      const c = i === hi ? (s.result === 'ok' || s.result === 'found' ? 'ok' : s.result === 'bad' ? 'bad' : 'cmp') : okRange && i >= okRange[0] && i < okRange[1] ? 'matched' : '';
      return `<span class="kc ${c}">${ch}</span>`;
    }).join('')}</div>`;
    const idxRow = (len, off = 0) => `<div class="krow idx" style="margin-left:calc(${off} * (var(--cw) + 2px))">${Array.from({ length: len }, (_, i) => `<span class="kc">${i}</span>`).join('')}</div>`;
    const topStr = lps ? s.P : s.T;
    const foundMarks = s.found.length && !lps ? `<div class="kfound">Matches so far: ${s.found.map(f => `index ${f}`).join(', ')}</div>` : '';
    el.innerHTML = `<div class="kmp">
      <div class="klabel">${lps ? 'Pattern (the table is built from the pattern itself)' : 'Text'}</div>${idxRow(topStr.length)}${cells(topStr, s.top, 'top', 0, !lps && s.top !== null ? [s.top - s.matched, s.top] : null)}
      <div class="klabel">${lps ? 'The same pattern, slid along so the prefix lines up with the end' : 'Pattern, lined up under the text'}</div>${cells(s.P, s.botI, 'bot', s.off, !lps ? [0, s.matched] : null)}
      <div class="klabel">lps table (longest prefix that is also a suffix)</div>${idxRow(s.P.length)}
      <div class="krow">${s.P.split('').map((ch, i) => `<span class="kc lps${s.lps[i] === null ? ' blank' : ''}">${s.lps[i] === null ? '?' : s.lps[i]}</span>`).join('')}</div>${foundMarks}</div>` +
      `<ul class="legend"><li><i class="sw cur"></i>Letters being compared</li><li><i class="sw done"></i>Match</li><li><i class="sw end"></i>Mismatch</li><li><i class="sw tree"></i>Already matched</li></ul>`;
  }

  const SPEC = {
      problem: 'How do you find a word inside a long text quickly? The obvious method lines the word up at every position and compares letter by letter, and after each mismatch it starts again, re-reading text it has already seen. That can be very slow. The Knuth-Morris-Pratt algorithm studies the pattern first, so that after a mismatch it knows exactly how far to slide the pattern, and it never moves backwards in the text.',
      code: CODE,
      controls: [
        { id: 'text', type: 'text', label: 'Text', value: PRESETS[0][0], max: 16, size: 18, clean: clean(16) },
        { id: 'pat', type: 'text', label: 'Pattern', value: PRESETS[0][1], max: 7, size: 9, clean: clean(7) },
        { id: 'pre', type: 'button', label: 'Random example', action: (inputs, set) => { const p = PRESETS[Math.floor(Math.random() * PRESETS.length)]; set('text', p[0]); set('pat', p[1]); } },
      ],
      build, draw,
  };
  function mount(root) { createAlgoPage(root, SPEC); }


  const interview = {
    spec: SPEC,
    inputs: () => { const p = PRESETS[Math.floor(Math.random() * PRESETS.length)]; return { text: p[0], pat: p[1] }; },
    orderWhy: 'The lps table has to be built before the search starts, because the search reads it after every mismatch. In each loop, the “slide the pattern” step (the while loop) must come before the comparison that advances the pointer.',
    complexity: {
      time: { q: 'For a text of length n and a pattern of length m, how long does KMP take?', answer: 'O(n + m)', options: ['O(n + m)', 'O(n · m)', 'O(n log m)', 'O(m²)'] },
      space: { q: 'How much extra memory does KMP need?', answer: 'O(m)', options: ['O(m)', 'O(n)', 'O(1)', 'O(n · m)'] },
      why: 'The lps table takes O(m) time and space. In the search, the text pointer only moves forward, and the pattern pointer can only move back as far as it has moved forward, so the total work stays linear.',
    },
    followups: [
      { q: 'What does lps[i] tell us?', options: ['The length of the longest prefix of the pattern (up to i) that is also a suffix of it', 'The position where the pattern appears', 'The number of letters left in the pattern', 'How many times letter i occurs'], answer: 0, why: 'That border is the part of the pattern we can keep after a mismatch, because those letters already match the text just before the mismatch.' },
      { q: 'After a mismatch, why does KMP never move backwards in the text?', options: ['The lps table says which pattern letters already match the text we just read', 'It re-reads the text from a copy', 'It ignores the mismatch', 'Moving back would be slower, but it is allowed'], answer: 0, why: 'The letters before the mismatch are known, so KMP just slides the pattern forward and continues from the same text position.' },
      { q: 'What is the worst case of the simple method that restarts after every mismatch?', options: ['O(n · m)', 'O(n + m)', 'O(log n)', 'O(n)'], answer: 0, why: 'For texts like “aaaa…” and patterns like “aaab”, almost every start position matches many letters before failing, so the work multiplies.' },
      { q: 'Which pattern gives an lps table that is all zeros?', options: ['abcd', 'aaaa', 'abab', 'aabaa'], answer: 0, why: 'In “abcd” no prefix reappears at the end. “aaaa” gives 0 1 2 3, “abab” gives 0 0 1 2, and “aabaa” gives 0 1 0 1 2.' },
      { q: 'After KMP finds a full match, what does it do next?', options: ['It sets j = lps[m-1], so overlapping matches are found too', 'It stops searching', 'It restarts from the beginning of the text', 'It skips m letters of the text'], answer: 0, why: 'The end of the match may already be the beginning of another match, and the lps table tells us exactly how many letters can be reused.' },
    ],
    bug(states) {
      const cands = states.map((s, i) => i).filter(i => states[i].phase === 'lps' && states[i].top !== null && states[i].lps[states[i].top] !== null);
      if (!cands.length) return null;
      const k = cands[Math.floor(Math.random() * cands.length)], copy = structuredClone(states), s = copy[k], t = s.top;
      const right = s.lps[t], wrong = right + 1;
      s.lps[t] = wrong;
      s.vars.find(v => v[0] === 'lps')[1] = s.P.split('').map((ch, i) => `<span class="chip">${ch}: ${s.lps[i] === null ? '?' : s.lps[i]}</span>`).join(' ');
      return { states: copy, wrongIndex: k, explanation: `In step ${k + 1} the caption says lps[${t}] = ${right}, but the lps table on the screen and in the state panel shows ${wrong}.` };
    },
  };

  (window.ALGORITHMS = window.ALGORITHMS || []).push({
    id: 'kmp',
    title: 'KMP string search',
    summary: 'Find a pattern inside a text without ever moving backwards, using a table built from the pattern itself.',
    mount,
    interview,
  });
})();
