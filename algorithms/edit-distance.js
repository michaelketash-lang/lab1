// Edit distance (Levenshtein): the fewest single-letter edits that turn one word into another, by dynamic programming.
(function () {
  const CODE = [
    'dp[i][0] = i  (delete i letters),   dp[0][j] = j  (insert j letters)',
    'for i = 1 .. m:',
    '    for j = 1 .. n:',
    '        cost = 0 if A[i] == B[j] else 1',
    '        dp[i][j] = min( dp[i-1][j] + 1,',
    '                        dp[i][j-1] + 1,',
    '                        dp[i-1][j-1] + cost )',
    'return dp[m][n]   (walk back through the table to list the edits)',
  ];
  const PAIRS = [['kitten', 'sitting'], ['sunday', 'saturday'], ['flaw', 'lawn'], ['horse', 'ros'], ['cat', 'cut'], ['book', 'back'], ['sleep', 'sheep'], ['graph', 'giraffe']];
  const clean = t => t.toLowerCase().replace(/[^a-z]/g, '').slice(0, 8);

  function build(inputs) {
    const A = inputs.a, B = inputs.b, m = A.length, n = B.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(null));
    const states = [];
    const snap = (caption, line, o = {}) => {
      const vars = o.vars || [['Words', `<b>${A || '(empty)'}</b> → <b>${B || '(empty)'}</b>`], ['Table size', `${m + 1} × ${n + 1}`]];
      states.push({ caption, line, vars, quiz: o.quiz, A, B, dp: dp.map(r => r.slice()), cur: o.cur || null, src: o.src || [], best: o.best || [], trace: o.trace || [] });
    };

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    snap(`Edit distance counts the fewest single-letter edits (insert, delete or replace a letter) that turn “${A}” into “${B}”. The first row and column are easy: turning the first i letters of “${A}” into nothing takes i deletions, and building the first j letters of “${B}” from nothing takes j insertions. Every other cell will be filled from its neighbors.`, [0]);

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const same = A[i - 1] === B[j - 1], cost = same ? 0 : 1;
        const del = dp[i - 1][j] + 1, ins = dp[i][j - 1] + 1, sub = dp[i - 1][j - 1] + cost, best = Math.min(del, ins, sub);
        dp[i][j] = best;
        const lo = Math.max(0, best - 1), opts = [lo, lo + 1, lo + 2, lo + 3];
        snap(`Cell (${i}, ${j}) answers: how few edits turn “${A.slice(0, i)}” into “${B.slice(0, j)}”? The last letters are “${A[i - 1]}” and “${B[j - 1]}”, ${same ? 'and they match, so the diagonal cell can be reused for free' : 'which differ, so reaching this cell from the diagonal costs one replacement'}. The three ways in are: delete “${A[i - 1]}” (${dp[i - 1][j]} + 1 = ${del}), insert “${B[j - 1]}” (${dp[i][j - 1]} + 1 = ${ins}), or ${same ? 'match' : 'replace'} (${dp[i - 1][j - 1]} + ${cost} = ${sub}). We want the fewest edits, so we keep the smallest: ${best}.`, [2, 3, 4, 5, 6], {
          cur: [i, j], src: [[i - 1, j], [i, j - 1], [i - 1, j - 1]],
          best: [[i - 1, j, del], [i, j - 1, ins], [i - 1, j - 1, sub]].filter(x => x[2] === best).map(x => [x[0], x[1]]),
          vars: [['Cell (i, j)', `(${i}, ${j})`], ['Letters', `${A[i - 1]} vs ${B[j - 1]}`], ['Delete option', `${dp[i - 1][j]} + 1 = ${del}`], ['Insert option', `${dp[i][j - 1]} + 1 = ${ins}`],
            [same ? 'Match option' : 'Replace option', `${dp[i - 1][j - 1]} + ${cost} = ${sub}`], ['Cell value (smallest)', `<b>${best}</b>`, true]],
          quiz: { q: `Cell (${i}, ${j}): the letters are “${A[i - 1]}” and “${B[j - 1]}”. What value goes into this cell?`, options: opts.map(String), answer: best - lo },
        });
      }
    }

    // walk back from the bottom-right cell to list the edits
    let i = m, j = n;
    const trace = [[i, j]], ops = [];
    while (i > 0 || j > 0) {
      let op, d;
      if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + (A[i - 1] === B[j - 1] ? 0 : 1)) {
        op = A[i - 1] === B[j - 1] ? `keep “${A[i - 1]}”` : `replace “${A[i - 1]}” with “${B[j - 1]}”`; d = [i - 1, j - 1];
      } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) { op = `delete “${A[i - 1]}”`; d = [i - 1, j]; }
      else { op = `insert “${B[j - 1]}”`; d = [i, j - 1]; }
      ops.unshift(op);
      snap(`Walking back from the corner: cell (${i}, ${j}) = ${dp[i][j]} came from cell (${d[0]}, ${d[1]}), so one step of the answer is: ${op}.`, [7], { trace: trace.slice(), cur: [i, j], vars: [['Step back', op], ['Edit distance', dp[m][n]]] });
      [i, j] = d; trace.push([i, j]);
    }
    snap(`The edit distance is ${dp[m][n]}. The green path through the table spells out the edits, from the start of the words to the end: ${ops.filter(o => !o.startsWith('keep')).join(', ') || 'none needed'}${ops.some(o => o.startsWith('keep')) ? ' (the other letters stay as they are)' : ''}.`, [7], { trace, vars: [['Edit distance', `<b>${dp[m][n]}</b>`, true], ['Edits', ops.filter(o => !o.startsWith('keep')).join('; ') || 'none']] });
    return states;
  }

  function draw(el, s) {
    const key = (list, i, j) => list.some(p => p[0] === i && p[1] === j);
    const rows = ['ε', ...s.A], cols = ['ε', ...s.B];
    el.innerHTML = algoTable(rows, cols, (i, j) => {
      const v = s.dp[i][j];
      const c = s.cur && s.cur[0] === i && s.cur[1] === j ? 'cur' : key(s.trace, i, j) ? 'trace' : key(s.best, i, j) ? 'best' : key(s.src, i, j) ? 'src' : v === null ? 'blank' : '';
      return { t: v === null ? '·' : v, c };
    }) + `<ul class="legend"><li><i class="sw cur"></i>Cell being filled</li><li><i class="sw tree"></i>Cells it looks at</li><li><i class="sw queued"></i>Cheapest option</li><li><i class="sw done"></i>Path back</li></ul>`;
  }

  const SPEC = {
      problem: 'How different are two words? Spell checkers, search boxes that forgive typos, and tools that compare two versions of a document all need a number for it. The edit distance is the fewest single-letter changes (insert, delete or replace) that turn one word into the other. Instead of trying every possible sequence of edits, we fill a table in which each cell answers a smaller version of the same question, and build the full answer from those.',
      code: CODE,
      controls: [
        { id: 'a', type: 'text', label: 'From word', value: 'kitten', max: 8, size: 9, clean },
        { id: 'b', type: 'text', label: 'To word', value: 'sitting', max: 8, size: 9, clean },
        { id: 'pair', type: 'button', label: 'Random words', action: (inputs, set) => { const p = PAIRS[Math.floor(Math.random() * PAIRS.length)]; set('a', p[0]); set('b', p[1]); } },
      ],
      build, draw,
  };
  function mount(root) { createAlgoPage(root, SPEC); }


  const interview = {
    spec: SPEC,
    inputs: () => { const p = PAIRS[Math.floor(Math.random() * PAIRS.length)]; return { a: p[0], b: p[1] }; },
    orderWhy: 'The table must start with its edges (dp[i][0] and dp[0][j]), because every other cell is built from cells above or to the left of it. The two loops come next, then the cost of the current pair of letters, and only then the minimum that uses all three neighbors.',
    complexity: {
      time: { q: 'For words of length m and n, how long does filling the table take?', answer: 'O(m · n)', options: ['O(m · n)', 'O(m + n)', 'O(2^(m+n))', 'O(log(m · n))'] },
      space: { q: 'How much memory does the full table, as drawn here, use?', answer: 'O(m · n)', options: ['O(m · n)', 'O(m + n)', 'O(1)', 'O(min(m, n)²)'] },
      why: 'There are (m + 1) × (n + 1) cells and each one is computed from three neighbors in constant time. If you only need the number and not the list of edits, you can keep just two rows and use far less memory.',
    },
    followups: [
      { q: 'Why can we reuse three neighboring cells instead of trying every possible sequence of edits?', options: ['The best answer for two prefixes depends only on the best answers for slightly shorter prefixes', 'Because most sequences of edits are illegal', 'Because the words are sorted', 'Because computers can check millions of sequences quickly'], answer: 0, why: 'This is called optimal substructure: the best way to transform “kitt” into “sitt” builds on the best way for shorter prefixes, so each smaller problem only has to be solved once.' },
      { q: 'The two letters are different. What does moving diagonally in the table mean?', options: ['Replace one letter with the other', 'Delete a letter', 'Insert a letter', 'Keep both letters'], answer: 0, why: 'The diagonal cell is the cost of fixing everything before these two letters. Replacing one letter by the other then costs 1 more (or 0 if the letters match).' },
      { q: 'You only need the distance number, not the list of edits. How can you use less memory?', options: ['Keep just the previous row and the current row', 'Keep only the first column', 'It is not possible', 'Keep only the diagonal cells'], answer: 0, why: 'Every cell only looks at the row above and the cell to its left, so older rows can be thrown away. (Listing the edits needs the whole table to walk back through.)' },
      { q: 'Is the edit distance from word A to word B always equal to the distance from B to A?', options: ['Yes: an insertion one way is a deletion the other way', 'No, it only matches when the words have the same length', 'No, it depends on the letters', 'Only for words shorter than 5 letters'], answer: 0, why: 'Reverse every edit: inserting a letter becomes deleting it, deleting becomes inserting, and a replacement stays a replacement. The count does not change.' },
      { q: 'What is the edit distance between a word and itself?', options: ['0', '1', 'The length of the word', 'Undefined'], answer: 0, why: 'No edits are needed. In the table, every diagonal step is a match that costs 0, so the corner holds 0.' },
    ],
    bug(states) {
      const cands = states.map((s, i) => i).filter(i => states[i].cur && !states[i].trace.length && states[i].best.length);
      if (!cands.length) return null;
      const k = cands[Math.floor(Math.random() * cands.length)], copy = structuredClone(states), s = copy[k], [i, j] = s.cur;
      const right = s.dp[i][j], wrong = right + 1;
      s.dp[i][j] = wrong;
      s.vars.find(v => v[0] === 'Cell value (smallest)')[1] = `<b>${wrong}</b>`;
      return { states: copy, wrongIndex: k, explanation: `In step ${k + 1} the caption works out that cell (${i}, ${j}) is the smallest of its three options, ${right}. The table and the state panel show ${wrong} instead.` };
    },
    trace(states) {
      return states.map((s, i) => ({ s, i })).filter(({ s, i }) => i > 0 && s.cur && !s.trace.length && s.best.length).map(({ s, i }) => {
        const [r, c] = s.cur;
        return { index: i, prompt: `Fill in cell (${r}, ${c}) of the table, where the letters are “${s.A[r - 1]}” and “${s.B[c - 1]}”. Type a number.`, answer: s.dp[r][c],
          hint: `The neighbors are ${s.dp[r - 1][c]} above, ${s.dp[r][c - 1]} to the left and ${s.dp[r - 1][c - 1]} on the diagonal. Add 1 to above and to the left, and add 0 (same letters) or 1 (different letters) to the diagonal. Then take the smallest.` };
      });
    },
  };

  (window.ALGORITHMS = window.ALGORITHMS || []).push({
    id: 'edit-distance',
    title: 'Edit distance',
    summary: 'Fill a table cell by cell to find the fewest edits that turn one word into another, then walk back through it to list the edits.',
    mount,
    interview,
  });
})();
