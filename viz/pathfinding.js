// Pathfinding visualization: BFS, DFS and Dijkstra on a grid, played by the step player.
// A state is { kind: Uint8Array per cell (0 empty, 1 visited, 2 frontier, 3 path, 4 current), caption, visited, pathLen, quiz? }.
// Race mode combines two searches into { race: true, a, b, caption }.
(function () {
  const ALGOS = {
    bfs: { name: 'Breadth-first search (BFS)', blurb: 'Explores outward in rings, nearest cells first, using a queue. It always finds a shortest path.' },
    dfs: { name: 'Depth-first search (DFS)', blurb: 'Dives as deep as it can down one route before backing up, using a stack. It finds a path, but not necessarily the shortest one.' },
    dijkstra: { name: "Dijkstra's algorithm", blurb: 'Always expands the cell with the smallest known distance from the start. Every step here costs 1, so it explores in the same order as BFS; it only pulls ahead once cells have different costs.' },
  };
  const KIND = ['', 'visited', 'frontier', 'path', 'current'];
  const SHORT = { bfs: 'BFS', dfs: 'DFS', dijkstra: 'Dijkstra' };

  function mount(root) {
    const R = 15, C = matchMedia('(max-width: 800px)').matches ? 19 : 31, N = R * C; // both odd, for the maze
    const idx = (r, c) => r * C + c;
    let walls = new Uint8Array(N), start = idx(7, 3), end = idx(7, C - 4);

    root.innerHTML = `
      <div class="controls">
        <label>Algorithm
          <select id="algo">${Object.entries(ALGOS).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('')}</select>
        </label>
        <button class="btn" id="maze">Random maze</button>
        <button class="btn" id="clear">Clear walls</button>
        <label class="check"><input id="race" type="checkbox"> Race two algorithms</label>
        <label id="algoBBox" hidden>Algorithm B
          <select id="algoB">${Object.entries(ALGOS).map(([k, v]) => `<option value="${k}"${k === 'dfs' ? ' selected' : ''}>${v.name}</option>`).join('')}</select>
        </label>
      </div>
      <p class="blurb" id="blurb"></p>
      <p class="blurb">Click and drag on the grid to draw walls (start on a wall to erase). Drag the green start or the red end to move them.</p>
      <div class="stats" id="stats"></div>
      <div class="grids" id="grids">
        <div><div class="stage-title" id="gtA" hidden></div><div class="grid" id="grid" style="--cols:${C}" role="img" aria-label="Pathfinding grid"></div></div>
        <div id="box2" hidden><div class="stage-title" id="gtB"></div><div class="grid" id="grid2" style="--cols:${C}" role="img" aria-label="Second pathfinding grid"></div></div>
      </div>
      <ul class="legend">
        <li><i class="sw start"></i>Start</li><li><i class="sw end"></i>End</li><li><i class="sw wall"></i>Wall</li>
        <li><i class="sw frontier"></i>Frontier</li><li><i class="sw current"></i>Being visited</li>
        <li><i class="sw visited"></i>Visited</li><li><i class="sw path"></i>Path</li>
      </ul>
      <div id="player"></div>`;
    const $ = id => root.querySelector('#' + id);
    const grid = $('grid');
    grid.innerHTML = Array.from({ length: N }, (_, i) => `<div class="cell" data-i="${i}"></div>`).join('');
    const cells = grid.children, grid2 = $('grid2');
    grid2.innerHTML = grid.innerHTML;
    const cells2 = grid2.children;

    function neighbors(i) { // up, right, down, left
      const r = (i / C) | 0, c = i % C, out = [];
      if (r > 0) out.push(i - C);
      if (c < C - 1) out.push(i + 1);
      if (r < R - 1) out.push(i + C);
      if (c > 0) out.push(i - 1);
      return out.filter(n => !walls[n]);
    }
    const where = i => `row ${((i / C) | 0) + 1}, col ${(i % C) + 1}`;

    function search(algo) {
      const visited = new Uint8Array(N), found = new Uint8Array(N), parent = new Int32Array(N).fill(-1);
      const frontier = [{ c: start, p: -1, d: 0 }], states = [];
      let count = 0;
      found[start] = 1;
      const snap = (caption, cur = -1, path = [], pathLen, quiz) => {
        const kind = new Uint8Array(N);
        frontier.forEach(e => { kind[e.c] = 2; });
        for (let i = 0; i < N; i++) if (visited[i]) kind[i] = 1;
        if (cur >= 0) kind[cur] = 4;
        path.forEach(i => { kind[i] = 3; });
        states.push({ kind, caption, visited: count, pathLen, quiz });
      };
      snap('Ready. Green is the start and red is the goal. The “frontier” is the set of cells we know about but have not visited yet. Press Play, or step one cell at a time.');

      while (frontier.length) {
        let pick = 0; // BFS: front of the queue
        if (algo === 'dfs') pick = frontier.length - 1; // stack: most recent
        else if (algo === 'dijkstra') frontier.forEach((e, k) => { if (e.d < frontier[pick].d) pick = k; });
        const { c, p, d } = frontier.splice(pick, 1)[0];
        if (visited[c]) continue; // DFS can queue a cell twice
        visited[c] = 1; parent[c] = p; count++;
        if (c === end) break;
        const before = frontier.length;
        const next = neighbors(c).filter(n => !visited[n]);
        if (algo === 'dfs') next.reverse(); // so "up" is explored first
        for (const n of next) {
          if (algo !== 'dfs') { if (found[n]) continue; found[n] = 1; }
          frontier.push({ c: n, p: c, d: d + 1 });
        }
        const added = frontier.length - before;
        snap(`Visit ${where(c)}${algo === 'dijkstra' ? ` (distance ${d})` : ''}. ${added} new cell${added === 1 ? '' : 's'} join${added === 1 ? 's' : ''} the frontier (next in line to be visited).`, c, [], undefined,
          { q: `Next the search visits ${where(c)}. How many new cells will join the frontier?`, options: [0, 1, 2, 3, ...(added > 3 ? [4] : [])].map(String), answer: added });
      }

      if (!visited[end]) { snap(`No path exists: the end is walled off. ${count} cells were visited.`, -1, [], 'none'); return states; }
      const path = [];
      for (let i = end; i !== -1; i = parent[i]) path.unshift(i);
      for (let k = 1; k <= path.length; k++) snap(`The goal is reached! Tracing the route back to the start… ${k - 1} step${k === 2 ? '' : 's'} so far.`, -1, path.slice(0, k));
      const steps = path.length - 1;
      snap(algo === 'dfs'
        ? `Path found: ${steps} steps. DFS does not guarantee this is the shortest path; try BFS to compare.`
        : `Shortest path found: ${steps} steps, after visiting ${count} cells.`, -1, path, steps);
      return states;
    }

    function paint(list, st) {
      for (let i = 0; i < N; i++) {
        list[i].className = 'cell ' + (walls[i] ? 'wall' : i === start ? 'start' : i === end ? 'end' : KIND[st.kind[i]]);
      }
    }
    const len = st => (st.pathLen === undefined ? '–' : st.pathLen);
    function draw(state) {
      if (state.race) {
        paint(cells, state.a); paint(cells2, state.b);
        $('stats').innerHTML = `<span>${SHORT[$('algo').value]}: visited <b>${state.a.visited}</b>, path <b>${len(state.a)}</b></span><span>${SHORT[$('algoB').value]}: visited <b>${state.b.visited}</b>, path <b>${len(state.b)}</b></span>`;
      } else {
        paint(cells, state);
        $('stats').innerHTML = `<span>Cells visited: <b>${state.visited}</b></span><span>Path length: <b>${len(state)}</b></span>`;
      }
    }

    const player = createStepPlayer($('player'), draw);
    const run = () => {
      const race = $('race').checked, a = $('algo').value, b = $('algoB').value;
      $('algoBBox').hidden = $('box2').hidden = !race;
      $('gtA').hidden = !race; $('gtA').textContent = `A: ${ALGOS[a].name}`; $('gtB').textContent = `B: ${ALGOS[b].name}`;
      $('grids').classList.toggle('race', race);
      $('blurb').textContent = race ? 'Both searches get the same walls and take one step per tick. Edit the walls on the first grid; the second follows.' : ALGOS[a].blurb;
      if (!race) return player.setStates(search(a));
      const A = search(a), B = search(b), n = Math.max(A.length, B.length);
      const states = Array.from({ length: n }, (_, k) => {
        const sa = A[Math.min(k, A.length - 1)], sb = B[Math.min(k, B.length - 1)];
        return { race: true, a: sa, b: sb, caption: `${SHORT[a]}: ${k < A.length ? sa.caption : 'finished.'}\n${SHORT[b]}: ${k < B.length ? sb.caption : 'finished.'}` };
      });
      const ea = A[A.length - 1], eb = B[B.length - 1], say = (n, s) => `${n}: ${s.pathLen === 'none' ? 'no path' : `a path of ${s.pathLen} steps`} after visiting ${s.visited} cells`;
      states[n - 1].caption = `${say(SHORT[a], ea)}. ${say(SHORT[b], eb)}. ${A.length === B.length ? 'They took the same number of steps.' : `${SHORT[A.length < B.length ? a : b]} finished first.`}`;
      player.setStates(states);
    };
    $('algo').onchange = $('algoB').onchange = $('race').onchange = run;

    // drag to draw walls, erase walls, or move the start / end
    let drag = null;
    const cellAt = (x, y) => {
      const el = document.elementFromPoint(x, y);
      return el && grid.contains(el) && el.dataset.i !== undefined ? +el.dataset.i : -1;
    };
    function apply(i) {
      if (drag === 'start' || drag === 'end') {
        if (i === start || i === end) return;
        walls[i] = 0;
        if (drag === 'start') start = i; else end = i;
      } else if (i === start || i === end || walls[i] === (drag === 'wall' ? 1 : 0)) return;
      else walls[i] = drag === 'wall' ? 1 : 0;
      run();
    }
    grid.onpointerdown = e => {
      const i = cellAt(e.clientX, e.clientY);
      if (i < 0) return;
      e.preventDefault();
      grid.setPointerCapture(e.pointerId);
      drag = i === start ? 'start' : i === end ? 'end' : walls[i] ? 'erase' : 'wall';
      apply(i);
    };
    grid.onpointermove = e => { if (drag) { const i = cellAt(e.clientX, e.clientY); if (i >= 0) apply(i); } };
    grid.onpointerup = grid.onpointercancel = () => { drag = null; };

    $('clear').onclick = () => { walls = new Uint8Array(N); run(); };
    $('maze').onclick = () => { // random depth-first maze, then a few extra gaps so there are several routes
      walls.fill(1);
      walls[idx(1, 1)] = 0;
      const stack = [[1, 1]];
      while (stack.length) {
        const [r, c] = stack[stack.length - 1];
        const opts = [[-2, 0], [0, 2], [2, 0], [0, -2]].filter(([dr, dc]) => {
          const nr = r + dr, nc = c + dc;
          return nr > 0 && nr < R - 1 && nc > 0 && nc < C - 1 && walls[idx(nr, nc)];
        });
        if (!opts.length) { stack.pop(); continue; }
        const [dr, dc] = opts[(Math.random() * opts.length) | 0];
        walls[idx(r + dr / 2, c + dc / 2)] = 0; walls[idx(r + dr, c + dc)] = 0;
        stack.push([r + dr, c + dc]);
      }
      for (let r = 1; r < R - 1; r++) for (let c = 1; c < C - 1; c++) if (Math.random() < 0.06) walls[idx(r, c)] = 0;
      start = idx(1, 1); end = idx(R - 2, C - 2);
      run();
    };

    $('blurb').textContent = ALGOS.bfs.blurb;
    run();
  }

  (window.VIZ = window.VIZ || []).push({
    id: 'pathfinding',
    category: 'Algorithms',
    title: 'Pathfinding on a grid',
    summary: 'Draw walls, move the start and end, and watch BFS, DFS and Dijkstra search for a route.',
    mount,
  });
})();
