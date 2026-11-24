/** Scene helpers shared by the office renderer: sky by hour, the plan-mode diagram, the employee-of-the-week portrait. */
import { R, clipLogical, ctx } from '../core/canvas.js';
import { BG, C } from '../core/palette.js';
import { figure } from './figure.js';
import { lookFor } from '../entities/look.js';
import { state } from '../state.js';

/**
 * Plan-mode diagram drawn step by step into a rect (whiteboard or TV): three boxes with arrows, one
 * hanging below the middle one, notes underneath; parts appear one by one and start over.
 */
export function drawDiagram(x, y, w, h, t) {
  const gap = 2;
  const bw = Math.max(3, Math.floor((w - 2 - gap * 2) / 3));
  const bh = Math.max(2, Math.min(4, Math.floor((h - 4) / 3)));
  const cols = [x + 1, x + 1 + bw + gap, x + 1 + 2 * (bw + gap)];
  const row0 = y + 1;
  const row1 = row0 + bh + 2;
  const mid = row0 + Math.floor(bh / 2);
  const parts = [
    () => R(cols[0], row0, bw, bh, C.blue),
    () => R(cols[0] + bw, mid, gap, 1, C.ink),
    () => R(cols[1], row0, bw, bh, C.green),
    () => R(cols[1] + Math.floor(bw / 2), row0 + bh, 1, 2, C.ink),
    () => R(cols[1], row1, bw, bh, C.orange),
    () => R(cols[1] + bw, mid, gap, 1, C.ink),
    () => R(cols[2], row0, bw, bh, C.purple),
    () => {
      for (let ly = row1 + 1, i = 0; ly < y + h - 1; ly += 2, i++) {
        if (ly >= row1 && ly < row1 + bh) R(cols[0], ly, bw - (i % 2), 1, C.metal);
        else R(cols[0], ly, Math.max(2, w - 4 - ((i * 5) % 7)), 1, C.metal);
      }
    },
  ];
  const shown = Math.floor((t * 0.8) % (parts.length + 4));
  parts.slice(0, Math.min(shown + 1, parts.length)).forEach((draw) => draw());
}


/**
 * Employee of the week in a gold frame (the `F` rect on the back wall): their figure from the stats
 * module, a placeholder silhouette until there is one, a star under the picture.
 */
export function drawPortrait({ x, y, w, h }, t) {
  R(x, y, w, h, '#c8a24a');
  R(x + 1, y + 1, w - 2, h - 2, '#a8842e');
  const inner = { x: x + 2, y: y + 2, w: w - 4, h: h - 8 };
  R(inner.x, inner.y, inner.w, inner.h, BG.brandInk);
  const cx = x + Math.floor(w / 2);
  const eow = state.employeeOfWeek;
  if (eow) {
    clipLogical(inner.x, inner.y, inner.w, inner.h);
    figure(cx, inner.y + inner.h + 12, lookFor(eow.key, eow.level), { view: 'front', arms: 'down', face: 'smile', t }, 1.25);
    ctx.restore();
  } else {
    R(cx - 3, y + 6, 6, 6, '#e8b48a');
    R(cx - 3, y + 5, 6, 2, '#5d3f2a');
    R(cx - 5, y + 13, 10, h - 19, BG.brand);
    R(cx - 1, y + 12, 2, 1, '#e8b48a');
  }
  const sy = y + h - 5;
  R(cx - 2, sy + 1, 5, 1, '#f4d35e');
  R(cx - 1, sy, 3, 3, '#f4d35e');
  R(cx, sy - 1, 1, 1, '#f4d35e');
}


export function skyFor(hour) {
  if (hour >= 7 && hour < 17) return { top: '#73eff7', bottom: '#41a6f6', city: '#5d6dd8', night: false };
  if (hour >= 17 && hour < 20) return { top: '#ef7d57', bottom: '#b55088', city: '#5d275d', night: false };
  if (hour >= 5 && hour < 7) return { top: '#f4d35e', bottom: '#ef7d57', city: '#5d275d', night: false };
  return { top: '#1a1c2c', bottom: '#29366f', city: '#14162a', night: true };
}
