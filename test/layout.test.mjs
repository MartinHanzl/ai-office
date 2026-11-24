import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BOARD, CHAT_PAIRS, DESKS, DOOR, ENTRY, FLOOR_NAMES, IDLE_POOLS, OFFICE_AREAS, OFFICE_SPOTS, PLAN_BOARD, TASK_BOARD, TVS,
  chatPair, claimSeat, floors, internSpot, isWalkable, randomFloorPoint, randomOfficePoint, releaseSeat, route,
} from '../renderer/src/world/layout.js';
import { STAIRS_SECONDS, stairsPoint } from '../renderer/src/world/stairs.js';
import { lineOfSight, nearestWalkable } from '../renderer/src/world/path.js';
import { Person } from '../renderer/src/entities/person.js';

const cellOf = (p) => [Math.floor(p.x / 4), Math.floor(p.y / 4)];

/** Every place people go to, per floor. */
function placesOn(floor) {
  const F = floors[floor];
  const all = [
    ...DESKS.map((d) => ({ name: `desk ${d.id}`, ...d })),
    ...Object.entries(IDLE_POOLS).flatMap(([kind, pool]) => pool.map((s) => ({ name: `${kind} ${s.c},${s.r}`, ...s }))),
    ...BOARD.map((s) => ({ name: 'board', ...s })),
    ...Object.entries(OFFICE_SPOTS).map(([name, s]) => ({ name: `director ${name}`, ...s })),
    ...Object.values(F.named).map((s) => ({ name: `named ${s.name}`, ...s })),
    ...F.chatPairs.flat().map((s) => ({ name: 'chat', ...s })),
  ];
  return all.filter((p) => (p.floor ?? 'upper') === floor);
}

/** The route stays on free floor; only the last step may go into a seat inside furniture (sofa, stool…). */
function assertRoute(F, from, p) {
  const pts = route({ ...from, floor: F.name }, p);
  assert.deepEqual(pts.at(-1), { x: p.x, y: p.y }, p.name);
  const inside = !F.isWalkable(p.x, p.y);
  let prev = nearestWalkable(F.grid, from.x, from.y);
  pts.forEach((q, i) => {
    if (inside && i === pts.length - 1) assert.ok(Math.hypot(prev.x - q.x, prev.y - q.y) < 12, `${F.name} ${p.name}: last step too long`);
    else assert.ok(lineOfSight(F.grid, prev, q), `${F.name} ${p.name}: ${JSON.stringify(prev)} → ${JSON.stringify(q)}`);
    prev = q;
  });
  return [nearestWalkable(F.grid, from.x, from.y), ...pts];
}

test('every seat and spot is reachable from the stairs of its floor without crossing furniture', () => {
  for (const floor of FLOOR_NAMES) {
    const places = placesOn(floor);
    assert.ok(places.length > 10, floor);
    for (const p of places) assertRoute(floors[floor], floors[floor].stairs, p);
  }
});

test('downstairs everything is reached from the gate through the entrance door', () => {
  const G = floors.ground;
  assert.equal(DOOR, ENTRY);
  assert.equal(ENTRY.floor, 'ground');
  const doors = new Set(G.map.of('door').filter((d) => d.cells.some(([c, r]) => G.map.at(c - 1, r) === ',' || G.map.at(c, r + 1) === ','))
    .map((d) => `${d.box.c},${d.box.r}`));
  assert.equal(doors.size, 3, 'three door cells on the chamfer');
  assert.ok(doors.has(cellOf(G.door).join(',')), 'floor.door is one of them');
  // the entrance is the only way in: with its door cells shut the yard is cut off from the hall
  const reach = (open) => {
    const [c0, r0] = cellOf(ENTRY);
    const seen = new Set([`${c0},${r0}`]);
    const queue = [[c0, r0]];
    while (queue.length) {
      const [c, r] = queue.shift();
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const k = `${c + dc},${r + dr}`;
        if (seen.has(k) || !open(c + dc, r + dr)) continue;
        seen.add(k);
        queue.push([c + dc, r + dr]);
      }
    }
    return seen;
  };
  const z = cellOf(G.stairs).join(',');
  assert.ok(reach((c, r) => G.map.walkable(c, r)).has(z));
  assert.ok(!reach((c, r) => G.map.walkable(c, r) && !doors.has(`${c},${r}`)).has(z));
  for (const p of [...placesOn('ground'), { name: 'stairs', ...G.stairs }]) {
    const pts = assertRoute(G, ENTRY, p);
    let through = false;
    for (let i = 1; i < pts.length && !through; i++) {
      const [a, b] = [pts[i - 1], pts[i]];
      const n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) * 20);
      for (let k = 0; k <= n && !through; k++) {
        // a diagonal doorway may be crossed right through the corner two door cells share
        const x = a.x + ((b.x - a.x) * k) / n;
        const y = a.y + ((b.y - a.y) * k) / n;
        through = [[0, 0], [0.5, 0.5], [-0.5, 0.5], [0.5, -0.5], [-0.5, -0.5]].some(([dx, dy]) => doors.has(cellOf({ x: x + dx, y: y + dy }).join(',')));
      }
    }
    assert.ok(through, `${p.name}: not through the entrance door`);
  }
});

