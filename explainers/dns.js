// "DNS": a browser asks a resolver, which asks root, TLD and authoritative servers for an IP address.
// The second visit is answered from the resolver's cache.
// A state is { caption, from, to, label, kind, hl, name, flash, bCache, rCache, msgs, visit }.
(function () {
  const NAME = 'www.example.com', IP = '93.184.216.34';
  const NODE = {
    browser: { x: 80, y: 190, t: 'Browser', s: 'wants the IP address' },
    resolver: { x: 285, y: 190, t: 'Resolver', s: 'does the searching' },
    root: { x: 520, y: 45, t: 'Root server', s: 'points to .com' },
    tld: { x: 520, y: 190, t: '.com server', s: 'points to example.com' },
    auth: { x: 520, y: 335, t: 'example.com', s: 'has the real answer' },
  };
  const BW = 130, BH = 56;
  const EDGES = [['browser', 'resolver'], ['resolver', 'root'], ['resolver', 'tld'], ['resolver', 'auth']];
  const CACHE = { browser: { x: 80, y: 292 }, resolver: { x: 285, y: 292 } }; // cache boxes under the nodes
  const FILLED = [NAME, `→ ${IP}`, 'TTL: 5 min'];

  function build() {
    const states = [];
    let cur = { from: null, to: null, label: '', kind: 'q', hl: [], name: null, flash: null, bCache: null, rCache: null, msgs: 0, visit: 1 };
    const snap = (caption, o = {}) => { cur = { ...cur, flash: null, from: null, to: null, label: '', ...o, caption }; states.push(cur); };
    const msg = (from, to, label, kind, caption, o = {}) => snap(caption, { from, to, label, kind, hl: [from, to], msgs: cur.msgs + 1, ...o });

    snap(`Computers find each other with numbers called IP addresses, but people use names like ${NAME}. DNS, the Domain Name System, is the internet’s phone book that turns names into numbers. Let’s watch one lookup, first with nothing remembered, then a second time.`, { bCache: [], rCache: [] });
    snap('First visit. Before asking anyone, the browser checks its own cache: a small notebook of recent lookups. It has never visited this site, so the notebook has no entry. That is called a cache miss.', { flash: 'browser:miss', hl: ['browser'] });
    msg('browser', 'resolver', `${NAME}?`, 'q', 'The browser asks the resolver: “What is the IP address of www.example.com?” The resolver is a helper, usually run by your internet provider or a public service such as 8.8.8.8, that does the searching for you.');
    snap('The resolver checks its own cache too, and finds nothing. So it has to work its way down the DNS hierarchy: a chain of servers that each know one piece of the answer. It reads the name from right to left, starting with the very end, the root.', { flash: 'resolver:miss', hl: ['resolver'], name: 'root' });
    msg('resolver', 'root', `${NAME}?`, 'q', 'First it asks a root server. The whole world has only 13 sets of root servers, and every resolver already knows where they are.', { name: 'root' });
    msg('root', 'resolver', 'Ask .com servers', 'ref', 'The root server does not know the IP address, but it knows who is in charge of .com. It sends back a referral: “Ask the .com servers.”', { name: 'root' });
    msg('resolver', 'tld', `${NAME}?`, 'q', 'The resolver asks a .com server. These are called top-level domain (TLD) servers.', { name: 'tld' });
    msg('tld', 'resolver', 'Ask ns1.example.com', 'ref', 'The .com server does not know the IP address either, but it knows which server is in charge of example.com, so it refers the resolver there.', { name: 'tld' });
    msg('resolver', 'auth', `${NAME}?`, 'q', 'The resolver asks that server, the authoritative server for example.com.', { name: 'auth' });
    msg('auth', 'resolver', IP, 'ans', `The authoritative server holds the real records for example.com, so it finally gives the answer: ${IP}. It also gives a TTL (time to live) of 5 minutes, which says how long the answer may be remembered.`, { name: 'auth' });
    snap('The resolver saves the answer in its cache until the TTL runs out.', { flash: 'resolver:store', rCache: FILLED, hl: ['resolver'] });
    msg('resolver', 'browser', IP, 'ans', 'The resolver sends the IP address back to the browser.');
    snap(`The browser saves the answer in its own cache too, and can now connect to ${IP}. Finding the address took ${cur.msgs} messages and visited four different servers.`, { flash: 'browser:store', bCache: FILLED, hl: ['browser'], name: null });

    snap('Later, another visit. Say the browser’s own cache is empty (it was cleared, or a different person on the same network is asking). The resolver’s cache, however, still has the answer. If the browser’s cache did still have it, the browser would not even need to ask.', { flash: 'browser:miss', bCache: [], msgs: 0, visit: 2, hl: ['browser'] });
    msg('browser', 'resolver', `${NAME}?`, 'q', 'The browser asks the resolver the same question.');
    snap('The resolver looks in its cache and finds the answer there: a cache hit! It does not need to bother the root, TLD or authoritative servers at all.', { flash: 'resolver:hit', hl: ['resolver'] });
    msg('resolver', 'browser', IP, 'ans', 'It answers straight away.');
    snap(`Same answer, but ${cur.msgs} messages instead of 8, and much faster. Thanks to caching, most lookups never reach the root, TLD or authoritative servers. When an entry’s TTL runs out it is thrown away, which is how changes to a website’s address slowly spread around the world.`, { flash: 'browser:store', bCache: FILLED, hl: [] });
    states[states.length - 1].link = { href: '#networking/tcp-udp', text: 'TCP vs UDP: what the browser does next, once it has the address' };
    return states;
  }

  function mount(root) {
    const nodes = Object.entries(NODE).map(([k, n]) => `
      <g class="dnode" id="dn-${k}"><rect x="${n.x - BW / 2}" y="${n.y - BH / 2}" width="${BW}" height="${BH}" rx="10"/>
        <text class="ntitle" x="${n.x}" y="${n.y - 5}">${n.t}</text><text class="nsub" x="${n.x}" y="${n.y + 15}">${n.s}</text></g>`).join('');
    const wires = EDGES.map(([a, b]) => `<line class="dwire" x1="${NODE[a].x}" y1="${NODE[a].y}" x2="${NODE[b].x}" y2="${NODE[b].y}"/>`).join('');
    const caches = Object.entries(CACHE).map(([k, c]) => `
      <g class="dcache" id="dc-${k}"><rect x="${c.x - 75}" y="${c.y - 32}" width="150" height="68" rx="8"/>
        <text class="ctag" x="${c.x}" y="${c.y - 16}">${k} cache</text><text class="cl1" x="${c.x}" y="${c.y - 1}"></text><text class="cl2" x="${c.x}" y="${c.y + 14}"></text><text class="cl3" x="${c.x}" y="${c.y + 29}"></text></g>`).join('');
    root.innerHTML = `
      <div class="dname" id="dname" aria-label="www.example.com, read from right to left">
        <span><b data-k="host">www</b><i>host</i></span><span class="dot">.</span>
        <span><b data-k="auth">example</b><i>domain</i></span><span class="dot">.</span>
        <span><b data-k="tld">com</b><i>TLD</i></span><span class="dot"><b data-k="root">.</b><i>root</i></span>
      </div>
      <div class="stats"><span id="dvisit"></span><span>Messages this visit: <b id="dmsgs">0</b></span></div>
      <div class="stage-card"><svg class="dns" id="dns" viewBox="0 0 600 380" role="img" aria-label="A browser, a resolver and the root, TLD and authoritative DNS servers exchanging messages">
        ${wires}${nodes}${caches}
        <g class="dchip" id="dchip"><rect height="24" rx="12" y="-12"/><text y="4"></text></g>
      </svg></div>
      <div id="xp"></div>`;
    const $ = id => root.querySelector('#' + id);
    const chip = $('dchip'), pill = chip.querySelector('rect'), pillText = chip.querySelector('text');

    function edge(a, b) { // where the chip leaves or enters a node's box
      const dx = NODE[b].x - NODE[a].x, dy = NODE[b].y - NODE[a].y;
      const t = Math.min((BW / 2 + 8) / Math.abs(dx || 1e-9), (BH / 2 + 8) / Math.abs(dy || 1e-9));
      return { x: NODE[a].x + dx * t, y: NODE[a].y + dy * t };
    }
    function draw(s) {
      Object.keys(NODE).forEach(k => $('dn-' + k).classList.toggle('active', s.hl.includes(k)));
      $('dvisit').textContent = `Visit ${s.visit} of 2`;
      $('dmsgs').textContent = s.msgs;
      root.querySelectorAll('#dname [data-k]').forEach(el => el.classList.toggle('on', el.dataset.k === s.name));
      ['browser', 'resolver'].forEach(k => {
        const g = $('dc-' + k), lines = s[k === 'browser' ? 'bCache' : 'rCache'] || [];
        g.querySelector('.cl1').textContent = lines[0] || 'empty';
        g.querySelector('.cl2').textContent = lines[1] || '';
        g.querySelector('.cl3').textContent = lines[2] || '';
        g.setAttribute('class', 'dcache' + (s.flash && s.flash.startsWith(k + ':') ? ' ' + s.flash.split(':')[1] : ''));
      });
      chip.setAttribute('class', 'dchip ' + s.kind);
      if (!s.from) { chip.style.opacity = 0; return; }
      const w = s.label.length * 7.2 + 24;
      let a = edge(s.from, s.to), b = edge(s.to, s.from);
      const len = Math.hypot(b.x - a.x, b.y - a.y), ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
      const sh = Math.min((w / 2 + 4) / Math.max(Math.abs(ux), 0.3), len * 0.42); // keep the pill beside the boxes
      a = { x: a.x + ux * sh, y: a.y + uy * sh }; b = { x: b.x - ux * sh, y: b.y - uy * sh };
      pill.setAttribute('x', -w / 2); pill.setAttribute('width', w);
      pillText.textContent = s.label;
      chip.style.transition = 'none'; // jump to the sender, then glide to the receiver
      chip.style.opacity = 1;
      chip.style.transform = `translate(${a.x}px, ${a.y}px)`;
      void chip.getBoundingClientRect();
      chip.style.transition = 'transform .6s ease-in-out';
      chip.style.transform = `translate(${b.x}px, ${b.y}px)`;
    }
    createExplainer($('xp'), draw, { id: 'dns', slow: 14 }).setStates(build());
  }

  (window.EXPLAINERS = window.EXPLAINERS || []).push({
    id: 'dns',
    title: 'DNS',
    summary: 'Follow a name lookup from your browser through a resolver to the root, TLD and authoritative servers, then see how a cache makes the second visit almost instant.',
    mount,
  });
})();
