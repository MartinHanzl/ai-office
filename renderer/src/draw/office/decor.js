/**
 * Things on the back wall (painted ghost, LED logo, TVs, boards, portrait, darts, doors), the spider
 * chandeliers above the chill zone and skylight beams. Static items go into the cached base layer
 * (drawWallItems); TVs, boards and the portrait change with the office and are drawn every frame
 * (wallItemDrawables).
 */
import { OX, OY, R, S, ctx, text } from '../../core/canvas.js';
import { BG } from '../../core/palette.js';
import { noise, pad2 } from '../../core/util.js';
import { WEEKDAYS, fmtReset, fuelColor, remaining, strikeActive, strikeUntil } from '../../limits.js';
import { state } from '../../state.js';
import { BAND, CELL } from '../../world/map.js';
import { drawDiagram, drawPortrait } from '../room.js';
import { drawTaskBoard } from '../taskboard.js';
import { BAR_H, barRect } from './furniture.js';
import { GHOST_H, GHOST_W, ghost, pixelText, textWidth } from './sprites.js';

const BAND_PX = BAND * CELL;

/** Soft radial light (anti-aliased on purpose: light bloom, not pixels). */
export function bloom(x, y, r, color, alpha) {
  const gx = OX + x * S;
  const gy = OY + y * S;
  const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, r * S);
  g.addColorStop(0, color.replace('A', String(alpha)));
  g.addColorStop(1, color.replace('A', '0'));
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g;
  ctx.fillRect(gx - r * S, gy - r * S, r * 2 * S, r * 2 * S);
  ctx.restore();
}

/** The painted white ghost on the taupe wall (photo 01). */
function ghostWall(panel, g) {
  const { x, y, w, h } = panel;
  R(x, y, w, h, BG.taupe);
  R(x, y, w, 1, BG.taupeLight);
  R(x, y + h - 1, w, 1, BG.taupeDark);
  R(x + w - 1, y, 1, h, BG.taupeDark);
  const gx = g ? g.x + Math.round((g.w - GHOST_W) / 2) : x + Math.round((w - GHOST_W) / 2);
  const gy = g ? g.y + Math.round((g.h - GHOST_H) / 2) : y + Math.round((h - GHOST_H) / 2);
  ghost(gx + 1, gy + 1, BG.taupeDark); // painted edge shadow
  ghost(gx, gy, BG.ghost, 1, { eye: BG.taupeDark });
}

/**
 * Glowing white LED ghost and wordmark above the bar, a blue bloom behind. Side by side like the
 * web logo when the sign is wide enough, else the ghost above the wordmark.
 */
function ledLogo(item, env) {
  const { x, y, w, h } = item;
  const gw = GHOST_W / 2;
  const gh = GHOST_H / 2;
  const tw = textWidth('BlueGhost');
  let tx;
  let ty;
  let gx;
  let gy;
  if (tw + 3 + gw <= w) {
    tx = x + Math.round((w - tw - 3 - gw) / 2);
    ty = y + Math.round((h - 7) / 2);
    gx = tx + tw + 3;
    gy = ty - gh + 7;
  } else {
    gx = x + Math.round((w - gw) / 2);
    gy = y + 1;
    tx = x + Math.round((w - tw) / 2);
    ty = gy + gh + 2;
  }
  bloom(x + w / 2, y + h / 2, w * 0.62, 'rgba(51,187,207,A)', env.dark ? 0.55 : 0.32);
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    pixelText('BlueGhost', tx + dx, ty + dy, 'rgba(120,214,236,0.55)');
    ghost(gx + dx, gy + dy, 'rgba(120,214,236,0.55)', 0.5, { mirror: true });
  }
  pixelText('BlueGhost', tx, ty, '#ffffff');
  ghost(gx, gy, '#ffffff', 0.5, { mirror: true });
  R(tx + tw + 1, ty - 1, 1, 1, '#ffffff'); // ®
  env.lights.push({ x: x + w / 2, y: y + h / 2, r: w * 0.75, s: 0.9 });
  env.lights.push({ x: x + w / 2, y: y + h + 18, r: w * 0.6, s: 0.5 });
}

/**
 * TV above the reception: clock, date and the subscription limits (5 h window and week); during a
 * token strike the limits give way to the strike notice and when it ends.
 */
