/** Raw concrete columns, the steel railing round the stairwell and the anthracite steel staircase. */
import { R } from '../../core/canvas.js';
import { BG } from '../../core/palette.js';
import { noise } from '../../core/util.js';
import { CELL } from '../../world/map.js';

/** Projected height of a cut column shaft (taller than people, cut like the walls). */
export const COLUMN_H = 34;

/**
 * Raw concrete column: cut top section, shaft with patina, contact shadow. `behind` = another column
 * stands right in front of it in the view: drawn darker, so the two read as two.
 */
export function drawColumn(item, behind = false) {
  const { x, y, w, h } = item;
  const top = y + h - COLUMN_H;
  R(x + w, y + h - 3, 2, 3, 'rgba(0,0,0,0.12)');
  R(x - 1, top - h + 1, w + 2, COLUMN_H + h - 1, '#6b6861'); // outline
  R(x, top, w, COLUMN_H, BG.concrete);
  R(x, top, 1, COLUMN_H, BG.concreteLight);
  R(x + w - 1, top, 1, COLUMN_H, BG.concreteDark);
  for (let yy = top + 2; yy < y + h - 1; yy++) {
    for (let xx = x + 1; xx < x + w - 1; xx++) {
      const v = noise(xx * 131 + yy * 17);
      if (v > 0.9) R(xx, yy, 1, v > 0.96 ? 2 : 1, BG.concreteDark);
      else if (v < 0.07) R(xx, yy, 1, 1, BG.concreteLight);
    }
  }
  // formwork joints
  for (let yy = top + 9; yy < y + h - 2; yy += 10) R(x + 1, yy, w - 2, 1, 'rgba(125,122,114,0.6)');
  // cut top
  R(x, top - h + 2, w, h - 2, BG.concreteCut);
  R(x, top - h + 2, w, 1, BG.concreteLight);
  R(x, top, w, 1, BG.concreteDark);
  if (behind) R(x, top - h + 2, w, COLUMN_H + h - 2, 'rgba(30,28,24,0.22)');
}

/** Columns with another one right in front of them (same x, overlapping in the view). */
export function columnsBehind(columns) {
  return new Set(columns.filter((a) => columns.some((b) => b !== a && b.x === a.x && b.y > a.y && b.y - a.y < COLUMN_H + a.h)));
}

/**
 * Steel railing (dark grey, posts every 6 px, handrail and knee rail). Horizontal runs face the
 * viewer; runs along the depth are seen edge-on.
 */
export function railingDrawables(item, items) {
  const RH = 11;
  for (const rc of item.rects) {
    const x = rc.c * CELL;
    const y = rc.r * CELL;
    if (rc.w >= rc.h) {
      const w = rc.w * CELL;
      const foot = y + CELL - 1;
      items.push({
        y: foot,
        draw: () => {
          for (let px = x + 1; px < x + w; px += 6) R(px, foot - RH, 1, RH, BG.steel);
          R(x, foot - RH, w, 1, BG.steelLight);
          R(x, foot - RH + 1, w, 1, BG.steel);
          R(x, foot - 5, w, 1, BG.steel);
        },
      });
    } else {
      for (let i = 0; i < rc.h; i++) {
        const foot = y + i * CELL + CELL - 1;
        const px = x;
        items.push({
          y: foot,
          draw: () => {
            R(px, foot - RH - 3, 1, RH + 3, BG.steel);
            R(px, foot - RH - CELL + 1, 1, CELL, BG.steelLight);
          },
        });
      }
    }
  }
}

/**
 * Straight steel staircase with open treads rising towards the west end (the item start); one tread
 * per map column, tread depth = the flight's width in the map, about 2.6 px rise per tread.
 */
export function drawStairs(item) {
  const { x, y, w, h } = item;
  const n = item.box.w;
  const step = Math.min(2.6, 46 / n);
  // shadow on the floor under the flight
  R(x, y + 2, w, h - 2, 'rgba(0,0,0,0.10)');
  for (let k = 0; k < n; k++) {
    // k = 0 is the lowest tread at the east end
    const tx = x + w - (k + 1) * CELL;
    const top = y - Math.round((k + 1) * step);
    R(tx, top, CELL - 1, h - 1, BG.steelLight);
    R(tx, top, CELL - 1, 1, '#71757b');
    R(tx, top + h - 2, CELL - 1, 1, BG.steelDark);
    R(tx + CELL - 1, top + 1, 1, h - 2, 'rgba(20,22,24,0.55)'); // open riser
  }
  // steel supports under the raised part (whatever stands beneath the flight shows between them)
  for (const fx of [0.08, 0.45]) {
    const px = x + Math.round(w * fx);
    const sy = Math.round(y + h - 1 - ((w - (px - x)) / CELL) * step);
    R(px, sy + 2, 2, y + h - sy - 2, BG.steel);
    R(px, sy + 2, 1, y + h - sy - 2, BG.steelLight);
  }
  // near stringer along the facade side
  for (let i = 0; i < w; i++) {
    const sy = Math.round(y + h - 1 - ((w - i) / CELL) * step);
    R(x + i, sy, 1, 3, BG.steel);
    R(x + i, sy + 2, 1, 1, BG.steelDark);
  }
  // railing on the open (hall) side, same steel as upstairs: posts on the treads, rails along the slope
  const RH = 11;
  for (let i = 0; i < w; i++) {
    const edge = Math.round(y - ((w - i) / CELL) * step);
    R(x + i, edge - RH, 1, 1, BG.steelLight);
    R(x + i, edge - RH + 1, 1, 1, BG.steel);
    R(x + i, edge - 5, 1, 1, BG.steel);
    if (i % 8 === 2) R(x + i, edge - RH, 1, RH, BG.steel);
  }
}