/** Deterministic pseudo-random generator for repeatable tests. */
const seeded = (seed) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

test('walks indoors keep out of the yard; open-plan walks upstairs keep out of the meeting room and the booths', () => {
  const rng = seeded(7);
  const pick = (list) => list[Math.floor(rng() * list.length)];
  for (const F of Object.values(floors)) {
    // downstairs the courtyard; upstairs every room but the open plan (the biggest one)
    const main = F.rooms.sizes.indexOf(Math.max(...F.rooms.sizes));
    const off = F.name === 'ground'
      ? (c, r) => F.map.floorAt(c, r) === 'yard'
      : (c, r) => F.rooms.of(c, r) >= 0 && F.rooms.of(c, r) !== main;
    const places = [F.stairs, ...placesOn(F.name), ...F.openCells.map(([c, r]) => ({ x: c * 4 + 2, y: r * 4 + 2 }))]
      .filter((p) => !off(...cellOf(nearestWalkable(F.grid, p.x, p.y))));
    assert.ok(places.length > 100, F.name);
    for (let k = 0; k < 1500; k++) {
      const a = pick(places);
      const b = pick(places);
      if (a === b) continue;
      const pts = route({ x: a.x, y: a.y, floor: F.name }, { x: b.x, y: b.y, floor: F.name }, { rng });
      let prev = a;
      for (const q of pts) {
        const n = Math.max(1, Math.ceil(Math.hypot(q.x - prev.x, q.y - prev.y)));
        for (let i = 0; i <= n; i++) {
          const x = prev.x + ((q.x - prev.x) * i) / n;
          const y = prev.y + ((q.y - prev.y) * i) / n;
          assert.ok(!off(...cellOf({ x, y })), `${F.name} ${a.x},${a.y} → ${b.x},${b.y} via ${JSON.stringify(pts)}`);
        }
        prev = q;
      }
    }
  }
});

