/**
 * ASCII floor plan → walkable cells, obstacle rects, furniture instances, wall items and spots.
 * Pure module (no DOM), unit-tested in test/map.test.mjs. Plans come from world/maps.js
 * (generated from docs/office/layout.md); one char = one 4×4 px cell, rows 0–11 = back-wall band.
 */

export const CELL = 4;

export const COLS = 80;

export const ROWS = 45;

/** Usual depth of the back-wall band (rows 0..BAND-1, the wall seen face-on); a floor may start lower (`m.band`). */
export const BAND = 12;

export const FLOOR_Y = BAND * CELL;

/** Lamp markers: a spider chandelier hangs above this floor cell. */
export const LAMP = '*';

/** Floor chars → floor material. */
export const FLOOR_CHARS = { '.': 'floor', ';': 'chill', '-': 'wood', ',': 'yard' };

/** Furniture / structure chars on the floor → instance type. */
export const FURNITURE = {
  W: 'wall', _: 'facade', '|': 'facade', '\\': 'chamfer', '#': 'glass', D: 'door', I: 'screen', O: 'column',
  S: 'stairs', '~': 'opening', ':': 'railing', d: 'desk', T: 'meetingTable', h: 'meetingChair', t: 'table',
  s: 'sofa', a: 'armchair', e: 'pouf', b: 'bar', M: 'coffeeMachine', i: 'barStool', R: 'reception', x: 'snack',
  p: 'printer', C: 'booth', u: 'drawers', k: 'bins', g: 'glassFloor', '&': 'plant', n: 'bench', '!': 'banner',
  U: 'floorSwitch', H: 'hooks', Y: 'angledDoor',
};

/** Chars in the back-wall band → wall item type ('=' is the bare wall). */
export const WALL_ITEMS = {
  V: 'tv', X: 'taskBoard', P: 'planBoard', G: 'ghost', '%': 'ghostPanel', L: 'ledLogo', F: 'portrait',
  '@': 'darts', D: 'door', W: 'partition', '#': 'glassPartition', H: 'hooks', Y: 'angledDoor',
};

/** Seat chars → facing. */
export const FACING = { '<': 'left', '>': 'right', v: 'front', '^': 'back' };

/** Unit step in the facing direction (screen coordinates, "front" = towards the viewer = +y). */
export const DIR = { left: [-1, 0], right: [1, 0], front: [0, 1], back: [0, -1] };

/** Spot chars that are not seats. */
export const SPOTS = { Z: 'stairs', E: 'entry', $: 'coffee', w: 'window', m: 'meeting', c: 'chat', '+': 'named' };

/** Upholstery a seat can be anchored in (the seat cell is part of the piece, not floor). */
const UPHOLSTERY = new Set(['s', 'a', 'e']);

/** Lounge pieces standing on the light chill carpet (the carpet grows under them). */
const LOUNGE = new Set(['s', 'a', 't', 'g', '<', '>', 'v', '^', '*']);

const key = (c, r) => r * COLS + c;


/**
 * Splits a set of cells into rectangles: horizontal runs per row, merged downwards while the
 * run below has the same extent. Cell units ({ c, r, w, h }).
 */
export function cellsToRects(has, c0 = 0, r0 = 0, c1 = COLS - 1, r1 = ROWS - 1) {
  const rects = [];
  const open = new Map(); // "c:w" → rect still growing
  for (let r = r0; r <= r1; r++) {
    const runs = [];
    for (let c = c0; c <= c1; c++) {
      if (!has(c, r)) continue;
      const start = c;
      while (c + 1 <= c1 && has(c + 1, r)) c++;
      runs.push([start, c - start + 1]);
    }
    const next = new Map();
    for (const [c, w] of runs) {
      const id = `${c}:${w}`;
      const rect = open.get(id);
      if (rect && rect.r + rect.h === r) {
        rect.h += 1;
        next.set(id, rect);
      } else {
        const fresh = { c, r, w, h: 1 };
        rects.push(fresh);
        next.set(id, fresh);
      }
    }
    open.clear();
    for (const [k, v] of next) open.set(k, v);
  }
  return rects;
}

