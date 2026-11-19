/**
 * ?mode=preview&floor=ground|upper&hour=14&people=0|1 – draws one static BlueGhost floor, nothing
 * else runs (no simulation, no hooks, no panels). scripts/preview.js captures it as PNG.
 * people=1 puts stand-ins on every kind of seat and spot of the floor and lays them out with the live
 * code (draw/people.js workerLayout → seatPose), so the shots show the real poses and layering:
 * upstairs desks left/right/front/back, sofas, armchairs, a booth, the window, the plan-mode meeting, a
 * chat, the printer, the stairs, an intern, a ghost and the director at the task board; downstairs bar
 * stools, coffee at the bar, café chairs, the blue sofa, the sofa under the stairs, the pouf, a chat, the
 * stairs and someone walking in from the yard.
 */
import { C } from './core/palette.js';
import { H, OX, OY, S, W, canvas, ctx, resize } from './core/canvas.js';
import { drawOffice } from './draw/office/index.js';
import { liveLights } from './draw/office/live.js';
import { directorLayout, internLayout, personDrawable, workerLayout } from './draw/people.js';
import { lookFor } from './entities/look.js';
import { lifeItems } from './life/index.js';
import { BOARD, DESKS, IDLE_POOLS, OFFICE_SPOTS, floors, internSpot } from './world/layout.js';
import { stairsPoint } from './world/stairs.js';

/** A stand-in worker with everything workerLayout reads. */
function standIn(key, level, props) {
  return {
    look: lookFor(`preview-${key}`, level), mood: { current: 'neutral', flash: null }, activity: 'typing', waiting: false,
    errorUntil: 0, walking: false, ghost: false, leaving: false, gone: false, interns: [], step: 0, talkingUntil: 0,
    context: 30, bubble: null, stairs: null, ...props,
  };
}

/** Seated at a desk seat (owner of it, so the live screen shows the activity). */
function atDesk(key, level, seat, activity, extra = {}) {
  const w = standIn(key, level, { place: 'desk', seat, x: seat.x, y: seat.y, floor: seat.floor, activity, ...extra });
  seat.owner = w;
  return w;
}

/** On an idle seat or spot of a pool. */
const idleAt = (key, level, kind, spot, extra = {}) => standIn(key, level, {
  place: 'spot', idle: { kind, spot, arrived: true }, x: spot.x, y: spot.y, floor: spot.floor, activity: 'idle', ...extra,
});

/** A chat on a floor's first `c` pair: the left one talks, both face each other. */
function chat(floorName, key) {
  const [s0, s1] = floors[floorName].chatPairs[0];
  const a = idleAt(`${key}-a`, 1, 'chat', s0, { talkingUntil: Infinity });
  const b = idleAt(`${key}-b`, 0, 'chat', s1);
  const convo = { a, b };
  a.idle.convo = convo;
  b.idle.convo = convo;
  return [a, b];
}

const onStairs = (key, floorName, dir, progress) => {
  const p = stairsPoint(floorName, dir, progress);
  return standIn(key, 0, { place: 'entering', x: p.x, y: p.y, floor: floorName, step: progress * 20, stairs: { floor: floorName, dir, progress } });
};

const pick = (list, pred, i = 0) => list.filter(pred)[i];

function upperCast() {
  const desk = (pred, i) => pick(DESKS, pred, i);
  const back = (d) => d.item.box.r === floors.upper.band;
  const people = [
    atDesk('d-left', 1, desk((d) => back(d) && d.facing === 'left', 2), 'typing'),
    atDesk('d-right', 2, desk((d) => back(d) && d.facing === 'right', 2), 'reading'),
    atDesk('d-right2', 0, desk((d) => back(d) && d.facing === 'right', 5), 'sleeping'),
    atDesk('d-left2', 3, desk((d) => back(d) && d.facing === 'left', 7), 'waiting', { waiting: true }),
    atDesk('d-front', 0, desk((d) => d.facing === 'front', 0), 'terminal'),
    atDesk('d-back', 4, desk((d) => d.facing === 'back', 0), 'web', { context: 80 }),
    atDesk('d-front2', 1, desk((d) => d.facing === 'front', 3), 'thinking'),
    idleAt('sofa-r', 1, 'sofa', pick(IDLE_POOLS.sofa, (s) => s.floor === 'upper' && s.kind === 'sofa' && s.facing === 'right')),
    idleAt('sofa-l', 2, 'sofa', pick(IDLE_POOLS.sofa, (s) => s.floor === 'upper' && s.kind === 'sofa' && s.facing === 'left', 1)),
    idleAt('arm-f', 0, 'sofa', pick(IDLE_POOLS.sofa, (s) => s.kind === 'armchair' && s.facing === 'front')),
    idleAt('arm-b', 3, 'sofa', pick(IDLE_POOLS.sofa, (s) => s.kind === 'armchair' && s.facing === 'back')),
    idleAt('booth', 1, 'booth', IDLE_POOLS.booth[1]),
    idleAt('window', 2, 'window', IDLE_POOLS.window[0]),
    idleAt('printer', 0, 'stroll', floors.upper.named.printer),
    ...chat('upper', 'chat-u'),
    standIn('board', 2, { place: 'board', x: BOARD[1].x, y: BOARD[1].y, floor: 'upper', activity: 'planning' }),
    onStairs('stairs-u', 'upper', 'up', 0.8),
    standIn('ghost', 0, { place: 'ghost', ghost: true, x: 120, y: 112, floor: 'upper' }),
  ];
  const boss = people[4];
  const intern = { look: { ...lookFor('preview-intern'), cap: C.lime, tie: null }, slot: 0, walking: false, ...internSpot(boss.seat, 0) };
  const director = {
    x: OFFICE_SPOTS.board.x, y: OFFICE_SPOTS.board.y, floor: 'upper', look: { ...lookFor('ředitel', 4), headphones: false },
    walking: false, stairs: null, beat: { kind: 'board', spot: 'board', arms: 'draw' }, face: 'neutral',
    todos: { configured: true, overdue: 1, today: 3, week: 5, total: 9 }, boardFx: [],
  };
  return { people, interns: [intern], director, meeting: true };
}

