// Reusable step player. A visualization computes a list of states and hands it over:
//   const player = createStepPlayer(slotElement, (state, index, total) => draw(state), { slow: 1 });
//   player.setStates([{ caption: 'what is happening', ...anything you need to draw }, ...]);
// opts.slow stretches the time between steps for visualizations that animate between states.
// Keyboard: Space = play/pause, Left/Right arrows = step back/forward (for the newest player on the page).
let activePlayer = null;

addEventListener('keydown', e => {
  if (!activePlayer || !activePlayer.slot.isConnected || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target.matches && e.target.matches('input, select, textarea')) return; // let sliders and menus keep their keys
  const act = { ' ': 'toggle', ArrowRight: 'next', ArrowLeft: 'back' }[e.key];
  if (!act) return;
  e.preventDefault();
  if (e.target.tagName === 'BUTTON') e.target.blur(); // otherwise Space would also "click" the focused button
  activePlayer[act]();
});
// after dragging a slider, give the keyboard back to the player
addEventListener('pointerup', e => { if (e.target.matches && e.target.matches('input[type=range]')) e.target.blur(); });

function createStepPlayer(slot, onState, opts = {}) {
  slot.innerHTML = `
    <div class="player">
      <p class="caption" aria-live="polite"></p>
      <div class="player-controls">
        <button class="btn" data-act="reset">↺ Reset</button>
        <button class="btn" data-act="back">‹ Back</button>
        <button class="btn primary" data-act="play">▶ Play</button>
        <button class="btn" data-act="next">Next ›</button>
        <label class="speed">Speed <input type="range" min="1" max="10" value="5" aria-label="Speed"></label>
        <span class="step-count"></span>
      </div>
      <p class="hint">Keyboard: <kbd>Space</kbd> play / pause, <kbd>←</kbd> <kbd>→</kbd> step back / forward</p>
    </div>`;
  const $ = s => slot.querySelector(s);
  const caption = $('.caption'), count = $('.step-count'), speed = $('input'), playBtn = $('[data-act=play]');
  let states = [], i = 0, timer = null;

  const delay = () => (1200 / Math.pow(+speed.value, 1.4)) * (opts.slow || 1); // speed 1 -> 1.2 s per step, 10 -> ~50 ms

  function show() {
    const s = states[i];
    if (!s) return;
    caption.textContent = s.caption || '';
    count.textContent = `Step ${i + 1} / ${states.length}`;
    $('[data-act=reset]').disabled = $('[data-act=back]').disabled = i === 0;
    $('[data-act=next]').disabled = i === states.length - 1;
    onState(s, i, states.length);
  }
  function pause() { clearTimeout(timer); timer = null; playBtn.textContent = '▶ Play'; }
  function tick() {
    if (!slot.isConnected) return pause(); // the page was navigated away
    if (i >= states.length - 1) return pause();
    i++; show();
    timer = setTimeout(tick, delay());
  }
  function play() {
    if (i >= states.length - 1) i = 0;
    playBtn.textContent = '⏸ Pause';
    show();
    timer = setTimeout(tick, delay());
  }

  playBtn.onclick = () => (timer ? pause() : play());
  $('[data-act=next]').onclick = () => { pause(); if (i < states.length - 1) { i++; show(); } };
  $('[data-act=back]').onclick = () => { pause(); if (i > 0) { i--; show(); } };
  $('[data-act=reset]').onclick = () => { pause(); i = 0; show(); };

  activePlayer = {
    slot,
    toggle: () => playBtn.click(),
    next: () => $('[data-act=next]').click(),
    back: () => $('[data-act=back]').click(),
  };
  return { setStates(list) { pause(); states = list; i = 0; show(); } };
}
