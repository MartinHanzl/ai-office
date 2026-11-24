/**
 * Walls of the BlueGhost office: the back wall seen face-on (white plaster, black cable runs, matte
 * panels with a warm LED line behind the back-wall desks), partitions, glass walls, doors and booths
 * from the wall graph, and the cut-away front facade with dark brown windows.
 */
import { R } from '../../core/canvas.js';
import { BG } from '../../core/palette.js';
import { noise } from '../../core/util.js';
import { BAND, CELL, COLS, wallCells } from '../../world/map.js';

/** Projected heights (px) of cut walls: partitions and glass, booths, the cut-away facade. */
export const WALL_H = 24;

export const BOOTH_H = 19;

export const FACADE_H = 3;

const CABLE_Y = [5, 7];

/**
 * Strip above a back wall that stands further forward than usual (the ground floor is shallower):
 * plain upper wall and ceiling with white beams, soft shading and a black cable run. No windows.
 */
function drawCeiling(h) {
  const W = COLS * CELL;
  R(0, 0, W, h, '#e2e0da');
  // soft shading towards the top (further away, less light)
  for (let i = 0; i < Math.min(h, 12); i += 3) R(0, i, W, 3, `rgba(80,76,68,${(0.10 - i * 0.008).toFixed(3)})`);
  // white beams running back to front, seen end-on
  for (let x = 30; x < W; x += 64) {
    R(x, 0, 8, h - 3, BG.wallLight);
    R(x, 0, 1, h - 3, '#ffffff');
    R(x + 8, 0, 1, h - 3, BG.wallShade);
    R(x + 9, 0, 2, h - 3, 'rgba(80,76,68,0.08)');
  }
  // the beam along the wall top and its shadow
  R(0, h - 4, W, 3, BG.wallLight);
  R(0, h - 4, W, 1, '#ffffff');
  R(0, h - 1, W, 1, BG.wallShade);
  // black cable run with clips under the ceiling
  const cy = Math.max(2, h - 9);
  R(0, cy, W, 1, BG.cable);
  for (let x = 5; x < W; x += 10) R(x, cy - 1, 1, 3, BG.clip);
}

/** Back wall band: plaster (dark accent behind the klubovna bar), panels with LED, cables, switches. */
export function drawBackWall(m, env) {
  const floorY = m.floorY;
  const top = Math.max(0, floorY - BAND * CELL); // the wall face keeps its usual height
  if (top > 0) drawCeiling(top);
  // plaster per column: the klubovna (wood floor below) gets the dark accent wall
  let c = 0;
  while (c < COLS) {
    const dark = m.floorAt(c, m.band) === 'wood';
    let e = c + 1;
    while (e < COLS && (m.floorAt(e, m.band) === 'wood') === dark) e++;
    const x = c * CELL;
    const w = (e - c) * CELL;
    R(x, top, w, floorY - top, dark ? BG.accentWall : BG.wall);
    R(x, top, w, 2, dark ? BG.accentWallDark : BG.wallShade); // ceiling shadow
    R(x, floorY - 2, w, 1, dark ? BG.accentWallLight : BG.wallLight);
    R(x, floorY - 1, w, 1, dark ? BG.accentWallDark : BG.skirting);
    if (!dark) for (let i = 0; i < w; i++) if (noise(x + i) > 0.97) R(x + i, top + 10 + Math.floor(noise(x * 3 + i) * 30), 1, 1, BG.wallShade);
    c = e;
  }

  // matte panels behind the desks that stand against the back wall, warm LED line along their top
  const desks = m.of('desk').filter((d) => d.box.r === m.band);
  if (desks.length) {
    const x0 = Math.min(...desks.map((d) => d.x));
    const x1 = Math.max(...desks.map((d) => d.x + d.w));
    const pt = top + 14;
    R(x0, pt - 1, x1 - x0, 1, BG.wallShade);
    R(x0, pt, x1 - x0, floorY - 2 - pt, BG.panel);
    for (let x = x0; x < x1; x += 16) R(x, pt, 1, floorY - 2 - pt, BG.panelSeam);
    R(x0, pt, x1 - x0, 1, BG.led);
    R(x0, pt + 1, x1 - x0, 1, 'rgba(243,217,168,0.55)');
    R(x0, pt + 2, x1 - x0, 2, 'rgba(246,227,192,0.25)');
    env.lights.push(...Array.from({ length: Math.ceil((x1 - x0) / 24) }, (_, i) => ({ x: x0 + 12 + i * 24, y: pt + 2, r: 16, s: 0.55 })));
  }

  // two black cable runs under the ceiling with clips, and drops to switches next to doors
  const cy = [top + CABLE_Y[0], top + CABLE_Y[1]];
  for (const y of cy) R(0, y, COLS * CELL, 1, BG.cable);
  for (let x = 3; x < COLS * CELL; x += 8) R(x, cy[0] - 1, 1, cy[1] - cy[0] + 3, BG.clip);
  const drops = m.wall.filter((w) => w.type === 'door' || w.type === 'angledDoor' || w.type === 'tv').map((w) => w.x - 4);
  if (m.floor === 'upper') drops.push(4, 132);
  for (const x of drops) {
    R(x, cy[1], 1, 22, BG.cable);
    for (let y = cy[1] + 5; y < cy[1] + 22; y += 6) R(x - 1, y, 3, 1, BG.clip);
    R(x - 1, cy[1] + 22, 3, 4, BG.switchBox);
    R(x - 1, cy[1] + 25, 3, 1, BG.wallShade);
  }
}


