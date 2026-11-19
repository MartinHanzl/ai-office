import test from 'node:test';
import assert from 'node:assert/strict';
import { MAPS } from '../renderer/src/world/maps.js';
import { COLS, ROWS, deskSeats, parseMap, wallCells } from '../renderer/src/world/map.js';
import { createGrid, walkable } from '../renderer/src/world/path.js';

const floors = { ground: parseMap(MAPS.ground, 'ground'), upper: parseMap(MAPS.upper, 'upper') };
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

test('both plans are 45 rows × 80 chars and use only known chars', () => {
  for (const [name, rows] of Object.entries(MAPS)) {
    assert.equal(rows.length, ROWS, name);
    for (const row of rows) assert.equal([...row].length, COLS, name);
    assert.deepEqual(floors[name].unknown, [], `${name}: unknown chars`);
  }
});

test('the back-wall band and the outer columns are never walkable', () => {
  for (const m of Object.values(floors)) {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (r < m.band || c === 0 || c === COLS - 1 || r === ROWS - 1) assert.equal(m.walkable(c, r), false, `${m.floor} ${c},${r}`);
      }
    }
  }
});

test('every seat touches the piece it belongs to', () => {
  for (const m of Object.values(floors)) {
    for (const s of m.seats) {
      const touches = s.anchor || N4.some(([dc, dr]) => /[dtTsaebiRCx]/.test(m.at(s.c + dc, s.r + dr)));
      assert.ok(touches, `${m.floor}: seat ${s.ch} at ${s.c},${s.r} touches no furniture`);
      assert.notEqual(s.use, 'floor', `${m.floor}: seat at ${s.c},${s.r} belongs to nothing`);
    }
    for (const s of deskSeats(m)) {
      assert.ok(s.item?.type === 'desk', `${m.floor}: desk seat at ${s.c},${s.r} faces its desk`);
      assert.ok(m.walkable(s.c, s.r), `${m.floor}: desk seat at ${s.c},${s.r} is on the floor`);
    }
  }
});

test('stair portals on both floors, the entry only downstairs', () => {
  const count = (m, kind) => m.spots.filter((s) => s.kind === kind).length;
  assert.equal(count(floors.ground, 'stairs'), 1);
  assert.equal(count(floors.upper, 'stairs'), 1);
  assert.equal(count(floors.ground, 'entry'), 1);
  assert.equal(count(floors.upper, 'entry'), 0);
});

// counts from layout.md "V kostce" (v4): 18 desks by the back wall + 4 + 2 in the right part
test('workstations: 24 upstairs (18 by the back wall), none downstairs', () => {
  assert.equal(deskSeats(floors.ground).length, 0);
  const up = deskSeats(floors.upper);
  assert.equal(up.length, 24);
  const backWall = up.filter((s) => s.item.box.r === floors.upper.band);
  assert.equal(backWall.length, 18);
  for (const d of floors.upper.of('desk')) assert.ok(d.seats.length > 0, `desk at ${d.box.c},${d.box.r} has no seat`);
});

test('upholstered seats are anchored in their piece', () => {
  for (const m of Object.values(floors)) {
    for (const s of m.seats.filter((q) => ['sofa', 'armchair', 'pouf'].includes(q.use))) {
      assert.ok(s.anchor && !m.walkable(s.c, s.r), `${m.floor}: ${s.use} seat at ${s.c},${s.r}`);
      assert.ok(s.item, `${m.floor}: ${s.use} seat at ${s.c},${s.r} has its piece`);
    }
  }
});

test('chat spots come in pairs, the chill zone exists only upstairs', () => {
  for (const m of Object.values(floors)) {
    assert.equal(m.spots.filter((s) => s.kind === 'chat').length, m.chatPairs.length * 2, m.floor);
  }
  assert.ok(floors.upper.zones.chill);
  assert.equal(floors.ground.zones.chill, null);
});

test('obstacle rects give path.js the same walkable cells', () => {
  for (const m of Object.values(floors)) {
    const grid = createGrid({ width: 320, height: 180, minY: m.floorY, obstacles: m.obstacles });
    for (let r = m.band; r < ROWS - 1; r++) {
      for (let c = 1; c < COLS - 1; c++) assert.equal(walkable(grid, c * 4 + 2, r * 4 + 2), m.walkable(c, r), `${m.floor} ${c},${r}`);
    }
  }
});

test('every spot is reachable from the way in (entry downstairs, stairs upstairs)', () => {
  for (const m of Object.values(floors)) {
    const start = m.spots.find((s) => s.kind === (m.floor === 'ground' ? 'entry' : 'stairs'));
    const seen = new Set([`${start.c},${start.r}`]);
    const queue = [[start.c, start.r]];
    while (queue.length) {
      const [c, r] = queue.shift();
      for (const [dc, dr] of N4) {
        const k = `${c + dc},${r + dr}`;
        if (seen.has(k) || !m.walkable(c + dc, r + dr)) continue;
        seen.add(k);
        queue.push([c + dc, r + dr]);
      }
    }
    for (const s of m.spots) {
      // anchors (sofa seats…) are reached from a free cell next to the piece
      const near = [];
      for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) near.push(`${s.c + dc},${s.r + dr}`);
      const ok = seen.has(`${s.c},${s.r}`) || (s.anchor && near.some((k) => seen.has(k)));
      assert.ok(ok, `${m.floor}: spot ${s.ch} at ${s.c},${s.r} unreachable`);
    }
    // the stairs portal downstairs is reachable from the entry as well
    if (m.floor === 'ground') {
      const z = m.spots.find((s) => s.kind === 'stairs');
      assert.ok(seen.has(`${z.c},${z.r}`));
    }
  }
});

test('wall graph: diagonal walls and doors connect through their corners', () => {
  for (const m of Object.values(floors)) {
    const cells = wallCells(m);
    const diagonal = cells.filter((w) => w.arms.some(([dc, dr]) => dc && dr));
    assert.ok(diagonal.some((w) => w.ch === 'D'), `${m.floor}: a door on a diagonal wall`);
    for (const w of cells) assert.ok(w.arms.length > 0, `${m.floor}: wall cell ${w.c},${w.r} is isolated`);
  }
});
