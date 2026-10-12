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
  if (e.code === 'Space' && winner) reset();
});
addEventListener('keyup', e => { keys[e.code] = false; });

const players = [
  { name: 'RED', color: '#e53935', x: CX - 40, y: 95, keys: { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD' } },
  { name: 'BLUE', color: '#1e88e5', x: CX - 40, y: 145, keys: { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' } },
];
let winner = null, clock = 0;

// Angle around the track centre, measured from the finish line (top, x = CX); clockwise is positive.
const angleOf = c => Math.atan2(c.y - CY, c.x - CX) + Math.PI / 2;

function reset() {
  winner = null; clock = 0;
  for (const c of players) {
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
  const throttle = (keys[k.up] ? 1 : 0) - (keys[k.down] ? 1 : 0);
  const steer = (keys[k.right] ? 1 : 0) - (keys[k.left] ? 1 : 0);
  const fx = Math.cos(c.angle), fy = Math.sin(c.angle);

  // split velocity into forward / sideways parts so sideways can slide (drift)
  let vf = c.vx * fx + c.vy * fy;
  let vl = -c.vx * fy + c.vy * fx;

  const grass = offTrack(c);
  vf += throttle * (throttle > 0 ? 380 : 300) * dt;
  vf *= Math.exp(-(grass ? 1.8 : 0.35) * dt);       // drag / rolling resistance
  vf = Math.max(-MAX_SPEED / 3, Math.min(grass ? MAX_SPEED * 0.45 : MAX_SPEED, vf));
  vl *= Math.exp(-(grass ? 2 : 4.5) * dt);          // sideways grip, lower = more drift

  // steering grows with speed, so the car can't spin on the spot; flips when reversing
  c.angle += steer * 2.6 * Math.max(-1, Math.min(1, vf / 140)) * dt;

  const nfx = Math.cos(c.angle), nfy = Math.sin(c.angle);
  c.vx = vf * nfx - vl * nfy;
  c.vy = vf * nfy + vl * nfx;
  c.x += c.vx * dt; c.y += c.vy * dt;
  c.x = Math.max(10, Math.min(W - 10, c.x)); c.y = Math.max(10, Math.min(H - 10, c.y));

  // lap tracking: unwrap the angle so crossing the line backwards undoes progress
  const a = angleOf(c);
  let d = a - c.prev;
  if (d > Math.PI) d -= TAU; else if (d < -Math.PI) d += TAU;
  c.progress += d; c.prev = a;
  const done = Math.max(0, Math.floor(c.progress / TAU));
  if (done > c.laps) { c.laps = done; c.lapStart = clock; }
  if (c.laps >= LAPS && !winner) { winner = c; c.finishTime = clock; }
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

function drawCar(c) {
  ctx.save();
  ctx.translate(c.x, c.y); ctx.rotate(c.angle);
  ctx.fillStyle = c.color; ctx.fillRect(-18, -9, 36, 18);
  ctx.fillStyle = '#cfe8ff'; ctx.fillRect(2, -7, 8, 14);   // windshield, shows the front
  ctx.fillStyle = '#111'; ctx.fillRect(-16, -11, 8, 3); ctx.fillRect(-16, 8, 8, 3); ctx.fillRect(8, -11, 8, 3); ctx.fillRect(8, 8, 8, 3);
  ctx.restore();
}

const fmt = t => `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, '0')}`;

function drawHud(c, x) {
  const speed = Math.hypot(c.vx, c.vy);
  ctx.textAlign = 'left'; ctx.fillStyle = c.color; ctx.font = 'bold 20px system-ui';
  ctx.fillText(c.name, x, CY - 30);
  ctx.fillStyle = '#fff'; ctx.font = '16px system-ui';
  ctx.fillText(`Lap ${Math.min(LAPS, c.laps + 1)} / ${LAPS}`, x, CY - 6);
  ctx.fillText(`Time ${fmt((winner === c ? c.finishTime : clock) - c.lapStart)}`, x, CY + 16);
  ctx.fillText(`${Math.round(speed * 0.6)} km/h`, x, CY + 38);
  ctx.fillStyle = '#222'; ctx.fillRect(x + 90, CY + 26, 120, 10);
  ctx.fillStyle = c.color; ctx.fillRect(x + 90, CY + 26, 120 * Math.min(1, speed / MAX_SPEED), 10);
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
    clock += dt;
    players.forEach(c => update(c, dt));
    collide(players[0], players[1]);
  }
  drawTrack();
  players.forEach(drawCar);
  drawHud(players[0], CX - 245);
  drawHud(players[1], CX + 15);
  if (winner) drawBanner();
  requestAnimationFrame(frame);
}

reset();
requestAnimationFrame(frame);