// ---- wall graph: partitions, glass, doors, booths, facades

const isOuter = (c) => c === 0 || c === COLS - 1;

const FACADE = new Set(['_', '|', '\\']);

/** Height of a wall cell; doors take the height of the walls next to them. */
function heightOf(m, c, r, ch) {
  if (FACADE.has(ch)) return FACADE_H;
  if (ch === 'C') return BOOTH_H;
  if (ch === 'D') {
    const near = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].map(([dc, dr]) => m.at(c + dc, r + dr));
    if (near.includes('C')) return BOOTH_H;
    return WALL_H + (near.some((n) => FACADE.has(n)) ? 4 : 0);
  }
  return WALL_H;
}

/**
 * Footprint pieces of one wall cell: half-segments from the cell centre along its arms.
 * Free ends (a single arm) are extended to the cell edge.
 */
function pieces(cell, band) {
  const cx = cell.c * CELL + 2;
  const cy = cell.r * CELL + 2;
  const arms = cell.arms.filter(([dc, dr]) => !(cell.r === band && dr === 0)); // first-row runs belong to the back wall
  const out = arms.map(([dc, dr]) => ({ dc, dr, x0: cx, y0: cy, x1: cx + dc * 2, y1: cy + dr * 2 }));
  if (arms.length === 1) {
    const [dc, dr] = arms[0];
    out.push({ dc: -dc, dr: -dr, x0: cx, y0: cy, x1: cx - dc * 2, y1: cy - dr * 2, end: true });
  }
  return out;
}

/** Lifted face of a footprint piece; `paint(x, top, h)` fills one 1-px column, `strip` draws edge-on runs. */
function lift(p, H, paintColumn, strip) {
  if (p.dc === 0) {
    // runs north–south: seen edge-on, the cut top is a thin strip H px above the footprint
    const y0 = Math.min(p.y0, p.y1);
    const y1 = Math.max(p.y0, p.y1);
    strip(p.x0, y0 - H, y1 - y0);
    return;
  }
  const xa = Math.min(p.x0, p.x1);
  const n = Math.abs(p.x1 - p.x0);
  for (let i = 0; i < n; i++) {
    const x = xa + i;
    const base = p.dr === 0 ? p.y0 : p.y0 + (x - p.x0) * (p.dr / p.dc);
    paintColumn(x, Math.round(base) - H, H, i, n);
  }
}

/** Glass styles: plain (meeting room), booth front with curtains. */
function glassColumn(x, top, h, curtain) {
  R(x, top, 1, h, BG.glass);
  R(x, top, 1, 1, BG.glassFrame);
  R(x, top + h - 1, 1, 1, BG.glassFrameDark);
  if (curtain) R(x, top + 1, 1, h - 2, curtain);
}