/** Cell rect → pixel rect. */
export const px = ({ c, r, w, h }) => ({ x: c * CELL, y: r * CELL, w: w * CELL, h: h * CELL });

/** Spot point = cell centre. */
export const centre = (c, r) => ({ x: c * CELL + CELL / 2, y: r * CELL + CELL / 2 });


/**
 * Parses one floor plan.
 * @param {string[]} rows 45 strings of 80 chars
 * @param {'ground'|'upper'} floor
 */
export function parseMap(rows, floor) {
  if (rows.length !== ROWS || rows.some((r) => [...r].length !== COLS)) throw new Error(`map ${floor}: expected ${ROWS}×${COLS}`);
  const grid = rows.map((r) => [...r]);
  const at = (c, r) => (c < 0 || r < 0 || c >= COLS || r >= ROWS ? ' ' : grid[r][c]);
  const yardWalkable = floor === 'ground';
  // the floor starts on the first row with a floor char; above it is the back-wall band
  const firstFloor = grid.findIndex((row) => row.some((ch) => FLOOR_CHARS[ch]));
  const band = firstFloor > 0 ? firstFloor : BAND;

  // seats anchored inside upholstery (sofa, armchair, pouf): the piece is behind the sitter,
  // or flanks the seat on both sides
  const anchorOf = (c, r) => {
    const facing = FACING[grid[r][c]];
    if (facing) {
      const [dc, dr] = DIR[facing];
      const behind = at(c - dc, r - dr);
      if (UPHOLSTERY.has(behind)) return behind;
    }
    for (const [a, b] of [[at(c - 1, r), at(c + 1, r)], [at(c, r - 1), at(c, r + 1)]]) {
      if (a === b && UPHOLSTERY.has(a)) return a;
    }
    return null;
  };

  // "solid" plan: anchored seats take the char of their piece, so pieces stay whole rectangles
  const solid = grid.map((row, r) => row.map((ch, c) => (r >= band && FACING[ch] && anchorOf(c, r)) || ch));
  const solidAt = (c, r) => (c < 0 || r < 0 || c >= COLS || r >= ROWS ? ' ' : solid[r][c]);

  // ---- walkable cells
  const open = new Uint8Array(COLS * ROWS);
  // like path.js: the outermost columns and the bottom row stay closed (margin)
  for (let r = band; r < ROWS - 1; r++) {
    for (let c = 1; c < COLS - 1; c++) {
      const ch = solid[r][c];
      const walk = (FLOOR_CHARS[ch] && (ch !== ',' || yardWalkable)) || ch === 'D' || ch === LAMP || FACING[ch] || SPOTS[ch];
      if (walk) open[key(c, r)] = 1;
    }
  }
  const walkable = (c, r) => c >= 0 && r >= 0 && c < COLS && r < ROWS && open[key(c, r)] === 1;
  const obstacles = cellsToRects((c, r) => !walkable(c, r), 0, band).map(px);

  // ---- floor material under every cell (furniture stands on the nearest floor)
  const floorAt = new Array(COLS * ROWS).fill(null);
  const queue = [];
  for (let r = band; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const f = FLOOR_CHARS[grid[r][c]];
      if (f) {
        floorAt[key(c, r)] = f;
        if (f === 'chill') queue.push([c, r]);
      }
    }
  }
  // the chill carpet first grows under the lounge pieces standing on it
  while (queue.length) {
    const [c, r] = queue.shift();
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc;
      const nr = r + dr;
      if (nr < band || nc < 0 || nr >= ROWS || nc >= COLS || floorAt[key(nc, nr)] || !LOUNGE.has(grid[nr][nc])) continue;
      floorAt[key(nc, nr)] = 'chill';
      queue.push([nc, nr]);
    }
  }
  // then everything else takes the nearest floor (breadth-first from all floor cells)
  for (let r = band; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (floorAt[key(c, r)]) queue.push([c, r]);
  while (queue.length) {
    const [c, r] = queue.shift();
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc;
      const nr = r + dr;
      if (nr < band || nc < 0 || nr >= ROWS || nc >= COLS || floorAt[key(nc, nr)]) continue;
      floorAt[key(nc, nr)] = floorAt[key(c, r)];
      queue.push([nc, nr]);
    }
  }

  // ---- spots
  const spots = [];
  for (let r = band; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const ch = grid[r][c];
      const facing = FACING[ch] ?? (ch === 'i' ? 'back' : null);
      if (!facing && !SPOTS[ch]) continue;
      const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dc, dr]) => solidAt(c + dc, r + dr)).filter((n) => FURNITURE[n]);
      const spot = { ch, c, r, ...centre(c, r), kind: facing ? 'seat' : SPOTS[ch], near: [...new Set(near.map((n) => FURNITURE[n]))] };
      if (facing) {
        const anchor = ch === 'i' ? 'i' : anchorOf(c, r);
        const [dc, dr] = DIR[facing];
        const ahead = solidAt(c + dc, r + dr);
        spot.facing = facing;
        spot.anchor = Boolean(anchor);
        // what the seat belongs to: the piece it is anchored in, else what it faces, else what it touches
        spot.use = anchor ? FURNITURE[anchor]
          : FURNITURE[ahead] && ahead !== 'W' ? FURNITURE[ahead]
            : spot.near.includes('booth') ? 'booth' : spot.near[0] ?? 'floor';
        spot.target = anchor ? null : FURNITURE[ahead] ? { c: c + dc, r: r + dr } : null;
      }
      spots.push(spot);
    }
  }

  // chat pairs: two `c` on one row, the nearest partner first
  const chats = spots.filter((s) => s.kind === 'chat');
  const chatPairs = [];
  const used = new Set();
  for (const a of chats) {
    if (used.has(a)) continue;
    const b = chats.filter((o) => o !== a && !used.has(o) && o.r === a.r).sort((p, q) => Math.abs(p.c - a.c) - Math.abs(q.c - a.c))[0];
    if (!b) continue;
    used.add(a).add(b);
    chatPairs.push(a.c < b.c ? [a, b] : [b, a]);
  }

  // ---- furniture instances: connected components of one char (rows below the band, plus hooks on the side wall)
  const seen = new Uint8Array(COLS * ROWS);
  const component = (c0, r0, ch, minRow) => {
    const cells = [];
    const stack = [[c0, r0]];
    seen[key(c0, r0)] = 1;
    while (stack.length) {
      const [c, r] = stack.pop();
      cells.push([c, r]);
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nc = c + dc;
        const nr = r + dr;
        if (nr < minRow || nc < 0 || nr >= ROWS || nc >= COLS || seen[key(nc, nr)] || solid[nr][nc] !== ch) continue;
        if (minRow === 0 && nr >= band) continue; // band components stay in the band
        seen[key(nc, nr)] = 1;
        stack.push([nc, nr]);
      }
    }
    const cs = cells.map(([c]) => c);
    const rs = cells.map(([, r]) => r);
    const box = { c: Math.min(...cs), r: Math.min(...rs), w: Math.max(...cs) - Math.min(...cs) + 1, h: Math.max(...rs) - Math.min(...rs) + 1 };
    const set = new Set(cells.map(([c, r]) => key(c, r)));
    const rects = cellsToRects((c, r) => set.has(key(c, r)), box.c, box.r, box.c + box.w - 1, box.r + box.h - 1);
    return { ch, cells, box, rects, ...px(box), solid: cells.length === box.w * box.h };
  };

  const items = [];
  const wall = [];
  const unknown = new Set();
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const ch = solid[r][c];
      if (seen[key(c, r)] || ch === '=' || FLOOR_CHARS[ch]) continue;
      if (r < band) {
        if (!WALL_ITEMS[ch]) unknown.add(ch);
        wall.push({ type: WALL_ITEMS[ch] ?? 'unknown', ...component(c, r, ch, 0) });
        continue;
      }
      if (FACING[ch] || SPOTS[ch] || ch === LAMP) continue;
      if (!FURNITURE[ch]) {
        unknown.add(ch);
        continue;
      }
      const item = { type: FURNITURE[ch], ...component(c, r, ch, band) };
      if (ch === 'H') wall.push(item);
      else items.push(item);
    }
  }
  // seats that belong to a piece (desk, table, sofa…)
  for (const item of items) item.seats = [];
  const itemAt = new Map();
  for (const item of items) for (const [c, r] of item.cells) itemAt.set(key(c, r), item);
  for (const s of spots) {
    if (s.kind !== 'seat') continue;
    const owner = s.anchor ? itemAt.get(key(s.c, s.r)) : s.target ? itemAt.get(key(s.target.c, s.target.r)) : null;
    if (owner) {
      owner.seats.push(s);
      s.item = owner;
    }
  }
  // the ghost panel covers the painted ghost too
  const panel = wall.find((w) => w.type === 'ghostPanel');
  const ghost = wall.find((w) => w.type === 'ghost');
  if (panel && ghost) {
    const c0 = Math.min(panel.box.c, ghost.box.c);
    const r0 = Math.min(panel.box.r, ghost.box.r);
    const c1 = Math.max(panel.box.c + panel.box.w, ghost.box.c + ghost.box.w);
    const r1 = Math.max(panel.box.r + panel.box.h, ghost.box.r + ghost.box.h);
    panel.box = { c: c0, r: r0, w: c1 - c0, h: r1 - r0 };
    Object.assign(panel, px(panel.box));
  }

  const of = (type) => items.filter((i) => i.type === type);
  const bboxOf = (pred) => {
    let c0 = COLS;
    let r0 = ROWS;
    let c1 = -1;
    let r1 = -1;
    for (let r = band; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!pred(c, r)) continue;
        c0 = Math.min(c0, c);
        r0 = Math.min(r0, r);
        c1 = Math.max(c1, c);
        r1 = Math.max(r1, r);
      }
    }
    return c1 < 0 ? null : { c: c0, r: r0, w: c1 - c0 + 1, h: r1 - r0 + 1 };
  };
  const chill = bboxOf((c, r) => floorAt[key(c, r)] === 'chill');
  const yard = bboxOf((c, r) => grid[r][c] === ',');

  const lamps = [];
  for (let r = band; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (grid[r][c] === LAMP) lamps.push({ c, r, ...centre(c, r) });

  return {
    floor,
    band,
    floorY: band * CELL,
    rows,
    grid,
    at,
    open,
    walkable,
    obstacles,
    floorAt: (c, r) => (c < 0 || r < band || c >= COLS || r >= ROWS ? null : floorAt[key(c, r)]),
    items,
    of,
    wall,
    spots,
    seats: spots.filter((s) => s.kind === 'seat'),
    chatPairs,
    lamps,
    zones: { chill: chill && { box: chill, ...px(chill) }, yard: yard && { box: yard, ...px(yard) } },
    unknown: [...unknown],
  };
}

