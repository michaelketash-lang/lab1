// Reusable step player. A visualization computes a list of states and hands it over:
//   const player = createStepPlayer(slotElement, (state, index, total) => draw(state), { slow: 1 });
//   player.setStates([{ caption: 'what is happening', ...anything you need to draw }, ...]);
// A state may also have link: { href, text }, shown as "Learn more" under the caption.
// opts.slow stretches the time between steps for visualizations that animate between states.
// opts.external() -> true means something else (narration) decides when to advance: call player.advance() then.
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
      <p class="learn" hidden></p>
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
  const caption = $('.caption'), learn = $('.learn'), count = $('.step-count'), speed = $('input'), playBtn = $('[data-act=play]');
  let states = [], i = 0, timer = null, playing = false;

  const delay = () => (1200 / Math.pow(+speed.value, 1.4)) * (opts.slow || 1); // speed 1 -> 1.2 s per step, 10 -> ~50 ms

  function show() {
    const s = states[i];
    if (!s) return;
    caption.textContent = s.caption || '';
    learn.hidden = !s.link; // optional { href, text } shown under the caption
    learn.innerHTML = s.link ? `Learn more: <a href="${s.link.href}">${s.link.text}</a>` : '';
    count.textContent = `Step ${i + 1} / ${states.length}`;
    $('[data-act=reset]').disabled = $('[data-act=back]').disabled = i === 0;
    $('[data-act=next]').disabled = i === states.length - 1;
    onState(s, i, states.length);
  }
  const last = () => states.length - 1;
  function pause() { clearTimeout(timer); timer = null; playing = false; playBtn.textContent = '▶ Play'; }
  function schedule() { clearTimeout(timer); timer = opts.external && opts.external() ? null : setTimeout(advance, delay()); }
  function advance() {
    if (!playing) return;
    if (!slot.isConnected || i >= last()) return pause(); // the page was navigated away, or we are at the end
    i++; show();
    if (i >= last()) pause(); else schedule();
  }
  function play() {
    if (i >= last()) i = 0;
    playing = true;
    playBtn.textContent = '⏸ Pause';
    show();
    schedule();
  }

  playBtn.onclick = () => (playing ? pause() : play());
  $('[data-act=next]').onclick = () => { pause(); if (i < states.length - 1) { i++; show(); } };
  $('[data-act=back]').onclick = () => { pause(); if (i > 0) { i--; show(); } };
  $('[data-act=reset]').onclick = () => { pause(); i = 0; show(); };

  activePlayer = {
    slot,
    toggle: () => playBtn.click(),
    next: () => $('[data-act=next]').click(),
    back: () => $('[data-act=back]').click(),
  };
  return {
    setStates(list) { pause(); states = list; i = 0; show(); },
    goTo(n) { i = Math.max(0, Math.min(last(), n)); show(); },
    play() { if (!playing) play(); },
    advance, // used when narration decides the pace
    repace() { if (playing) schedule(); },
    isPlaying: () => playing,
    current: () => states[i],
  };
}