/** Every wall cell becomes depth-sorted drawables. */
export function wallDrawables(m, env, items) {
  const cells = wallCells(m);
  const booths = boothRows(m);
  for (const cell of cells) {
    const { c, r, ch } = cell;
    if (FACADE.has(ch)) continue; // facades are drawn by drawFacades
    const H = heightOf(m, c, r, ch);
    const y = r * CELL + CELL;
    if ((ch === 'W' || ch === 'H') && isOuter(c)) {
      items.push({ y: r * CELL, draw: () => outerWall(c, r) });
      continue;
    }
    const ps = pieces(cell, m.band);
    if (ch === 'W') {
      items.push({ y, draw: () => ps.forEach((p) => solidWall(p, H)) });
    } else if (ch === '#') {
      items.push({ y, draw: () => ps.forEach((p) => glassWall(p, H)) });
    } else if (ch === 'C') {
      const back = r === booths.top;
      const front = r === booths.bottom;
      items.push({ y, draw: () => ps.forEach((p) => boothWall(p, H, back, front, booths.dividers)) });
    } else if (ch === 'D') {
      items.push({ y, draw: () => ps.forEach((p) => doorway(m, cell, p, H)) });
    }
  }
}

function outerWall(c, r) {
  const x = c * CELL;
  const y = r * CELL;
  R(x, y, CELL, CELL, BG.wallLight);
  R(c === 0 ? x + CELL - 1 : x, y, 1, CELL, BG.wallShade);
  R(c === 0 ? x + CELL : x - 1, y, 1, CELL, 'rgba(0,0,0,0.12)');
}

/**
 * Solid partition. Faces towards the viewer get a light cut cap, a face shaded by its direction
 * (south-west faces lit, south-east faces in shade), a skirting and a soft shadow on the floor.
 */
function solidWall(p, H) {
  const slope = p.dc && p.dr ? p.dr / p.dc : 0;
  const face = slope > 0 ? '#e6e4de' : slope < 0 ? '#d2cfc7' : BG.wall;
  lift(p, H,
    (x, top, h) => {
      R(x, top, 1, 2, BG.wallLight);
      R(x, top + 2, 1, h - 3, face);
      R(x, top + 2, 1, 1, BG.wallShade);
      R(x, top + h - 1, 1, 1, '#b5b2aa');
      if (slope) R(x, top + h, 1, 2, 'rgba(0,0,0,0.10)');
    },
    (x, top, len) => {
      R(x - 1, top, 3, len, BG.wallLight);
      R(x - 2, top, 1, len, BG.wallShade);
      R(x + 2, top, 1, len, BG.wallShade);
    });
  if (p.dc === 0 && p.dr === 1 && p.end) {
    // south end face of a partition
    R(p.x0 - 1, p.y1 - H, 3, H, BG.wallShade);
  }
}

function glassWall(p, H) {
  // curtains gathered at every 5th column of a run, pale teal (photo 03)
  lift(p, H,
    (x, top, h) => {
      const fold = (x % 20) < 3;
      glassColumn(x, top, h, fold ? ['rgba(127,168,161,0.85)', 'rgba(163,196,190,0.85)', 'rgba(106,147,140,0.85)'][x % 3] : null);
      if (x % 20 === 10) R(x, top, 1, h, 'rgba(141,154,152,0.6)'); // mullion
      if ((x + top) % 11 === 0) R(x, top + 3, 1, 4, 'rgba(255,255,255,0.35)'); // reflection
    },
    (x, top, len) => {
      R(x - 1, top, 2, len, BG.glass);
      R(x - 1, top, 1, len, BG.glassFrame);
      R(x, top, 1, len, 'rgba(163,196,190,0.55)');
    });
  if (p.dc === 0 && p.dr === 1 && p.end) R(p.x0 - 1, p.y1 - H, 2, H, BG.glass);
}

