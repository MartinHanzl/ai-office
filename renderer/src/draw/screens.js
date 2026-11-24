/**
 * Live desk screens: what a worker's monitor shows, from a full screen facing the viewer (8×6 px on the
 * BlueGhost desks) down to the 2×5 px side-on strip of a profile desk, plus the attention frame, the
 * smoke of a failed tool and the coffee mugs piling up with a full context.
 */
import { R } from '../core/canvas.js';
import { C } from '../core/palette.js';
import { noise, pick, shade } from '../core/util.js';

export function screenActivity(w) {
  if (!w || w.leaving) return 'off';
  if (w.place !== 'desk') return 'sleeping';
  if (w.waiting) return 'waiting';
  return w.activity;
}

const CODE = [C.teal, C.yellow, C.purple, C.lime, C.metal, C.orange];

/** Code lines every other pixel row, `speed` rows per second scrolling, dimmed unless `bright`. */
function codeLines(x, y, w, h, seed, t, speed, bright, gutter) {
  const scroll = Math.floor(t * speed);
  const tick = Math.floor(t * 5);
  const rows = Math.ceil(h / 2);
  for (let i = 0; i < rows; i++) {
    const n = seed + scroll + i;
    const indent = w > 4 ? Math.floor(noise(n * 3) * 2) : 0;
    const room = w - gutter - indent;
    const len = i === rows - 1 && speed > 0 ? 1 + (tick % room) : 1 + Math.floor(noise(n) * room);
    const color = CODE[n % CODE.length];
    R(x + gutter + indent, y + i * 2, Math.min(len, room), 1, bright ? color : shade(color, -0.55));
  }
}

/**
 * Screen content in a rect. Narrow rects (≤ 3 px wide) are the side-on screens of profile desks: only
 * the colours of the activity show.
 */
export function drawScreen(rect, act, t, seed = 0) {
  const { x, y, w, h } = rect;
  const tick = Math.floor(t * 5);
  const side = w <= 3;
  const gutter = side ? 0 : 1;
  switch (act) {
    case 'typing':
    case 'phone':
      R(x, y, w, h, '#1e2233');
      if (!side) R(x, y, 1, h, C.trim);
      codeLines(x, y, w, h, seed, t, act === 'typing' ? 1.5 : 0.4, true, gutter);
      break;
    case 'planning':
      R(x, y, w, h, '#e8e6d9');
      for (let i = 0; i < (side ? 2 : 4); i++) {
        if ((i + tick) % 9 === 0) continue;
        const nx = side ? x + (i % 2) : x + 1 + (i % 2) * 4;
        const ny = side ? y + 1 + i * 2 : y + 1 + Math.floor(i / 2) * 3;
        R(nx, ny, side ? 1 : 2, side ? 1 : 2, [C.yellow, C.lime, C.orange, C.teal, '#ff9ec4'][(i + seed) % 5]);
      }
      break;
    case 'terminal': {
      R(x, y, w, h, '#0d1117');
      const scroll = Math.floor(t * 4);
      for (let i = 0; i * 2 < h; i++) {
        const n = seed * 3 + scroll + i;
        if (!side) R(x, y + i * 2, 1, 1, C.lime);
        R(x + gutter + (side ? 0 : 1), y + i * 2, side ? 1 + (n % 2) : 1 + Math.floor(noise(n) * (w - 2)), 1, i * 2 + 2 >= h ? C.white : C.green);
      }
      if (!side && tick % 2) R(x + w - 1, y + h - 1, 1, 1, C.white);
      break;
    }
    case 'reading': {
      R(x, y, w, h, C.paper);
      const scroll = Math.floor(t * 1.2);
      for (let i = 0; i * 2 < h; i++) {
        const n = seed + scroll + i;
        R(x + (side ? 0 : 1), y + i * 2, side ? 1 + (n % 2) : 2 + Math.floor(noise(n) * (w - 4)), 1, n % 4 === 0 ? C.metalDark : '#9aa3b5');
      }
      if (!side) R(x + w - 1, y + (scroll % Math.max(1, h - 2)), 1, 2, C.metalDark);
      break;
    }
    case 'web':
      R(x, y, w, h, C.white);
      R(x, y, w, 1, C.blue);
      if (side) {
        R(x, y + 2, w, 2, pick([C.orange, C.purple, C.green], Math.floor(t / 2)));
        break;
      }
      R(x + 1, y + 2, 3, h - 3, pick([C.orange, C.purple, C.green], Math.floor(t / 2)));
      for (let ly = y + 2; ly < y + h - 1; ly += 2) R(x + 5, ly, w - 6, 1, '#9aa3b5');
      break;
    case 'thinking': {
      R(x, y, w, h, '#1e2233');
      codeLines(x, y, w, h, seed, t, 0, false, gutter);
      const spin = tick % 4;
      const cx = x + Math.floor(w / 2) - (side ? 1 : 0);
      const cy = y + Math.floor(h / 2);
      R(cx + (spin === 1 ? 1 : spin === 3 ? -1 : 0), cy + (spin === 0 ? -1 : spin === 2 ? 1 : 0), 1, 1, C.white);
      break;
    }
    case 'waiting': {
      const blink = tick % 4 < 2;
      R(x, y, w, h, blink ? C.yellow : C.orange);
      if (side) break;
      R(x + 1, y + 1, w - 2, 1, C.ink);
      R(x + 1, y + h - 2, 2, 1, C.green);
      R(x + w - 3, y + h - 2, 2, 1, C.red);
      break;
    }
    case 'surfing':
      funScreen(x, y, w, h, Math.floor(t / 7 + seed) % 3, t);
      break;
    case 'idle':
      R(x, y, w, h, '#1e2233');
      codeLines(x, y, w, h, seed, t, 0, false, gutter);
      break;
    case 'sleeping': {
      // screensaver: a pixel bouncing about
      R(x, y, w, h, '#0b0d18');
      const px = w > 1 ? Math.abs(((t * 3) % (2 * (w - 1))) - (w - 1)) : 0;
      const py = h > 1 ? Math.abs(((t * 2) % (2 * (h - 1))) - (h - 1)) : 0;
      R(x + Math.round(px), y + Math.round(py), 1, 1, CODE[Math.floor(t) % CODE.length]);
      break;
    }
    default:
      R(x, y, w, h, '#151827');
      R(x, y, 1, Math.min(2, h), '#262b44');
  }
}

