// Union-Find (disjoint sets) with path compression and union by size, drawn as a forest.
(function () {
  const CODE = [
    'find(x): follow parent[x] upwards until x is its own parent  (the root)',
    '    path compression: point every node we passed straight at the root',
    'union(a, b):',
    '    ra = find(a);  rb = find(b)',
    '    if ra == rb:  they are already in the same group, nothing to do',
    '    else:  attach the smaller group\'s root under the larger group\'s root',
  ];

  function build(inputs) {
    const n = inputs.n, rand = algoRng(inputs.seed);
    const ops = [];
    while (ops.length < 7) { // random pairs of different elements
      const a = Math.floor(rand() * n), b = Math.floor(rand() * n);
      if (a !== b) ops.push([a, b]);
    }
    const parent = Array.from({ length: n }, (_, i) => i), size = Array(n).fill(1);
    const groups = () => parent.filter((p, i) => p === i).length;
    const states = [];
    const snap = (caption, line, o = {}) => states.push({ caption, line, quiz: o.quiz, n, parent: parent.slice(), path: o.path || [], root: o.root ?? null, linked: o.linked || null,
      vars: [['Operation', o.op || '—'], ['parent', parent.map((p, i) => `<span class="chip${p === i ? ' done' : ''}">${i}→${p}</span>`).join(' '), o.hot === 'parent'],
        ['size (roots only)', parent.map((p, i) => (p === i ? `<span class="chip">${i}: ${size[i]}</span>` : '')).join(' '), o.hot === 'size'], ['Groups', groups(), o.hot === 'groups'], ['Roots found', o.roots || '—', o.hot === 'roots']] });
    const find = x => { const path = [x]; while (parent[x] !== x) { x = parent[x]; path.push(x); } return path; };

    snap(`Union-Find keeps track of which elements belong to the same group. Every element starts alone, as its own group and its own root: parent[i] = i. We will run ${ops.length} union operations that merge groups. Each group is stored as a tree, and the root of the tree names the group.`, [], { hot: 'groups' });

    ops.forEach(([a, b], k) => {
      const op = `union(${a}, ${b})`, label = `${k + 1}. ${op}`;
      const finds = [a, b].map((x, idx) => {
        const path = find(x), r = path[path.length - 1], needs = path.length > 2;
        snap(`${label}: are ${a} and ${b} in the same group? To find out, follow parent pointers from ${x} upwards: ${path.join(' → ')}. ${path.length === 1 ? `${x} is its own parent, so it is a root.` : `The last node, ${r}, is its own parent: it is the root.`}`, [2, 3, 0], { path, root: r, op: label, roots: `root of ${x} = ${r}`, hot: 'roots' });
        if (needs) {
          path.slice(0, -1).forEach(p => { parent[p] = r; });
          snap(`Path compression: every node we passed now points straight at the root ${r}. The next find for any of them takes just one step, which keeps the trees very flat.`, [1], { path, root: r, op: label, hot: 'parent' });
        }
        return r;
      });
      const [ra, rb] = finds;
      if (ra === rb) { snap(`Both have root ${ra}, so ${a} and ${b} are already in the same group. Nothing to do.`, [4], { op: label, root: ra, roots: `${ra} and ${rb}` }); return; }
      const big = size[ra] >= size[rb] ? ra : rb, small = big === ra ? rb : ra;
      const quiz = { q: `${op}: the roots are ${ra} (a group of ${size[ra]}) and ${rb} (a group of ${size[rb]}). Which root becomes the parent of the other?`, options: [`${ra}`, `${rb}`], answer: big === ra ? 0 : 1 };
      parent[small] = big; size[big] += size[small];
      snap(`The roots differ (${ra} and ${rb}), so the two groups are merged. The smaller group's root (${small}, ${size[small]} ${size[small] === 1 ? 'element' : 'elements'}) is attached under the larger group's root (${big}). Putting the small tree under the big one keeps the trees short, so finds stay fast.`, [5], { op: label, linked: [small, big], root: big, roots: `${ra} and ${rb}`, hot: 'size', quiz });
    });
    snap(`Done. ${groups()} group${groups() === 1 ? '' : 's'} remain. Elements in the same tree are connected, and any two of them have the same root. With path compression and union by size, each operation is almost constant time.`, [], { hot: 'groups' });
    return states;
  }

  function draw(el, s) {
    const n = s.n, kids = Array.from({ length: n }, () => []);
    s.parent.forEach((p, i) => { if (p !== i) kids[p].push(i); });
    const pos = {};
    let leaf = 0;
    const place = (x, depth) => {
      if (!kids[x].length) pos[x] = { x: leaf++, y: depth };
      else { kids[x].forEach(k => place(k, depth + 1)); const xs = kids[x].map(k => pos[k].x); pos[x] = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: depth }; }
    };
    s.parent.forEach((p, i) => { if (p === i) place(i, 0); });
    const maxDepth = Math.max(...Object.values(pos).map(p => p.y)), W = Math.max(leaf, 4) * 66 + 20, H = maxDepth * 80 + 90;
    const P = i => ({ x: 40 + pos[i].x * 66, y: 40 + pos[i].y * 80 });
    const edges = s.parent.map((p, i) => {
      if (p === i) return '';
      const a = P(i), b = P(p), isNew = s.linked && s.linked[0] === i;
      return `<line class="uedge${isNew ? ' new' : ''}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" marker-end="url(#uarrow)"/>`;
    }).join('');
    const nodes = s.parent.map((p, i) => {
      const q = P(i), cls = 'unode' + (p === i ? ' root' : '') + (s.path.includes(i) ? ' path' : '') + (i === s.root ? ' found' : '');
      return `<g class="${cls}"><circle cx="${q.x}" cy="${q.y}" r="22"/><text x="${q.x}" y="${q.y + 6}">${i}</text></g>`;
    }).join('');
    el.innerHTML = `<svg class="forest" viewBox="0 0 ${W} ${H}" style="max-width:${W}px" role="img" aria-label="Groups drawn as trees, with arrows pointing from each element to its parent"><defs><marker id="uarrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="11" markerHeight="11" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0L10 5L0 10z" class="head"/></marker></defs>${edges}${nodes}</svg>` +
      `<ul class="legend"><li><i class="sw done"></i>Root (names the group)</li><li><i class="sw cur"></i>Node being followed</li><li><i class="sw updated"></i>Root found</li></ul>`;
  }

  const SPEC = {
      problem: 'Many problems ask “are these two things connected?”, for example whether two computers are on the same network, whether two pixels belong to the same blob, or whether adding a road would create a loop. Union-Find answers it almost instantly. It keeps every group as a tree, so finding a group’s name means walking up to the root, and merging two groups means hanging one tree under the other.',
      code: CODE,
      controls: [
        { id: 'n', type: 'range', label: 'Number of elements', min: 6, max: 10, value: 8 },
        { id: 'seed', type: 'button', label: 'Random unions', value: 4242, action: (inputs, set) => set('seed', 1 + Math.floor(Math.random() * 1e9)) },
      ],
      build, draw,
  };
  function mount(root) { createAlgoPage(root, SPEC); }


  const interview = {
    spec: SPEC,
    inputs: () => ({ n: 7 + Math.floor(Math.random() * 3), seed: 1 + Math.floor(Math.random() * 1e9) }),
    orderWhy: 'find must be defined before union can use it. Inside union, you first find both roots, then check whether they are equal, and only when they differ do you attach one root under the other.',
    complexity: {
      time: { q: 'With path compression and union by size, how long does one find or union take, roughly?', answer: 'Almost constant (inverse Ackermann, α(n))', options: ['Almost constant (inverse Ackermann, α(n))', 'O(n)', 'O(n²)', 'O(n log n)'] },
      space: { q: 'How much memory does Union-Find need for n elements?', answer: 'O(n)', options: ['O(n)', 'O(1)', 'O(n²)', 'O(log n)'] },
      why: 'Union by size keeps trees shallow and path compression flattens them further, so the trees are almost always only one or two levels deep. The structure is just two arrays of length n: the parents and the sizes.',
    },
    followups: [
      { q: 'Why do we attach the smaller tree under the bigger one?', options: ['It keeps the trees shallow, so finds stay fast', 'It makes the numbers smaller', 'It saves memory in the parent array', 'It is required for the code to compile'], answer: 0, why: 'Hanging a big tree under a small one makes the big tree one level taller for all its members. Doing it the other way round barely changes any depth.' },
      { q: 'What does path compression do?', options: ['After a find, it points every node on the path straight at the root', 'It deletes the nodes on the path', 'It sorts the parent array', 'It joins the two largest groups'], answer: 0, why: 'We already walked the whole path once, so we might as well make it a one-step path for next time.' },
      { q: 'Which question can Union-Find answer very quickly?', options: ['Are x and y in the same group?', 'What is the shortest path between x and y?', 'What is the largest element in the group?', 'Which elements are neighbors of x?'], answer: 0, why: 'Two elements are in the same group exactly when find gives them the same root. It does not remember paths or neighbors.' },
      { q: 'Can the standard Union-Find split a group back into two?', options: ['No, it only merges groups', 'Yes, with a split(x) operation in constant time', 'Yes, by deleting the root', 'Only if the group has two elements'], answer: 0, why: 'Merging only rewrites one root pointer, but nothing records how a group was formed, so there is nothing to undo cheaply.' },
      { q: 'Kruskal’s algorithm for a minimum spanning tree uses Union-Find. What for?', options: ['To check whether adding an edge would create a cycle', 'To sort the edges', 'To find the shortest path', 'To count the edges'], answer: 0, why: 'If both ends of an edge already have the same root, they are already connected, and adding the edge would close a loop, so Kruskal skips it.' },
    ],
    bug(states) {
      const cands = states.map((s, i) => i).filter(i => states[i].linked);
      if (!cands.length) return null;
      const k = cands[Math.floor(Math.random() * cands.length)], copy = structuredClone(states), s = copy[k], [small, big] = s.linked;
      s.parent[small] = small; s.parent[big] = small; s.linked = [big, small];
      s.vars[1][1] = s.parent.map((p, i) => `<span class="chip${p === i ? ' done' : ''}">${i}→${p}</span>`).join(' ');
      return { states: copy, wrongIndex: k, explanation: `In step ${k + 1} the smaller group's root (${small}) should be attached under the bigger group's root (${big}), as the caption says. The picture shows ${big} hanging under ${small}, the wrong way round.` };
    },
  };

  (window.ALGORITHMS = window.ALGORITHMS || []).push({
    id: 'union-find',
    title: 'Union-Find',
    summary: 'Merge groups and ask whether two elements are connected, using trees, path compression and union by size.',
    mount,
    interview,
  });
})();