/** Booth rows (back wall with doors, front glass) and the x of the dividers between booths. */
function boothRows(m) {
  const cells = m.of('booth').flatMap((b) => b.cells);
  if (!cells.length) return { top: -1, bottom: -1, dividers: [] };
  const top = Math.min(...cells.map(([, r]) => r));
  const bottom = Math.max(...cells.map(([, r]) => r));
  const dividers = [...new Set(cells.filter(([, r]) => r > top && r < bottom).map(([c]) => c * CELL + 2))];
  const walls = cells.filter(([, r]) => r === top).map(([c]) => c);
  dividers.push(Math.min(...walls) * CELL - 2, (Math.max(...walls) + 1) * CELL + 2);
  return { top, bottom, dividers: dividers.sort((a, b) => a - b) };
}

function boothWall(p, H, back, front, dividers) {
  const nearDivider = (x) => Math.min(...dividers.map((d) => Math.abs(x - d)));
  lift(p, H,
    (x, top, h) => {
      if (back) {
        // inner face of the back wall: white pyramid foam between gathered curtains
        const d = nearDivider(x);
        if (d < 4) {
          R(x, top, 1, h, ['#7fa8a1', '#a3c4be', '#8fb5ae'][x % 3]);
        } else {
          for (let yy = top + 1; yy < top + h; yy++) R(x, yy, 1, 1, ((x >> 1) + (yy >> 1)) % 2 ? BG.foam : '#e2e1db');
        }
        R(x, top, 1, 1, BG.glassFrameDark);
      } else if (front) {
        const d = nearDivider(x);
        glassColumn(x, top, h, d < 3 ? ['rgba(127,168,161,0.9)', 'rgba(163,196,190,0.9)'][x % 2] : null);
        if ((x + top) % 9 === 0 && d >= 3) R(x, top + 3, 1, 3, 'rgba(255,255,255,0.35)');
      } else {
        R(x, top, 1, h, BG.foam);
      }
    },
    (x, top, len) => {
      R(x - 1, top, 2, len, BG.white);
      R(x - 1, top, 1, len, BG.whiteShade);
    });
}

/** Door in a wall: black (or anthracite at the entrance) frame posts and lintel; glass leaves where the wall is glass. */
function doorway(m, cell, p, H) {
  const { c, r } = cell;
  const near = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].map(([dc, dr]) => m.at(c + dc, r + dr));
  const entrance = near.some((n) => FACADE.has(n)) || (m.floor === 'ground' && near.includes(','));
  const glassy = entrance || near.includes('#') || near.includes('C');
  const frame = entrance ? BG.anthracite : BG.black;
  const post = m.at(c + p.dc, r + p.dr) !== 'D' && !p.end; // the arm leaves the doorway: a post at the wall side
  const middle = cell.arms.filter(([dc, dr]) => m.at(c + dc, r + dr) === 'D').length === 2;
  const far = p.x1 > p.x0 ? 'last' : 'first';
  lift(p, H,
    (x, top, h, i, n) => {
      if (glassy) R(x, top + 1, 1, h - 1, entrance ? 'rgba(178,214,214,0.45)' : 'rgba(196,226,222,0.16)');
      if (entrance && (x + top) % 7 === 0) R(x, top + 7, 1, 5, 'rgba(255,255,255,0.45)'); // reflections
      R(x, top, 1, entrance ? 2 : 1, frame); // lintel (transom bar at the entrance)
      if (entrance) {
        R(x, top + 2, 1, 3, 'rgba(220,236,240,0.6)');
        R(x, top + 5, 1, 1, frame);
        R(x, top + h - 2, 1, 2, frame); // kick plate
      }
      if (post && i === (far === 'last' ? n - 1 : 0)) {
        R(x, top, 1, h, frame);
        if (entrance) R(x + (far === 'last' ? -1 : 1), top, 1, h, frame);
      }
      if (middle && entrance && i === (far === 'last' ? 0 : n - 1)) {
        R(x, top + 5, 1, h - 5, frame); // the two leaves meet here
        R(x + (far === 'last' ? 1 : -1), top + Math.round(h * 0.55), 1, 2, BG.chrome);
      }
    },
    (x, top, len) => R(x - 1, top, 2, len, frame));
  if (p.dc === 0 && post) R(p.x0 - 1, Math.max(p.y0, p.y1) - H, 2, H, frame);
  // threshold
  R(Math.min(p.x0, p.x1), Math.min(p.y0, p.y1) + 1, Math.max(1, Math.abs(p.x1 - p.x0)), 1, 'rgba(0,0,0,0.18)');
}