/** Seats at work desks (workstations). */
export const deskSeats = (map) => map.seats.filter((s) => s.use === 'desk');


/** Chars that form walls on the floor part (doors are gaps in them; `Y` is drawn on its own). */
export const WALL_CHARS = new Set(['W', '#', 'D', 'C', '_', '|', '\\', 'H']);

/**
 * Wall graph: every wall cell with its arms towards connected wall cells (8 directions; a diagonal
 * arm only where it does not cut an L corner). Cells on the first floor row that continue south
 * also get an arm north, so side walls meet the back wall.
 * @returns {{ c: number, r: number, ch: string, arms: [number, number][] }[]}
 */
export function wallCells(m) {
  const isWall = (c, r) => r >= m.band && WALL_CHARS.has(m.at(c, r));
  const cells = [];
  for (let r = m.band; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!isWall(c, r)) continue;
      const arms = [];
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if ((!dc && !dr) || !isWall(c + dc, r + dr)) continue;
          if (dc && dr && (isWall(c + dc, r) || isWall(c, r + dr))) continue;
          arms.push([dc, dr]);
        }
      }
      if (r === m.band && arms.some(([dc, dr]) => dr === 1 && !dc)) arms.push([0, -1]);
      cells.push({ c, r, ch: m.at(c, r), arms });
    }
  }
  return cells;
}
