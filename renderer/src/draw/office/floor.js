/** Floors of the BlueGhost office: carpet, chill island with its zigzag edge, hall, wood, cobbles, glass panel, stairwell. */
import { R } from '../../core/canvas.js';
import { BG } from '../../core/palette.js';
import { noise } from '../../core/util.js';
import { CELL, COLS, ROWS } from '../../world/map.js';

/** Floor material of a cell: '.' is carpet upstairs and the smooth hall floor downstairs. */
export function material(m, c, r) {
  const f = m.floorAt(c, r);
  return f === 'floor' ? (m.floor === 'upper' ? 'carpet' : 'hall') : f;
}

const n2 = (x, y) => noise(x * 7919 + y * 104729);

/** Upper-floor carpet tiles: a darker and a lighter grey in a checkerboard, 8×8 px, soft joints, fibre texture. */
export const TILE = 8;

function carpet(x, y, w, h) {
  for (let ty = Math.floor(y / TILE) * TILE; ty < y + h; ty += TILE) {
    for (let tx = Math.floor(x / TILE) * TILE; tx < x + w; tx += TILE) {
      const x0 = Math.max(x, tx);
      const y0 = Math.max(y, ty);
      const x1 = Math.min(x + w, tx + TILE);
      const y1 = Math.min(y + h, ty + TILE);
      const light = ((tx + ty) / TILE) % 2 === 1;
      R(x0, y0, x1 - x0, y1 - y0, light ? BG.tileLight : BG.tileDark);
      // soft edges: a mid-tone joint along the top and left of every tile
      if (ty >= y) R(x0, ty, x1 - x0, 1, BG.tileJoint);
      if (tx >= x) R(tx, y0, 1, y1 - y0, BG.tileJoint);
    }
  }
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      const v = n2(xx, yy);
      if (v < 0.84) continue;
      const light = ((Math.floor(xx / TILE) + Math.floor(yy / TILE)) % 2) === 1;
      R(xx, yy, 1, 1, light ? BG.tileLightSpeck : BG.tileDarkSpeck);
    }
  }
}

/** Chill-zone carpet: a light grey island, close to the average tone of the tiles around it. */
function chill(x, y, w, h) {
  R(x, y, w, h, BG.lounge);
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      const v = n2(xx + 3, yy);
      if (v > 0.92) R(xx, yy, 1, 1, BG.loungeSpeck);
      else if (v < 0.06) R(xx, yy, 1, 1, BG.loungeB);
    }
  }
}

function hall(x, y, w, h) {
  R(x, y, w, h, BG.hall);
  // large poured-floor slabs with faint joints and a soft sheen
  for (let yy = Math.ceil(y / 24) * 24; yy < y + h; yy += 24) R(x, yy, w, 1, BG.hallB);
  for (let xx = Math.ceil(x / 40) * 40; xx < x + w; xx += 40) R(xx, y, 1, h, BG.hallB);
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      if (n2(xx, yy + 11) > 0.965) R(xx, yy, 2, 1, BG.hallShine);
    }
  }
}

function wood(x, y, w, h) {
  // planks 3 px wide + 1 px joint, staggered ends
  for (let yy = y; yy < y + h; yy++) {
    const row = Math.floor(yy / 4);
    if (yy % 4 === 3) {
      R(x, yy, w, 1, BG.woodSeam);
      continue;
    }
    let xx = x;
    while (xx < x + w) {
      const start = Math.floor((xx + (row % 3) * 9) / 22) * 22 - (row % 3) * 9;
      const end = Math.min(x + w, start + 22);
      const tone = [BG.wood, BG.woodB, BG.woodLight][Math.floor(noise(row * 31 + start) * 3)];
      R(xx, yy, end - xx, 1, tone);
      if (start + 22 <= x + w && end === start + 22) R(end - 1, yy, 1, 1, BG.woodSeam);
      xx = end;
    }
  }
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) if (n2(xx, yy) > 0.97 && yy % 4 !== 3) R(xx, yy, 2, 1, BG.woodSeam);
  }
}

