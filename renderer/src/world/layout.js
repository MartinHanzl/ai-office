/**
 * The BlueGhost office as a world to walk in: two floors parsed from the ASCII plans (world/floors.js,
 * docs/office/layout.md), a walking grid per floor (world/path.js), desks, idle spots, the director's
 * meeting room and the stairs portals between the floors. Nothing is placed by hand: every point and
 * rect is derived from the maps. Pure module (no DOM), unit-tested in test/layout.test.mjs.
 */
import { hash } from '../core/util.js';
import { FLOORS } from './floors.js';
import { CELL, COLS, DIR, FURNITURE, ROWS, centre, deskSeats, px } from './map.js';
import { findPath, randomPoint as gridPoint, nearestWalkable, walkable } from './path.js';

export const SPEED = 60; // logical px / s

export const FLOOR_NAMES = ['ground', 'upper'];

export const DEFAULT_FLOOR = 'upper';

export const otherFloor = (floor) => (floor === 'ground' ? 'upper' : 'ground');

/** Rooms behind doors smaller than this (cells) are not for strolling: meeting room, phone booths. */
const ROOM_MIN = 150;

/** Wall item under which a `+` spot stands → spot name (when no furniture touches the spot). */
const WALL_SPOT = { taskBoard: 'board' };

/** The doors in the back wall of the ground floor from the left (layout.md: WC, kitchenette). */
const BACK_DOORS = { ground: ['wc', 'kitchen'] };

const key = (c, r) => r * COLS + c;
const N4 = [[0, -1], [0, 1], [-1, 0], [1, 0]];
const facingOf = ([dc, dr]) => (dc < 0 ? 'left' : dc > 0 ? 'right' : dr < 0 ? 'back' : 'front');
const rectOf = (o) => (o ? { x: o.x, y: o.y, w: o.w, h: o.h } : undefined);
const inside = (c, r) => c >= 0 && r >= 0 && c < COLS && r < ROWS;
const cellOf = (p) => [Math.floor(p.x / CELL), Math.floor(p.y / CELL)];

/** Random item, weighted. */
function weighted(items, weight) {
  let roll = Math.random() * items.reduce((n, i) => n + weight(i), 0);
  return items.find((i) => (roll -= weight(i)) < 0) ?? items[items.length - 1];
}

/** A random point inside a cell (1–3 px from its edges, so feet never touch the neighbour). */
const pointIn = (c, r) => ({ x: c * CELL + 1 + Math.floor(Math.random() * 3), y: r * CELL + 1 + Math.floor(Math.random() * 3) });


// ---- geometry helpers

/** Largest rectangle (cells) of `has` at least minW × minH (histogram method), or null. */
function largestRect(has, r0, minW, minH) {
  const heights = new Array(COLS).fill(0);
  let best = null;
  for (let r = r0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) heights[c] = has(c, r) ? heights[c] + 1 : 0;
    const stack = [];
    for (let c = 0; c <= COLS; c++) {
      const h = c < COLS ? heights[c] : 0;
      let start = c;
      while (stack.length && stack[stack.length - 1][1] >= h) {
        const [s, sh] = stack.pop();
        const w = c - s;
        if (sh >= minH && w >= minW && (!best || w * sh > best.w * best.h)) best = { c: s, r: r - sh + 1, w, h: sh };
        start = s;
      }
      stack.push([start, h]);
    }
  }
  return best;
}

/** Greedy cover of `has` with disjoint large rectangles (cells), biggest first. */
function bigRects(has, r0, { minW = 3, minH = 2, minArea = 12 } = {}) {
  const used = new Uint8Array(COLS * ROWS);
  const free = (c, r) => has(c, r) && !used[key(c, r)];
  const out = [];
  for (;;) {
    const best = largestRect(free, r0, minW, minH);
    if (!best || best.w * best.h < minArea) return out;
    for (let r = best.r; r < best.r + best.h; r++) for (let c = best.c; c < best.c + best.w; c++) used[key(c, r)] = 1;
    out.push(best);
  }
}