test('desks: 24 upstairs with facing, desk top and seed; pools carry floor, kind and facing', () => {
  assert.equal(DESKS.length, 24);
  assert.deepEqual(DESKS.map((d) => d.id), Array.from({ length: 24 }, (_, i) => i + 1));
  for (const d of DESKS) {
    assert.equal(d.floor, 'upper');
    assert.equal(d.kind, 'desk');
    assert.ok(['left', 'right', 'front', 'back'].includes(d.facing));
    assert.ok(isWalkable(d.x, d.y, 'upper'), `desk ${d.id} seat on the floor`);
    // the desk top lies inside the desk piece, in front of the seat
    const { desk, item } = d;
    assert.ok(desk.x >= item.x && desk.y >= item.y && desk.x + desk.w <= item.x + item.w && desk.y + desk.h <= item.y + item.h, `desk ${d.id}`);
    assert.ok(desk.w >= 16 && desk.h >= 8, `desk ${d.id} top ${JSON.stringify(desk)}`);
    assert.equal(typeof d.seed, 'number');
  }
  // the desk tops of one piece do not overlap
  for (const a of DESKS) {
    for (const b of DESKS) {
      if (a === b) continue;
      const overlap = a.desk.x < b.desk.x + b.desk.w && b.desk.x < a.desk.x + a.desk.w && a.desk.y < b.desk.y + b.desk.h && b.desk.y < a.desk.y + a.desk.h;
      assert.ok(!overlap, `desks ${a.id} and ${b.id} share a top`);
    }
  }
  const expect = {
    coffee: ['ground', ['coffee']], sofa: [null, ['sofa', 'armchair']], window: ['upper', ['window']], booth: ['upper', ['booth']],
    cafe: ['ground', ['cafe']], stool: ['ground', ['stool']], pouf: ['ground', ['pouf']],
  };
  for (const [kind, [floor, kinds]] of Object.entries(expect)) {
    assert.ok(IDLE_POOLS[kind].length > 0, kind);
    for (const s of IDLE_POOLS[kind]) {
      if (floor) assert.equal(s.floor, floor, kind);
      assert.ok(kinds.includes(s.kind), `${kind}: ${s.kind}`);
      assert.ok(s.facing, kind);
      assert.equal(s.owner, null);
    }
  }
  assert.deepEqual(IDLE_POOLS.coffee.map((s) => s.facing), ['back', 'back']);
  assert.ok(IDLE_POOLS.window.every((s) => s.facing === 'front'));
  assert.ok(new Set(IDLE_POOLS.sofa.map((s) => s.floor)).size === 2, 'sofas on both floors');
  assert.equal(IDLE_POOLS.booth.length, 3);
  assert.equal(IDLE_POOLS.cafe.length, 18);
  assert.equal(BOARD.length, 3);
  assert.ok(BOARD.every((s) => s.floor === 'upper' && s.facing === 'back'));
});

test('named spots, wall items and the director’s meeting room come from the plans', () => {
  assert.deepEqual(Object.keys(floors.upper.named).sort(), ['bins', 'board', 'drawers', 'glass', 'printer']);
  assert.deepEqual(Object.keys(floors.ground.named).sort(), ['darts', 'kitchen', 'reception', 'snack', 'wc']);
  for (const F of Object.values(floors)) {
    for (const s of Object.values(F.named)) assert.ok(F.isWalkable(s.x, s.y), `${F.name} ${s.name}`);
  }
  for (const r of [TASK_BOARD, PLAN_BOARD, TVS.reception, TVS.meeting]) assert.ok(r && r.w > 0 && r.h > 0);
  assert.ok(TASK_BOARD.y + TASK_BOARD.h <= floors.upper.floorY, 'task board on the wall');
  const board = floors.upper.named.board;
  const room = floors.upper.rooms.of(board.c, board.r);
  const inRoom = (p) => floors.upper.rooms.of(...cellOf(p)) === room;
  for (const s of Object.values(OFFICE_SPOTS)) {
    assert.equal(s.floor, 'upper');
    assert.ok(isWalkable(s.x, s.y, 'upper') && inRoom(s), JSON.stringify(s));
  }
  // the TV spot stands under the meeting-room TV
  assert.ok(OFFICE_SPOTS.tv.x >= TVS.meeting.x && OFFICE_SPOTS.tv.x < TVS.meeting.x + TVS.meeting.w);
  for (const a of OFFICE_AREAS) {
    for (let x = a.x + 2; x < a.x + a.w; x += 4) for (let y = a.y + 2; y < a.y + a.h; y += 4) assert.ok(inRoom({ x, y }), JSON.stringify(a));
  }
  for (let i = 0; i < 200; i++) {
    const p = randomOfficePoint();
    assert.equal(p.floor, 'upper');
    assert.ok(isWalkable(p.x, p.y, 'upper') && inRoom(p), JSON.stringify(p));
    // a walk without detours never leaves the room
    for (const q of route(OFFICE_SPOTS.board, p, { detour: 0 })) assert.ok(inRoom(q), JSON.stringify(q));
  }
});

