// Wraps the step player for "Networking Explained" topics: a video-style progress bar, a Narrate toggle
// (browser speechSynthesis, no external services) and Replay / Next topic buttons at the end.
//   const xp = createExplainer(slot, (state, i, total) => draw(state), { id: 'packets', slow: 14 });
//   xp.setStates(states);  // every state needs a `caption`
function createExplainer(slot, draw, opts = {}) {
  slot.innerHTML = `
    <div class="progress" role="progressbar" aria-label="Explainer progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="progress-fill"></div></div>
    <div class="xp-player"></div>
    <div class="xp-bar">
      <label class="narrate"><input type="checkbox"> Narrate</label>
      <span class="xp-note"></span>
    </div>
    <div class="xp-end" hidden>
      <strong>That&rsquo;s the end of this explainer.</strong>
      <button class="btn" data-act="replay">↺ Replay</button>
      <a class="btn primary" data-act="next-topic"></a>
    </div>`;
  const $ = s => slot.querySelector(s);
  const fill = $('.progress-fill'), bar = $('.progress'), endPanel = $('.xp-end'), toggle = $('.narrate input');
  const canSpeak = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  let narrating = false, token = 0, watchdog = null, player;

  function cancelSpeech() {
    token++; clearTimeout(watchdog);
    if (canSpeak) speechSynthesis.cancel();
  }
  function speak(text) {
    cancelSpeech();
    const mine = token;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    const finish = () => { // runs once per caption: when speech ends, or when the watchdog gives up on it
      if (mine !== token) return;
      token++; clearTimeout(watchdog);
      if (slot.isConnected && narrating) player.advance();
    };
    u.onend = finish;
    u.onerror = e => { if (e.error !== 'canceled' && e.error !== 'interrupted') finish(); };
    watchdog = setTimeout(finish, text.length * 90 + 5000); // some browsers never fire "end"
    speechSynthesis.speak(u);
  }

  function onState(s, i, total) {
    const pct = total > 1 ? (i / (total - 1)) * 100 : 100;
    fill.style.width = pct + '%';
    bar.setAttribute('aria-valuenow', Math.round(pct));
    endPanel.hidden = i !== total - 1;
    draw(s, i, total);
    if (narrating) speak(s.caption);
  }
  player = createStepPlayer($('.xp-player'), onState, { slow: opts.slow, noSeek: true, external: () => narrating });

  // Next topic: the following explainer in the list, or back to the topic list after the last one
  const list = window.EXPLAINERS || [], at = list.findIndex(x => x.id === opts.id), nextTopic = list[at + 1];
  const link = $('[data-act=next-topic]');
  link.href = nextTopic ? '#networking/' + nextTopic.id : '#networking';
  link.textContent = nextTopic ? 'Next topic ›' : 'All topics ›';
  $('[data-act=replay]').onclick = () => { player.goTo(0); player.play(); };

  if (!canSpeak) { toggle.disabled = true; $('.xp-note').textContent = 'Narration is not supported in this browser.'; }
  toggle.onchange = () => {
    narrating = toggle.checked;
    if (!narrating) { cancelSpeech(); player.repace(); return; }
    if (player.isPlaying()) { player.repace(); speak(player.current().caption); } else player.play(); // Narrate starts playing
  };
  // pausing should silence the voice
  $('[data-act=play]').addEventListener('click', () => { if (!player.isPlaying()) cancelSpeech(); });
  addEventListener('hashchange', cancelSpeech);

  return player;
}
