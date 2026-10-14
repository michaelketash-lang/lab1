// App shell: sidebar, hash routing, home page. Visualizations register themselves in window.VIZ,
// "Networking Explained" topics in window.EXPLAINERS and "Complex Algorithms" pages in window.ALGORITHMS
// (both are { id, title, summary, mount }).
const VIZ = window.VIZ || [];
const EXPLAINERS = window.EXPLAINERS || [];
const ALGORITHMS = window.ALGORITHMS || [];
const sidebar = document.getElementById('sidebar');
const main = document.getElementById('main');
const menuBtn = document.getElementById('menuBtn');

// Sidebar: tappable category headers that open to show their pages. The category of the current page is kept open.
const openGroups = new Set();
function buildSidebar(activeId) {
  const cats = {};
  VIZ.forEach(v => (cats[v.category] = cats[v.category] || []).push({ id: v.id, title: v.title }));
  const groups = Object.entries(cats).map(([name, items]) => ({ name, items }));
  groups.push({ name: 'Networking Explained', items: [{ id: 'networking', title: 'All topics' }, ...EXPLAINERS.map(x => ({ id: 'networking/' + x.id, title: x.title }))] });
  groups.push({ name: 'Complex Algorithms', items: [{ id: 'algorithms', title: 'All algorithms' }, ...ALGORITHMS.map(x => ({ id: 'algorithms/' + x.id, title: x.title }))] });
  const link = it => `<a href="#${it.id}"${it.id === activeId ? ' class="active" aria-current="page"' : ''}>${it.title}</a>`;
  groups.forEach(g => { if (g.items.some(it => it.id === activeId)) openGroups.add(g.name); });
  sidebar.innerHTML = `<div class="brand">CS Visualized</div><a href="#home"${activeId === 'home' ? ' class="active" aria-current="page"' : ''}>Home</a>` +
    groups.map((g, i) => {
      const open = openGroups.has(g.name);
      return `<button type="button" class="cat" aria-expanded="${open}" aria-controls="grp${i}" data-group="${g.name}"><span>${g.name}</span><span class="chev" aria-hidden="true">›</span></button>` +
        `<div class="sub" id="grp${i}"${open ? '' : ' hidden'}>${g.items.map(link).join('')}</div>`;
    }).join('');
}
sidebar.addEventListener('click', e => {
  const btn = e.target.closest('button.cat');
  if (!btn) return;
  const open = btn.getAttribute('aria-expanded') !== 'true';
  btn.setAttribute('aria-expanded', open);
  document.getElementById(btn.getAttribute('aria-controls')).hidden = !open;
  open ? openGroups.add(btn.dataset.group) : openGroups.delete(btn.dataset.group);
});

function route() {
  const id = location.hash.slice(1) || 'home';
  const viz = VIZ.find(v => v.id === id);
  const topic = EXPLAINERS.find(x => 'networking/' + x.id === id) || ALGORITHMS.find(x => 'algorithms/' + x.id === id);
  buildSidebar(viz || topic || id === 'networking' || id === 'algorithms' ? id : 'home');
  closeMenu();
  window.scrollTo(0, 0);
  if (id === 'networking') {
    main.innerHTML = `
      <h1>Networking Explained</h1>
      <p class="lead">Short animated explainers about how the internet works, one topic at a time.</p>
      ${EXPLAINERS.length
        ? `<div class="cards">${EXPLAINERS.map(x => `<a class="card" href="#networking/${x.id}"><span class="tag">Explainer</span><h3>${x.title}</h3><p>${x.summary}</p></a>`).join('')}</div>`
        : `<p class="empty">No topics yet. Explainers will appear here as they are added.</p>`}`;
    return;
  }
  if (id === 'algorithms') {
    main.innerHTML = `
      <h1>Complex Algorithms</h1>
      <p class="lead">Step-by-step walkthroughs of harder algorithms, with the state of the program and the code visible at every step.</p>
      ${ALGORITHMS.length
        ? `<div class="cards">${ALGORITHMS.map(x => `<a class="card" href="#algorithms/${x.id}"><span class="tag">Algorithm</span><h3>${x.title}</h3><p>${x.summary}</p></a>`).join('')}</div>`
        : `<p class="empty">No algorithms yet. They will appear here as they are added.</p>`}`;
    return;
  }
  if (topic) {
    main.innerHTML = `<h1>${topic.title}</h1><p class="lead">${topic.summary}</p><div id="viz"></div>`;
    topic.mount(document.getElementById('viz'));
    return;
  }
  if (!viz) {
    main.innerHTML = `
      <h1>Hard ideas, one step at a time</h1>
      <p class="lead">CS Visualized turns tricky computer science concepts into interactive animations. Most visualizations run in a step player: press Play to watch it run, pause whenever you like, or step forward and back to see exactly what changes and why. The caption under the animation explains each step.</p>
      <h2>Visualizations</h2>
      <div class="cards">${VIZ.map(v => `<a class="card" href="#${v.id}"><span class="tag">${v.category}</span><h3>${v.title}</h3><p>${v.summary}</p></a>`).join('')}</div>
      <h2>Networking Explained</h2>
      <p class="lead">Short animated explainers about how the internet works. Each plays like a short video, and you can turn on Narrate to hear it read aloud. <a href="#networking">See all topics</a></p>
      <div class="cards">${EXPLAINERS.map(x => `<a class="card" href="#networking/${x.id}"><span class="tag">Explainer</span><h3>${x.title}</h3><p>${x.summary}</p></a>`).join('')}</div>
      <h2>Complex Algorithms</h2>
      <p class="lead">Step-by-step walkthroughs of harder algorithms. <a href="#algorithms">See all algorithms</a></p>
      <div class="cards">${ALGORITHMS.length
        ? ALGORITHMS.map(x => `<a class="card" href="#algorithms/${x.id}"><span class="tag">Algorithm</span><h3>${x.title}</h3><p>${x.summary}</p></a>`).join('')
        : `<a class="card" href="#algorithms"><span class="tag">Section</span><h3>Complex Algorithms</h3><p>Harder algorithms, one step at a time. Coming soon.</p></a>`}</div>
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