/** Procrastination content: 0 = video, 1 = social feed, 2 = cat. */
function funScreen(x, y, w, h, kind, t) {
  if (kind === 0) {
    R(x, y, w, h, '#29366f');
    const bx = w > 2 ? Math.abs(((t * 4) % (2 * (w - 2))) - (w - 2)) : 0;
    R(x + Math.round(bx), y + 1, Math.min(2, w), Math.min(2, h - 2), C.yellow);
    R(x, y + h - 1, w, 1, C.chair);
    R(x, y + h - 1, Math.max(1, Math.round((t * 0.5) % w)), 1, C.red);
    return;
  }
  if (kind === 1) {
    R(x, y, w, h, C.white);
    const scroll = Math.floor(t * 3) % 4;
    for (let i = -1; i < h / 2; i++) {
      const py = y + i * 4 - scroll + 4;
      if (py < y || py >= y + h) continue;
      R(x, py, Math.min(2, w), Math.min(2, y + h - py), pick([C.orange, C.purple, C.blue, C.green], i + Math.floor(t / 2.7) + 2));
      if (w > 4) R(x + 3, py, w - 4, 1, '#9aa3b5');
    }
    return;
  }
  // cat
  R(x, y, w, h, '#ff9ec4');
  const tail = Math.floor(t * 4) % 2;
  if (w <= 3) {
    R(x, y + 2, w, 2, C.orange);
    return;
  }
  R(x + 1, y + h - 3, w - 3, 2, C.orange);
  R(x + w - 3, y + h - 5, 2, 2, C.orange);
  R(x + w - 2, y + h - 4, 1, 1, C.ink);
  R(x, y + h - 4 + tail, 1, 2, C.orange);
}

/** Attention frame round a monitor (the worker waits for a permission): blinks red. */
export function drawAttention(frame, t) {
  if (!(Math.floor(t * 3) % 2)) return;
  const { x, y, w, h } = frame;
  R(x - 1, y - 1, w + 2, 1, C.red);
  R(x - 1, y + h, w + 2, 1, C.red);
  R(x - 1, y, 1, h, C.red);
  R(x + w, y, 1, h, C.red);
}

/** A failed tool: grey smoke rising from the monitor. */
export function drawSmoke(frame, t) {
  const cx = frame.x + frame.w / 2;
  for (let i = 0; i < 3; i++) {
    const p = (t * 1.1 + i / 3) % 1;
    const size = 1 + p * 2.5;
    R(cx - 3 + i * 3 + Math.sin(t * 3 + i) - size / 2, frame.y - 1 - p * 10, size, size * 0.8, `rgba(148,163,184,${(0.8 * (1 - p)).toFixed(2)})`);
  }
}

/** Fuller context → more coffee mugs on the desk (up to 3), in a row from (x, y) away from the sitter (dir). */
export function drawMugs(x, y, dir, context, seed = 0) {
  const n = context >= 50 ? Math.min(3, 1 + Math.floor((context - 50) / 17)) : 0;
  for (let i = 0; i < n; i++) {
    const mx = x + dir * i * 3;
    R(mx, y - 2, 2, 2, '#f4f3ef');
    R(mx, y - 2, 2, 1, [C.orange, C.purple, C.green][(i + seed) % 3]);
  }
  return n;
}
