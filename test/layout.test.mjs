import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BOARD, COFFEE, CHAT_PAIRS, DESKS, DOOR, GRID, OPEN_AREAS, SOFA, WINDOW_SPOTS, isWalkable, route,
} from '../renderer/src/world/layout.js';
import { lineOfSight, nearestWalkable } from '../renderer/src/world/path.js';

const places = [
  ...DESKS.map((d) => ({ name: `desk ${d.cx}/${d.deskY}`, x: d.cx, y: d.seatY })),
  ...SOFA.map((s) => ({ name: 'sofa', ...s })),
  ...COFFEE.map((s) => ({ name: 'coffee', ...s })),
  ...WINDOW_SPOTS.map((s) => ({ name: 'window', ...s })),
  ...BOARD.map((s) => ({ name: 'board', ...s })),
  ...CHAT_PAIRS.flat().map((s) => ({ name: 'chat', ...s })),
];

test('every seat and spot is reachable from the entrance without crossing furniture', () => {
  for (const p of places) {
    const pts = route(DOOR, p);
    assert.deepEqual(pts.at(-1), { x: p.x, y: p.y }, p.name);
    // all segments except the last step into the seat stay on the floor
    let prev = nearestWalkable(GRID, DOOR.x, DOOR.y);
    for (const q of pts.slice(0, -1)) {
      assert.ok(lineOfSight(GRID, prev, q), `${p.name}: ${JSON.stringify(prev)} → ${JSON.stringify(q)}`);
      prev = q;
    }
    assert.ok(Math.hypot(prev.x - p.x, prev.y - p.y) < 12, `${p.name}: last step too long`);
  }
});

test('chat and stroll areas have free floor', () => {
  for (const a of OPEN_AREAS) {
    let free = 0;
    for (let x = a.x; x < a.x + a.w; x += 4) for (let y = a.y; y < a.y + a.h; y += 4) free += isWalkable(x, y) ? 1 : 0;
    assert.ok(free > 5, JSON.stringify(a));
  }
});