/** Parts of the free floor with the doors shut (4-neighbour flood fill): the rooms behind doors. */
function regions(m) {
  const id = new Int32Array(COLS * ROWS).fill(-1);
  const sizes = [];
  const open = (c, r) => m.walkable(c, r) && m.at(c, r) !== 'D';
  for (let r = m.band; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (id[key(c, r)] !== -1 || !open(c, r)) continue;
      const n = sizes.length;
      let size = 0;
      const stack = [[c, r]];
      id[key(c, r)] = n;
      while (stack.length) {
        const [cc, rr] = stack.pop();
        size += 1;
        for (const [dc, dr] of N4) {
          const nc = cc + dc;
          const nr = rr + dr;
          if (!open(nc, nr) || id[key(nc, nr)] !== -1) continue;
          id[key(nc, nr)] = n;
          stack.push([nc, nr]);
        }
      }
      sizes.push(size);
    }
  }
  return { of: (c, r) => (inside(c, r) ? id[key(c, r)] : -1), sizes };
}

/** Direction from a spot to the first piece of furniture touching it (N, S, W, E), or null. */
function furnitureBeside(m, c, r) {
  for (const d of N4) {
    const ch = m.at(c + d[0], r + d[1]);
    if (ch !== '=' && FURNITURE[ch]) return { type: FURNITURE[ch], dir: d };
  }
  return null;
}

/** Desk-top cells of a desk piece shared out among its seats (nearest seat; ties go south/east). */
function deskTops(item) {
  const own = new Map(item.seats.map((s) => [s, []]));
  for (const [c, r] of item.cells) {
    let best = null;
    let bd = Infinity;
    for (const s of item.seats) {
      const d = Math.hypot(c - s.c, r - s.r);
      if (d < bd - 1e-9 || (Math.abs(d - bd) < 1e-9 && (s.r > best.r || (s.r === best.r && s.c > best.c)))) {
        best = s;
        bd = d;
      }
    }
    own.get(best).push([c, r]);
  }
  const tops = new Map();
  for (const [s, cells] of own) {
    const cs = cells.map(([c]) => c);
    const rs = cells.map(([, r]) => r);
    const c0 = Math.min(...cs);
    const r0 = Math.min(...rs);
    tops.set(s, px({ c: c0, r: r0, w: Math.max(...cs) - c0 + 1, h: Math.max(...rs) - r0 + 1 }));
  }
  return tops;
}


// ---- floors

/** A seat or spot of a floor plan as a world object (`owner` = who uses it now). */
function spotObject(m, s, kind, extra = {}) {
  const beside = furnitureBeside(m, s.c, s.r);
  return {
    id: `${m.floor}:${s.c},${s.r}`, floor: m.floor, kind, x: s.x, y: s.y, c: s.c, r: s.r,
    facing: s.facing ?? (beside ? facingOf(beside.dir) : 'back'),
    use: s.use ?? null, item: s.item ?? null, anchor: Boolean(s.anchor), owner: null, ...extra,
  };
}

/** Named `+` spots, named after the furniture they touch or the wall item above them. */
function namedSpots(m) {
  const named = {};
  const doors = [...(BACK_DOORS[m.floor] ?? [])];
  for (const s of m.spots.filter((q) => q.kind === 'named').sort((a, b) => a.c - b.c || a.r - b.r)) {
    const beside = furnitureBeside(m, s.c, s.r);
    const wall = m.wall.find((w) => w.box.r < m.band && w.box.c <= s.c && s.c < w.box.c + w.box.w && w.type !== 'ghostPanel');
    let name = beside ? beside.type : wall ? WALL_SPOT[wall.type] ?? wall.type : 'spot';
    if (name === 'door' && m.at(s.c, s.r - 1) === 'D' && s.r === m.band && doors.length) name = doors.shift();
    let unique = name;
    for (let i = 2; named[unique]; i++) unique = `${name}${i}`;
    named[unique] = spotObject(m, s, 'named', { name: unique });
  }
  return named;
}

