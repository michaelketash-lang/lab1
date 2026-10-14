// "TCP vs UDP": the same lost packet, handled by TCP (handshake, acknowledgements, retransmission)
// and by UDP (just send), side by side (stacked on a phone). Step k shows message k of both sides,
// so they share one timeline. A state is { caption, k }, where k = 0..10 is how many rows are visible.
(function () {
  const X = { c: 60, s: 360 }; // client / sender and server / receiver lifelines, in each side's own drawing
  const Y = k => 110 + (k - 1) * 38; // row k of the timeline
  const TCP_MSGS = [
    { k: 1, dir: 'cs', label: 'SYN' }, { k: 2, dir: 'sc', label: 'SYN-ACK' }, { k: 3, dir: 'cs', label: 'ACK' },
    { k: 4, dir: 'cs', label: 'DATA 1' }, { k: 5, dir: 'sc', label: 'ACK 1' }, { k: 6, dir: 'cs', label: 'DATA 2', lost: true },
    { k: 8, dir: 'cs', label: 'DATA 2 (again)', again: true }, { k: 9, dir: 'sc', label: 'ACK 2' },
  ];
  const UDP_MSGS = [{ k: 1, dir: 'cs', label: 'Packet 1' }, { k: 2, dir: 'cs', label: 'Packet 2', lost: true }, { k: 3, dir: 'cs', label: 'Packet 3' }];
  const LOST_AT = 0.6; // how far a lost packet gets before it vanishes

  const CAPTIONS = [
    'Data crosses the internet in packets, and there are two main ways to send them. TCP is careful: it sets up a connection, confirms every delivery and re-sends anything that gets lost. UDP is simple: it just sends packets and hopes. Watch both at once. Time runs downwards, and in the middle of the show a packet gets lost on both sides.',
    'TCP starts with a handshake. The client sends SYN, which means “Hello, can we talk?” UDP has no handshake at all: it sends its first packet straight away.',
    'The TCP server answers SYN-ACK: “Yes, and I am ready too.” Meanwhile UDP sends packet 2. The network drops it, so it is lost.',
    'The TCP client replies ACK, and the connection is open. UDP has already sent packet 3, and it arrived. UDP is finished before TCP has sent any data. But the UDP receiver only has packets 1 and 3, and nobody has noticed that 2 is missing.',
    'Now TCP sends its first piece of data, DATA 1. TCP numbers what it sends, like the sequence numbers in “What is a packet?”.',
    'The server answers with ACK 1, an acknowledgement: “I got number 1.” This is how the sender knows that its data arrived.',
    'TCP sends DATA 2, and this packet gets lost on the way, just like UDP’s packet 2 was.',
    'No acknowledgement comes back. TCP’s sender keeps a timer for every packet it sends, and when the timer runs out with no ACK, it assumes the packet was lost. UDP has no timer and no ACKs, so it never finds out.',
    'Timeout! TCP sends DATA 2 again. This is called a retransmission.',
    'This time DATA 2 arrives, and the server sends ACK 2. TCP has recovered from the loss: everything was delivered, in order. UDP’s packet 2 is still gone.',
    'TCP: handshake, acknowledgements and retransmission make it reliable and ordered, at the cost of extra messages and waiting. Web pages, email and file downloads use TCP. UDP: no setup and no guarantees make it fast and light. Video calls, online games and DNS lookups use UDP, where a late packet is worse than a missing one.',
  ];
  const states = CAPTIONS.map((caption, k) => ({ caption, k }));
  states[states.length - 1].link = { href: '#network', text: 'What happens when you type a URL' };

  const received = (side, k) => side === 'tcp'
    ? [k >= 4 ? 1 : null, k >= 9 ? 2 : null] : [k >= 1 ? 1 : null, null, k >= 3 ? 3 : null];

  function mount(root) {
    const side = (id, title, names) => `
      <svg class="tu" id="${id}" viewBox="0 0 420 540" role="img" aria-label="${title}">
        <defs><marker id="${id}Arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" class="ah"/></marker></defs>
        <text class="htitle" x="210" y="22">${title}</text>
        ${[[X.c, names[0]], [X.s, names[1]]].map(([x, n]) => `<line class="life" x1="${x}" y1="64" x2="${x}" y2="${Y(9) + 22}"/><g class="lhead"><rect x="${x - 40}" y="38" width="80" height="26" rx="6"/><text x="${x}" y="56">${n}</text></g>`).join('')}
        <g id="${id}Layer"></g><g class="dot" id="${id}Dot"><circle r="8"/></g>
      </svg>`;
    root.innerHTML = `
      <div class="tu-grid stage-card">${side('tcp', 'TCP: careful', ['Client', 'Server'])}${side('udp', 'UDP: just send', ['Sender', 'Receiver'])}</div>
      <div id="xp"></div>`;
    const $ = id => root.querySelector('#' + id);

    function arrow(out, id, m, now) {
      const y = Y(m.k), from = m.dir === 'cs' ? X.c : X.s, to = m.dir === 'cs' ? X.s : X.c;
      const end = m.lost ? from + (to - from) * LOST_AT : to, mid = (from + to) / 2;
      out.push(`<g class="${now ? 'now' : ''}"><line class="msg${m.lost ? ' lost' : ''}${m.again ? ' again' : ''}" x1="${from}" y1="${y}" x2="${end}" y2="${y}"${m.lost ? '' : ` marker-end="url(#${id}Arrow)"`}/>` +
        (m.lost ? `<text class="x" x="${end}" y="${y + 6}">✕</text>` : '') +
        `<text class="lbl${m.again ? ' again' : ''}" x="${mid}" y="${y - 7}">${m.label}</text></g>`);
    }
    function launch(dot, m) { // the dot slides along the newest arrow, or stops where a lost packet vanishes
      if (!m) { dot.style.opacity = 0; return; }
      const y = Y(m.k), from = m.dir === 'cs' ? X.c : X.s, to = m.dir === 'cs' ? X.s : X.c;
      dot.classList.toggle('lost', !!m.lost);
      dot.style.transition = 'none';
      dot.style.opacity = 1;
      dot.style.transform = `translate(${from}px, ${y}px)`;
      void dot.getBoundingClientRect();
      dot.style.transition = 'transform .8s ease-in-out, opacity .4s';
      dot.style.transform = `translate(${m.lost ? from + (to - from) * LOST_AT : to}px, ${y}px)`;
    }
    const tray = (side, k) => received(side, k).map((v, i) => {
      const gap = !v && ((side === 'udp' && i === 1 && k >= 3) || (side === 'tcp' && i === 1 && k >= 6));
      const text = v ? 'Data ' + v : gap ? (side === 'udp' ? 'lost' : 'missing') : '';
      return `<g transform="translate(${i * 62} 0)"><rect class="slot ${v ? 'full' : gap ? 'gap' : ''}" width="54" height="30" rx="6"/><text x="27" y="20">${text}</text></g>`;
    }).join('');

    function draw(s) {
      const k = s.k, tcp = [], udp = [], yb = Y(9);
      TCP_MSGS.filter(m => m.k <= k).forEach(m => arrow(tcp, 'tcp', m, m.k === k));
      UDP_MSGS.filter(m => m.k <= k).forEach(m => arrow(udp, 'udp', m, m.k === k));
      if (k >= 7) tcp.push(`<text class="note" x="${X.c + 12}" y="${Y(7) + 4}">⏱ timer running… no ACK for DATA 2</text>`);
      if (k >= 3) udp.push(`<text class="note" x="${X.c + 12}" y="${Y(5) + 4}">no ACKs, no handshake, no re-sending</text>`);
      if (k >= 7) udp.push(`<text class="note bad" x="${X.c + 12}" y="${Y(7) + 4}">packet 2 is gone for good</text>`);
      tcp.push(`<text class="status" x="210" y="${yb + 52}">${k < 1 ? 'no connection yet' : k < 3 ? 'connecting…' : 'connection open'}</text>`);
      udp.push(`<text class="status" x="210" y="${yb + 52}">no connection to set up</text>`);
      tcp.push(`<text class="trayl" x="10" y="${yb + 90}">Server got:</text><g transform="translate(110 ${yb + 70})">${tray('tcp', k)}</g>`);
      udp.push(`<text class="trayl" x="10" y="${yb + 90}">Receiver got:</text><g transform="translate(110 ${yb + 70})">${tray('udp', k)}</g>`);
      $('tcpLayer').innerHTML = tcp.join('');
      $('udpLayer').innerHTML = udp.join('');
      launch($('tcpDot'), TCP_MSGS.find(m => m.k === k));
      launch($('udpDot'), UDP_MSGS.find(m => m.k === k));
    }
    createExplainer($('xp'), draw, { id: 'tcp-udp', slow: 14 }).setStates(states);
  }

  (window.EXPLAINERS = window.EXPLAINERS || []).push({
    id: 'tcp-udp',
    title: 'TCP vs UDP',
    summary: 'Send the same packets two ways, side by side: TCP with its handshake, acknowledgements and retransmission, and UDP, which just sends. Then lose a packet.',
    mount,
  });
})();
