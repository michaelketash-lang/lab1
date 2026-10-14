// What happens when you type a URL: messages travel between the browser, a DNS server and a web server.
// A state is { from, to, label, caption, phase, ip, done }. When from === to the browser is working locally.
(function () {
  const NODES = {
    browser: { x: 75, y: 185, title: 'Your browser', line: 'https://example.com' },
    dns: { x: 260, y: 55, title: 'DNS server', line: 'the web’s phone book' },
    server: { x: 445, y: 185, title: 'Web server', line: 'example.com' },
  };
  const BW = 136, BH = 64;
  const PHASES = ['DNS lookup', 'TCP handshake', 'TLS (encryption)', 'HTTP request', 'Server response', 'Rendering'];

  // [from, to, phase (1-6, 0 = none), message label, caption]
  const STEPS = [
    ['browser', 'browser', 0, '', 'You type example.com into the address bar and press Enter. Your browser knows the name, but computers find each other using numbers called IP addresses, so its first job is to look the name up.'],
    ['browser', 'dns', 1, 'IP of example.com?', 'Step 1 · DNS lookup. The browser asks a DNS server: “What is the IP address of example.com?” DNS works like the internet’s phone book: it turns names into numbers.'],
    ['dns', 'browser', 1, '93.184.216.34', 'The DNS server replies with the IP address, 93.184.216.34. Your computer remembers the answer for a while, so the next visit can skip this step.'],
    ['browser', 'server', 2, 'SYN', 'Step 2 · TCP handshake. Before sending any real data, the browser opens a reliable connection to the web server. It starts with a message called SYN, which means “Hello, can we talk?”'],
    ['server', 'browser', 2, 'SYN-ACK', 'The server answers SYN-ACK, which means “Yes, I hear you. Can you hear me?”'],
    ['browser', 'server', 2, 'ACK', 'The browser replies ACK: “Yes!” Both sides now agree the connection is open. These three messages are called the three-way handshake.'],
    ['browser', 'server', 3, 'ClientHello', 'Step 3 · TLS. The address starts with https, so the browser and server now set up encryption. The browser sends a ClientHello listing the ways it knows how to scramble data.'],
    ['server', 'browser', 3, 'ServerHello + cert', 'The server picks one scrambling method and sends its certificate: a digital ID card that proves it really is example.com, signed by an organization the browser trusts.'],
    ['browser', 'server', 3, 'Key + Finished', 'The browser checks the certificate, then the two sides agree on a secret key. From now on everything is encrypted, so anyone listening in the middle sees only gibberish. This is the padlock in the address bar.'],
    ['browser', 'server', 4, 'GET / HTTP/1.1', 'Step 4 · HTTP request. Now the browser finally asks for the page. “GET /” means “please send me the home page”. The request travels inside the encrypted connection.'],
    ['server', 'browser', 5, '200 OK + HTML', 'Step 5 · Server response. The server answers “200 OK” (200 is the code for success) and sends the page’s HTML, the text that describes the structure of the page.'],
    ['browser', 'browser', 6, '', 'Step 6 · Rendering. The browser reads the HTML from top to bottom and builds a tree of the page’s elements. While reading, it notices other files the page needs: a stylesheet (CSS) and a script (JavaScript).'],
    ['browser', 'server', 6, 'GET CSS + JS', 'It asks the server for those extra files. The connection is already open and encrypted, so there is no new handshake.'],
    ['server', 'browser', 6, 'CSS + JS files', 'The server sends the files back.'],
    ['browser', 'browser', 6, '', 'With the HTML and CSS, the browser works out the size and position of every element, then paints the pixels. The page appears! All of this took only a handful of tiny messages, usually well under a second.'],
  ];
  const states = STEPS.map(([from, to, phase, label, caption], i) => ({ from, to, phase, label, caption, ip: i >= 2, done: i === STEPS.length - 1 }));

  // point on the edge of a node's box, heading towards another node (so the packet starts and stops outside the boxes)
  function edge(a, b) {
    const dx = NODES[b].x - NODES[a].x, dy = NODES[b].y - NODES[a].y;
    const t = Math.min((BW / 2 + 10) / Math.abs(dx || 1e-9), (BH / 2 + 10) / Math.abs(dy || 1e-9));
    return { x: NODES[a].x + dx * t, y: NODES[a].y + dy * t };
  }

  function mount(root) {
    const node = id => {
      const n = NODES[id];
      return `<g class="nnode" id="n-${id}">
        <rect x="${n.x - BW / 2}" y="${n.y - BH / 2}" width="${BW}" height="${BH}" rx="10"/>
        <text class="ntitle" x="${n.x}" y="${n.y - 8}">${n.title}</text>
        <text class="nline" id="l-${id}" x="${n.x}" y="${n.y + 14}">${n.line}</text></g>`;
    };
    root.innerHTML = `
      <ol class="phases">${PHASES.map((p, i) => `<li class="p${i + 1}" data-p="${i + 1}"><span>${i + 1}</span>${p}</li>`).join('')}</ol>
      <div class="net">
        <svg viewBox="0 0 520 250" style="width:100%;max-width:800px" role="img" aria-label="Browser, DNS server and web server exchanging messages">
          <line class="wire" x1="${NODES.browser.x}" y1="${NODES.browser.y}" x2="${NODES.dns.x}" y2="${NODES.dns.y}"/>
          <line class="wire" x1="${NODES.browser.x}" y1="${NODES.browser.y}" x2="${NODES.server.x}" y2="${NODES.server.y}"/>
          ${node('browser')}${node('dns')}${node('server')}
          <g class="packet" id="packet"><rect height="24" rx="12" y="-12"/><text y="4"></text></g>
        </svg>
      </div>
      <div id="player"></div>`;
    const $ = id => root.querySelector('#' + id);
    const packet = $('packet'), pill = packet.querySelector('rect'), pillText = packet.querySelector('text');

    function draw(s) {
      root.querySelectorAll('.phases li').forEach(li => {
        const p = +li.dataset.p;
        li.className = `p${p}` + (p === s.phase ? ' current' : p < s.phase ? ' done' : '');
      });
      Object.keys(NODES).forEach(id => $('n-' + id).classList.toggle('active', id === s.from || id === s.to));
      $('n-browser').classList.toggle('working', s.from === s.to);
      $('l-server').textContent = s.ip ? '93.184.216.34' : NODES.server.line;
      $('l-browser').textContent = s.done ? 'Page displayed ✓' : NODES.browser.line;

      packet.setAttribute('class', `packet p${s.phase}`);
      if (s.from === s.to) { packet.style.opacity = 0; return; }
      const w = s.label.length * 7.2 + 24;
      let a = edge(s.from, s.to), b = edge(s.to, s.from);
      // pull the label inwards so the pill sits beside the boxes instead of on top of them
      const len = Math.hypot(b.x - a.x, b.y - a.y), ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
      const sh = Math.min((w / 2 + 4) / Math.max(Math.abs(ux), 0.3), len * 0.42);
      a = { x: a.x + ux * sh, y: a.y + uy * sh }; b = { x: b.x - ux * sh, y: b.y - uy * sh };
      pill.setAttribute('x', -w / 2); pill.setAttribute('width', w);
      pillText.textContent = s.label;
      packet.style.transition = 'none'; // jump to the sender first, then glide to the receiver
      packet.style.opacity = 1;
      packet.style.transform = `translate(${a.x}px, ${a.y}px)`;
      void packet.getBoundingClientRect();
      packet.style.transition = 'transform .6s ease-in-out';
      packet.style.transform = `translate(${b.x}px, ${b.y}px)`;
    }

    createStepPlayer($('player'), draw, { slow: 14 }).setStates(states);
  }

  (window.VIZ = window.VIZ || []).push({
    id: 'network',
    category: 'Networking',
    title: 'What happens when you type a URL',
    summary: 'Follow the messages between your browser, a DNS server and a web server, from pressing Enter to seeing the page.',
    mount,
  });
})();
