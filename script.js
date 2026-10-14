// App shell: sidebar, hash routing, home page, theme, progress, share links and the guided tour.
// Visualizations register themselves in window.VIZ, "Networking Explained" topics in window.EXPLAINERS and
// "Complex Algorithms" pages in window.ALGORITHMS (all are { id, title, summary, mount }).
const VIZ = window.VIZ || [];
const EXPLAINERS = window.EXPLAINERS || [];
const ALGORITHMS = window.ALGORITHMS || [];
const sidebar = document.getElementById('sidebar');
const main = document.getElementById('main');
const menuBtn = document.getElementById('menuBtn');

// Saved settings (theme, finished pages). Storage can be blocked, so every access is guarded.
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* the site still works, it just forgets */ } },
};
const done = new Set(store.get('done') || []);
const systemDark = () => matchMedia('(prefers-color-scheme: dark)').matches;
const theme = () => document.documentElement.dataset.theme || (systemDark() ? 'dark' : 'light');
if (store.get('theme')) document.documentElement.dataset.theme = store.get('theme');

let current = 'home';
const contentIds = () => [...VIZ.map(v => v.id), ...EXPLAINERS.map(x => 'networking/' + x.id), ...ALGORITHMS.map(x => 'algorithms/' + x.id)];

// Sidebar: tappable category headers that open to show their pages. The category of the current page is kept open.
const openGroups = new Set();
function buildSidebar(activeId) {
  const cats = {};
  VIZ.forEach(v => (cats[v.category] = cats[v.category] || []).push({ id: v.id, title: v.title }));
  const groups = Object.entries(cats).map(([name, items]) => ({ name, items }));
  groups.push({ name: 'Networking Explained', items: [{ id: 'networking', title: 'All topics', index: true }, ...EXPLAINERS.map(x => ({ id: 'networking/' + x.id, title: x.title }))] });
  groups.push({ name: 'Complex Algorithms', items: [{ id: 'algorithms', title: 'All algorithms', index: true }, { id: 'interview', title: 'Interview mode', index: true }, ...ALGORITHMS.map(x => ({ id: 'algorithms/' + x.id, title: x.title }))] });
  const link = it => `<a href="#${it.id}"${it.id === activeId ? ' class="active" aria-current="page"' : ''}>${it.title}${done.has(it.id) ? '<span class="tick" title="Finished">✓</span>' : ''}</a>`;
  groups.forEach(g => { if (g.items.some(it => it.id === activeId)) openGroups.add(g.name); });
  const next = theme() === 'dark' ? 'light' : 'dark';
  sidebar.innerHTML = `<div class="brand"><span>O(WOW)</span><button type="button" class="theme-btn" id="themeBtn" aria-label="Switch to ${next} mode" title="Switch to ${next} mode">${next === 'dark' ? '🌙' : '☀️'}</button></div>` +
    `<a href="#home"${activeId === 'home' ? ' class="active" aria-current="page"' : ''}>Home</a>` +
    groups.map((g, i) => {
      const open = openGroups.has(g.name), content = g.items.filter(it => !it.index);
      return `<button type="button" class="cat" aria-expanded="${open}" aria-controls="grp${i}" data-group="${g.name}"><span>${g.name}</span><span class="cnt">${content.filter(it => done.has(it.id)).length}/${content.length}</span><span class="chev" aria-hidden="true">›</span></button>` +
        `<div class="sub" id="grp${i}"${open ? '' : ' hidden'}>${g.items.map(link).join('')}</div>`;
    }).join('');
}
sidebar.addEventListener('click', e => {
  if (e.target.closest('#themeBtn')) {
    const next = theme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next; store.set('theme', next);
    return buildSidebar(current);
  }
  const btn = e.target.closest('button.cat');
  if (!btn) return;
  const open = btn.getAttribute('aria-expanded') !== 'true';
  btn.setAttribute('aria-expanded', open);
  document.getElementById(btn.getAttribute('aria-controls')).hidden = !open;
  open ? openGroups.add(btn.dataset.group) : openGroups.delete(btn.dataset.group);
});

// A page counts as finished when its step player reaches the last step (pages without one fire the same event themselves).
document.addEventListener('step-finished', () => {
  if (!contentIds().includes(current) || done.has(current)) return;
  done.add(current); store.set('done', [...done]);
  buildSidebar(current);
});

