// App shell: sidebar, hash routing, home page. Visualizations register themselves in window.VIZ.
const VIZ = window.VIZ || [];
const sidebar = document.getElementById('sidebar');
const main = document.getElementById('main');
const menuBtn = document.getElementById('menuBtn');

function buildSidebar(activeId) {
  const cats = {};
  VIZ.forEach(v => (cats[v.category] = cats[v.category] || []).push(v));
  const link = (id, text) => `<a href="#${id}"${id === activeId ? ' class="active" aria-current="page"' : ''}>${text}</a>`;
  sidebar.innerHTML = `<div class="brand">CS Visualized</div>` + link('home', 'Home') +
    Object.entries(cats).map(([name, items]) =>
      `<div class="cat">${name}</div>` + items.map(v => link(v.id, v.title)).join('')).join('');
}

function route() {
  const id = location.hash.slice(1) || 'home';
  const viz = VIZ.find(v => v.id === id);
  buildSidebar(viz ? id : 'home');
  closeMenu();
  window.scrollTo(0, 0);
  if (!viz) {
    main.innerHTML = `
      <h1>Hard ideas, one step at a time</h1>
      <p class="lead">CS Visualized turns tricky computer science concepts into interactive animations. Most visualizations run in a step player: press Play to watch it run, pause whenever you like, or step forward and back to see exactly what changes and why. The caption under the animation explains each step.</p>
      <h2>Pick a topic</h2>
      <div class="cards">${VIZ.map(v => `<a class="card" href="#${v.id}"><span class="tag">${v.category}</span><h3>${v.title}</h3><p>${v.summary}</p></a>`).join('')}</div>
      <p class="hint">Tip: in a step player, press <kbd>Space</kbd> to play or pause and <kbd>←</kbd> <kbd>→</kbd> to step.</p>`;
    return;
  }
  main.innerHTML = `<h1>${viz.title}</h1><p class="lead">${viz.summary}</p><div id="viz"></div>`;
  viz.mount(document.getElementById('viz'));
}

function closeMenu() { document.body.classList.remove('menu-open'); menuBtn.setAttribute('aria-expanded', 'false'); }
menuBtn.onclick = () => {
  const open = document.body.classList.toggle('menu-open');
  menuBtn.setAttribute('aria-expanded', open);
};
document.getElementById('scrim').onclick = closeMenu;
addEventListener('hashchange', route);
route();
