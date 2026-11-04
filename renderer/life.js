'use strict';
/*
 * AI Office – office life: the office cat, a cleaning robot in the empty office,
 * confetti/heart particles and night-time lighting. Shares globals with office.js.
 */

// ================================================================ particles

const particles = [];
const CONFETTI = [C.red, C.yellow, C.green, C.blue, C.purple, C.orange, C.teal];

function confetti(x, y, n = 30) {
  for (let i = 0; i < n; i++) {
    particles.push({
      x, y, vx: rand(-45, 45), vy: rand(-80, -25), color: randItem(CONFETTI),
      life: rand(1.2, 2.2), size: rand(0.8, 1.6), float: false,
    });
  }
}

function hearts(x, y, n = 4) {
  for (let i = 0; i < n; i++) {
    particles.push({ x: x + rand(-4, 4), y, vx: rand(-4, 4), vy: rand(-14, -8), life: rand(1.2, 1.8), heart: true, float: true });
  }
}

function updateParticles(dt) {
  for (const p of particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (!p.float) {
      p.vy += 95 * dt;
      p.vx *= 0.985;
    }
  }
  for (let i = particles.length - 1; i >= 0; i--) if (particles[i].life <= 0) particles.splice(i, 1);
}

function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = Math.min(1, p.life * 2);
    if (p.heart) text('❤', p.x, p.y, 3.5, C.red);
    else R(p.x, p.y, p.size, p.size, p.color);
  }
  ctx.globalAlpha = 1;
}

// ================================================================ the office cat ("Bajt")

const CAT_SPEED = 22;
const cat = { x: 130, y: 105, tx: 130, ty: 105, state: 'sit', next: 'sit', until: 0, dir: 1, step: 0, onTop: 0, pendingTop: 0, bubble: null };

function catSpots() {
  const spots = [
    { x: 270, y: 127 },             // rug in front of the TV
    { x: 262, y: 104, onTop: 2 },   // on top of the TV cabinet
  ];
  for (const d of DESKS) {
    if (!d.owner) spots.push({ x: d.cx + 5, y: d.deskY + 5, onTop: 13 }); // on an empty desk's keyboard
  }
  return spots;
}

function catGo(x, y, next, onTop = 0) {
  cat.tx = x;
  cat.ty = y;
  cat.next = next;
  cat.pendingTop = onTop;
  cat.onTop = 0;
  cat.state = 'walk';
}

function chooseCatTarget() {
  const roll = Math.random();
  const visitable = [...workers.values()].filter((w) => !w.gone && !w.walking);
  if (roll < 0.35) {
    const s = randItem(catSpots());
    catGo(s.x, s.y, 'sleep', s.onTop);
  } else if (roll < 0.6 && visitable.length) {
    const w = randItem(visitable);
    catGo(clamp(w.x + randItem([-9, 9]), 6, 314), w.y + 2, 'sit');
  } else {
    catGo(rand(10, 310), randItem([54, 100, 105, 125, 160, 166]), 'sit');
  }
}

function updateCat(dt) {
  const t = now();
  if (cat.state === 'walk') {
    const dx = cat.tx - cat.x;
    const dy = cat.ty - cat.y;
    const d = Math.hypot(dx, dy);
    const stepLen = CAT_SPEED * dt;
    if (d <= stepLen) {
      cat.x = cat.tx;
      cat.y = cat.ty;
      cat.state = cat.next;
      cat.onTop = cat.pendingTop;
      cat.until = t + (cat.state === 'sleep' ? rand(40_000, 120_000) : rand(5000, 15_000));
    } else {
      cat.x += (dx / d) * stepLen;
      cat.y += (dy / d) * stepLen;
      if (Math.abs(dx) > 0.3) cat.dir = dx > 0 ? 1 : -1;
      cat.step += dt * 10;
    }
  } else if (t > cat.until) {
    chooseCatTarget();
  }
  if (cat.bubble && t > cat.bubble.until) cat.bubble = null;
  if (!cat.bubble && cat.state !== 'sleep' && Math.random() < dt / 50) {
    cat.bubble = { text: randItem(['Mňau', 'Mňau?', 'Mrr…']), until: t + 2000 };
  }
}

function petCat() {
  cat.bubble = { text: randItem(['Prrr ❤', 'Mňau ❤', 'Prrrrr…']), until: now() + 2500 };
  hearts(cat.x, cat.y - 8);
  if (cat.state === 'sleep') {
    cat.state = 'sit';
    cat.until = now() + 6000;
  }
  play([392, 330, 392], { type: 'triangle', volume: 0.03, step: 0.08, length: 0.1 });
}

function catHit(lx, ly) {
  return Math.abs(lx - cat.x) < 6 && ly >= cat.y - 9 && ly <= cat.y + 1;
}