/** Cobblestones: staggered rows of small rounded stones in muted tones. */
export function cobbles(x, y, w, h) {
  R(x, y, w, h, '#857e70');
  const tones = ['#a39c8c', '#9a9384', '#928b7c', '#aaa393', '#9e9686'];
  for (let sy = Math.floor(y / 4) * 4; sy < y + h; sy += 4) {
    const row = sy / 4;
    for (let sx = Math.floor(x / 5) * 5 - (row % 2) * 2 - 5; sx < x + w; sx += 5) {
      const tone = tones[Math.floor(noise(row * 977 + sx * 13) * tones.length)];
      const clip = (rx, ry, rw, rh) => {
        const x0 = Math.max(x, rx);
        const y0 = Math.max(y, ry);
        const x1 = Math.min(x + w, rx + rw);
        const y1 = Math.min(y + h, ry + rh);
        if (x1 > x0 && y1 > y0) R(x0, y0, x1 - x0, y1 - y0, tone);
      };
      clip(sx + 1, sy, 2, 1);
      clip(sx, sy + 1, 4, 1);
      clip(sx + 1, sy + 2, 2, 1);
      if (noise(row * 31 + sx) > 0.8 && sx + 1 >= x && sy + 1 >= y && sx + 1 < x + w && sy + 1 < y + h) R(sx + 1, sy + 1, 1, 1, '#b3ac9c');
    }
  }
}

const PAINT = { carpet, chill, hall, wood, yard: cobbles };

/** Base floor of every cell below the band, merged into horizontal runs per material. */
export function drawFloors(m) {
  for (let r = m.band; r < ROWS; r++) {
    let c = 0;
    while (c < COLS) {
      const mat = material(m, c, r);
      let e = c + 1;
      while (e < COLS && material(m, e, r) === mat) e++;
      PAINT[mat]?.(c * CELL, r * CELL, (e - c) * CELL, CELL);
      c = e;
    }
  }
  drawZigzag(m);
}

/** Saw-tooth edge of the light chill carpet where it meets the dark carpet (photo 01, 03). */
function drawZigzag(m) {
  const depth = (i) => [1, 2, 3, 4, 4, 3, 2, 1][((i % 8) + 8) % 8];
  for (let r = m.band; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (m.floorAt(c, r) !== 'chill') continue;
      const x = c * CELL;
      const y = r * CELL;
      if (material(m, c, r - 1) === 'carpet') for (let i = 0; i < CELL; i++) R(x + i, y - depth(x + i), 1, depth(x + i), BG.lounge);
      if (material(m, c, r + 1) === 'carpet') for (let i = 0; i < CELL; i++) R(x + i, y + CELL, 1, depth(x + i), BG.lounge);
      if (material(m, c - 1, r) === 'carpet') for (let i = 0; i < CELL; i++) R(x - depth(y + i), y + i, depth(y + i), 1, BG.lounge);
      if (material(m, c + 1, r) === 'carpet') for (let i = 0; i < CELL; i++) R(x + CELL, y + i, depth(y + i), 1, BG.lounge);
    }
  }
}

/** Milky glass panel in the chill floor: a glimpse of the hall below. */
export function drawGlassFloor(item) {
  const { x, y, w, h } = item;
  R(x, y, w, h, BG.steel);
  R(x + 1, y + 1, w - 2, h - 2, '#a9c7c0');
  R(x + 1, y + 1, w - 2, 1, '#d3e6e1');
  R(x + 1, y + 1, 1, h - 2, '#d3e6e1');
  R(x + 2, y + h - 2, w - 3, 1, '#8fb0a9');
  R(x + w - 2, y + 2, 1, h - 3, '#8fb0a9');
  // blurred hall floor and a chair seen through it
  R(x + 3, y + 3, w - 6, 2, '#bcd5cf');
  R(x + w - 5, y + 3, 2, 2, '#93ada7');
}

/**
 * Stairwell opening upstairs: a dark shaft, the far slab edge, the open steel treads sinking
 * towards the east (the flight rises to the west) and the dim hall floor deep below.
 */
export function drawOpening(item) {
  const { x, y, w, h } = item;
  R(x, y, w, h, '#202124');
  R(x + Math.round(w * 0.4), y + 4, Math.round(w * 0.6), h - 4, '#4a4843'); // hall floor far below
  for (let i = Math.round(w * 0.4); i < w; i += 9) R(x + i, y + 6, 4, 1, '#56544e');
  R(x, y, w, 1, BG.wallShade); // far slab edge
  R(x, y + 1, w, 1, BG.concreteDark);
  for (let k = 0; k * 4 < w; k++) {
    const top = y + 1 + Math.round(k * 2.6);
    if (top >= y + h) break;
    const tx = x + k * 4;
    R(tx, top, 3, y + h - top, BG.steelLight);
    R(tx, top, 3, 1, '#80858b');
    R(tx, Math.min(y + h - 1, top + 3), 3, 1, BG.steel);
  }
  R(x, y + h - 2, w, 2, 'rgba(0,0,0,0.35)'); // near edge shadow
}