function tvClock(item, date) {
  const { x, y, w, h } = item;
  R(x, y, w, h, BG.black);
  R(x + 1, y + 1, w - 2, h - 2, '#0d1117');
  R(x + 1, y + 1, w - 2, 1, '#1d2430');
  text(`${pad2(date.getHours())}:${pad2(date.getMinutes())}`, x + w / 2, y + 10, 7, '#f4f1ea');
  text(`${WEEKDAYS[date.getDay()]} ${date.getDate()}.${date.getMonth() + 1}.`, x + w / 2, y + 15, 3, BG.brandLight);
  if (strikeActive()) {
    text('STÁVKA', x + w / 2, y + 21.5, 4.2, '#e43b44');
    const until = fmtReset(strikeUntil > Date.now() ? strikeUntil : state.limits?.fiveHour?.resetsAt);
    text(`do ${until || '?'}`, x + w / 2, y + 25.8, 2.6, '#94a3b8');
  } else {
    const bar = (label, win, by) => {
      const left = remaining(win);
      text(label, x + 3, by + 2.6, 2.6, '#94a3b8', 'left');
      R(x + 9, by, w - 14, 3, '#333c57');
      if (left != null) R(x + 9, by, ((w - 14) * left) / 100, 3, fuelColor(left));
    };
    bar('5h', state.limits?.fiveHour, y + 18);
    bar('7d', state.limits?.week, y + 23);
  }
  R(x + w / 2 - 3, y + h, 6, 1, BG.black);
}

/**
 * Meeting-room TV: the plan-mode diagram while a meeting runs at the plan board, otherwise the
 * BlueGhost screensaver (the ghost drifting over the brand blue).
 */
function tvMeeting(item, t, meeting) {
  const { x, y, w, h } = item;
  R(x, y, w, h, BG.black);
  if (meeting) {
    R(x + 1, y + 1, w - 2, h - 2, BG.paper);
    R(x + 1, y + 1, w - 2, 2, BG.brand);
    R(x + 2, y + 1, Math.min(8, w - 4), 1, '#ffffff');
    drawDiagram(x + 1, y + 4, w - 2, h - 5, t);
    return;
  }
  R(x + 1, y + 1, w - 2, h - 2, BG.brand);
  R(x + 1, y + 1, w - 2, 1, BG.brandLight);
  const span = (n, len) => (len > 0 ? Math.abs(((n % (2 * len)) + 2 * len) % (2 * len) - len) : 0);
  const gx = x + 2 + Math.round(span(t * 2.2, w - 10));
  const gy = y + 2 + Math.round(span(t * 1.5, h - 12));
  ghost(gx, gy, '#ffffff', 0.25, { mirror: true });
  R(x + 3, y + h - 4, w - 6, 1, BG.brandPale);
}

/** TV glow for the night lights (TVs are always on). */
const tvLight = (item) => ({ x: item.x + item.w / 2, y: item.y + item.h / 2, r: item.w > 24 ? 22 : 18, s: item.w > 24 ? 0.7 : 0.6 });

function whiteboard(item, draw) {
  // draw(x, y, w, h) paints the writing surface
  const { x, y, w, h } = item;
  R(x, y, w, h, '#a9aeb4');
  R(x + 1, y + 1, w - 2, h - 3, BG.paper);
  R(x + 1, y + 1, w - 2, 1, '#ffffff');
  R(x + 2, y + h - 2, w - 4, 2, BG.chrome);
  R(x + 6, y + h - 2, 3, 1, '#d04f55');
  R(x + 11, y + h - 2, 3, 1, BG.brand);
  draw(x + 1, y + 1, w - 2, h - 3);
}

/**
 * Plan-mode board: the diagram being drawn while a meeting runs, otherwise the last plan's boxes and
 * arrows with today's finished tasks ticked in the corner.
 */
function planBoard(item, t, meeting, done) {
  if (meeting) {
    whiteboard(item, (x, y, w, h) => drawDiagram(x, y, w, h, t));
    return;
  }
  planSketch(item);
  if (done > 0) {
    const { x, y, w, h } = item;
    const label = `✓${done}`;
    R(x + w - 3 - label.length * 2, y + h - 8, label.length * 2 + 1, 5, BG.paper);
    text(label, x + w - 2, y + h - 4, 3, '#38b764', 'right');
  }
}