/**
 * One floor as a world to walk in.
 * @typedef {object} Floor
 * @property {'ground'|'upper'} name
 * @property {object} map parseMap() result (world/map.js)
 * @property {object} grid walking grid for world/path.js
 * @property {number} band rows of the back-wall band
 * @property {number} floorY y where the floor starts
 * @property {{ x: number, y: number, floor: string }} stairs the Z cell centre (portal to the other floor)
 * @property {{ x: number, y: number, floor: string }} [entry] ground: the courtyard gate E
 * @property {{ x: number, y: number, floor: string }} [door] ground: middle cell of the entrance door
 * @property {(from: object, to: object, opts?: object) => object[]} route path on this floor
 * @property {(x: number, y: number) => boolean} isWalkable
 * @property {(x: number, y: number) => boolean} isOpen free floor for strolling (away from seats and spots)
 * @property {(area?: object) => ({ x: number, y: number, floor: string }|null)} randomPoint in the open areas, or walkable in `area`
 * @property {{ x: number, y: number, w: number, h: number }[]} openAreas px rects people stroll and chat in
 * @property {number[][]} openCells [c, r] of every open-area cell
 * @property {{ of: (c: number, r: number) => number, sizes: number[] }} rooms parts of the floor with the doors shut
 * @property {object[][]} chatPairs the plan's `c` pairs as spots
 * @property {Record<string, object>} named named `+` spots (printer, bins, drawers, board, glass / wc, kitchen, reception, snack, darts)
 * @property {{ x: number, y: number, w: number, h: number }} [taskBoard] wall items (px rects)
 * @property {{ x: number, y: number, w: number, h: number }} [planBoard]
 * @property {{ x: number, y: number, w: number, h: number }} [tv]
 */

