/** Office floor plan: desks, lounge spots, walking routes. */
import { hash } from '../core/util.js';

export const SPEED = 60; // logical px / s

export const CORRIDOR_X = 216;

export const DOOR = { x: 297, y: 47, lane: 54 };


export const DESKS = [];

for (const [deskY, seatY, lane] of [[62, 90, 100], [118, 146, 160]]) {
  for (const cx of [30, 82, 134, 186]) {
    DESKS.push({ cx, deskY, seatY, lane, seed: DESKS.length * 7919 + 13, owner: null });
  }
}

export const SOFA = [0, 1, 2, 3].map((i) => ({ x: 253 + i * 14, y: 146, lane: 122, sofa: true, owner: null }));

export const COFFEE = [0, 1, 2, 3, 4].map((i) => ({ x: 248 + i * 10, y: 60, lane: 68, owner: null }));

export const CHAT_PAIRS = [
  [{ x: 52, y: 105, lane: 105 }, { x: 67, y: 105, lane: 105 }],   // left aisle (keeps the wall panels readable)
  [{ x: 104, y: 105, lane: 105 }, { x: 119, y: 105, lane: 105 }], // middle aisle
  [{ x: 230, y: 166, lane: 166 }, { x: 245, y: 166, lane: 166 }], // lounge corner
].map((pair) => pair.map((spot) => ({ ...spot, owner: null })));

export const IDLE_POOLS = { coffee: COFFEE, sofa: SOFA };


export function route(from, to) {
  return [
    { x: from.x, y: from.lane },
    { x: CORRIDOR_X, y: from.lane },
    { x: CORRIDOR_X, y: to.lane },
    { x: to.x, y: to.lane },
    { x: to.x, y: to.y },
  ];
}


export function claimSeat(worker) {
  const desk = DESKS.find((d) => !d.owner);
  if (desk) {
    desk.owner = worker;
    return { x: desk.cx, y: desk.seatY, lane: desk.lane, desk };
  }
  const spot = SOFA.find((s) => !s.owner);
  if (spot) {
    spot.owner = worker;
    return spot;
  }
  const h = hash(worker.id);
  return { x: 236 + (h % 70), y: 104 + ((h >>> 8) % 20), lane: 100, standing: true };
}


export function releaseSeat(worker) {
  if (worker.seat.desk) worker.seat.desk.owner = null;
  else if (worker.seat.sofa) worker.seat.owner = null;
}


/** Whiteboard spots for plan-mode "meetings". */
export const BOARD = [{ x: 153, y: 50, lane: 50, owner: null }, { x: 164, y: 50, lane: 50, owner: null }];