function planSketch(item) {
  whiteboard(item, (x, y, w, h) => {
    const bw = Math.max(3, Math.floor((w - 8) / 3));
    const bh = Math.max(3, Math.min(5, Math.floor((h - 6) / 3)));
    const cols = [x + 2, x + 4 + bw, x + 6 + 2 * bw];
    const colors = [BG.brand, '#38b764', '#d04f55'];
    cols.forEach((bx, i) => R(bx, y + 2, bw, bh, colors[i]));
    R(cols[0] + bw, y + 2 + Math.floor(bh / 2), 2, 1, '#29366f');
    R(cols[1] + bw, y + 2 + Math.floor(bh / 2), 2, 1, '#29366f');
    const mid = cols[1] + Math.floor(bw / 2);
    if (h > bh * 2 + 8) {
      R(mid, y + 2 + bh, 1, 3, '#29366f');
      R(cols[1], y + 5 + bh, bw, bh, '#f8955e');
    }
    for (let ly = y + 8 + bh * 2; ly < y + h - 1; ly += 3) R(x + 2, ly, Math.max(2, w - 6 - ((ly * 3) % 7)), 1, '#9aa3ad');
  });
}

/** Dartboard with two darts. */
function darts(item) {
  const { x, y, w, h } = item;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const rad = Math.min(w, h) / 2;
  for (let yy = 0; yy < h; yy++) {
    for (let xx = 0; xx < w; xx++) {
      const dx = x + xx + 0.5 - cx;
      const dy = y + yy + 0.5 - cy;
      const d = Math.hypot(dx, dy) / rad;
      if (d > 1) continue;
      const sector = Math.floor(((Math.atan2(dy, dx) + Math.PI) / (Math.PI * 2)) * 10) % 2;
      let col = sector ? '#efe3c2' : '#1e1f22';
      if (d > 0.82) col = '#1e1f22';
      else if (d > 0.68) col = sector ? '#38b764' : '#d04f55';
      else if (d < 0.2) col = '#d04f55';
      R(x + xx, y + yy, 1, 1, col);
    }
  }
  R(cx + 1, cy - 2, 3, 1, '#f4d35e');
  R(cx - 3, cy + 1, 3, 1, BG.brandLight);
  R(x - 1, y + h + 2, w + 2, 1, '#2b3438');
}

/** Anthracite door in the back wall with a pictogram (WC, kitchen). */
function wallDoor(item, kind) {
  const { x, y, w, h } = item;
  R(x - 1, y - 1, w + 2, h + 1, BG.wallShade);
  R(x, y, w, h, BG.anthracite);
  R(x, y, w, 1, '#1f262a');
  R(x + w - 3, y + Math.round(h * 0.55), 2, 1, BG.chrome);
  R(x + 2, y + 3, w - 4, 1, BG.anthraciteLight);
  const px = x + Math.floor(w / 2) - 2;
  const py = y + 6;
  R(px - 1, py - 1, 6, 6, BG.paper);
  if (kind === 'wc') {
    R(px, py, 1, 1, BG.anthracite);
    R(px - 0.5, py + 1, 2, 3, BG.anthracite);
    R(px + 3, py, 1, 1, BG.anthracite);
    R(px + 2.5, py + 1, 2, 3, BG.anthracite);
  } else {
    R(px, py + 1, 3, 3, BG.anthracite);
    R(px + 3, py + 2, 1, 1, BG.anthracite);
    R(px + 1, py, 1, 1, '#9aa3ad');
  }
}

/**
 * Angled glass door of the recessed ground-floor meeting room: a door face running at 45° from the
 * band to its floor cells, black frame, tinted glass with a hint of the lit room behind.
 */
