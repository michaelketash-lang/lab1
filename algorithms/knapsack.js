// 0/1 knapsack by dynamic programming: the most valuable set of items that fits in a bag of limited size.
(function () {
  const CODE = [
    'dp[0][c] = 0 for every capacity c      (no items, no value)',
    'for each item i = 1 .. n:',
    '    for each capacity c = 0 .. W:',
    '        skip = dp[i-1][c]',
    '        if weight[i] <= c:  take = dp[i-1][c - weight[i]] + value[i]',
    '        dp[i][c] = max(skip, take)',
    'walk back from dp[n][W]: item i was taken whenever its row changed the value',
    'return dp[n][W]',
  ];

  function makeItems(n, seed) {
    const rand = algoRng(seed);
    return Array.from({ length: n }, () => ({ w: 1 + Math.floor(rand() * 5), v: 1 + Math.floor(rand() * 9) }));
  }

  function build(inputs) {
    const items = makeItems(inputs.n, inputs.seed), n = items.length, W = inputs.cap;
    const dp = Array.from({ length: n + 1 }, () => Array(W + 1).fill(null));
    const states = [];
    const list = items.map((it, k) => `<span class="chip">${k + 1}: weight ${it.w}, value ${it.v}</span>`).join(' ');
    const snap = (caption, line, o = {}) => states.push({ caption, line, quiz: o.quiz, items, W, dp: dp.map(r => r.slice()), cur: o.cur || null, src: o.src || [], best: o.best || [], trace: o.trace || [],
      vars: o.vars || [['Items', list], ['Bag capacity', W]] });

    for (let c = 0; c <= W; c++) dp[0][c] = 0;
    snap(`You can carry a bag that holds weight ${W}, and each item has a weight and a value. Which items give the most value without going over the limit? Each table cell dp[i][c] answers: what is the best value using only the first i items in a bag of size c? With no items the value is 0, so the top row is all zeros.`, [0]);

    for (let i = 1; i <= n; i++) {
      const { w, v } = items[i - 1];
      for (let c = 0; c <= W; c++) {
        const skip = dp[i - 1][c], fits = w <= c, take = fits ? dp[i - 1][c - w] + v : null;
        const takeIt = fits && take > skip;
        dp[i][c] = takeIt ? take : skip;
        const src = fits ? [[i - 1, c], [i - 1, c - w]] : [[i - 1, c]];
        snap(!fits
          ? `Item ${i} (weight ${w}, value ${v}) does not fit in a bag of size ${c}, so the only choice is to skip it. We copy the best value we already had without it: ${skip}.`
          : `Bag size ${c}, item ${i} (weight ${w}, value ${v}). Skipping it keeps the best value without it: ${skip}. Taking it uses up ${w} of the space, leaving ${c - w} for the earlier items, whose best value there is ${dp[i - 1][c - w]}, plus ${v} for this item = ${take}. ${takeIt ? `Taking is better (${take} > ${skip}), so this cell becomes ${take}.` : `Skipping is at least as good (${skip} ≥ ${take}), so this cell stays ${skip}.`}`,
        [2, 3, 4, 5], {
          cur: [i, c], src, best: [takeIt ? [i - 1, c - w] : [i - 1, c]],
          vars: [['Item', `${i}: weight ${w}, value ${v}`], ['Capacity c', c], ['Skip', skip], ['Take', fits ? take : 'does not fit'], ['Cell value (the larger)', `<b>${dp[i][c]}</b>`, true]],
          quiz: fits ? { q: `Bag size ${c}, item ${i} (weight ${w}, value ${v}): is it better to take the item or skip it?`, options: ['Take it', 'Skip it'], answer: takeIt ? 0 : 1 } : undefined,
        });
      }
    }

    // walk back to find which items were taken
    let c = W;
    const trace = [[n, c]], chosen = [];
    for (let i = n; i >= 1; i--) {
      const { w, v } = items[i - 1], took = dp[i][c] !== dp[i - 1][c];
      snap(took
        ? `Item ${i}: the value in row ${i} (${dp[i][c]}) differs from the value above it (${dp[i - 1][c]}), so item ${i} must have been taken. Remove its weight ${w}: the bag size left is ${c - w}.`
        : `Item ${i}: the value in row ${i} (${dp[i][c]}) equals the value above it, so item ${i} was not needed. Same bag size, move up.`, [6], { trace: trace.slice(), cur: [i, c], vars: [['Item', i], ['Taken so far', chosen.length ? chosen.slice().reverse().join(', ') : 'none'], ['Bag size left', c]] });
      if (took) { chosen.push(i); c -= w; }
      trace.push([i - 1, c]);
    }
    const tw = chosen.reduce((s, i) => s + items[i - 1].w, 0), tv = dp[n][W];
    snap(`The best value is ${tv}. ${chosen.length ? `Take item${chosen.length > 1 ? 's' : ''} ${chosen.slice().reverse().join(' and ')}: total weight ${tw} (limit ${W}), total value ${tv}.` : 'No item is worth taking.'} The green path through the table shows how we got there.`, [7], { trace, vars: [['Best value', `<b>${tv}</b>`, true], ['Items taken', chosen.length ? chosen.slice().reverse().join(', ') : 'none'], ['Total weight', `${tw} of ${W}`]] });
    return states;
  }

  function draw(el, s) {
    const key = (list, i, c) => list.some(p => p[0] === i && p[1] === c);
    const rows = ['no items', ...s.items.map((it, k) => `item ${k + 1} (w${it.w}, v${it.v})`)], cols = Array.from({ length: s.W + 1 }, (_, c) => c);
    el.innerHTML = `<p class="dp-note">Columns are the bag size c. Each row adds one more item.</p>` + algoTable(rows, cols, (i, c) => {
      const v = s.dp[i][c];
      return { t: v === null ? '·' : v, c: s.cur && s.cur[0] === i && s.cur[1] === c ? 'cur' : key(s.trace, i, c) ? 'trace' : key(s.best, i, c) ? 'best' : key(s.src, i, c) ? 'src' : v === null ? 'blank' : '' };
    }) + `<ul class="legend"><li><i class="sw cur"></i>Cell being filled</li><li><i class="sw tree"></i>Cells it looks at</li><li><i class="sw queued"></i>The choice it keeps</li><li><i class="sw done"></i>Path back</li></ul>`;
  }

  const SPEC = {
      problem: 'You are packing a bag that can only hold so much weight, and every item has a value. Which items should you take to get the most value without breaking the limit? Trying every combination takes far too long once there are many items. Dynamic programming solves it by building a table of smaller bags and fewer items, and reusing those answers.',
      code: CODE,
      controls: [
        { id: 'n', type: 'range', label: 'Number of items', min: 3, max: 5, value: 4 },
        { id: 'cap', type: 'range', label: 'Bag size', min: 6, max: 12, value: 9 },
        { id: 'seed', type: 'button', label: 'Random items', value: 777, action: (inputs, set) => set('seed', 1 + Math.floor(Math.random() * 1e9)) },
      ],
      build, draw,
  };
  function mount(root) { createAlgoPage(root, SPEC); }


  const interview = {
    spec: SPEC,
    inputs: () => ({ n: 4, cap: 8 + Math.floor(Math.random() * 3), seed: 1 + Math.floor(Math.random() * 1e9) }),
    orderWhy: 'The top row (no items) must be filled first, since every other row is built from the row above. Then come the loops over items and capacities, the skip value, the take value (only when the item fits), and finally the maximum of the two.',
    complexity: {
      time: { q: 'With n items and a bag of size W, how long does the table method take?', answer: 'O(n · W)', options: ['O(n · W)', 'O(n + W)', 'O(2^n)', 'O(n log W)'] },
      space: { q: 'How much memory does the full table, as drawn here, use?', answer: 'O(n · W)', options: ['O(n · W)', 'O(n)', 'O(W²)', 'O(1)'] },
      why: 'There is one cell for every pair (items so far, bag size), and each cell is computed in constant time from two cells above it. Because a row only needs the row above, the memory can be cut down to O(W) if you do not need to list which items were taken.',
    },
    followups: [
      { q: 'Why is it called the “0/1” knapsack?', options: ['Each item is taken whole, either 0 times or 1 time', 'Items can only weigh 0 or 1', 'Because the table holds only zeros and ones', 'The bag can hold at most one item'], answer: 0, why: 'You cannot split an item or take it twice. (If items could be split, a greedy “best value per weight” approach would work.)' },
      { q: 'Why can the greedy rule “take the best value per weight first” give a wrong answer here?', options: ['A good-looking item can block a better combination because items cannot be split', 'Greedy is always correct for knapsack', 'Greedy cannot sort the items', 'Greedy only works with negative weights'], answer: 0, why: 'For example, one big item with a slightly better ratio can leave empty space that two smaller items would have filled for more total value. The table tries both choices at every step.' },
      { q: 'What does the cell dp[i][c] mean?', options: ['The best total value using only the first i items in a bag of size c', 'The weight of item i', 'The number of items that fit in a bag of size c', 'The value of item i'], answer: 0, why: 'Every cell answers a smaller version of the whole problem, and the corner cell dp[n][W] answers the full problem.' },
      { q: 'If you double the bag size W, roughly what happens to the amount of work?', options: ['It doubles', 'It stays the same', 'It quadruples', 'It halves'], answer: 0, why: 'The table has n rows and W + 1 columns, so doubling W doubles the number of cells.' },
      { q: 'The table method is called “pseudo-polynomial”. What does that mean?', options: ['The work depends on the size of the number W, not just on how many digits it has', 'It only works for small items', 'It is an approximation', 'It uses polynomials to fill the table'], answer: 0, why: 'A bag size of 1,000,000 takes only 7 digits to write, but the table needs a million columns. So the work can grow enormously as the numbers get bigger.' },
    ],
    bug(states) {
      const cands = states.map((s, i) => i).filter(i => states[i].cur && !states[i].trace.length && states[i].cur[0] >= 1);
      if (!cands.length) return null;
      const k = cands[Math.floor(Math.random() * cands.length)], copy = structuredClone(states), s = copy[k], [i, c] = s.cur;
      const right = s.dp[i][c], wrong = right + 1;
      s.dp[i][c] = wrong;
      s.vars.find(v => v[0] === 'Cell value (the larger)')[1] = `<b>${wrong}</b>`;
      return { states: copy, wrongIndex: k, explanation: `In step ${k + 1} the caption says the cell becomes ${right}, but the table and the state panel show ${wrong}.` };
    },
    trace(states) {
      return states.map((s, i) => ({ s, i })).filter(({ s, i }) => i > 0 && s.cur && !s.trace.length && s.cur[0] >= 1).map(({ s, i }) => {
        const [r, c] = s.cur, prev = states[i - 1], it = s.items[r - 1], fits = it.w <= c, skip = prev.dp[r - 1][c];
        return { index: i, prompt: `Row ${r} adds item ${r} (weight ${it.w}, value ${it.v}). For a bag of size ${c}, what value goes in this cell? Type a number.`, answer: s.dp[r][c],
          hint: fits ? `Skipping the item keeps ${skip}. Taking it gives dp[${r - 1}][${c - it.w}] + ${it.v} = ${prev.dp[r - 1][c - it.w]} + ${it.v}. The cell holds the larger of the two.` : `The item (weight ${it.w}) does not fit in a bag of size ${c}, so the only choice is to copy the value above: ${skip}.` };
      });
    },
  };

  (window.ALGORITHMS = window.ALGORITHMS || []).push({
    id: 'knapsack',
    title: 'Knapsack (dynamic programming)',
    summary: 'Pick the most valuable items that fit in a bag, by filling a table of smaller bags. Decide at every cell: take the item or skip it?',
    mount,
    interview,
  });
})();