function drawCat(t) {
  const { x, y } = cat;
  const f = cat.dir;
  const fur = '#ef7d57';
  const stripe = '#c45a3a';
  const r = (dx, dy, w, h, col) => R(f > 0 ? x + dx : x - dx - w, y + dy, w, h, col);
  if (cat.state === 'sleep') {
    r(-3, -3, 6, 3, fur);
    r(-3, -3, 6, 0.8, stripe);
    r(1, -4, 3, 2.5, fur);
    r(1.3, -4.8, 0.8, 0.8, fur);
    r(3, -4.8, 0.8, 0.8, fur);
    r(-4, -1.2, 5, 1, stripe);
    return;
  }
  const leg = cat.state === 'walk' ? Math.floor(cat.step) % 2 : 0;
  r(-3, -4, 6, 3, fur);
  r(-3, -4, 6, 0.8, stripe);
  r(2, -6.5, 3, 3, fur);
  r(2, -7.5, 1, 1, fur);
  r(4, -7.5, 1, 1, fur);
  r(4, -5.6, 0.7, 0.7, C.ink);
  r(-2.5 + leg, -1, 1, 1, fur);
  r(1.5 - leg, -1, 1, 1, fur);
  r(-4.5, -6.5 + (Math.sin(t * 4) > 0 ? 1 : 0), 1, 3, stripe);
}

// ================================================================ cleaning robot (empty office only)

const robot = { x: 110, y: 120, angle: 0.7, turnAt: 0 };

function updateRobot(dt) {
  if (workers.size > 0) return;
  robot.x += Math.cos(robot.angle) * 14 * dt;
  robot.y += Math.sin(robot.angle) * 14 * dt;
  if (robot.x < 6 || robot.x > 314) robot.angle = Math.PI - robot.angle;
  if (robot.y < 52 || robot.y > 176) robot.angle = -robot.angle;
  robot.x = clamp(robot.x, 6, 314);
  robot.y = clamp(robot.y, 52, 176);
  if (now() > robot.turnAt) {
    robot.angle += rand(-1.2, 1.2);
    robot.turnAt = now() + rand(2000, 6000);
  }
}

function drawRobot(t) {
  R(robot.x - 3.5, robot.y - 2.5, 7, 3, C.metalDark);
  R(robot.x - 3, robot.y - 3, 6, 1, C.metal);
  R(robot.x - 0.5, robot.y - 2.6, 1, 0.8, Math.floor(t * 2) % 2 ? C.lime : C.green);
  R(robot.x - 3.5, robot.y - 0.5, 7, 0.5, C.ink);
}

// ================================================================ night lighting

let lightCanvas = null;

function drawLighting(t, date) {
  const h = hourOf(date);
  const dark = h >= 21 || h < 6 ? 0.55 : h >= 19 || h < 7 ? 0.3 : 0;
  if (!dark) return;
  lightCanvas ??= document.createElement('canvas');
  if (lightCanvas.width !== canvas.width || lightCanvas.height !== canvas.height) {
    lightCanvas.width = canvas.width;
    lightCanvas.height = canvas.height;
  }
  const lc = lightCanvas.getContext('2d');
  lc.globalCompositeOperation = 'source-over';
  lc.clearRect(0, 0, lightCanvas.width, lightCanvas.height);
  lc.fillStyle = `rgba(6,8,28,${dark})`;
  lc.fillRect(OX, OY, W * S, H * S);
  lc.globalCompositeOperation = 'destination-out';
  const light = (x, y, radius, strength) => {
    const gx = OX + x * S;
    const gy = OY + y * S;
    const gr = radius * S;
    const g = lc.createRadialGradient(gx, gy, 0, gx, gy, gr);
    g.addColorStop(0, `rgba(0,0,0,${strength})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    lc.fillStyle = g;
    lc.fillRect(gx - gr, gy - gr, gr * 2, gr * 2);
  };
  for (const d of DESKS) if (d.owner && !d.owner.leaving) light(d.cx, d.deskY, 28, 0.95);
  light(310, 96, 36, 0.95);  // floor lamp
  light(242, 24, 12, 0.6);   // coffee machine
  if ([...workers.values()].some((w) => w.idle?.kind === 'sofa' && w.idle.arrived)) light(276, 94, 34, 0.85);
  if (personNearDoor()) light(298, 40, 18, 0.7);
  ctx.drawImage(lightCanvas, 0, 0);

  // warm glow of the floor lamp
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const gx = OX + 310 * S;
  const gy = OY + 95 * S;
  const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, 22 * S);
  g.addColorStop(0, 'rgba(255,200,110,0.18)');
  g.addColorStop(1, 'rgba(255,200,110,0)');
  ctx.fillStyle = g;
  ctx.fillRect(gx - 22 * S, gy - 22 * S, 44 * S, 44 * S);
  ctx.restore();
}

// ================================================================ hooks used by office.js

function updateLife(dt) {
  updateParticles(dt);
  updateCat(dt);
  updateRobot(dt);
}

function lifeItems(t) {
  const items = [{ y: cat.y + cat.onTop, draw: () => drawCat(t) }];
  if (workers.size === 0) items.push({ y: robot.y, draw: () => drawRobot(t) });
  return items;
}

function drawLifeOverlay(t) {
  if (cat.bubble) bubble(cat.x, cat.y - 9, cat.bubble.text, 'chat', 3.2);
  else if (cat.state === 'sleep') {
    const p = (t * 0.6) % 1;
    text('z', cat.x + 3 + p * 2, cat.y - 5 - p * 5, 2.5 + p * 1.5, `rgba(244,244,244,${1 - p})`);
  }
}
