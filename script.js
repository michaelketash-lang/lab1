const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;
const CX = W / 2, CY = H / 2;
const OUT = { a: 450, b: 270 }, IN = { a: 270, b: 130 };
const TAU = Math.PI * 2, LAPS = 3, MAX_SPEED = 420;

const keys = {};
addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
  if (e.code === 'Enter') e.preventDefault();
  if (e.code === 'Space' && winner) reset();
  else if (!e.repeat && !winner && cd >= 3) players.forEach(c => { if (e.code === c.keys.item) useItem(c); });
  initAudio(); // browsers only allow audio after a key press
});
addEventListener('keyup', e => { keys[e.code] = false; });

const players = [
  { name: 'RED', color: '#e53935', x: CX - 40, y: 95, keys: { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', item: 'Space' } },
  { name: 'BLUE', color: '#1e88e5', x: CX - 40, y: 145, keys: { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', item: 'Enter' } },
];

// --- hazards and pickups, placed by angle t around the middle of the track (clockwise, top = 3π/2) ---
const spot = (t, s = 1) => ({ x: CX + 360 * s * Math.cos(t), y: CY + 200 * s * Math.sin(t) });
const pads = [5.4, 1.57, 3.9].map(t => ({ ...spot(t), ang: Math.atan2(200 * Math.cos(t), -360 * Math.sin(t)) }));
const SLICKS = [spot(0.15, 1.05), spot(3.0, 0.92)].map(p => ({ ...p, r: 32, ttl: Infinity }));
const crates = [0.8, 2.4, 4.2].map(t => ({ ...spot(t), respawn: 0, kind: 'nitro' }));
let oils = [];
const STUN = 1.5, BOOST = 2;

function boost(c) {
  if (c.boost <= 0) { c.vx *= 1.5; c.vy *= 1.5; } // instant kick, but never stacks
  c.boost = BOOST;
}
function useItem(c) {
  if (!c.item || c.stun > 0) return;
  if (c.item === 'nitro') boost(c);
  else oils.push({ x: c.x - Math.cos(c.angle) * 34, y: c.y - Math.sin(c.angle) * 34, r: 32, ttl: 20 });
  beep(c.item === 'nitro' ? 1200 : 200, 0, 0.25);
  c.item = null;
}
let winner = null, clock = 0, cd = 0; // cd: seconds since reset; the race starts at cd = 3
let smoke = [];
const marks = document.createElement('canvas'); // persistent tire marks, drawn once per skid
marks.width = W; marks.height = H;
const mctx = marks.getContext('2d');

// --- sound: everything is synthesised with Web Audio, no files ---
let audio = null;
function initAudio() {
  if (audio) { audio.ac.resume(); return; }
  try {
    const ac = new AudioContext();
    const noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    noise.getChannelData(0).forEach((_, i, d) => { d[i] = Math.random() * 2 - 1; });
    for (const c of players) {
      const osc = ac.createOscillator(); osc.type = 'sawtooth';
      const lp = ac.createBiquadFilter(); lp.frequency.value = 500;
      const eg = ac.createGain(); eg.gain.value = 0;
      osc.connect(lp).connect(eg).connect(ac.destination); osc.start();
      const src = ac.createBufferSource(); src.buffer = noise; src.loop = true;
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1800; bp.Q.value = 4;
      const sg = ac.createGain(); sg.gain.value = 0;
      src.connect(bp).connect(sg).connect(ac.destination); src.start();
      c.snd = { osc, eg, sg };
    }
    audio = { ac };
  } catch (err) { /* no audio support: the game still works silently */ }
}
function beep(freq, start, dur, vol = 0.15) {
  if (!audio) return;
  const ac = audio.ac, t = ac.currentTime + start;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = 'square'; o.frequency.value = freq;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur);
}
function fanfare() {
  [[523, 0], [659, 0.18], [784, 0.36], [1047, 0.54], [784, 0.8], [1047, 0.98]]
    .forEach(([f, t], i) => beep(f, t, i === 3 || i === 5 ? 0.5 : 0.16, 0.2));
}
function updateSound(c) {
  if (!audio) return;
  const running = !winner && cd >= 3, t = audio.ac.currentTime;
  const speed = Math.hypot(c.vx, c.vy);
  c.snd.osc.frequency.setTargetAtTime(45 + (speed / MAX_SPEED) * 120 + c.thr * 15, t, 0.05);
  c.snd.eg.gain.setTargetAtTime(running ? 0.05 + 0.06 * Math.abs(c.thr) : 0, t, 0.05);
  c.snd.sg.gain.setTargetAtTime(running && c.slip > 70 ? Math.min(0.12, (c.slip - 60) / 500) : 0, t, 0.03);
}

// Angle around the track centre, measured from the finish line (top, x = CX); clockwise is positive.
const angleOf = c => Math.atan2(c.y - CY, c.x - CX) + Math.PI / 2;

function reset() {
  winner = null; clock = 0; cd = 0; smoke = [];
  oils = SLICKS.map(s => ({ ...s }));
  crates.forEach(b => { b.respawn = 0; b.kind = Math.random() < 0.5 ? 'nitro' : 'oil'; });
  mctx.clearRect(0, 0, W, H);
  for (const c of players) {
    c.boost = 0; c.stun = 0; c.immune = 0; c.item = null;
    if (c.sx === undefined) { c.sx = c.x; c.sy = c.y; }
    c.x = c.sx; c.y = c.sy; c.angle = 0; c.vx = 0; c.vy = 0;
    c.prev = angleOf(c); c.progress = c.prev; c.laps = 0; c.lapStart = 0; c.finishTime = 0;
  }
}

const offTrack = c => {
  const o = ((c.x - CX) / OUT.a) ** 2 + ((c.y - CY) / OUT.b) ** 2;
  const i = ((c.x - CX) / IN.a) ** 2 + ((c.y - CY) / IN.b) ** 2;
  return o > 1 || i < 1;
};

function update(c, dt) {
  const k = c.keys;
  c.boost = Math.max(0, c.boost - dt); c.stun = Math.max(0, c.stun - dt); c.immune = Math.max(0, c.immune - dt);
  const live = c.stun === 0; // oil spin-out disables controls
  const throttle = live ? (keys[k.up] ? 1 : 0) - (keys[k.down] ? 1 : 0) : 0;
  const steer = live ? (keys[k.right] ? 1 : 0) - (keys[k.left] ? 1 : 0) : 0;
  const fx = Math.cos(c.angle), fy = Math.sin(c.angle);

  // split velocity into forward / sideways parts so sideways can slide (drift)
  let vf = c.vx * fx + c.vy * fy;
  let vl = -c.vx * fy + c.vy * fx;

  const grass = offTrack(c);
  const turbo = c.boost > 0 ? 1.5 : 1;
  vf += throttle * (throttle > 0 ? 380 : 300) * (grass ? 0.5 : turbo) * dt;
  vf *= Math.exp(-(grass ? 2.5 : 0.35) * dt);       // drag / rolling resistance
  vf = Math.max(-MAX_SPEED / 3, Math.min(grass ? MAX_SPEED * 0.3 : MAX_SPEED * turbo, vf));
  vl *= Math.exp(-(grass ? 1.2 : 4.5) * dt);        // sideways grip, lower = more drift
  c.thr = throttle; c.slip = Math.abs(vl);

  // steering grows with speed, so the car can't spin on the spot; flips when reversing
  c.angle += steer * 2.6 * Math.max(-1, Math.min(1, vf / 140)) * dt;

  const nfx = Math.cos(c.angle), nfy = Math.sin(c.angle);
  c.vx = vf * nfx - vl * nfy;
  c.vy = vf * nfy + vl * nfx;
  c.x += c.vx * dt; c.y += c.vy * dt;
  c.x = Math.max(10, Math.min(W - 10, c.x)); c.y = Math.max(10, Math.min(H - 10, c.y));

  // tire marks from both rear wheels while skidding on asphalt, exhaust smoke while on the gas
  const rear = (lx, ly) => [c.x + lx * nfx - ly * nfy, c.y + lx * nfy + ly * nfx];
  if (c.slip > 55 && !grass) {
    mctx.fillStyle = 'rgba(10,10,10,0.35)';
    for (const side of [-8, 8]) { const [px, py] = rear(-14, side); mctx.beginPath(); mctx.arc(px, py, 2, 0, TAU); mctx.fill(); }
  }
  if (throttle > 0 && Math.random() < 0.6) {
    const [px, py] = rear(-20, 0);
    smoke.push({ x: px, y: py, vx: -nfx * 30 + (Math.random() - 0.5) * 30, vy: -nfy * 30 + (Math.random() - 0.5) * 30, life: 0.7, grass });
  }

  // boost pads, item crates and oil slicks
  for (const p of pads) if (Math.hypot(c.x - p.x, c.y - p.y) < 28) { if (c.boost <= 0) beep(900, 0, 0.2); boost(c); }
  for (const b of crates) {
    if (b.respawn <= 0 && !c.item && Math.hypot(c.x - b.x, c.y - b.y) < 26) {
      c.item = b.kind; b.respawn = 8; beep(660, 0, 0.12);
    }
  }
  if (c.immune <= 0) {
    for (const o of oils) if (Math.hypot(c.x - o.x, c.y - o.y) < o.r) { c.stun = STUN; c.immune = STUN + 1.5; beep(120, 0, 0.4); break; }
  }

  // lap tracking: unwrap the angle so crossing the line backwards undoes progress
  const a = angleOf(c);
  let d = a - c.prev;
  if (d > Math.PI) d -= TAU; else if (d < -Math.PI) d += TAU;
  c.progress += d; c.prev = a;
  const done = Math.max(0, Math.floor(c.progress / TAU));
  if (done > c.laps) { c.laps = done; c.lapStart = clock; }
  if (c.laps >= LAPS && !winner) { winner = c; c.finishTime = clock; fanfare(); }
}

function collide(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy), min = 30;
  if (dist === 0 || dist >= min) return;
  const nx = dx / dist, ny = dy / dist, push = (min - dist) / 2;
  a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push;
  const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (rel < 0) {
    a.vx += nx * rel * 0.9; a.vy += ny * rel * 0.9;
    b.vx -= nx * rel * 0.9; b.vy -= ny * rel * 0.9;
  }
}

function ellipse(e, fill, stroke, width) {
  ctx.beginPath();
  ctx.ellipse(CX, CY, e.a, e.b, 0, 0, TAU);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
}

function drawTrack() {
  ctx.fillStyle = '#2f7d32'; ctx.fillRect(0, 0, W, H);
  ellipse(OUT, '#444');
  ellipse(IN, '#2f7d32');
  // red/white curbs on both edges
  for (const e of [OUT, IN]) {
    ctx.setLineDash([22, 22]);
    ellipse(e, null, '#fff', 6);
    ctx.lineDashOffset = 22;
    ellipse(e, null, '#d32f2f', 6);
    ctx.setLineDash([]); ctx.lineDashOffset = 0;
  }
  // checkered start/finish line across the top straight
  const top = CY - OUT.b, bottom = CY - IN.b, size = 10;
  for (let y = top, row = 0; y < bottom; y += size, row++) {
    for (let col = 0; col < 2; col++) {
      ctx.fillStyle = (row + col) % 2 ? '#fff' : '#111';
      ctx.fillRect(CX - size + col * size, y, size, Math.min(size, bottom - y));
    }
  }
}

function drawPickups() {
  for (const o of oils) {
    ctx.fillStyle = '#0a0a12'; ctx.beginPath(); ctx.ellipse(o.x, o.y, o.r, o.r * 0.7, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(120,80,200,0.35)'; ctx.beginPath(); ctx.ellipse(o.x - 8, o.y - 6, o.r * 0.4, o.r * 0.2, -0.4, 0, TAU); ctx.fill();
  }
  for (const p of pads) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.ang);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(-26, -26, 52, 52);
    ctx.fillStyle = '#ffd600';
    for (const dx of [-14, 4]) { ctx.beginPath(); ctx.moveTo(dx, -18); ctx.lineTo(dx + 14, 0); ctx.lineTo(dx, 18); ctx.lineTo(dx + 6, 0); ctx.fill(); }
    ctx.restore();
  }
  const bob = Math.sin(performance.now() / 250) * 3;
  for (const b of crates) {
    if (b.respawn > 0) continue;
    ctx.fillStyle = '#ffb300'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
    ctx.fillRect(b.x - 14, b.y - 14 + bob, 28, 28); ctx.strokeRect(b.x - 14, b.y - 14 + bob, 28, 28);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 20px system-ui'; ctx.textAlign = 'center'; ctx.fillText('?', b.x, b.y + 7 + bob);
  }
}

function drawCar(c) {
  ctx.save();
  ctx.translate(c.x, c.y); ctx.rotate(c.angle + (c.stun > 0 ? (1 - c.stun / STUN) * TAU : 0)); // oil: one full spin
  if (c.boost > 0) { ctx.shadowColor = '#ffd600'; ctx.shadowBlur = 20; }
  ctx.fillStyle = c.color; ctx.fillRect(-18, -9, 36, 18);
  ctx.fillStyle = '#cfe8ff'; ctx.fillRect(2, -7, 8, 14);   // windshield, shows the front
  ctx.fillStyle = '#111'; ctx.fillRect(-16, -11, 8, 3); ctx.fillRect(-16, 8, 8, 3); ctx.fillRect(8, -11, 8, 3); ctx.fillRect(8, 8, 8, 3);
  ctx.restore();
}

const fmt = t => `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, '0')}`;

function drawHud(c, x) {
  const speed = Math.hypot(c.vx, c.vy);
  ctx.textAlign = 'left'; ctx.fillStyle = c.color; ctx.font = 'bold 20px system-ui';
  ctx.fillText(c.name, x, CY - 42);
  ctx.fillStyle = '#fff'; ctx.font = '16px system-ui';
  ctx.fillText(`Lap ${Math.min(LAPS, c.laps + 1)} / ${LAPS}`, x, CY - 18);
  ctx.fillText(`Time ${fmt((winner === c ? c.finishTime : clock) - c.lapStart)}`, x, CY + 4);
  ctx.fillText(`${Math.round(speed * 0.6)} km/h`, x, CY + 26);
  ctx.fillStyle = '#222'; ctx.fillRect(x + 90, CY + 14, 120, 10);
  ctx.fillStyle = c.color; ctx.fillRect(x + 90, CY + 14, 120 * Math.min(1, speed / (MAX_SPEED * 1.5)), 10);
  ctx.fillStyle = '#ffd600'; ctx.font = 'bold 14px system-ui';
  ctx.fillText(c.item ? `ITEM: ${c.item === 'nitro' ? 'NITRO' : 'OIL TRAP'} [${c.keys.item}]` : 'ITEM: -', x, CY + 50);
}

function drawSmoke() {
  for (const p of smoke) {
    ctx.fillStyle = p.grass ? `rgba(150,110,60,${p.life * 0.5})` : `rgba(210,210,210,${p.life * 0.5})`;
    ctx.beginPath(); ctx.arc(p.x, p.y, 3 + (0.7 - p.life) * 12, 0, TAU); ctx.fill();
  }
}

function drawCountdown() {
  const go = cd >= 3, phase = go ? (cd - 3) / 0.7 : cd % 1;
  ctx.save();
  ctx.translate(CX, CY + 215); ctx.scale(1 + (1 - phase) * 0.3, 1 + (1 - phase) * 0.3);
  ctx.globalAlpha = 1 - phase * 0.5;
  ctx.textAlign = 'center'; ctx.font = 'bold 90px system-ui';
  ctx.lineWidth = 8; ctx.strokeStyle = '#000'; ctx.fillStyle = go ? '#4caf50' : '#ffeb3b';
  const text = go ? 'GO!' : String(3 - Math.floor(cd));
  ctx.strokeText(text, 0, 0); ctx.fillText(text, 0, 0);
  ctx.restore();
}

function drawBanner() {
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, CY - 70, W, 140);
  ctx.textAlign = 'center'; ctx.fillStyle = winner.color; ctx.font = 'bold 64px system-ui';
  ctx.fillText(`WINNER: ${winner.name}`, CX, CY + 10);
  ctx.fillStyle = '#fff'; ctx.font = '20px system-ui';
  ctx.fillText(`${fmt(winner.finishTime)} — press Space to race again`, CX, CY + 48);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000); last = now;
  if (!winner) {
    const was = cd;
    cd += dt;
    if (was < 3 && Math.floor(was) !== Math.floor(cd)) beep(cd < 3 ? 440 : 880, 0, cd < 3 ? 0.15 : 0.5);
    if (cd >= 3) {
      clock += dt;
      players.forEach(c => update(c, dt));
      collide(players[0], players[1]);
    }
  }
  if (!winner && cd >= 3) {
    oils = oils.filter(o => (o.ttl -= dt) > 0);
    crates.forEach(b => { b.respawn -= dt; if (b.respawn <= 0 && b.respawn + dt > 0) b.kind = Math.random() < 0.5 ? 'nitro' : 'oil'; });
  }
  smoke.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; });
  smoke = smoke.filter(p => p.life > 0);
  players.forEach(updateSound);
  drawTrack();
  ctx.drawImage(marks, 0, 0);
  drawPickups();
  drawSmoke();
  players.forEach(drawCar);
  drawHud(players[0], CX - 245);
  drawHud(players[1], CX + 15);
  if (!winner && cd < 3.7) drawCountdown();
  if (winner) drawBanner();
  requestAnimationFrame(frame);
}

reset();
requestAnimationFrame(frame);