function angledDoor(item, m) {
  const cells = m.items.filter((i) => i.type === 'angledDoor').flatMap((i) => i.cells).sort((a, b) => a[0] - b[0]);
  if (!cells.length) return;
  // slant: from two door cells, else from the diagonal wall it continues
  const wallish = (c, r) => /[W#D]/.test(m.at(c, r));
  const [c0, r0] = cells[0];
  let slope = 1;
  if (cells.length > 1) slope = Math.sign((cells[1][1] - r0) / (cells[1][0] - c0)) || 1;
  else if (wallish(c0 - 1, r0 + 1)) slope = -1;
  const H = item.h;
  const base = (x) => Math.round(r0 * CELL + 2 + slope * (x - (c0 * CELL + 2)));
  const x0 = item.x;
  const n = item.w;
  for (let i = 0; i < n; i++) {
    const b = base(x0 + i);
    const top = b - H;
    R(x0 + i, top, 1, H, 'rgba(150,186,184,0.55)');
    R(x0 + i, top + Math.round(H * 0.45), 1, Math.round(H * 0.3), 'rgba(255,214,150,0.35)'); // warm room behind
    if (i > 1 && i < n - 2 && i % 3 === 0) R(x0 + i, top + Math.round(H * 0.5), 1, Math.round(H * 0.25), 'rgba(40,40,44,0.6)'); // chair backs
    if ((i + top) % 5 === 0) R(x0 + i, top + 3, 1, 6, 'rgba(255,255,255,0.45)'); // reflection
    R(x0 + i, top, 1, 2, BG.black);
    R(x0 + i, b - 2, 1, 2, BG.black);
    if (i < 2 || i >= n - 2) R(x0 + i, top, 1, H, BG.black);
  }
  const hx = slope > 0 ? x0 + n - 4 : x0 + 3;
  R(hx, base(hx) - Math.round(H * 0.45), 1, 3, BG.chrome);
}

/**
 * Wall shelf with bottles above the bar: under the LED sign if there is room, else in the widest
 * free stretch of wall beside it.
 */
function bottleShelf(m) {
  const bar = barRect(m);
  if (!bar) return;
  const barTop = bar.y - BAR_H;
  const blockers = m.wall.filter((w) => w.y < barTop && w.y + w.h > barTop - 16);
  const led = m.wall.find((w) => w.type === 'ledLogo' && w.x < bar.x + bar.w && w.x + w.w > bar.x);
  let span = null;
  if (led && barTop - (led.y + led.h) >= 8) {
    span = { x: Math.max(bar.x, led.x), w: Math.min(bar.x + bar.w, led.x + led.w) - Math.max(bar.x, led.x), y: barTop - 1 };
  } else {
    // free x ranges over the bar not covered by wall items
    let best = null;
    let start = null;
    for (let x = bar.x; x <= bar.x + bar.w; x++) {
      const free = x < bar.x + bar.w && !blockers.some((b) => x >= b.x - 1 && x < b.x + b.w + 1);
      if (free && start == null) start = x;
      if (!free && start != null) {
        if (!best || x - start > best.w) best = { x: start, w: x - start };
        start = null;
      }
    }
    if (best && best.w >= 6) span = { ...best, y: barTop - 9 };
  }
  if (!span) return;
  const colors = ['#3d6b3a', '#b07a2c', '#cfe3e6', '#2b2b2b', '#8c2a2a', '#d9b45a', '#4a7f8c'];
  const planks = span.y - 9 > m.floorY - BAND_PX + 12 ? [span.y, span.y - 9] : [span.y];
  for (const py of planks) {
    for (let bx = span.x + 1, i = 0; bx < span.x + span.w - 1; i++) {
      const bw = noise(bx * 7 + py) > 0.6 ? 2 : 1;
      const bh = 3 + Math.floor(noise(bx * 13 + py) * 4);
      const col = colors[(i * 3 + py) % colors.length];
      R(bx, py - bh, bw, bh, col);
      R(bx, py - bh - 1, 1, 1, '#2a2a2a');
      if (bw === 2) R(bx, py - bh + 1, 1, bh - 2, 'rgba(255,255,255,0.25)');
      bx += bw + 1;
    }
    R(span.x, py, span.w, 1, '#5e4630');
    R(span.x, py + 1, span.w, 1, 'rgba(0,0,0,0.25)');
  }
}

/** Is this TV the one above the reception (clock and limits)? */
function isReceptionTv(m, tv) {
  const reception = m.of('reception')[0];
  return Boolean(reception && tv.x < reception.x + reception.w && tv.x + tv.w > reception.x);
}

/** Everything static hanging on the back wall (the base layer); TVs only add their glow to the lights. */
export function drawWallItems(m, env) {
  const panel = m.wall.find((w) => w.type === 'ghostPanel');
  const g = m.wall.find((w) => w.type === 'ghost');
  if (panel) ghostWall(panel, g);
  const doors = m.wall.filter((w) => w.type === 'door').sort((a, b) => a.x - b.x);
  for (const w of m.wall) {
    switch (w.type) {
      case 'ledLogo': ledLogo(w, env); break;
      case 'tv': env.lights.push(tvLight(w)); break;
      case 'darts': darts(w); break;
      case 'door': wallDoor(w, doors.indexOf(w) === 0 ? 'wc' : 'kitchen'); break;
      case 'angledDoor': angledDoor(w, m); break;
      default:
    }
  }
  bottleShelf(m);
}

/**
 * Live wall items as drawables behind everything else on the floor (depth -1): TVs, the plan board,
 * the director's task board and the employee-of-the-week portrait.
 * @param {{ t: number, date: Date, meeting: boolean, director: object, done: number }} live
 */
export function wallItemDrawables(m, live, items) {
  for (const w of m.wall) {
    const box = { x: w.x - 1, y: w.y - 1, w: w.w + 2, h: w.h + 3 };
    let draw = null;
    switch (w.type) {
      case 'tv':
        draw = isReceptionTv(m, w) ? () => tvClock(w, live.date) : () => tvMeeting(w, live.t, live.meeting);
        break;
      case 'planBoard': draw = () => planBoard(w, live.t, live.meeting, live.done); break;
      case 'taskBoard': draw = () => drawTaskBoard(live.director, w); break;
      case 'portrait': draw = () => drawPortrait(w, live.t); break;
      default:
    }
    if (draw) items.push({ y: -1, box, draw });
  }
}


// ---- spider chandeliers

/**
 * "Spider" chandelier (photos 01, 04): small black ceiling plate, thin cords sagging out to hooks
 * and dropping to 5 bare warm bulbs at different heights. (x, y) = the floor point of its map marker.
 */
function spiderLamp(x, y, seed, env) {
  const cy = y - 46;
  const cord = 'rgba(20,22,24,0.95)';
  R(x - 2, cy, 5, 1, BG.black);
  R(x - 1, cy + 1, 3, 1, BG.black);
  const n = 5;
  for (let i = 0; i < n; i++) {
    const a = (i / (n - 1)) * 2 - 1; // -1 … 1
    const hx = x + Math.round(a * (7 + ((seed + i) % 3)));
    const drop = 6 + ((seed * 7 + i * 5) % 8) + Math.round((1 - Math.abs(a)) * 3);
    const span = hx - x;
    for (let k = 0; k <= Math.abs(span); k++) {
      const t = span ? k / Math.abs(span) : 0;
      R(x + Math.sign(span) * k, cy + 1 + Math.round(Math.sin(t * Math.PI) * 2.5), 0.5, 0.5, cord);
    }
    R(hx, cy + 1, 0.5, drop, cord);
    R(hx - 0.25, cy + 1 + drop, 1, 1, BG.black);
    R(hx - 0.25, cy + 2 + drop, 1, 2, BG.bulb);
    if (env.dark) R(hx - 0.25, cy + 2 + drop, 1, 1, '#fff6dc');
    env.lights.push({ x: hx, y: cy + 3 + drop, r: env.dark ? 16 : 8, s: 0.75 });
  }
  bloom(x, cy + 12, 18, 'rgba(255,210,122,A)', env.dark ? 0.32 : 0.08);
  if (env.dark) env.lights.push({ x, y: y - 4, r: 30, s: 0.55 });
}

/** One spider lamp per `*` marker of the map. */
export function drawLamps(m, env) {
  m.lamps.forEach((p, i) => spiderLamp(p.x, p.y, i * 3 + 1, env));
}


// ---- skylight beams

/** Warm slanted light shafts from the skylights during the day (none at night): soft trapezoids. */
export function drawBeams(m, env) {
  const h = env.hour;
  if (h < 7 || h >= 19) return;
  const warm = h >= 17 ? '255,190,120' : '255,246,222';
  const a = h >= 17 ? 0.05 : 0.075;
  const shift = m.floorY - 48; // a shallower floor moves the pools forward
  const spots = m.floor === 'upper' ? [[104, 92], [232, 132], [36, 70]] : [[88, 96], [150, 104], [262, 120]];
  for (const [fx, fy0] of spots) {
    const fy = Math.min(124, fy0 + Math.round(shift * 0.6));
    const top = fy - 44;
    for (let yy = top; yy < fy; yy++) {
      const k = (yy - top) / (fy - top);
      const w = Math.round(8 + k * 10);
      const x = Math.round(fx - 8 + k * 10 - w / 2);
      const alpha = a * (0.25 + k * 0.75);
      R(x, yy, w, 1, `rgba(${warm},${alpha.toFixed(3)})`);
      R(x + 2, yy, w - 4, 1, `rgba(${warm},${(alpha * 0.6).toFixed(3)})`);
    }
    R(fx - 7, fy - 1, 18, 4, `rgba(${warm},${(a * 0.7).toFixed(3)})`);
    R(fx - 5, fy, 14, 2, `rgba(${warm},${(a * 0.5).toFixed(3)})`);
  }
}