test('open areas are free floor away from seats; random points and chat pairs stay on their floor', () => {
  for (const F of Object.values(floors)) {
    assert.ok(F.openAreas.length >= 3, F.name);
    const spots = new Set(F.map.spots.filter((s) => s.kind !== 'chat').map((s) => `${s.c},${s.r}`));
    for (const a of F.openAreas) {
      for (let x = a.x + 2; x < a.x + a.w; x += 4) {
        for (let y = a.y + 2; y < a.y + a.h; y += 4) {
          assert.ok(F.isWalkable(x, y) && F.isOpen(x, y), `${F.name} ${JSON.stringify(a)}`);
          assert.ok(!spots.has(cellOf({ x, y }).join(',')), `${F.name}: area ${JSON.stringify(a)} covers a seat`);
          assert.notEqual(F.map.floorAt(...cellOf({ x, y })), 'yard');
        }
      }
    }
    for (let i = 0; i < 100; i++) {
      const p = randomFloorPoint(null, F.name);
      assert.equal(p.floor, F.name);
      assert.ok(F.isOpen(p.x, p.y), JSON.stringify(p));
      const pair = chatPair([], F.name);
      assert.ok(pair, F.name);
      for (const s of pair) {
        assert.equal(s.floor, F.name);
        assert.ok(F.isWalkable(s.x, s.y), JSON.stringify(s));
      }
    }
    // busy spots keep chats away
    const busy = [{ x: 100, y: 100, floor: F.name }];
    for (let i = 0; i < 50; i++) {
      const pair = chatPair(busy, F.name);
      if (pair[0].c === undefined) for (const s of pair) assert.ok(Math.hypot(s.x - 100, s.y - 100) >= 22);
    }
  }
  assert.equal(CHAT_PAIRS, floors.upper.chatPairs);
  assert.ok(CHAT_PAIRS.length >= 3 && CHAT_PAIRS.every((p) => p.every((s) => s.floor === 'upper')));
});

test('claimSeat hands out 24 distinct desks, then klubovna tables and sofas; releaseSeat frees them', () => {
  const workers = Array.from({ length: 60 }, (_, i) => ({ id: `w${i}` }));
  for (const w of workers) w.seat = claimSeat(w);
  const desks = workers.slice(0, 24).map((w) => w.seat);
  assert.equal(new Set(desks).size, 24);
  assert.ok(desks.every((s) => s.kind === 'desk' && DESKS.includes(s)));
  // the first few spread over different desk pieces
  assert.equal(new Set(desks.slice(0, 7).map((s) => s.item)).size, 7);
  const overflow = workers.slice(24).map((w) => w.seat);
  assert.ok(overflow.slice(0, 18).every((s) => s.kind === 'cafe' && s.floor === 'ground'));
  assert.ok(overflow.slice(18, 18 + IDLE_POOLS.sofa.length).every((s) => ['sofa', 'armchair'].includes(s.kind)));
  const standing = workers.at(-1).seat;
  assert.ok(standing.standing && standing.floor === 'upper' && isWalkable(standing.x, standing.y, 'upper'));
  for (const w of workers) assert.equal(w.seat.owner, w);
  const first = workers[0].seat;
  releaseSeat(workers[0]);
  assert.equal(first.owner, null);
  const again = { id: 'again' };
  assert.equal(claimSeat(again), first, 'a freed desk is handed out again');
  again.seat = first;
  for (const w of [again, ...workers.slice(1)]) releaseSeat(w);
  assert.ok(DESKS.every((d) => !d.owner));
});

test('interns stand on free floor next to the seat, away from the desk', () => {
  const seats = [...DESKS, ...IDLE_POOLS.cafe, ...IDLE_POOLS.sofa, claimSeat({ id: 'x' })];
  for (const d of DESKS) releaseSeat({ seat: d });
  for (const seat of seats) {
    const F = floors[seat.floor];
    const spotCells = new Set(F.map.spots.map((s) => `${s.c},${s.r}`));
    const spots = [0, 1, 2].map((slot) => internSpot(seat, slot));
    assert.equal(new Set(spots.map((p) => `${p.x},${p.y}`)).size, 3, `${seat.id}: three distinct spots`);
    for (const p of spots) {
      assert.equal(p.floor, seat.floor);
      assert.ok(F.isWalkable(p.x, p.y), `${seat.id}: intern on an obstacle ${JSON.stringify(p)}`);
      assert.ok(!spotCells.has(cellOf(p).join(',')), `${seat.id}: intern on a seat or spot`);
      assert.ok(Math.hypot(p.x - seat.x, p.y - seat.y) <= 20, `${seat.id}: intern too far`);
      if (seat.kind === 'desk') {
        // not on the desk side
        const ahead = { left: [-1, 0], right: [1, 0], front: [0, 1], back: [0, -1] }[seat.facing];
        assert.ok((p.x - seat.x) * ahead[0] + (p.y - seat.y) * ahead[1] <= 0, `${seat.id} ${seat.facing}: intern by the desk`);
      }
      assertRoute(F, F.stairs, { name: `intern of ${seat.id}`, ...p });
    }
  }
});

