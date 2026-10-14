// "What is a packet?": a message is split into numbered packets that take different routes,
// arrive out of order and are reassembled. The user can drop a packet to see what happens.
// A state is { caption, mode: 'cards' | 'net', split, cards (0-2), strips (1-2), chips: [{ x, y, op, w, label, cls, color }] }.
(function () {
  const PAY = ['Meet', ' me ', 'at n', 'oon!'], SRC = '10.0.0.1', DST = '93.184.216.34';
  const COLORS = ['#6366f1', '#d97706', '#059669', '#db2777'];
  const NODE = {
    S: { x: 60, y: 190 }, A: { x: 230, y: 90 }, B: { x: 230, y: 190 }, C: { x: 230, y: 290 },
    D: { x: 410, y: 90 }, E: { x: 410, y: 290 }, G: { x: 590, y: 190 }, Dest: { x: 760, y: 190 },
  };
  const ROUTER = { A: 'R1', B: 'R2', C: 'R3', D: 'R4', E: 'R5', G: 'R6' };
  const ROUTES = { top: ['S', 'A', 'D', 'G', 'Dest'], middle: ['S', 'B', 'G', 'Dest'], bottom: ['S', 'C', 'E', 'G', 'Dest'] };
  const EDGES = [['S', 'A'], ['S', 'B'], ['S', 'C'], ['A', 'D'], ['B', 'G'], ['C', 'E'], ['D', 'G'], ['E', 'G'], ['G', 'Dest']];
  // every packet leaves at its own tick; routes differ in length, so they overtake each other
  const PK = [{ id: 1, route: 'top', depart: 0 }, { id: 2, route: 'middle', depart: 0 }, { id: 3, route: 'bottom', depart: 2 }, { id: 4, route: 'middle', depart: 2 }];
  const INTRO = 3; // states before the packets start moving
  // chips sit just above the You / Friend boxes so they do not hide the labels
  const at = n => (n === 'S' || n === 'Dest' ? { x: NODE[n].x, y: NODE[n].y - 40 } : NODE[n]);
  const row1 = k => ({ x: 300 + k * 80, y: 345 }), row2 = k => ({ x: 300 + k * 80, y: 385 });
  const quote = t => `“${t}”`;
  const join = a => (a.length > 1 ? a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1] : String(a[0]));

  function build(drop) {
    const states = [];
    const chips = Array.from({ length: 6 }, (_, i) => ({ x: NODE.S.x, y: NODE.S.y, op: 0, w: 30, label: String(i + 1), cls: '', color: COLORS[i] || '#6b7280' }));
    const snap = (caption, scene) => {
      const copy = chips.map(c => ({ ...c }));
      const groups = {}; // chips sitting on the same spot get spread out sideways
      copy.forEach(c => { if (c.op > 0) (groups[c.x + ',' + c.y] = groups[c.x + ',' + c.y] || []).push(c); });
      Object.values(groups).forEach(g => g.length > 1 && g.forEach((c, k) => { c.x += (k - (g.length - 1) / 2) * 34; }));
      states.push({ caption, mode: 'net', split: true, cards: 2, strips: 1, ...scene, chips: copy });
    };
    const put = (i, pos, o = {}) => Object.assign(chips[i], { x: pos.x, y: pos.y, op: 1, w: 30, cls: '', label: String(i + 1) }, o);

    const survivors = PK.filter(p => p.id !== drop);
    const arrTick = p => p.depart + ROUTES[p.route].length - 1;
    const tmax = Math.max(...survivors.map(arrTick));
    const order = survivors.slice().sort((a, b) => arrTick(a) - arrTick(b)).map(p => p.id); // arrival order
    const finalOrder = drop ? [...order, drop] : order;
    const chipOf = id => (id === drop ? 5 : id - 1); // a resent packet is drawn by its own chip

    // --- the message becomes packets ---
    const cardsScene = { mode: 'cards', chips };
    snap('Imagine sending the message “Meet me at noon!” to a friend over the internet. It does not travel in one piece.', { ...cardsScene, split: false, cards: 0 });
    snap('First, your computer chops the message into small chunks. Here it is cut into 4 pieces of 4 characters. Each chunk is called the payload: the actual content being delivered.', { ...cardsScene, cards: 1 });
    snap(`Then each chunk gets a header, like the address label on an envelope. The header says who sent it (source ${SRC}), where it is going (destination ${DST}) and which piece it is (sequence number). A header plus a payload is one packet.`, cardsScene);

    // --- packets travel ---
    function place(t) {
      PK.forEach((p, i) => {
        const route = ROUTES[p.route], idx = t - p.depart, len = route.length - 1;
        if (idx < 0) put(i, { x: at('S').x, y: at('S').y - 30 * (1 + PK.filter(q => q.depart > t && q.id < p.id).length) }); // waiting at the sender
        else if (p.id === drop && idx >= 2) put(i, { x: at(route[2]).x, y: at(route[2]).y - 28 }, { cls: 'lost', label: '✕', op: idx === 2 ? 1 : 0.5 }); // lost at its 2nd router
        else if (idx <= len) put(i, at(route[idx]));
        else put(i, row1(order.indexOf(p.id)));
      });
    }
    const arrived = new Set();
    let generic = 0;
    for (let t = 0; t <= tmax; t++) {
      place(t);
      let caption;
      if (t === 0) caption = 'The packets set off. Routers are the junctions of the internet: each one reads only the destination in a packet’s header and passes the packet on towards it. Packets 1 and 2 are on their way, and they take different routes.';
      else {
        const parts = [];
        const deps = PK.filter(p => p.depart === t);
        if (deps.length) parts.push(`Now packet${deps.length > 1 ? 's' : ''} ${join(deps.map(p => `${p.id} (${p.route} route)`))} leave${deps.length > 1 ? '' : 's'} the sender.`);
        if (drop && PK[drop - 1].depart + 2 === t) {
          parts.push(`Packet ${drop} is lost at router ${ROUTER[ROUTES[PK[drop - 1].route][2]]}! Maybe its queue was full or a cable glitched. Routers are allowed to drop packets, and nobody tells the sender.`);
        }
        survivors.filter(p => arrTick(p) === t).forEach(p => {
          const expected = [1, 2, 3, 4].find(n => !arrived.has(n));
          arrived.add(p.id);
          parts.push(p.id === expected
            ? `Packet ${p.id} arrives, right on time.`
            : `Packet ${p.id} arrives, but the destination is still waiting for packet ${expected}. Packets can overtake each other because they take different routes.`);
        });
        caption = parts.join(' ') || ['At every router, the destination in the header decides where the packet goes next. Different packets can take different routes.',
          'Each router works on its own and has no idea what the whole message is. It just forwards packets towards their destination.'][generic++ % 2];
      }
      snap(caption, {});
    }
    place(tmax + 1);

    // --- a lost packet is noticed and sent again ---
    if (!drop) {
      snap(`All 4 packets have arrived, but in the order ${order.join(', ')}. The network does not promise to deliver packets in the order they were sent.`, {});
    } else {
      snap(`Only packets ${join(order)} have arrived. The destination checks the sequence numbers and notices that packet ${drop} is missing.`, {});
      const back = ['Dest', 'G', 'B', 'S'], ask = [
        `So the destination sends a message back: “Please resend packet ${drop}.” Sequence numbers make it easy to see exactly what is missing. (Real protocols such as TCP do this with acknowledgements.)`,
        'The request is itself a packet, so it hops back through the routers just like data does.',
        'It is almost back at the sender.',
        'The sender receives the request.'];
      back.forEach((n, k) => { put(4, at(n), { label: `Resend ${drop}`, w: 84, cls: 'ctl' }); snap(ask[k], {}); });
      chips[4].op = 0;
      const again = ['S', 'B', 'G', 'Dest'], resend = [
        `The sender sends packet ${drop} again, as a fresh copy.`,
        'The new copy takes the middle route, the quickest one.',
        'Nearly there.',
        `Packet ${drop} arrives at last.`];
      again.forEach((n, k) => { put(5, at(n), { label: String(drop), cls: 'resent', color: COLORS[drop - 1] }); snap(resend[k], {}); });
      put(5, row1(order.length), { label: String(drop), cls: 'resent', color: COLORS[drop - 1] });
      chips[drop - 1].op = 0.35;
      snap(`Now all 4 packets are here, but not in the order they were sent: ${finalOrder.join(', ')}.`, {});
    }

    // --- reassembly ---
    snap(`That is a problem. If the destination just joined the payloads in the order they arrived, the message would read ${quote(finalOrder.map(id => PAY[id - 1]).join(''))}.`, {});
    finalOrder.forEach(id => put(chipOf(id), row2(id - 1), { label: quote(PAY[id - 1]), w: 66, cls: id === drop ? 'resent' : '', color: COLORS[id - 1] }));
    snap('Instead, the destination uses the sequence number in each packet’s header to put the packets back in order.', { strips: 2 });
    snap(`The payloads now read ${quote('Meet me at noon!')}: the message is whole again.${drop ? ' Even though a packet was lost on the way, nothing is missing.' : ''} Splitting a message into small numbered packets lets many messages share the same wires, and lets the network route around busy or broken paths.`, { strips: 2 });
    states[states.length - 1].link = { href: '#networking/tcp-udp', text: 'TCP vs UDP: how lost packets are handled' };
    return states;
  }

  function mount(root) {
    const wires = EDGES.map(([a, b]) => `<line class="wire" x1="${NODE[a].x}" y1="${NODE[a].y}" x2="${NODE[b].x}" y2="${NODE[b].y}"/>`).join('');
    const routers = Object.keys(ROUTER).map(k => `<g class="router"><rect x="${NODE[k].x - 23}" y="${NODE[k].y - 16}" width="46" height="32" rx="6"/><text x="${NODE[k].x}" y="${NODE[k].y + 5}">${ROUTER[k]}</text></g>`).join('');
    const ends = [['S', 'You', SRC], ['Dest', 'Friend', DST]].map(([k, name, ip]) =>
      `<g class="endpoint"><rect x="${NODE[k].x - 45}" y="${NODE[k].y - 24}" width="90" height="48" rx="8"/><text class="en" x="${NODE[k].x}" y="${NODE[k].y - 4}">${name}</text><text class="ei" x="${NODE[k].x}" y="${NODE[k].y + 14}">${ip}</text></g>`).join('');
    const slots = r => [0, 1, 2, 3].map(k => `<rect class="slot" x="${r(k).x - 35}" y="${r(k).y - 15}" width="70" height="30" rx="6"/>`).join('');
    const cards = PAY.map((pay, i) => `
      <g class="card" transform="translate(${37 + i * 190} 118)" style="--c:${COLORS[i]}">
        <text class="ctitle" x="87" y="-10">Packet ${i + 1}</text>
        <rect class="cbox" width="175" height="196" rx="10"/>
        <g class="card-header"><rect class="hdr" width="175" height="104" rx="10"/><text class="tag" x="12" y="18">HEADER</text>
          <text class="hl" x="12" y="44">From: ${SRC}</text><text class="hl" x="12" y="68">To: ${DST}</text><text class="hl" x="12" y="92">Sequence: ${i + 1} of 4</text></g>
        <text class="tag" x="12" y="128">PAYLOAD</text><text class="payload" x="87" y="170">${quote(pay)}</text>
      </g>`).join('');
    const parts = PAY.map((pay, i) => `<g style="--c:${COLORS[i]}"><rect class="part" x="${60 + i * 178}" y="24" width="165" height="44" rx="8"/><text class="mono" x="${60 + i * 178 + 82}" y="54">${quote(pay)}</text></g>`).join('');

    root.innerHTML = `
      <div class="controls">
        <button class="btn" id="drop">Drop a packet</button>
        <button class="btn" id="undo" disabled>No packet loss</button>
        <span class="drop-note" id="dropNote">No packets will be lost.</span>
      </div>
      <div class="stage-card">
        <svg class="pk" id="pk" viewBox="0 0 820 420" role="img" aria-label="A message split into packets crossing a network of routers">
          <g class="g-cards">
            <g class="msg-whole"><rect class="part" x="60" y="24" width="700" height="44" rx="8"/><text class="mono" x="410" y="54">${quote('Meet me at noon!')}</text></g>
            <g class="msg-parts">${parts}</g>${cards}
          </g>
          <g class="g-net">${wires}${routers}${ends}
            <text class="rowlabel" x="20" y="349">Arrival order</text><g class="slots1">${slots(row1)}</g>
            <g class="slots2"><text class="rowlabel" x="20" y="389">Back in order</text>${slots(row2)}</g>
          </g>
          <g class="g-chips">${Array.from({ length: 6 }, (_, i) => `<g class="chip" id="chip-${i}"><rect y="-12" height="24" rx="12"/><text y="4"></text></g>`).join('')}</g>
        </svg>
      </div>
      <div id="xp"></div>`;
    const $ = id => root.querySelector('#' + id);
    const svg = $('pk'), chipEls = Array.from({ length: 6 }, (_, i) => $('chip-' + i));

    function draw(s) {
      svg.dataset.mode = s.mode; svg.dataset.split = s.split; svg.dataset.cards = s.cards; svg.dataset.strips = s.strips;
      s.chips.forEach((c, i) => {
        const el = chipEls[i], rect = el.firstChild;
        el.style.transform = `translate(${c.x}px, ${c.y}px)`;
        el.style.opacity = c.op;
        el.style.setProperty('--c', c.color);
        el.setAttribute('class', 'chip ' + c.cls);
        rect.setAttribute('width', c.w); rect.setAttribute('x', -c.w / 2);
        el.lastChild.textContent = c.label;
      });
    }

    let drop = 0;
    const xp = createExplainer($('xp'), draw, { id: 'packets', slow: 14 });
    xp.setStates(build(drop));
    function rerun() { // rebuild with or without a lost packet and play from the moment the packets set off
      $('undo').disabled = !drop;
      $('dropNote').textContent = drop ? `Packet ${drop} will be lost on its way.` : 'No packets will be lost.';
      xp.setStates(build(drop));
      xp.goTo(INTRO);
      xp.play();
    }
    $('drop').onclick = () => { drop = (drop % 4) + 1; rerun(); };
    $('undo').onclick = () => { drop = 0; rerun(); };
  }

  (window.EXPLAINERS = window.EXPLAINERS || []).push({
    id: 'packets',
    title: 'What is a packet?',
    summary: 'See a message chopped into numbered packets that cross the network by different routes, arrive out of order, and get put back together. Then lose one.',
    mount,
  });
})();
