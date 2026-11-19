/**
 * Map-driven renderer of one BlueGhost floor (world/map.js → pixels), drawn in the logical 320×180 space
 * with R(). Split into what never changes for a given light (the base: floors, back wall and what hangs on
 * it; the static furniture, walls and courtyard as depth-sorted drawables) and the per-frame rest (live
 * screens, back-row chairs, printer, TVs and boards from live.js, people), then lamps, beams and darkness.
 * The loop caches the static part per floor and light (loop.js); drawOffice draws it all at once (preview).
 */
import { skyFor } from '../room.js';
import { courtyardDrawables, drawFloorSwitch, drawYardLight } from './courtyard.js';
import { drawBeams, drawLamps, drawWallItems } from './decor.js';
import { drawFloors, drawGlassFloor, drawOpening } from './floor.js';
import {
  BLUE, CREAM, armchairDrawables, barDrawables, barStool, binsDrawables, boothStool, cafeChair, deskDrawables, drawersDrawables,
  hooksDrawables, meetingChair, meetingTableDrawables, plantDrawables, poufDrawables, printerDrawables, receptionDrawables,
  snackDrawables, sofaDrawables, tableDrawables,
} from './furniture.js';
import { darknessAt, drawDarkness } from './light.js';
import { liveDrawables } from './live.js';
import { columnsBehind, drawColumn, drawStairs, railingDrawables } from './structure.js';
import { drawBackWall, drawFacades, wallDrawables } from './walls.js';
import { clipLogical, ctx } from '../../core/canvas.js';

/** Variant of a small table from where it stands. */
function tableVariant(m, t, chillTables) {
  if (m.floorAt(t.box.c, t.box.r) === 'chill') return chillTables.indexOf(t) % 2 ? 'c-table' : 'round-wood';
  if (t.box.w <= 2 && t.box.h <= 2) return m.floorAt(t.box.c, t.box.r) === 'wood' ? 'round-wood' : 'round-white';
  if (t.box.w >= 5) return 'coffee';
  return 'cafe';
}

/** Depth-sorted drawables of the furniture and structure of a floor. */
function furnitureDrawables(m, env, items) {
  const chillTables = m.of('table').filter((t) => m.floorAt(t.box.c, t.box.r) === 'chill');
  const behind = columnsBehind(m.of('column'));
  for (const it of m.items) {
    switch (it.type) {
      case 'desk': deskDrawables(it, env, items); break;
      case 'sofa': sofaDrawables(it, items, m.floorAt(it.box.c, it.box.r) === 'wood' ? BLUE : CREAM); break;
      case 'armchair': armchairDrawables(it, items); break;
      case 'pouf': poufDrawables(it, items); break;
      case 'table':
        if (m.floorAt(it.box.c, it.box.r) !== 'yard') tableDrawables(m, it, items, tableVariant(m, it, chillTables));
        break;
      case 'meetingTable': meetingTableDrawables(it, items); break;
      case 'meetingChair': meetingChair(m, it, items); break;
      case 'reception': receptionDrawables(it, items); break;
      case 'snack': snackDrawables(it, items); break;
      case 'printer': printerDrawables(it, items); break;
      case 'drawers': drawersDrawables(it, items); break;
      case 'bins': binsDrawables(it, items); break;
      case 'plant': if (m.floorAt(it.box.c, it.box.r) !== 'yard') plantDrawables(it, items, m.band); break;
      case 'column': items.push({ y: it.y + it.h, draw: () => drawColumn(it, behind.has(it)) }); break;
      case 'railing': railingDrawables(it, items); break;
      case 'stairs': items.push({ y: it.y + it.h + 0.5, draw: () => drawStairs(it) }); break; // over what stands beneath
      default:
    }
  }
  barDrawables(m, items);
  for (const hk of m.wall.filter((w) => w.type === 'hooks')) hooksDrawables(hk, items);
  for (const s of m.seats) {
    if (s.use === 'barStool') barStool(s, items);
    else if (s.use === 'booth') boothStool(s, items);
    else if (s.use === 'table' && m.floorAt(s.c, s.r) === 'wood') cafeChair(s, items);
  }
}

/** What the drawing of a floor depends on besides the map: hour, its light and sky, lights collected on the way. */
export function officeEnv(m, hour, t = 0) {
  return { m, t, hour, dark: darknessAt(hour), sky: skyFor(hour), lights: [] };
}

/**
 * Key of everything the static part of a floor depends on (darkness, sky, evening light on the yard):
 * the cache of the loop keeps one layer per key.
 */
export function lightBucket(hour) {
  return `${darknessAt(hour)}|${skyFor(hour).top}|${hour >= 17 ? 'pm' : 'am'}`;
}

/** The base under everything: floors, the stairwell opening, yard light, back wall and its static items. */
export function drawBase(m, env) {
  drawFloors(m);
  for (const g of m.of('glassFloor')) drawGlassFloor(g);
  for (const o of m.of('opening')) drawOpening(o);
  drawYardLight(m, env);
  drawBackWall(m, env);
  drawWallItems(m, env);
}

/** The static depth-sorted drawables of a floor (furniture, walls, facades, courtyard), sorted. */
export function staticDrawables(m, env) {
  const items = [];
  furnitureDrawables(m, env, items);
  wallDrawables(m, env, items);
  drawFacades(m, env, items);
  courtyardDrawables(m, env, items);
  return items.sort((a, b) => a.y - b.y);
}

/** Draws a drawable, inside its clip rect if it has one (the row slices of profile desks). */
export function drawItem(it) {
  if (!it.clip) {
    it.draw();
    return;
  }
  clipLogical(it.clip.x, it.clip.y, it.clip.w, it.clip.h);
  it.draw();
  ctx.restore();
}

/** Over everything on the floor: spider lamps and skylight beams (they add their lights to env.lights). */
export function drawTop(m, env) {
  drawLamps(m, env);
  drawBeams(m, env);
}

/**
 * Draws one floor at once, uncached (preview): base, static drawables, live ones and the extra drawables
 * (people) in depth order, lamps, darkness with the extra lights, the floor switch.
 * @param {ReturnType<import('../../world/map.js').parseMap>} m parsed floor
 * @param {{ t?: number, hour: number, live?: object, drawables?: object[], lights?: object[], others?: number }} opts
 *   live = what liveDrawables needs (desk seats with owners, director…), or none; others = the switch badge
 */
export function drawOffice(m, { t = 0, hour, live = null, drawables = [], lights = [], others = 0 }) {
  const env = officeEnv(m, hour, t);
  drawBase(m, env);
  const items = staticDrawables(m, env);
  if (live) liveDrawables(m, live, items);
  items.push(...drawables);
  items.sort((a, b) => a.y - b.y);
  for (const it of items) drawItem(it);
  drawTop(m, env);
  drawDarkness(env.dark, [...env.lights, ...lights]);
  drawFloorSwitch(m, others);
  return env;
}
