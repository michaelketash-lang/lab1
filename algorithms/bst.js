// Binary search tree: inserting keys one by one, then deleting a leaf, a node with one child, or a node with two children.
(function () {
  const CODE = [
    'insert(value):',
    '    if the tree is empty: value becomes the root',
    '    node = root',
    '    repeat: if value < node.key go left, otherwise go right',
    '    when that child is missing: put the new node there',
    'delete(key):  find the node (the same walk as insert), then:',
    '    no children:   just remove it',
    '    one child:     replace it with that child',
    '    two children:  copy the smallest key of its right subtree into it,',
    '                   then delete that smaller node from the right subtree',
  ];

  function build(inputs) {
    const rand = algoRng(inputs.seed), n = inputs.n;
    const pool = Array.from({ length: 99 }, (_, i) => i + 1);
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const vals = pool.slice(0, n);
    let root = null, comps = 0, count = 0, uid = 0;
    const states = [];
    const clone = t => t && { id: t.id, k: t.k, l: clone(t.l), r: clone(t.r) };
    const height = t => (t ? 1 + Math.max(height(t.l), height(t.r)) : 0);
    const inorder = t => (t ? [...inorder(t.l), t.k, ...inorder(t.r)] : []);
    const snap = (caption, line, o = {}) => states.push({ caption, line, quiz: o.quiz, tree: clone(root), cur: o.cur ?? null, path: o.path || [], added: o.added ?? null, target: o.target ?? null, succ: o.succ ?? null,
      vars: [['Operation', o.op || '—'], ['Current node', o.curKey ?? '—'], ['Comparisons so far', comps], ['Nodes in the tree', count], ['Tree height', height(root)]] });

    snap(`A binary search tree keeps smaller keys on the left of every node and bigger keys on the right. That lets a search throw away half of the remaining tree at every step. We will insert ${n} keys one by one (${vals.join(', ')}), then delete one.`, []);

    vals.forEach(v => {
      const op = `insert(${v})`, nn = { id: ++uid, k: v, l: null, r: null };
      if (!root) { root = nn; count++; snap(`The tree is empty, so ${v} becomes the root.`, [1], { op, added: nn.id, curKey: v }); return; }
      let node = root;
      const path = [];
      for (;;) {
        comps++; path.push(node.id);
        const left = v < node.k, dir = left ? 'left' : 'right', child = left ? node.l : node.r;
        const quiz = { q: `Insert ${v}: compare it with ${node.k}. Which way does ${v} go?`, options: ['Left (smaller)', 'Right (bigger)'], answer: left ? 0 : 1 };
        if (child) {
          snap(`Insert ${v}: compare with ${node.k}. ${v} is ${left ? 'smaller' : 'bigger'}, so it belongs in the ${dir} subtree. Every key on the other side is ${left ? 'bigger' : 'smaller'} than ${node.k}, so we can ignore that whole side. Go to the ${dir} child, ${child.k}.`, [2, 3], { op, cur: node.id, curKey: node.k, path: path.slice(), quiz });
          node = child;
        } else {
          if (left) node.l = nn; else node.r = nn;
          count++;
          snap(`Insert ${v}: compare with ${node.k}. ${v} is ${left ? 'smaller' : 'bigger'}, so it goes ${dir}, and there is nothing there yet. ${v} becomes the new ${dir} child of ${node.k}.`, [3, 4], { op, cur: node.id, curKey: node.k, path: path.slice(), added: nn.id, quiz });
          break;
        }
      }
    });

    // pick a node to delete, according to the chosen case
    const nodes = [];
    (function walk(t) { if (t) { walk(t.l); nodes.push(t); walk(t.r); } })(root);
    const kids = t => (t.l ? 1 : 0) + (t.r ? 1 : 0), want = { leaf: 0, one: 1, two: 2 }[inputs.del];
    const cands = want === undefined ? [] : nodes.filter(t => kids(t) === want && !(t === root && want === 0));
    if (want === undefined) { snap(`All ${n} keys are in. Reading the tree from left to right gives the keys in sorted order: ${inorder(root).join(', ')}. That is what makes a binary search tree useful.`, []); return states; }
    if (!cands.length) { snap(`All ${n} keys are in, but no node in this tree has ${['no children', 'exactly one child', 'two children'][want]}, so there is nothing to delete for that case. Try “Random keys” or another case.`, []); return states; }

    const t = cands[Math.floor(rand() * cands.length)], op = `delete(${t.k})`;
    let node = root, parent = null;
    const path = [];
    while (node !== t) {
      comps++; path.push(node.id);
      const left = t.k < node.k;
      snap(`Delete ${t.k}: first find it. Compare with ${node.k}: ${t.k} is ${left ? 'smaller' : 'bigger'}, so go ${left ? 'left' : 'right'}.`, [5, 3], { op, cur: node.id, curKey: node.k, path: path.slice(), target: t.id });
      parent = node; node = left ? node.l : node.r;
    }
    comps++;
    const replaceInParent = child => { if (!parent) root = child; else if (parent.l === t) parent.l = child; else parent.r = child; };
    if (want === 0) {
      snap(`Found ${t.k}. It has no children (it is a leaf), so there is nothing to repair: we can simply cut it off.`, [6], { op, cur: t.id, curKey: t.k, target: t.id, path: path.concat(t.id) });
      replaceInParent(null); count--;
      snap(`${t.k} is gone. The rest of the tree is untouched, and the ordering rule still holds.`, [6], { op });
    } else if (want === 1) {
      const c = t.l || t.r;
      snap(`Found ${t.k}. It has just one child, ${c.k}. Everything in that child's subtree is already on the correct side of ${t.k}'s parent, so the child can simply take its parent's place.`, [7], { op, cur: t.id, curKey: t.k, target: t.id, path: path.concat(t.id) });
      replaceInParent(c); count--;
      snap(`${c.k} (with everything below it) now hangs where ${t.k} used to be. The ordering rule still holds.`, [7], { op });
    } else {
      const rightKeys = inorder(t.r), shuffle = a => a.slice().sort(() => rand() - 0.5);
      // the answer plus other keys as distractors: first from the right subtree, then from the rest of the tree
      const pick = shuffle([rightKeys[0], ...shuffle(rightKeys.slice(1)), ...shuffle(inorder(root).filter(k => !rightKeys.includes(k)))].slice(0, 3));
      let s = t.r, sp = t;
      snap(`Found ${t.k}. It has two children, so we cannot just remove it: both subtrees would lose their parent. Instead we replace its key with the next bigger key in the tree, the in-order successor. That is the smallest key in the right subtree: go to the right child, ${s.k}, then keep going left as far as possible.`, [8], {
        op, cur: s.id, curKey: s.k, target: t.id, path: path.concat(t.id, s.id), quiz: { q: `${t.k} has two children. Which key in its right subtree will replace it?`, options: pick.map(String), answer: pick.indexOf(rightKeys[0]) } });
      const walkPath = path.concat(t.id, s.id);
      while (s.l) {
        sp = s; s = s.l; walkPath.push(s.id);
        snap(`${sp.k} has a smaller key to its left, ${s.k}, so go left again.`, [8], { op, cur: s.id, curKey: s.k, target: t.id, path: walkPath.slice() });
      }
      snap(`${s.k} has no left child, so it is the smallest key in the right subtree: the in-order successor. Copy ${s.k} into the node that held ${t.k}. It is the next bigger key, so everything on the left is still smaller and everything on the right is still bigger.`, [8], { op, cur: s.id, curKey: s.k, succ: s.id, target: t.id, path: walkPath.slice() });
      const old = t.k; t.k = s.k;
      snap(`The node now holds ${t.k}, but the original ${s.k} is still in the tree further down. We must remove that copy.`, [9], { op, cur: t.id, curKey: t.k, succ: s.id, target: t.id });
      if (sp === t) t.r = s.r; else sp.l = s.r;
      count--;
      snap(`The successor node had no left child, so deleting it is easy: its right child (if any) takes its place. ${old} has been removed and the tree is still ordered.`, [9], { op });
    }
    snap(`Done. Reading the tree from left to right still gives sorted keys: ${inorder(root).join(', ')}.`, []);
    return states;
  }

  function draw(el, s) {
    const pos = {};
    let i = 0;
    (function place(t, d) { if (!t) return; place(t.l, d + 1); pos[t.id] = { x: i++, y: d }; place(t.r, d + 1); })(s.tree, 0);
    const ids = Object.keys(pos), W = Math.max(ids.length, 5) * 54 + 20, H = (ids.length ? Math.max(...ids.map(k => pos[k].y)) : 0) * 70 + 80;
    const P = id => ({ x: 36 + pos[id].x * 54, y: 36 + pos[id].y * 70 });
    const edges = [], nodes = [];
    (function walk(t) {
      if (!t) return;
      [t.l, t.r].forEach(c => { if (c) { const a = P(t.id), b = P(c.id); edges.push(`<line class="bedge" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`); } });
      const q = P(t.id), cls = 'bnode' + (t.id === s.added ? ' added' : '') + (t.id === s.target ? ' target' : '') + (t.id === s.succ ? ' succ' : '') + (t.id === s.cur ? ' cur' : '') + (s.path.includes(t.id) ? ' path' : '');
      nodes.push(`<g class="${cls}"><circle cx="${q.x}" cy="${q.y}" r="22"/><text x="${q.x}" y="${q.y + 6}">${t.k}</text></g>`);
      walk(t.l); walk(t.r);
    })(s.tree);
    el.innerHTML = `<svg class="bst" viewBox="0 0 ${W} ${H}" style="max-width:${W}px" role="img" aria-label="Binary search tree">${s.tree ? edges.join('') + nodes.join('') : '<text x="20" y="40" class="blank">The tree is empty</text>'}</svg>` +
      `<ul class="legend"><li><i class="sw cur"></i>Node being compared</li><li><i class="sw queued"></i>Path walked</li><li><i class="sw done"></i>New node</li><li><i class="sw end"></i>Node being deleted</li><li><i class="sw tree"></i>Successor</li></ul>`;
  }

  const SPEC = {
      problem: 'How do you keep a collection of numbers so that you can look things up, add and remove them quickly, without scanning everything? A binary search tree stores each key in a node with smaller keys to its left and bigger keys to its right, so every comparison throws away half of what is left. The tricky part is removing a node without breaking that rule, which depends on how many children it has.',
      code: CODE,
      controls: [
        { id: 'n', type: 'range', label: 'Number of keys', min: 5, max: 9, value: 7 },
        { id: 'del', type: 'select', label: 'Then', value: 'two', options: [['none', 'no deletion'], ['leaf', 'delete a leaf'], ['one', 'delete a node with one child'], ['two', 'delete a node with two children']] },
        { id: 'seed', type: 'button', label: 'Random keys', value: 99, action: (inputs, set) => set('seed', 1 + Math.floor(Math.random() * 1e9)) },
      ],
      build, draw,
  };
  function mount(root) { createAlgoPage(root, SPEC); }


  const interview = {
    spec: SPEC,
    inputs: () => ({ n: 6 + Math.floor(Math.random() * 3), del: ['leaf', 'one', 'two'][Math.floor(Math.random() * 3)], seed: 1 + Math.floor(Math.random() * 1e9) }),
    orderWhy: 'Insert starts by handling the empty tree, then walks down from the root choosing left or right by comparing keys, and only attaches the new node when the walk reaches a missing child. Delete first finds the node, then handles the three cases by how many children it has.',
    complexity: {
      time: { q: 'How long do search, insert and delete take in a binary search tree with n keys?', answer: 'O(log n) on average, but O(n) in the worst case', options: ['O(log n) on average, but O(n) in the worst case', 'O(1) always', 'O(n) always', 'O(n log n)'] },
      space: { q: 'How much memory does a binary search tree with n keys use?', answer: 'O(n)', options: ['O(n)', 'O(log n)', 'O(1)', 'O(n²)'] },
      why: 'Each operation walks one path from the root, so the cost is the height of the tree. A well-balanced tree has height about log n, but keys inserted in sorted order make a long chain of height n. Each key is stored in exactly one node.',
    },
    followups: [
      { q: 'You read a binary search tree from left to right (in-order). What do you get?', options: ['The keys in sorted order', 'The keys in the order they were inserted', 'The keys in random order', 'Only the leaves'], answer: 0, why: 'Everything on the left is smaller and everything on the right is bigger, at every node, so reading left-subtree, node, right-subtree always gives sorted keys.' },
      { q: 'You insert the keys 1, 2, 3, 4, 5 in that order. What does the tree look like?', options: ['A chain of height 5', 'A perfectly balanced tree', 'A tree with only left children', 'A tree of height 3'], answer: 0, why: 'Each new key is bigger than everything so far, so it always goes to the right of the last node. Searching it takes as long as scanning a list.' },
      { q: 'When deleting a node with two children, why do we use the in-order successor?', options: ['It is the next bigger key, so it fits between the left and right subtrees without breaking the order', 'It is always a leaf', 'It is the smallest key in the whole tree', 'It is the parent of the node'], answer: 0, why: 'The successor is bigger than everything in the left subtree and smaller than everything else in the right subtree, so it can take the deleted node’s place.' },
      { q: 'About how many comparisons does a search need in a well-balanced tree of 1,000,000 keys?', options: ['About 20', 'About 1,000', 'About 500,000', 'About 1,000,000'], answer: 0, why: 'Each comparison throws away half of the remaining keys, and 2^20 is just over a million.' },
      { q: 'Which kind of tree fixes the sorted-input problem by rebalancing itself?', options: ['An AVL tree or a red-black tree', 'A linked list', 'A stack', 'A plain array'], answer: 0, why: 'Self-balancing trees rotate nodes after inserts and deletes so the height stays around log n, whatever the order of the keys.' },
    ],
    bug(states) {
      const order = states.map((s, i) => i).filter(i => states[i].added !== null && states[i].cur !== null).sort(() => Math.random() - 0.5);
      for (const k of order) {
        const copy = structuredClone(states), s = copy[k];
        const find = (t, id) => (t ? (t.id === id ? t : find(t.l, id) || find(t.r, id)) : null);
        const parent = find(s.tree, s.cur);
        if (!parent) continue;
        const wasLeft = parent.l && parent.l.id === s.added, child = wasLeft ? parent.l : parent.r;
        if (!child || (wasLeft ? parent.r : parent.l)) continue; // the other side is occupied
        if (wasLeft) { parent.r = child; parent.l = null; } else { parent.l = child; parent.r = null; }
        return { states: copy, wrongIndex: k, explanation: `In step ${k + 1} the caption says ${child.k} goes to the ${wasLeft ? 'left' : 'right'} of ${parent.k}, because it is ${wasLeft ? 'smaller' : 'bigger'}. The tree shows it on the ${wasLeft ? 'right' : 'left'}, which breaks the rule of a binary search tree.` };
      }
      return null;
    },
  };

  (window.ALGORITHMS = window.ALGORITHMS || []).push({
    id: 'bst',
    title: 'Binary search tree',
    summary: 'Insert keys into a tree, then delete a leaf, a node with one child, or a node with two children, and see how the ordering rule is kept.',
    mount,
    interview,
  });
})();