function groundCast() {
  const pool = (name, pred = () => true, i = 0) => pick(IDLE_POOLS[name], (s) => s.floor === 'ground' && pred(s), i);
  const people = [
    idleAt('stool', 1, 'stool', pool('stool', () => true, 2)),
    idleAt('stool2', 3, 'stool', pool('stool', () => true, 4)),
    idleAt('coffee', 0, 'coffee', IDLE_POOLS.coffee[0]),
    idleAt('cafe-f', 2, 'cafe', pool('cafe', (s) => s.facing === 'front', 1)),
    idleAt('cafe-b', 0, 'cafe', pool('cafe', (s) => s.facing === 'back', 1)),
    idleAt('cafe-b2', 4, 'cafe', pool('cafe', (s) => s.facing === 'back', 5)),
    idleAt('blue-sofa', 1, 'sofa', pool('sofa', (s) => s.facing === 'right', 1)),
    idleAt('stairs-sofa', 2, 'sofa', pool('sofa', (s) => s.facing === 'back', 1)),
    idleAt('pouf', 0, 'pouf', pool('pouf')),
    ...chat('ground', 'chat-g'),
    onStairs('stairs-g', 'ground', 'up', 0.1),
    onStairs('stairs-g2', 'ground', 'down', 0.8),
    standIn('walker', 1, { place: 'entering', walking: true, step: 0.5, facing: 'down', x: 120, y: 136, floor: 'ground' }),
  ];
  return { people, interns: [], director: null, meeting: false };
}

export function startPreview() {
  const q = new URLSearchParams(location.search);
  const floorName = q.get('floor') === 'ground' ? 'ground' : 'upper';
  const floor = floors[floorName];
  const m = floor.map;
  const hour = Number(q.get('hour') ?? 14);
  const date = new Date(2026, 10, 11, hour, 0, 0);
  const t = 2;
  const cast = q.get('people') === '1' ? (floorName === 'upper' ? upperCast() : groundCast()) : { people: [], interns: [], director: null };
  const drawables = [
    ...cast.people.map((w) => personDrawable(workerLayout(w, t), w.look, t)),
    ...cast.interns.map((i) => personDrawable(internLayout(i, t), i.look, t)),
    ...(cast.director ? [personDrawable(directorLayout(cast.director, t), cast.director.look, t)] : []),
    ...(cast.people.length ? lifeItems(t, floorName) : []),
  ];
  const desks = DESKS.filter((d) => d.floor === floorName);
  const live = {
    t, date, desks, printer: floor.named.printer, standing: cast.people, meeting: Boolean(cast.meeting), done: 3,
    director: cast.director ?? { todos: { configured: true, overdue: 1, today: 2, week: 3, total: 6 }, boardFx: [] },
  };
  for (const id of ['bar', 'chat']) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  }
  resize();
  const frame = () => {
    ctx.fillStyle = C.ink;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.beginPath();
    ctx.rect(OX, OY, W * S, H * S);
    ctx.clip();
    drawOffice(m, { t, hour, live, drawables, lights: liveLights(desks, cast.people), others: cast.people.length ? 2 : 0 });
    ctx.restore();
  };
  let frames = 0;
  const loop = () => {
    frame();
    if (++frames === 3) window.__previewReady = true;
    requestAnimationFrame(loop);
  };
  document.fonts.ready.then(() => requestAnimationFrame(loop));
}
