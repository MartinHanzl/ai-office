/**
 * Frame loop: update everyone on both floors, then draw the floor shown (`state.floor`): its cached static
 * layer with the dynamic drawables sorted in (live desk screens, back-row chairs, printer, TVs and boards,
 * people, interns, the director, the cat, the robot), lamps and beams, the darkness with its lights,
 * particles, bubbles and name tags, the empty-office message and the floor-switch arrows.
 */
import { H, OX, OY, S, W, canvas, ctx } from './core/canvas.js';
import { C } from './core/palette.js';
import { now } from './core/util.js';
import { staticLayer, drawScene } from './draw/office/cache.js';
import { drawFloorSwitch } from './draw/office/courtyard.js';
import { drawTop, officeEnv } from './draw/office/index.js';
import { drawDarkness } from './draw/office/light.js';
import { liveDrawables, liveLights } from './draw/office/live.js';
import { drawEmptyOverlay, drawOverlay } from './draw/overlay.js';
import { directorLayout, floorOf, internLayout, personDrawable, workerLayout } from './draw/people.js';
import { director, updateDirector } from './entities/director.js';
import { hourOf } from './limits.js';
import { drawLifeOverlay, lifeItems, updateLife } from './life/index.js';
import { drawParticles } from './life/particles.js';
import { convos, state, stats, workers } from './state.js';
import { DEFAULT_FLOOR, DESKS, floors } from './world/layout.js';

/**
 * People (workers, their interns, the director) standing on or climbing to a floor, with their layout.
 * Interns still walking out after their boss has gone stay too.
 */
function peopleOn(floor, t) {
  const out = [];
  for (const w of workers.values()) {
    if (!w.gone && floorOf(w) === floor) out.push({ p: w, lay: workerLayout(w, t), look: w.look });
    for (const i of w.interns) if (!i.gone && floorOf(i) === floor) out.push({ p: i, lay: internLayout(i, t), look: i.look });
  }
  if (floorOf(director) === floor) out.push({ p: director, lay: directorLayout(director, t), look: director.look });
  return out;
}

/** How many people are on the other floor (for the badge on its switch button); leaving ones don't count. */
function countElsewhere(floor) {
  let n = floorOf(director) === floor ? 0 : 1;
  for (const w of workers.values()) {
    if (w.gone || w.leaving) continue;
    if (floorOf(w) !== floor) n += 1;
    for (const i of w.interns) if (!i.gone && !i.leaving && floorOf(i) !== floor) n += 1;
  }
  return n;
}

export function draw(t, dt) {
  const date = new Date();
  const hour = hourOf(date);
  const floorName = floors[state.floor] ? state.floor : DEFAULT_FLOOR;
  const floor = floors[floorName];
  const m = floor.map;

  ctx.fillStyle = C.ink;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.beginPath();
  ctx.rect(OX, OY, W * S, H * S);
  ctx.clip();

  const shown = peopleOn(floorName, t);
  const desks = DESKS.filter((d) => d.floor === floorName);
  const items = [];
  liveDrawables(m, {
    t, date, director, done: stats.done, desks,
    printer: floor.named.printer,
    standing: shown.map((s) => s.p),
    meeting: [...workers.values()].some((w) => w.place === 'board' && !w.walking && !w.gone),
  }, items);
  for (const s of shown) items.push(personDrawable(s.lay, s.look, t));
  items.push(...lifeItems(t, floorName));

  const layer = staticLayer(m, hour);
  drawScene(layer, items);

  const env = officeEnv(m, hour, t);
  drawTop(m, env);
  if (env.dark) drawDarkness(env.dark, [...layer.lights, ...env.lights, ...liveLights(desks, shown.map((s) => s.p))]);
  drawParticles(floorName);
  drawOverlay(t, floorName);
  drawLifeOverlay(t, floorName);
  drawEmptyOverlay(dt);
  drawFloorSwitch(m, countElsewhere(floorName));
  ctx.restore();
}


export let last = now();

/** One frame: everyone on both floors moves, then the floor shown is drawn. */
export function frame() {
  const ts = now();
  const dt = Math.min(0.1, (ts - last) / 1000);
  last = ts;
  for (const convo of convos) convo.tick(ts);
  updateLife(dt);
  updateDirector(dt);
  for (const [id, w] of workers) {
    w.update(dt);
    if (w.gone && w.interns.length === 0) workers.delete(id);
  }
  draw(ts / 1000, dt);
  requestAnimationFrame(frame);
}