/** @returns {Floor} */
function buildFloor(name) {
  const m = FLOORS[name];
  const grid = { cols: COLS, rows: ROWS, open: Uint8Array.from(m.open), width: COLS * CELL, height: ROWS * CELL };
  const spotsOf = (kind) => m.spots.filter((s) => s.kind === kind);
  const z = spotsOf('stairs')[0];
  const rooms = regions(m);

  // free floor for strolling: no doors, no yard, no small rooms, nothing right next to a seat or a spot
  const clear = new Uint8Array(COLS * ROWS);
  for (const s of m.spots) {
    if (s.kind === 'chat') continue;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (inside(s.c + dc, s.r + dr)) clear[key(s.c + dc, s.r + dr)] = 1;
  }
  const open = (c, r) => m.walkable(c, r) && !clear[key(c, r)] && m.at(c, r) !== 'D'
    && m.floorAt(c, r) !== 'yard' && rooms.sizes[rooms.of(c, r)] >= ROOM_MIN;
  const areas = bigRects(open, m.band);
  const openAreas = areas.map(px);
  const openCells = areas.flatMap((a) => Array.from({ length: a.w * a.h }, (_, i) => [a.c + (i % a.w), a.r + Math.floor(i / a.w)]));

  // the courtyard (ground floor) is shut to walks that neither start nor end in it
  const yardRooms = new Set();
  for (let r = m.band; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (m.at(c, r) === ',' && rooms.of(c, r) >= 0) yardRooms.add(rooms.of(c, r));
  const indoor = yardRooms.size
    ? { ...grid, open: grid.open.map((v, i) => (yardRooms.has(rooms.of(i % COLS, Math.floor(i / COLS))) ? 0 : v)) }
    : grid;
  /** Room of the walkable cell nearest to a point (-1 in a doorway). */
  const roomAt = (p) => {
    const q = nearestWalkable(grid, p.x, p.y);
    return q ? rooms.of(...cellOf(q)) : -1;
  };
  /**
   * Path on this floor. Detours lead only through the rooms the walk starts or ends in – never out into the yard
   * and back, through the meeting room or a phone booth on the way between two other places.
   */
  const route = (from, to, opts) => {
    const ends = [roomAt(from), roomAt(to)].filter((n) => n >= 0);
    const viaOk = (x, y) => ends.includes(rooms.of(...cellOf({ x, y })));
    return findPath(ends.some((n) => yardRooms.has(n)) ? grid : indoor, from, to, { viaOk, ...opts });
  };

  const isWalkable = (x, y) => walkable(grid, x, y);
  const isOpen = (x, y) => {
    const [c, r] = cellOf({ x, y });
    return inside(c, r) && open(c, r);
  };
  const randomPoint = (area = null) => {
    if (area) {
      const p = gridPoint(grid, Math.random, area);
      return p && { ...p, floor: name };
    }
    if (!areas.length) return null;
    const a = weighted(areas, (q) => q.w * q.h);
    return { ...pointIn(a.c + Math.floor(Math.random() * a.w), a.r + Math.floor(Math.random() * a.h)), floor: name };
  };

  const wallRect = (type) => rectOf(m.wall.find((w) => w.type === type));
  const floor = {
    name, map: m, grid, band: m.band, floorY: m.floorY,
    stairs: { x: z.x, y: z.y, floor: name },
    route,
    isWalkable, isOpen, randomPoint, openAreas, openCells, rooms,
    chatPairs: m.chatPairs.map((pair) => pair.map((s) => spotObject(m, s, 'chat'))),
    named: namedSpots(m),
    taskBoard: wallRect('taskBoard'),
    planBoard: wallRect('planBoard'),
    tv: wallRect('tv'),
  };
  const entry = spotsOf('entry')[0];
  if (entry) {
    floor.entry = { x: entry.x, y: entry.y, floor: name };
    // the entrance: door cells that open onto the yard, the middle one
    const doors = m.of('door').filter((d) => d.cells.some(([c, r]) => N4.some(([dc, dr]) => m.at(c + dc, r + dr) === ',')));
    doors.sort((a, b) => a.box.c - b.box.c);
    const door = doors[Math.floor(doors.length / 2)];
    if (door) floor.door = { ...centre(door.box.c, door.box.r), floor: name };
  }
  return floor;
}

export const floors = Object.fromEntries(FLOOR_NAMES.map((f) => [f, buildFloor(f)]));

const ground = floors.ground;
const upper = floors.upper;

/** Where people appear and leave: the courtyard gate (ground floor). */
export const ENTRY = { x: ground.entry.x, y: ground.entry.y, floor: 'ground' };

/** @deprecated alias of ENTRY for modules not yet moved to the two floors. */
export const DOOR = ENTRY;

/** @deprecated single-floor value: where the upstairs floor starts. */
export const FLOOR_Y = upper.floorY;

/** @deprecated single-floor value: floor y of the meeting room's glass front upstairs. */
export const GLASS_Y = upper.map.of('glass').reduce((a, g) => (g.w > a.w ? g : a)).y;


// ---- desks

const deskItems = [...new Set(deskSeats(upper.map).map((s) => s.item))];
const tops = new Map(deskItems.flatMap((it) => [...deskTops(it)]));
// layout.md numbering: back-wall desks column by column, then the right part row by row
const byNumber = (a, b) => {
  const wa = a.item.box.r === upper.band;
  const wb = b.item.box.r === upper.band;
  if (wa !== wb) return wa ? -1 : 1;
  return wa ? a.c - b.c || a.r - b.r : a.r - b.r || a.c - b.c;
};

/** The 24 workstations upstairs (desk seats, numbered as in layout.md). */
export const DESKS = deskSeats(upper.map).sort(byNumber).map((s, i) => spotObject(upper.map, s, 'desk', {
  id: i + 1, desk: tops.get(s), seed: i * 7919 + 13,
}));

/**
 * Order in which new employees get a desk: one per desk piece in turn (blocks first), so the office
 * fills evenly instead of row by row.
 */
const CLAIM_ORDER = (() => {
  const pieces = deskItems
    .map((it) => DESKS.filter((d) => d.item === it).sort((a, b) => a.r - b.r || a.c - b.c))
    .sort((a, b) => b.length - a.length || a[0].x - b[0].x);
  const out = [];
  for (let k = 0; out.length < DESKS.length; k++) for (const p of pieces) if (p[k]) out.push(p[k]);
  return out;
})();


// ---- idle spots

const seatsOf = (m, use, kind) => m.seats.filter((s) => s.use === use).map((s) => spotObject(m, s, kind));
const spotsOf = (m, spotKind, kind) => m.spots.filter((s) => s.kind === spotKind).map((s) => spotObject(m, s, kind));

/**
 * Where idle employees go. Every seat carries `floor`, `kind` and `facing` (the pose is drawn from those):
 * coffee = the bar's `$` (standing, facing the bar); sofa = upstairs chill sofas and armchairs, the klubovna
 * sofa and the sofa under the stairs; window = upstairs `w` (standing, facing the viewer); booth = the
 * 3 phone booths; cafe = klubovna table seats; stool = bar stools; pouf = the pouf by the hooks.
 */
export const IDLE_POOLS = {
  coffee: spotsOf(ground.map, 'coffee', 'coffee'),
  sofa: [
    ...seatsOf(upper.map, 'sofa', 'sofa'), ...seatsOf(upper.map, 'armchair', 'armchair'), ...seatsOf(ground.map, 'sofa', 'sofa'),
  ],
  window: spotsOf(upper.map, 'window', 'window'),
  booth: seatsOf(upper.map, 'booth', 'booth'),
  cafe: seatsOf(ground.map, 'table', 'cafe'),
  stool: seatsOf(ground.map, 'barStool', 'stool'),
  pouf: seatsOf(ground.map, 'pouf', 'pouf'),
};

/** Plan-mode meeting spots in front of the plan board and the TV (upstairs meeting room, facing the wall). */
export const BOARD = spotsOf(upper.map, 'meeting', 'meeting');

/** The director's to-do board on the back wall of the meeting room (px rect). */
export const TASK_BOARD = upper.taskBoard;

/** The smaller plan-mode board above the meeting-room TV. */
export const PLAN_BOARD = upper.planBoard;

export const TVS = { reception: ground.tv, meeting: upper.tv };

/** Fallback chat spots upstairs (the `c` pairs of the plan); normally chatPair() picks a random free place. */
export const CHAT_PAIRS = upper.chatPairs;


// ---- the director's meeting room

const boardSpot = upper.named.board;
const officeRoom = upper.rooms.of(boardSpot.c, boardSpot.r);
const inOffice = (c, r) => upper.rooms.of(c, r) === officeRoom;
const officeRects = bigRects(inOffice, upper.band, { minW: 2, minH: 2, minArea: 4 });

/** Floor of the meeting room upstairs, where the director walks about. */
export const OFFICE_AREAS = officeRects.map(px);

/** In front of the meeting-room TV: the free cell under its middle, closest to the wall, with room around it. */
function tvSpot() {
  const tv = upper.map.wall.find((w) => w.type === 'tv');
  const mid = tv.box.c + Math.floor(tv.box.w / 2);
  const spots = new Set(upper.map.spots.map((s) => key(s.c, s.r)));
  const roomy = (c, r) => inOffice(c, r) && !spots.has(key(c, r)) && N4.every(([dc, dr]) => upper.map.walkable(c + dc, r + dr));
  for (const dc of [0, -1, 1, -2, 2, -3, 3]) {
    for (let r = upper.band; r < ROWS; r++) if (roomy(mid + dc, r)) return { ...centre(mid + dc, r), facing: 'back' };
  }
  return { x: boardSpot.x, y: boardSpot.y, facing: 'back' };
}

/** The director's stops: at the task board, watching the meeting-room TV, by the glass looking into the office. */
export const OFFICE_SPOTS = {
  board: { x: boardSpot.x, y: boardSpot.y, floor: 'upper', facing: 'back' },
  tv: { ...tvSpot(), floor: 'upper' },
  glass: { x: upper.named.glass.x, y: upper.named.glass.y, floor: 'upper', facing: upper.named.glass.facing },
};

export function randomOfficePoint() {
  if (!officeRects.length) return null;
  const a = weighted(officeRects, (q) => q.w * q.h);
  return { ...pointIn(a.c + Math.floor(Math.random() * a.w), a.r + Math.floor(Math.random() * a.h)), floor: 'upper' };
}


// ---- walking

/** Random free point in a floor's open areas (or a walkable one inside `area`). */
export function randomFloorPoint(area = null, floor = DEFAULT_FLOOR) {
  return floors[floor].randomPoint(area);
}

export const isWalkable = (x, y, floor = DEFAULT_FLOOR) => floors[floor].isWalkable(x, y);

/** Path on one floor (taken from `from.floor`, else `to.floor`); crossing floors is up to entities/person.js. */
export const route = (from, to, opts) => floors[from.floor ?? to.floor ?? DEFAULT_FLOOR].route(from, to, opts);


/** Two free spots 4 cells apart somewhere in the floor's open areas (falls back to the plan's chat pairs). */
export function chatPair(busy = [], floor = DEFAULT_FLOOR) {
  const F = floors[floor];
  const near = busy.filter((b) => (b.floor ?? floor) === floor);
  for (let i = 0; i < 25; i++) {
    const p = F.randomPoint();
    if (!p) continue;
    const q = { x: p.x + 4 * CELL, y: p.y, floor };
    if (!F.isOpen(q.x, q.y)) continue;
    if (near.some((b) => Math.hypot(b.x - p.x, b.y - p.y) < 22 || Math.hypot(b.x - q.x, b.y - q.y) < 22)) continue;
    return [{ ...p, owner: null }, { ...q, owner: null }];
  }
  return F.chatPairs.find((pair) => !pair[0].owner && !pair[1].owner) ?? null;
}


// ---- seats

/** Upstairs desks first (evenly), then klubovna tables, then sofas; a standing spot if all are taken. */
export function claimSeat(worker) {
  const seat = CLAIM_ORDER.find((d) => !d.owner) ?? IDLE_POOLS.cafe.find((s) => !s.owner) ?? IDLE_POOLS.sofa.find((s) => !s.owner);
  if (seat) {
    seat.owner = worker;
    return seat;
  }
  const cells = upper.openCells;
  const [c, r] = cells[hash(worker.id) % cells.length];
  return { id: `stand:${worker.id}`, floor: 'upper', kind: 'stand', standing: true, facing: 'front', ...centre(c, r), c, r, owner: worker };
}

export function releaseSeat(worker) {
  if (worker.seat?.owner === worker) worker.seat.owner = null;
}


/** Cells around a seat by distance (where an intern may stand). */
const RING = Array.from({ length: 81 }, (_, i) => [(i % 9) - 4, Math.floor(i / 9) - 4])
  .filter(([dc, dr]) => dc || dr)
  .sort((p, q) => Math.hypot(...p) - Math.hypot(...q));

/** How far from the seat an intern may stand (cells). */
const INTERN_REACH = 5;

/** Feet-relative px boxes [x0, y0, x1, y1] of someone at a seat and of a standing intern (figures as drawn). */
const SITTER_BOX = [-5, -24, 5, 0];
const INTERN_BOX = [-4, -21, 4, 0];

/** Share of an intern at (ix, iy) hidden behind – or hiding – a figure with `box` at (x, y). */
function cover(ix, iy, x, y, box = SITTER_BOX) {
  const w = Math.min(ix + INTERN_BOX[2], x + box[2]) - Math.max(ix + INTERN_BOX[0], x + box[0]);
  const h = Math.min(iy + INTERN_BOX[3], y + box[3]) - Math.max(iy + INTERN_BOX[1], y + box[1]);
  const area = (INTERN_BOX[2] - INTERN_BOX[0]) * (INTERN_BOX[3] - INTERN_BOX[1]);
  return w > 0 && h > 0 ? (w * h) / area : 0;
}

/**
 * Cost weights of an intern's place: overlap with the boss, with the other interns, with people at other seats;
 * standing nearer to another seat than to the boss's (looks like someone else's intern).
 */
const COVER_BOSS = 6;
const COVER_INTERN = 4;
const COVER_NEIGHBOUR = 2;
const OTHER_SEAT = 5;

const internCache = new Map();

/**
 * The three places for a seat's interns: free floor cells of the seat's room near it, never on the desk side,
 * picked one by one at the lowest cost = distance (cells) + how much of the intern the boss, the interns
 * already placed and people at the neighbouring seats and spots would hide (or be hidden by) + whether the cell
 * is nearer to another seat. So interns stand beside their boss, clearly visible, instead of right behind or in
 * front of them, and two neighbours' interns don't share a place.
 */
function internCells(seat) {
  const floor = seat.floor ?? DEFAULT_FLOOR;
  const [sc, sr] = cellOf(seat);
  const id = `${floor}:${sc},${sr}:${seat.facing}:${seat.anchor ? 1 : 0}`;
  if (internCache.has(id)) return internCache.get(id);
  const m = floors[floor].map;
  const { rooms } = floors[floor];
  const spots = new Set(m.spots.map((s) => key(s.c, s.r)));
  const neighbours = m.spots.filter((s) => (s.c !== sc || s.r !== sr) && s.kind !== 'stairs' && s.kind !== 'entry');
  // away from the desk; upholstered seats: in front of the piece
  const [fc, fr] = DIR[seat.facing] ?? DIR.front;
  const [ac, ar] = seat.anchor ? [fc, fr] : [-fc, -fr];
  // the room the seat is reached from (an upholstered seat lies inside its piece: the cell in front of it)
  const home = [[0, 0], [fc, fr], ...N4].map(([dc, dr]) => rooms.of(sc + dc, sr + dr)).find((n) => n >= 0) ?? -1;
  const ok = (c, r) => home >= 0 && rooms.of(c, r) === home && !spots.has(key(c, r));
  const cands = [];
  for (const [dc, dr] of RING) {
    const c = sc + dc;
    const r = sr + dr;
    if (dc * ac + dr * ar < 0 || Math.hypot(dc, dr) > INTERN_REACH || !ok(c, r)) continue;
    const p = centre(c, r);
    const crowd = neighbours.reduce((n, q) => n + cover(p.x, p.y, q.x, q.y), 0);
    const own = Math.hypot(p.x - seat.x, p.y - seat.y);
    const theirs = neighbours.some((q) => q.kind === 'seat' && Math.hypot(p.x - q.x, p.y - q.y) <= own + 1e-9);
    cands.push({
      p, cost: Math.hypot(dc, dr) + COVER_BOSS * cover(p.x, p.y, seat.x, seat.y) + COVER_NEIGHBOUR * crowd + (theirs ? OTHER_SEAT : 0),
    });
  }
  const out = [];
  while (out.length < 3 && cands.length) {
    let best = 0;
    let bestCost = Infinity;
    cands.forEach((k, i) => {
      const cost = k.cost + COVER_INTERN * out.reduce((n, q) => n + cover(k.p.x, k.p.y, q.x, q.y, INTERN_BOX), 0);
      if (cost < bestCost - 1e-9) {
        best = i;
        bestCost = cost;
      }
    });
    out.push(cands.splice(best, 1)[0].p);
  }
  internCache.set(id, out);
  return out;
}

/** Where an intern stands by the boss's seat: free floor next to it, on the side away from the desk. */
export function internSpot(seat, slot) {
  const cells = internCells(seat);
  const p = cells[slot] ?? cells[cells.length - 1] ?? seat;
  return { x: p.x, y: p.y, floor: seat.floor ?? DEFAULT_FLOOR };
}
