import test from 'node:test';
import assert from 'node:assert/strict';
import { createGrid, findPath, lineOfSight, pathLength, walkable } from '../renderer/src/world/path.js';

// 100×60 room with a wall in the middle that has a gap at the bottom
const grid = createGrid({ width: 100, height: 60, minY: 0, obstacles: [{ x: 48, y: 0, w: 4, h: 44 }] });

/** Deterministic pseudo-random generator for repeatable tests. */
const seeded = (seed) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

const assertWalkable = (from, pts) => {
  let prev = from;
  for (const p of pts.slice(0, -1)) {
    assert.ok(lineOfSight(grid, prev, p), `segment ${JSON.stringify(prev)} → ${JSON.stringify(p)} crosses the wall`);
    prev = p;
  }
};

test('obstacles are not walkable', () => {
  assert.equal(walkable(grid, 50, 10), false);
  assert.equal(walkable(grid, 50, 50), true);
  assert.equal(walkable(grid, 20, 10), true);
});

test('path goes around the wall and ends exactly at the target', () => {
  const from = { x: 20, y: 10 };
  const to = { x: 80, y: 10 };
  const pts = findPath(grid, from, to, { rng: seeded(1) });
  assert.deepEqual(pts.at(-1), to);
  assertWalkable(from, pts);
  assert.ok(pts.some((p) => p.y >= 44), 'must pass through the gap');
});

test('targets inside furniture are reached from the nearest free cell', () => {
  const to = { x: 50, y: 30 }; // inside the wall, like a sofa seat
  const pts = findPath(grid, { x: 20, y: 30 }, to, { rng: seeded(2) });
  assert.deepEqual(pts.at(-1), to);
});

test('routes differ between walks but stay reasonably short', () => {
  const from = { x: 6, y: 6 };
  const to = { x: 94, y: 54 };
  const routes = new Set();
  const shortest = pathLength([from, ...findPath(grid, from, to, { noise: 0, detour: 0 })]);
  for (let i = 0; i < 12; i++) {
    const pts = findPath(grid, from, to, { rng: seeded(100 + i) });
    assertWalkable(from, pts);
    assert.ok(pathLength([from, ...pts]) < shortest * 1.8);
    routes.add(JSON.stringify(pts));
  }
  assert.ok(routes.size >= 4, `only ${routes.size} distinct routes`);
});

test('straight line in an open area needs no waypoints', () => {
  const pts = findPath(grid, { x: 10, y: 50 }, { x: 30, y: 50 }, { noise: 0, detour: 0 });
  assert.deepEqual(pts.at(-1), { x: 30, y: 50 });
  assert.ok(pts.length <= 2);
});