// Share links: the settings of the page (sliders, menus, checkboxes, text boxes) travel in the URL as #page?id=value&...
// Random data (a shuffled array, a random graph) is not part of the link.
const controlsOnPage = () => [...main.querySelectorAll('#viz select[id], #viz input[id]')];
function applyParams(params) {
  params.forEach((value, key) => {
    const el = main.querySelector('#viz #' + CSS.escape(key));
    if (!el || !el.matches('select, input')) return;
    if (el.type === 'checkbox') el.checked = value === '1'; else el.value = value;
    el.dispatchEvent(new Event(el.type === 'range' || el.type === 'text' ? 'input' : 'change'));
  });
}
function shareLink() {
  const params = new URLSearchParams();
  controlsOnPage().forEach(el => params.set(el.id, el.type === 'checkbox' ? (el.checked ? '1' : '0') : el.value));
  return `${location.href.split('#')[0]}#${current}?${params}`;
}
main.addEventListener('click', e => {
  const btn = e.target.closest('#shareBtn');
  if (!btn) return;
  const url = shareLink();
  const ok = () => { btn.textContent = 'Link copied!'; setTimeout(() => { btn.textContent = 'Copy link'; }, 1800); };
  if (navigator.clipboard) navigator.clipboard.writeText(url).then(ok, () => prompt('Copy this link:', url));
  else prompt('Copy this link:', url);
});

// --- guided tour: plays the best pages one after another, about a minute in total ---
const TOUR = [['sorting', 8, 8], ['pathfinding', 8, 9], ['cycle', 8, 2], ['bigo', 5, 5], ['network', 9, 7],
  ['networking/dns', 9, 6], ['networking/packets', 9, 6], ['algorithms/dijkstra', 10, 2]]; // [page, seconds, player speed]
let tour = null;
const byId = id => [...VIZ, ...EXPLAINERS.map(x => ({ ...x, id: 'networking/' + x.id })), ...ALGORITHMS.map(x => ({ ...x, id: 'algorithms/' + x.id }))].find(x => x.id === id);
const el = id => document.getElementById(id);
function startTour() {
  tour = { i: 0, timer: null, pending: false };
  const bar = document.createElement('div');
  bar.className = 'tour'; bar.id = 'tourBar'; bar.setAttribute('role', 'status');
  bar.innerHTML = '<span id="tourText"></span><button type="button" class="btn" id="tourSkip">Skip ›</button><button type="button" class="btn" id="tourStop">Stop</button>';
  document.body.appendChild(bar);
  el('tourSkip').onclick = () => tourGo(tour.i + 1);
  el('tourStop').onclick = () => stopTour(false);
  tourGo(0);
}
function tourGo(i) {
  clearTimeout(tour.timer);
  if (i >= TOUR.length) return stopTour(true);
  tour.i = i; tour.pending = true;
  if (location.hash.slice(1) === TOUR[i][0]) route(); else location.hash = TOUR[i][0];
}
function tourPlay() { // the page for the current tour stop has just been drawn
  const [id, secs, speed] = TOUR[tour.i], page = byId(id);
  el('tourText').textContent = `Tour ${tour.i + 1} / ${TOUR.length}: ${page ? page.title : id}`;
  const algo = main.querySelector('#algo'), maze = main.querySelector('#maze'), spd = main.querySelector('.speed input');
  if (algo && algo.querySelector('option[value=merge]')) { algo.value = 'merge'; algo.onchange(); } // merge sort shows off the sorting page best
  if (maze) maze.click();
  if (spd) spd.value = speed;
  const play = main.querySelector('[data-act=play]');
  if (play) play.click();
  tour.timer = setTimeout(() => tourGo(tour.i + 1), secs * 1000);
}
function stopTour(finished) {
  if (!tour) return;
  clearTimeout(tour.timer); tour = null;
  const bar = el('tourBar'); if (bar) bar.remove();
  if (finished) location.hash = 'home';
}

const page = (title, summary, mount, params, extra = '') => {
  main.innerHTML = `<div class="page-head"><h1>${title}</h1><span class="page-tools">${extra}<button type="button" class="btn" id="shareBtn" title="Copy a link that keeps these settings">Copy link</button></span></div><p class="lead">${summary}</p><div id="viz"></div>`;
  mount(el('viz'));
  applyParams(params);
};
const cards = (list, prefix, tag) => list.map(x => `<a class="card" href="#${prefix}${x.id}"><span class="tag">${tag || x.category}</span><h3>${x.title}</h3><p>${x.summary}</p></a>`).join('');

