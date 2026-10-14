// "Take a break": a floating button on every page that opens a small Snake game (the Python kind, it eats bugs).
// Arrow keys / WASD or swipe or the on-screen arrows to steer, Space to pause, Esc to close.
(function () {
  const N = 20, CELL = 20; // a 20 x 20 board, drawn on a 400 x 400 canvas
  const EAT = ['Bug squashed!', 'Works on my machine!', 'It’s not a bug, it’s a feature!', 'Fixed in the next release.', 'git commit -m "fixed stuff"', 'Have you tried turning it off and on again?', 'Tests are green. (Nobody checked.)', 'Compiling… just kidding. Python.'];
  const DIRS = { ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0] };

  const fab = document.createElement('button');
  fab.type = 'button'; fab.className = 'brk-fab'; fab.textContent = '☕ Take a break';
  fab.setAttribute('aria-haspopup', 'dialog');
  document.body.appendChild(fab);

  const best0 = () => { try { return +JSON.parse(localStorage.getItem('snakeBest')) || 0; } catch (e) { return 0; } };
  let best = best0(), overlay = null, timer = null, game = null, pauseIfRunning = null;
  document.addEventListener('visibilitychange', () => { if (document.hidden && pauseIfRunning) pauseIfRunning(); }); // pause when the tab is hidden

  function open() {
    if (overlay) return;
    if (typeof stopTour === 'function') stopTour(false); // a running tour would keep changing pages behind the game
    overlay = document.createElement('div');
    overlay.className = 'brk-overlay';
    overlay.innerHTML = `
      <div class="brk-dialog" role="dialog" aria-modal="true" aria-labelledby="brkTitle" tabindex="-1">
        <div class="brk-top"><h2 id="brkTitle">🐍 Python Snake</h2><button type="button" class="btn" id="brkClose" aria-label="Close the game">✕ Close</button></div>
        <div class="brk-stats"><span>Bugs eaten: <b id="brkScore">0</b></span><span>Best: <b id="brkBest">${best}</b></span></div>
        <canvas id="brkCanvas" width="${N * CELL}" height="${N * CELL}" aria-label="Snake game board"></canvas>
        <p class="brk-msg" id="brkMsg" aria-live="polite">Press an arrow key, swipe, or tap an arrow to start.</p>
        <div class="brk-pad" aria-label="Steering buttons">
          <button type="button" class="btn" data-dir="ArrowUp" aria-label="Up">↑</button>
          <button type="button" class="btn" data-dir="ArrowLeft" aria-label="Left">←</button>
          <button type="button" class="btn" data-dir="ArrowDown" aria-label="Down">↓</button>
          <button type="button" class="btn" data-dir="ArrowRight" aria-label="Right">→</button>
        </div>
        <p class="brk-hint">Arrow keys or WASD · <kbd>Space</kbd> pause · <kbd>Esc</kbd> close</p>
      </div>`;
    document.body.appendChild(overlay);
    const $ = id => overlay.querySelector('#' + id), canvas = $('brkCanvas'), ctx = canvas.getContext('2d');
    const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

    function reset() {
      game = { snake: [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }], dir: [1, 0], queue: [], bug: null, score: 0, state: 'ready', ms: 130 };
      placeBug();
      $('brkScore').textContent = 0;
      draw();
    }
    function placeBug() { // a random empty cell
      const taken = new Set(game.snake.map(p => p.y * N + p.x)), free = [];
      for (let i = 0; i < N * N; i++) if (!taken.has(i)) free.push(i);
      const i = free[Math.floor(Math.random() * free.length)];
      game.bug = { x: i % N, y: Math.floor(i / N) };
    }
    function steer(d) {
      if (game.state === 'over') return;
      const last = game.queue.length ? game.queue[game.queue.length - 1] : game.dir;
      if (d[0] === -last[0] && d[1] === -last[1]) return; // no U-turns
      if ((d[0] !== last[0] || d[1] !== last[1]) && game.queue.length < 2) game.queue.push(d);
      if (game.state === 'ready') { game.state = 'running'; $('brkMsg').textContent = 'Eat the bugs! 🐛'; loop(); }
    }
    function loop() {
      clearTimeout(timer);
      timer = setTimeout(() => { if (overlay && game.state === 'running') { step(); loop(); } }, game.ms);
    }
    function over(msg) {
      game.state = 'over'; clearTimeout(timer);
      if (game.score > best) { best = game.score; $('brkBest').textContent = best; try { localStorage.setItem('snakeBest', JSON.stringify(best)); } catch (e) { /* no storage: the best is only kept until the page reloads */ } }
      $('brkMsg').textContent = `${msg} · ${game.score} ${game.score === 1 ? 'bug' : 'bugs'} eaten. Press Space or tap Play again.`;
      showAgain();
      draw();
    }
    function step() {
      if (game.queue.length) game.dir = game.queue.shift();
      const head = game.snake[0], nx = head.x + game.dir[0], ny = head.y + game.dir[1];
      if (nx < 0 || ny < 0 || nx >= N || ny >= N) return over('IndexError: snake index out of range');
      const eating = nx === game.bug.x && ny === game.bug.y;
      const body = eating ? game.snake : game.snake.slice(0, -1); // the tail moves away unless we grow
      if (body.some(p => p.x === nx && p.y === ny)) return over('RecursionError: the snake ate itself');
      game.snake.unshift({ x: nx, y: ny });
      if (eating) {
        game.score++; $('brkScore').textContent = game.score;
        $('brkMsg').textContent = EAT[Math.floor(Math.random() * EAT.length)];
        game.ms = Math.max(70, 130 - game.score * 3);
        placeBug();
      } else game.snake.pop();
      draw();
    }
    function draw() {
      const bg = css('--bg'), line = css('--border'), green = css('--sorted');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, N * CELL, N * CELL);
      ctx.strokeStyle = line; ctx.lineWidth = 1;
      for (let i = 1; i < N; i++) { ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, N * CELL); ctx.moveTo(0, i * CELL); ctx.lineTo(N * CELL, i * CELL); ctx.stroke(); }
      ctx.font = `${CELL - 3}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('🐛', game.bug.x * CELL + CELL / 2, game.bug.y * CELL + CELL / 2 + 1);
      game.snake.forEach((p, i) => {
        ctx.fillStyle = i === 0 ? '#15803d' : i % 2 ? green : '#4ade80';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(p.x * CELL + 1, p.y * CELL + 1, CELL - 2, CELL - 2, i === 0 ? 8 : 5); else ctx.rect(p.x * CELL + 1, p.y * CELL + 1, CELL - 2, CELL - 2);
        ctx.fill();
      });
      const h = game.snake[0], [dx, dy] = game.dir, cx = h.x * CELL + CELL / 2, cy = h.y * CELL + CELL / 2; // two eyes on the head
      [-4, 4].forEach(side => {
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx + dx * 2 - dy * side, cy + dy * 2 + dx * side, 2.8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(cx + dx * 3.5 - dy * side, cy + dy * 3.5 + dx * side, 1.3, 0, Math.PI * 2); ctx.fill();
      });
      if (game.state === 'paused') { ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(0, 0, N * CELL, N * CELL); ctx.fillStyle = '#fff'; ctx.font = 'bold 28px system-ui, sans-serif'; ctx.fillText('Paused', N * CELL / 2, N * CELL / 2); }
    }
    function showAgain() {
      if (overlay.querySelector('#brkAgain')) return;
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'btn primary'; b.id = 'brkAgain'; b.textContent = 'Play again';
      b.onclick = () => { b.remove(); reset(); $('brkMsg').textContent = 'Press an arrow key, swipe, or tap an arrow to start.'; };
      overlay.querySelector('.brk-pad').after(b);
      b.focus();
    }
    function togglePause() {
      if (game.state === 'over') { const b = overlay.querySelector('#brkAgain'); if (b) b.click(); return; }
      if (game.state === 'running') { game.state = 'paused'; clearTimeout(timer); $('brkMsg').textContent = 'Paused. Press Space to continue.'; draw(); }
      else if (game.state === 'paused') { game.state = 'running'; $('brkMsg').textContent = 'Back to the bugs! 🐛'; loop(); draw(); }
    }

    // Keys are handled in the capture phase and stopped, so the step player behind the game does not also react.
    function onKey(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (key === 'Escape') { e.preventDefault(); e.stopPropagation(); return close(); }
      const isButton = e.target.tagName === 'BUTTON';
      if (DIRS[key]) { e.preventDefault(); e.stopPropagation(); steer(DIRS[key]); }
      else if (key === ' ' && !isButton) { e.preventDefault(); e.stopPropagation(); togglePause(); }
    }
    let sx = 0, sy = 0;
    canvas.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    canvas.addEventListener('touchmove', e => e.preventDefault(), { passive: false }); // keep the page from scrolling during a swipe
    canvas.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      steer(Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)]);
    });
    overlay.querySelector('.brk-pad').addEventListener('click', e => { const b = e.target.closest('[data-dir]'); if (b) steer(DIRS[b.dataset.dir]); });
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    $('brkClose').onclick = close;
    pauseIfRunning = () => { if (game && game.state === 'running') togglePause(); };
    window.addEventListener('keydown', onKey, true);
    overlay._off = () => window.removeEventListener('keydown', onKey, true);

    reset();
    overlay.querySelector('.brk-dialog').focus();
  }

  function close() {
    if (!overlay) return;
    clearTimeout(timer); overlay._off(); overlay.remove(); overlay = null; game = null; pauseIfRunning = null;
    fab.focus();
  }
  fab.onclick = open;
})();