test('interns are visible: beside a front/back desk seat, never sharing a place with a neighbour\'s intern', () => {
  for (const seat of DESKS.filter((d) => d.facing === 'front' || d.facing === 'back')) {
    for (const slot of [0, 1, 2]) {
      const p = internSpot(seat, slot);
      // not right behind (front seats) or right in front (back seats) of the boss, where the figures overlap
      assert.ok(Math.abs(p.x - seat.x) >= 8, `desk ${seat.id} ${seat.facing}: intern ${slot} hidden by the boss at ${p.x},${p.y}`);
    }
  }
  const seats = [...DESKS, ...IDLE_POOLS.cafe, ...IDLE_POOLS.sofa];
  const owner = new Map();
  for (const seat of seats) {
    for (const slot of [0, 1, 2]) {
      const p = internSpot(seat, slot);
      const id = `${p.floor}:${p.x},${p.y}`;
      assert.ok(!owner.has(id) || owner.get(id) === seat, `${id}: interns of ${owner.get(id)?.id} and ${seat.id} share a place`);
      owner.set(id, seat);
    }
  }
});

test('stairs: the climb starts and ends on the Z portals of both floors', () => {
  const g = floors.ground.stairs;
  const u = floors.upper.stairs;
  const pt = (p) => ({ x: p.x, y: p.y });
  assert.deepEqual(stairsPoint('ground', 'up', 0), pt(g));
  assert.deepEqual(stairsPoint('upper', 'up', 1), pt(u));
  assert.deepEqual(stairsPoint('upper', 'down', 0), pt(u));
  assert.deepEqual(stairsPoint('ground', 'down', 1), pt(g));
  assert.equal(STAIRS_SECONDS, 2.5);
  // halfway: the top of the ground flight (west end, ~40 px up) / down in the opening upstairs
  const top = stairsPoint('ground', 'up', 0.5);
  const flight = floors.ground.map.of('stairs')[0];
  assert.ok(top.x < flight.x + 8 && g.y - top.y >= 36 && g.y - top.y <= 48, JSON.stringify(top));
  assert.deepEqual(stairsPoint('ground', 'down', 0.5), top);
  const low = stairsPoint('upper', 'up', 0.5);
  const opening = floors.upper.map.of('opening')[0];
  assert.ok(low.x >= opening.x && low.x < opening.x + opening.w / 2 && low.y > u.y, JSON.stringify(low));
  assert.deepEqual(stairsPoint('upper', 'down', 0.5), low);
  // the ground half rises steadily
  let prev = stairsPoint('ground', 'up', 0);
  for (let p = 0.05; p <= 0.5; p += 0.05) {
    const q = stairsPoint('ground', 'up', p);
    assert.ok(q.x < prev.x && q.y < prev.y);
    prev = q;
  }
});

/** Steps a person until it stops walking; records the floors and climbs on the way. */
function simulate(person, { dt = 1 / 30, maxSecs = 120, onStep } = {}) {
  const seen = { floors: [person.floor], climbs: [], walkingThroughout: true, frames: 0 };
  let climbing = false;
  for (let t = 0; t < maxSecs; t += dt) {
    person.move(dt);
    seen.frames += 1;
    if (person.floor !== seen.floors.at(-1)) seen.floors.push(person.floor);
    if (person.stairs && !climbing) seen.climbs.push(person.stairs.dir);
    climbing = Boolean(person.stairs);
    if (person.stairs) assert.equal(person.stairs.floor, person.floor, 'stairs.floor follows the person');
    onStep?.(person);
    if (!person.walking && !person.onArrive) return seen;
    if (!person.walking) seen.walkingThroughout = false;
  }
  return seen;
}

