/** Desk monitor contents. */
import { R } from '../core/canvas.js';
import { C } from '../core/palette.js';
import { noise, pick, shade } from '../core/util.js';

export function screenActivity(w) {
  if (!w || w.leaving) return 'off';
  if (w.place !== 'desk') return 'sleeping';
  if (w.waiting) return 'waiting';
  return w.activity;
}


export function drawScreen(d, act, t) {
  const x = d.cx - 10;
  const y = d.deskY - 11;
  const w = 20;
  const h = 12;
  const tick = Math.floor(t * 5);
  const codeColors = [C.teal, C.yellow, C.purple, C.lime, C.metal, C.orange];

  const codeLines = (speed, bright) => {
    const scroll = Math.floor(t * speed);
    for (let i = 0; i < 5; i++) {
      const n = d.seed + scroll + i;
      const indent = Math.floor(noise(n * 3) * 3) * 2;
      const len = i === 4 && speed > 0 ? 2 + (tick % 10) : 3 + Math.floor(noise(n) * 11);
      const color = codeColors[n % codeColors.length];
      R(x + 4 + indent, y + 1.5 + i * 2, Math.min(len, w - 5 - indent), 1, bright ? color : shade(color, -0.55));
    }
  };

  switch (act) {
    case 'typing':
    case 'phone':
      R(x, y, w, h, '#1e2233');
      R(x, y, 3, h, C.trim);
      codeLines(act === 'typing' ? 1.5 : 0.4, true);
      break;
    case 'planning': {
      R(x, y, w, h, '#e8e6d9');
      const notes = [C.yellow, C.lime, C.orange, C.teal, '#ff9ec4'];
      for (let i = 0; i < 6; i++) {
        const col = i % 3;
        const row = Math.floor(i / 3);
        if ((i + tick) % 9 === 0) continue;
        R(x + 1.5 + col * 6.5, y + 1.5 + row * 5, 4, 4, notes[(i + d.seed) % notes.length]);
      }
      break;
    }
    case 'terminal': {
      R(x, y, w, h, '#0d1117');
      const scroll = Math.floor(t * 4);
      for (let i = 0; i < 5; i++) {
        const n = d.seed * 3 + scroll + i;
        R(x + 1, y + 1.5 + i * 2, 1, 1, C.lime);
        R(x + 3, y + 1.5 + i * 2, 2 + Math.floor(noise(n) * 14), 1, i === 4 ? C.white : C.green);
      }
      if (tick % 2) R(x + 18, y + 9.5, 1, 1, C.white);
      break;
    }
    case 'reading': {
      R(x, y, w, h, C.paper);
      const scroll = Math.floor(t * 1.2);
      for (let i = 0; i < 5; i++) {
        const n = d.seed + scroll + i;
        R(x + 2, y + 1.5 + i * 2, 4 + Math.floor(noise(n) * 12), 1, (n % 4 === 0) ? C.metalDark : '#9aa3b5');
      }
      R(x + w - 1.5, y + 1 + (scroll % 8), 1, 3, C.metalDark);
      break;
    }
    case 'web':
      R(x, y, w, h, C.white);
      R(x, y, w, 2, C.blue);
      R(x + 2, y + 3, 16, 2, '#d0d6e2');
      R(x + 2, y + 6, 6, 5, pick([C.orange, C.purple, C.green], Math.floor(t / 2)));
      R(x + 10, y + 6, 8, 1, '#9aa3b5');
      R(x + 10, y + 8, 6, 1, '#9aa3b5');
      R(x + 10, y + 10, 7, 1, '#9aa3b5');
      break;
    case 'thinking': {
      R(x, y, w, h, '#1e2233');
      R(x, y, 3, h, C.trim);
      codeLines(0, false);
      const spin = tick % 4;
      R(x + 9 + (spin === 1 ? 2 : spin === 3 ? -2 : 0), y + 5 + (spin === 0 ? -2 : spin === 2 ? 2 : 0), 2, 2, C.white);
      break;
    }
    case 'waiting': {
      R(x, y, w, h, '#1e2233');
      codeLines(0, false);
      const blink = tick % 4 < 2;
      R(x + 2, y + 2, 16, 8, C.ink);
      R(x + 2.5, y + 2.5, 15, 7, blink ? C.yellow : C.orange);
      R(x + 4, y + 4, 9, 1, C.ink);
      R(x + 4, y + 7, 4, 1.5, C.green);
      R(x + 10, y + 7, 4, 1.5, C.red);
      break;
    }
    case 'surfing':
      drawFunScreen(x, y, w, h, Math.floor(t / 7 + d.seed) % 3, t);
      break;
    case 'idle':
      R(x, y, w, h, '#1e2233');
      R(x, y, 3, h, C.trim);
      codeLines(0, false);
      break;
    case 'sleeping': {
      R(x, y, w, h, '#0b0d18');
      const px = Math.abs(((t * 6) % 34) - 17);
      const py = Math.abs(((t * 4) % 18) - 9);
      R(x + 1 + px, y + 1 + py, 2, 1, codeColors[Math.floor(t) % codeColors.length]);
      break;
    }
    default:
      R(x, y, w, h, '#151827');
      R(x + 2, y + 1, 1, 4, '#262b44');
      R(x + 4, y + 1, 1, 2, '#262b44');
  }
}


/** Procrastination content: 0 = video, 1 = social feed, 2 = cat. */
export function drawFunScreen(x, y, w, h, kind, t) {
  if (kind === 0) {
    R(x, y, w, h, C.ink);
    R(x + 1, y + 1, w - 2, h - 4, '#29366f');
    const bx = x + 2 + Math.abs(((t * 8) % 28) - 14);
    R(bx, y + 3 + Math.abs(Math.sin(t * 4)) * -1.5 + 1.5, 3, 3, C.yellow);
    R(x + 1, y + h - 2, w - 2, 1, C.chair);
    R(x + 1, y + h - 2, ((t * 1.5) % (w - 2)), 1, C.red);
    return;
  }
  if (kind === 1) {
    R(x, y, w, h, C.white);
    const scroll = (t * 3) % 8;
    for (let i = -1; i < 3; i++) {
      const py = y + 1 + i * 8 - scroll + 8;
      if (py < y || py > y + h - 2) continue;
      R(x + 2, py, 6, Math.min(5, y + h - py), pick([C.orange, C.purple, C.blue, C.green], i + Math.floor(t / 2.7)));
      R(x + 10, py + 1, 8, 1, '#9aa3b5');
      R(x + 10, py + 3, 5, 1, '#9aa3b5');
    }
    return;
  }
  // cat
  R(x, y, w, h, '#ff9ec4');
  const tail = Math.floor(t * 4) % 2;
  R(x + 6, y + 5, 8, 5, C.orange);       // body
  R(x + 11, y + 2, 5, 4, C.orange);      // head
  R(x + 11, y + 1, 1, 1, C.orange);      // ears
  R(x + 15, y + 1, 1, 1, C.orange);
  R(x + 12, y + 3, 1, Math.floor(t * 1.3) % 5 ? 1 : 0.3, C.ink);
  R(x + 14, y + 3, 1, Math.floor(t * 1.3) % 5 ? 1 : 0.3, C.ink);
  R(x + 4, y + 3 + tail, 2, 3, C.orange); // tail
  R(x + 7, y + 10, 1, 1, C.orange);
  R(x + 12, y + 10, 1, 1, C.orange);
}