/**
 * Cut-away facade: a low strip (cut face + outer face) with dark brown windows; windows glow at night.
 * The chamfer is a short diagonal piece of the same.
 */
export function drawFacades(m, env, items) {
  const cells = wallCells(m).filter((cell) => FACADE.has(cell.ch));
  const sky = env.sky;
  for (const cell of cells) {
    const ps = pieces(cell, m.band);
    items.push({
      y: cell.r * CELL + CELL,
      draw: () => {
        for (const p of ps) {
          lift(p, FACADE_H,
            (x, top) => {
              const win = windowAt(m, x, cell.r);
              R(x, top - 1, 1, 2, BG.facadeCut);
              R(x, top + 1, 1, 4, win ? BG.windowWood : BG.facade);
              if (win === 'glass') R(x, top + 2, 1, 2, sky.night ? BG.bulb : sky.top);
              if (win === 'mullion') R(x, top + 2, 1, 2, BG.windowWoodLight);
              R(x, top + 5, 1, 1, win ? BG.sill : BG.facadeShade);
            },
            (x, top, len) => {
              R(x - 1, top - 1, 3, len, BG.facadeCut);
              R(x - 1, top - 1, 1, len, BG.facadeShade);
            });
          if (p.dc === 0 && p.dr === 1 && p.end) R(p.x0 - 1, p.y1 - FACADE_H - 1, 3, FACADE_H + 3, BG.facade);
        }
      },
    });
  }
  // upstairs: a plant hangs from the window above the stairwell down the facade (photo 03)
  const opening = m.of('opening')[0];
  if (opening) {
    const cx = opening.x + opening.w / 2;
    const win = windowSpans(m).reduce((a, b) => (Math.abs(b.x + b.w / 2 - cx) < Math.abs(a.x + a.w / 2 - cx) ? b : a), windowSpans(m)[0]);
    if (win) items.push({ y: win.y + CELL + 1, draw: () => hangingPlant(win.x + 2, win.y + CELL + 1, win.w - 4) });
  }
  // windows light the yard at night
  if (sky.night) {
    for (const span of windowSpans(m)) env.lights.push({ x: span.x + span.w / 2, y: span.y + 10, r: 18, s: 0.7 });
  }
}

const spanCache = new WeakMap();

/** Windows along the long front facade runs: every 40 px, 16 px wide. */
export function windowSpans(m) {
  if (spanCache.has(m)) return spanCache.get(m);
  const spans = [];
  for (const f of m.of('facade').filter((it) => it.box.h === 1 && it.box.w > 4)) {
    for (let x = f.x + 10; x + 16 <= f.x + f.w - 4; x += 40) spans.push({ x, y: f.y, w: 16 });
  }
  spanCache.set(m, spans);
  return spans;
}

function windowAt(m, x, r) {
  for (const s of windowSpans(m)) {
    if (s.y !== r * CELL || x < s.x || x >= s.x + s.w) continue;
    const i = x - s.x;
    if (i === 0 || i === s.w - 1) return 'frame';
    if (i === s.w / 2 || i === s.w / 2 - 1) return 'mullion';
    return 'glass';
  }
  return null;
}

/** Trailing plant from a window sill down the wall. */
function hangingPlant(x, y, w) {
  R(x + 2, y - 3, 4, 2, BG.pot);
  for (let i = 0; i < w; i++) {
    const len = 3 + Math.floor(noise(x * 7 + i * 13) * 12);
    for (let k = 0; k < len; k++) {
      if (noise(i * 31 + k * 7 + x) < 0.35) continue;
      R(x + i, y + k, 1, 1, (i + k) % 3 ? BG.plant : BG.plantDark);
    }
  }
}