test('a person walks from the gate up to a desk and back down, across the stairs', () => {
  const p = new Person({});
  assert.equal(p.floor, 'ground');
  assert.deepEqual([p.x, p.y], [ENTRY.x, ENTRY.y]);
  const desk = DESKS[0];
  let arrived = 0;
  p.walkTo(desk, () => { arrived += 1; });
  assert.ok(p.walking);
  const flips = [];
  let lastFloor = p.floor;
  const up = simulate(p, {
    onStep: (q) => {
      if (q.floor !== lastFloor) {
        flips.push(q.stairs?.progress);
        lastFloor = q.floor;
      }
      if (!q.stairs && q.walking) {
        // off the stairs a person walks on the floor of their own level
        const F = floors[q.floor];
        const near = nearestWalkable(F.grid, q.x, q.y);
        assert.ok(near && Math.hypot(near.x - q.x, near.y - q.y) < 6, `${q.floor} ${q.x},${q.y}`);
      }
    },
  });
  assert.equal(arrived, 1);
  assert.equal(p.floor, 'upper');
  assert.deepEqual([p.x, p.y], [desk.x, desk.y]);
  assert.deepEqual(up.floors, ['ground', 'upper']);
  assert.deepEqual(up.climbs, ['up']);
  assert.equal(flips.length, 1);
  assert.ok(flips[0] >= 0.5 && flips[0] < 0.6, `flipped at ${flips[0]}`);
  assert.ok(up.walkingThroughout, 'walking all the way');

  let left = false;
  p.walkTo(ENTRY, () => { left = true; });
  const down = simulate(p);
  assert.ok(left);
  assert.equal(p.floor, 'ground');
  assert.deepEqual([p.x, p.y], [ENTRY.x, ENTRY.y]);
  assert.deepEqual(down.floors, ['upper', 'ground']);
  assert.deepEqual(down.climbs, ['down']);
});

test('a new target mid-climb: the climb finishes, then the walk turns back', () => {
  const p = new Person({});
  p.placeAt(floors.upper.stairs);
  assert.equal(p.floor, 'upper');
  const coffee = IDLE_POOLS.coffee[0];
  p.walkTo(coffee, () => {});
  // into the climb, past the floor flip
  for (let i = 0; i < 60 && !(p.stairs && p.stairs.progress > 0.6); i++) p.move(1 / 30);
  assert.ok(p.stairs && p.floor === 'ground', 'on the stairs, already downstairs');
  const win = IDLE_POOLS.window[0];
  let done = false;
  p.walkTo(win, () => { done = true; });
  assert.ok(p.walking);
  const seen = simulate(p);
  assert.ok(done);
  assert.equal(p.floor, 'upper');
  assert.deepEqual([p.x, p.y], [win.x, win.y]);
  assert.deepEqual(seen.floors, ['ground', 'upper']);
  // halt() and placeAt() call a pending climb off
  p.walkTo(coffee, () => { throw new Error('called off'); });
  p.placeAt(win);
  simulate(p, { maxSecs: 5 });
  assert.equal(p.floor, 'upper');
  assert.equal(p.stairs, null);
});

test('a same-floor walk never touches the stairs and takes about distance / speed', () => {
  const p = new Person({});
  p.placeAt(DESKS[0]);
  const target = DESKS[23];
  let ok = false;
  p.walkTo(target, () => { ok = true; });
  const seen = simulate(p);
  assert.ok(ok);
  assert.equal(seen.climbs.length, 0);
  assert.deepEqual(seen.floors, ['upper']);
  assert.ok(seen.frames / 30 < 30, 'walk took too long');
  // the climb itself lasts STAIRS_SECONDS
  p.placeAt(floors.upper.stairs);
  p.walkTo(floors.ground.stairs, () => {});
  const climb = simulate(p);
  assert.ok(Math.abs(climb.frames / 30 - STAIRS_SECONDS) < 0.2, `${climb.frames / 30} s`);
});