function render() {
  const [id, query] = (location.hash.slice(1) || 'home').split('?'), params = new URLSearchParams(query || '');
  const viz = VIZ.find(v => v.id === id);
  const topic = EXPLAINERS.find(x => 'networking/' + x.id === id), algo = ALGORITHMS.find(x => 'algorithms/' + x.id === id);
  const interview = id === 'interview' || id.startsWith('interview/');
  current = viz || topic || algo || id === 'networking' || id === 'algorithms' ? id : interview ? 'interview' : 'home';
  buildSidebar(current);
  const top = el('topInterview'); // the Interview button in the top bar follows the page you are on
  top.href = algo ? `#interview/${algo.id}` : '#interview';
  if (interview) top.setAttribute('aria-current', 'page'); else top.removeAttribute('aria-current');
  closeMenu();
  window.scrollTo(0, 0);
  if (id === 'networking') {
    main.innerHTML = `
      <h1>Networking Explained</h1>
      <p class="lead">Short animated explainers about how the internet works, one topic at a time.</p>
      ${EXPLAINERS.length ? `<div class="cards">${cards(EXPLAINERS, 'networking/', 'Explainer')}</div>` : `<p class="empty">No topics yet. Explainers will appear here as they are added.</p>`}`;
  } else if (id === 'algorithms') {
    main.innerHTML = `
      <h1>Complex Algorithms</h1>
      <p class="lead">Step-by-step walkthroughs of harder algorithms, with the state of the program and the code visible at every step.</p>
      ${ALGORITHMS.length ? `<div class="cards">${cards(ALGORITHMS, 'algorithms/', 'Algorithm')}</div>` : `<p class="empty">No algorithms yet. They will appear here as they are added.</p>`}`;
  } else if (interview) {
    main.innerHTML = `<div class="page-head"><h1>Interview mode</h1></div><div id="viz"></div>`;
    mountInterview(el('viz'), id.split('/')[1], params, { onPass(algoId) { done.add('algorithms/' + algoId); store.set('done', [...done]); buildSidebar(current); } });
  } else if (topic) page(topic.title, topic.summary, topic.mount, params);
  else if (algo) page(algo.title, algo.summary, algo.mount, params);
  else if (viz) page(viz.title, viz.summary, viz.mount, params);
  else {
    main.innerHTML = `
      <h1>Hard ideas, one step at a time</h1>
      <p class="lead">O(WOW) turns tricky computer science concepts into interactive animations. Most pages run in a step player: press Play to watch, pause whenever you like, or step forward and back to see exactly what changes and why. The caption under the animation explains each step.</p>
      <p class="home-actions"><button type="button" class="btn primary" id="tourBtn">▶ Take the tour (about a minute)</button>
        <span class="progress-note">${done.size} of ${contentIds().length} pages finished</span></p>
      <h2>Visualizations</h2>
      <div class="cards">${cards(VIZ, '')}</div>
      <h2>Networking Explained</h2>
      <p class="lead">Short animated explainers about how the internet works. Each plays like a short video, and you can turn on Narrate to hear it read aloud. <a href="#networking">See all topics</a></p>
      <div class="cards">${cards(EXPLAINERS, 'networking/', 'Explainer')}</div>
      <h2>Complex Algorithms</h2>
      <p class="lead">Step-by-step walkthroughs of harder algorithms, with the variables and the code on screen and a mode where you predict each step. <a href="#algorithms">See all algorithms</a></p>
      <p class="home-actions"><a class="btn primary" href="#interview">🎤 Practice in Interview mode</a></p>
      <div class="cards">${cards(ALGORITHMS, 'algorithms/', 'Algorithm')}</div>
      <p class="hint">Tip: in a step player, press <kbd>Space</kbd> to play or pause and <kbd>←</kbd> <kbd>→</kbd> to step. Every page has a “Copy link” button that keeps your settings.</p>`;
    el('tourBtn').onclick = startTour;
  }
}
function route() {
  if (tour && !tour.pending) stopTour(false); // the user went somewhere else: end the tour
  render();
  if (tour && tour.pending) { tour.pending = false; tourPlay(); }
}

function closeMenu() { document.body.classList.remove('menu-open'); menuBtn.setAttribute('aria-expanded', 'false'); }
menuBtn.onclick = () => {
  const open = document.body.classList.toggle('menu-open');
  menuBtn.setAttribute('aria-expanded', open);
};
document.getElementById('scrim').onclick = closeMenu;
addEventListener('hashchange', route);
route();
