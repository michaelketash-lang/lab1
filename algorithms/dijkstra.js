// Dijkstra's shortest paths on a small weighted graph, on the shared algorithm page layout.
(function () {
  const CODE = [
    'dist[start] = 0, dist[every other node] = ∞',
    'queue = [start]',
    'while queue is not empty:',
    '    u = remove the node with the smallest dist',
    '    mark u as done',
    '    for each neighbor v of u that is not done:',
    '        if dist[u] + weight(u, v) < dist[v]:',
    '            dist[v] = dist[u] + weight(u, v)',
    '            put v in the queue (or move it up)',
    'return dist',
  ];
  const NAME = i => String.fromCharCode(65 + i);
  const show = d => (d === Infinity ? '∞' : d);

  function rng(seed) { // small seeded random numbers, so the same size and seed give the same graph
    return () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function makeGraph(n, seed) {
    const rand = rng(seed), edges = [], has = (a, b) => edges.some(e => (e.a === a && e.b === b) || (e.a === b && e.b === a));
    const add = (a, b) => edges.push({ a, b, w: 1 + Math.floor(rand() * 9) });
    for (let i = 0; i < n; i++) add(i, (i + 1) % n); // a ring keeps every node reachable
    for (let k = 0, tries = 0; k < Math.floor(n / 2) + 1 && tries < 50; tries++) {
      const a = Math.floor(rand() * n), b = Math.floor(rand() * n);
      if (a !== b && !has(a, b)) { add(a, b); k++; }
    }
    const pos = Array.from({ length: n }, (_, i) => { const t = -Math.PI / 2 + (2 * Math.PI * i) / n; return { x: 300 + 220 * Math.cos(t), y: 200 + 140 * Math.sin(t), t }; });
    return { n, edges, pos };
  }

  function build(inputs) {
    const g = makeGraph(inputs.n, inputs.seed), n = g.n;
    const dist = Array(n).fill(Infinity), parent = Array(n).fill(-1), done = Array(n).fill(false);
    const queue = []; // node ids waiting to be finished
    let checks = 0, cur = null;
    const states = [];
    const byDist = () => queue.slice().sort((a, b) => dist[a] - dist[b] || a - b);
    const snap = (caption, line, o = {}) => {
      const vars = [
        ['Current node u', cur === null ? '—' : `<b>${NAME(cur)}</b>`, o.hotVars === 'cur'],
        ['dist', dist.map((d, i) => `<span class="chip${done[i] ? ' done' : ''}">${NAME(i)} = ${show(d)}</span>`).join(' '), o.hotVars === 'dist'],
        ['Queue (smallest first)', queue.length ? byDist().map(i => `<span class="chip">${NAME(i)} (${show(dist[i])})</span>`).join(' ') : 'empty', o.hotVars === 'queue'],
        ['Done', done.some(Boolean) ? done.map((d, i) => (d ? NAME(i) : '')).join(' ') : '—', false],
        ['Edges checked', checks, o.hotVars === 'checks'],
      ];
      states.push({ caption, line, vars, quiz: o.quiz, g, dist: dist.slice(), parent: parent.slice(), done: done.slice(), queue: queue.slice(), cur, edge: o.edge || null, updated: !!o.updated, final: !!o.final });
    };

    dist[0] = 0; queue.push(0);
    snap('We start at A. The distance from A to itself is 0. We know nothing about the other nodes yet, so we call their distance ∞ (infinity) until we find a route to them. The queue holds the nodes we have discovered but not finished: for now just A.', [0, 1], { hotVars: 'dist' });

    while (queue.length) {
      const order = byDist(), u = order[0], others = order.slice(1);
      queue.splice(queue.indexOf(u), 1);
      done[u] = true; cur = u;
      let quiz;
      if (others.length) {
        const opts = [u, ...others.slice(0, 3)].sort((a, b) => a - b);
        quiz = { q: 'Which node will be taken out of the queue next?', options: opts.map(NAME), answer: opts.indexOf(u) };
      }
      snap(`Take the node with the smallest distance out of the queue: ${NAME(u)}, at distance ${dist[u]}. Why is ${NAME(u)} safe to finish? Any other route to it would have to pass through a node that is at least as far away, and weights are never negative, so no shorter route to ${NAME(u)} can turn up later. Its distance is now final.`, [3, 4], { quiz, hotVars: 'cur' });
      g.edges.filter(e => e.a === u || e.b === u).forEach(e => {
        const v = e.a === u ? e.b : e.a;
        if (done[v]) return; // already final, nothing to improve
        checks++;
        const nd = dist[u] + e.w, old = dist[v], better = nd < old;
        if (better) {
          dist[v] = nd; parent[v] = u;
          if (!queue.includes(v)) queue.push(v);
        }
        snap(better
          ? `Look at the edge ${NAME(u)}–${NAME(v)} (weight ${e.w}). Going to ${NAME(v)} through ${NAME(u)} costs ${dist[u]} + ${e.w} = ${nd}, ${old === Infinity ? `and we had no route to ${NAME(v)} yet` : `which beats the ${old} we knew about`}. A cheaper route is always worth keeping, so dist[${NAME(v)}] becomes ${nd} and ${NAME(v)} goes into the queue.`
          : `Look at the edge ${NAME(u)}–${NAME(v)} (weight ${e.w}). Going to ${NAME(v)} through ${NAME(u)} would cost ${dist[u]} + ${e.w} = ${nd}, which is no better than the ${old} we already have. We keep the old route: a longer way will never be useful.`,
        better ? [5, 6, 7, 8] : [5, 6], {
          edge: [u, v], updated: better, hotVars: better ? 'dist' : 'checks',
          quiz: { q: `Edge ${NAME(u)}–${NAME(v)} (weight ${e.w}): will dist[${NAME(v)}] get smaller?`, options: ['Yes, update it', 'No, keep the old value'], answer: better ? 0 : 1 },
        });
      });
    }
    cur = null;
    snap(`The queue is empty, so every node is done and every distance is final. The green edges form the shortest-path tree: following them back from any node leads to A by the cheapest route. We checked ${checks} edges in total.`, [9], { final: true, hotVars: 'dist' });
    return states;
  }

  function draw(el, s) {
    const g = s.g;
    const isTree = e => s.parent[e.b] === e.a || s.parent[e.a] === e.b;
    const edges = g.edges.map(e => {
      const p = g.pos[e.a], q = g.pos[e.b];
      const active = s.edge && ((s.edge[0] === e.a && s.edge[1] === e.b) || (s.edge[0] === e.b && s.edge[1] === e.a));
      const cls = 'gedge' + (active ? (s.updated ? ' updated' : ' active') : isTree(e) ? (s.final ? ' final' : ' tree') : '');
      return `<line class="${cls}" x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}"/><g class="gw"><rect x="${(p.x + q.x) / 2 - 11}" y="${(p.y + q.y) / 2 - 11}" width="22" height="22" rx="6"/><text x="${(p.x + q.x) / 2}" y="${(p.y + q.y) / 2 + 5}">${e.w}</text></g>`;
    }).join('');
    const nodes = g.pos.map((p, i) => {
      const cls = 'gnode' + (s.cur === i ? ' cur' : s.done[i] ? ' done' : s.queue.includes(i) ? ' queued' : '');
      const lx = p.x + Math.cos(p.t) * 40, ly = p.y + Math.sin(p.t) * 38;
      return `<g class="${cls}"><circle cx="${p.x}" cy="${p.y}" r="22"/><text class="nl" x="${p.x}" y="${p.y + 6}">${NAME(i)}</text></g>` +
        `<text class="gd${s.dist[i] === Infinity ? ' inf' : ''}" x="${lx}" y="${ly + 5}">${show(s.dist[i])}</text>`;
    }).join('');
    el.innerHTML = `<svg class="graph" viewBox="0 0 600 400" role="img" aria-label="Weighted graph with the current shortest distance next to every node">${edges}${nodes}</svg>
      <ul class="legend"><li><i class="sw cur"></i>Being finished</li><li><i class="sw queued"></i>In the queue</li><li><i class="sw done"></i>Done</li><li><i class="sw tree"></i>Best route so far</li><li><i class="sw updated"></i>Just improved</li></ul>`;
  }

  const SPEC = {
      problem: 'You have a map of places joined by roads, and every road has a cost, such as minutes of driving. What is the cheapest way to get from one place to every other place? Navigation apps, network routers and game AI all need to answer this quickly. Dijkstra’s algorithm does it by always finishing the nearest unfinished place first, so every distance it announces is guaranteed to be the shortest.',
      code: CODE,
      controls: [
        { id: 'n', type: 'range', label: 'Number of nodes', min: 5, max: 9, value: 6 },
        { id: 'seed', type: 'button', label: 'Randomize graph', value: 12345, action: (inputs, set) => set('seed', 1 + Math.floor(Math.random() * 1e9)) },
      ],
      build, draw,
  };
  function mount(root) { createAlgoPage(root, SPEC); }


  // Interview mode: questions, and the two things the engine cannot derive by itself (a corrupted replay, hand-trace questions).
  const interview = {
    spec: SPEC,
    inputs: () => ({ n: 6 + Math.floor(Math.random() * 3), seed: 1 + Math.floor(Math.random() * 1e9) }),
    orderWhy: 'Dijkstra needs its set-up first (distance 0 for the start, ∞ for everything else) before the loop can pick “the node with the smallest distance”. Inside the loop, a node must be marked done before its neighbors are relaxed, and an edge is only updated after the comparison says it is shorter.',
    complexity: {
      time: { q: 'With a binary-heap priority queue, how long does Dijkstra take on a graph with V nodes and E edges?', answer: 'O((V + E) log V)', options: ['O((V + E) log V)', 'O(V + E)', 'O(V · E)', 'O(log V)'] },
      space: { q: 'Not counting the graph itself, how much extra memory does Dijkstra need?', answer: 'O(V)', options: ['O(V)', 'O(1)', 'O(V²)', 'O(log V)'] },
      why: 'Each edge can cause one queue update that costs about log V, and each node leaves the queue once. The distance table, the queue and the parent pointers each hold at most one entry per node.',
    },
    followups: [
      { q: 'Why does Dijkstra’s algorithm fail when some edges have negative weights?', options: ['It may finish a node too early: a later negative edge could have made a shorter route', 'It runs out of memory', 'Computers cannot store negative numbers', 'It still works, only more slowly'], answer: 0, why: 'Dijkstra finishes the nearest node first because no later route can be shorter. A negative edge breaks that promise. (Bellman-Ford is the algorithm for graphs with negative weights.)' },
      { q: 'Which data structure lets Dijkstra pick the node with the smallest distance quickly?', options: ['A priority queue (min-heap)', 'A stack', 'A hash set', 'A sorted array that is rebuilt at every step'], answer: 0, why: 'A priority queue always hands back its smallest item, and updating or adding an item costs only about log V.' },
      { q: 'If every edge has weight 1, which simpler algorithm finds the same shortest distances?', options: ['Breadth-first search (BFS)', 'Depth-first search (DFS)', 'Bubble sort', 'Binary search'], answer: 0, why: 'BFS explores in rings: all nodes 1 step away, then 2 steps away, and so on. With equal weights that is exactly the order Dijkstra visits them.' },
      { q: 'Besides the distances, what can Dijkstra tell you about each node?', options: ['The previous node on its shortest route (a shortest-path tree)', 'Its minimum spanning tree', 'A sorted list of all weights', 'Whether the graph has a cycle'], answer: 0, why: 'Every time a distance improves we remember which node it came from. Following those parents back from any node spells out its shortest route.' },
      { q: 'What happens to a node that cannot be reached from the start?', options: ['Its distance stays at ∞', 'Its distance becomes 0', 'The algorithm crashes', 'Its distance becomes negative'], answer: 0, why: 'Nothing ever improves its distance, so it keeps the starting value ∞, which is the honest answer: there is no route.' },
    ],
    bug(states) {
      const cands = states.map((s, i) => i).filter(i => states[i].updated && states[i].edge);
      if (!cands.length) return null;
      const k = cands[Math.floor(Math.random() * cands.length)], copy = structuredClone(states), s = copy[k], v = s.edge[1];
      const right = s.dist[v], wrong = right + 2;
      s.dist[v] = wrong;
      s.vars[1][1] = s.vars[1][1].replace(`${NAME(v)} = ${right}</span>`, `${NAME(v)} = ${wrong}</span>`);
      return { states: copy, wrongIndex: k, explanation: `In step ${k + 1} the caption says dist[${NAME(v)}] becomes ${right}, but the graph and the state panel show ${wrong}. The correct value is the shorter route the caption calculates.` };
    },
    trace(states) {
      return states.map((s, i) => ({ s, i })).filter(({ s, i }) => i > 0 && s.edge).map(({ s, i }) => {
        const [u, v] = s.edge, prev = states[i - 1], e = s.g.edges.find(x => (x.a === u && x.b === v) || (x.a === v && x.b === u));
        return { index: i, prompt: `Dijkstra now looks at the edge ${NAME(u)}–${NAME(v)}. After this step, what is dist[${NAME(v)}]? Type a number.`, answer: s.dist[v],
          hint: `dist[${NAME(u)}] is ${prev.dist[u]} and the edge costs ${e.w}, while dist[${NAME(v)}] is currently ${show(prev.dist[v])}. Keep whichever is smaller.` };
      });
    },
  };

  (window.ALGORITHMS = window.ALGORITHMS || []).push({
    id: 'dijkstra',
    title: 'Dijkstra’s shortest paths',
    summary: 'Find the cheapest route from one node to all others, always finishing the nearest unfinished node first. Watch the distances, the queue and the pseudocode, and try to predict each step.',
    mount,
    interview,
  });
})();
