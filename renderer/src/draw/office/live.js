/**
 * The per-frame pieces of a floor (everything else is the cached static layer): live desk screens of the
 * occupied desks with the attention frame, the smoke of a failed tool and the mugs of a full context; the
 * chairs of the back-row desks (over their sitter only while someone sits there); the printer at work
 * while someone stands at it; the TVs, boards and the portrait on the back wall.
 * Every drawable has a `box` (logical rect it may paint), so the loop redraws only around it.
 */
import { now } from '../../core/util.js';
import { drawAttention, drawMugs, drawScreen, drawSmoke, screenActivity } from '../screens.js';
import { wallItemDrawables } from './decor.js';
import { backChairDrawable, monitorOf, printerBusyDrawable, screenDepth } from './furniture.js';

/** Is the worker sitting on this seat right now (not walking to or from it)? */
const seatedAt = (w, seat) => Boolean(w) && w.seat === seat && w.place === 'desk' && !w.walking && !w.ghost && !w.leaving;

/** Where the mugs of a full context stand on the desk top, and which way their row grows (away from the sitter). */
function mugSpot(seat, mon) {
  const k = mon.keyboard;
  if (mon.kind === 'side') {
    const left = seat.facing === 'left';
    return { x: left ? k.x + 1 : k.x - 1, y: k.y - 3, dir: left ? -1 : 1 };
  }
  return { x: mon.frame.x + mon.frame.w + 1, y: mon.kind === 'rear' ? mon.frame.y + mon.frame.h : k.y + 1, dir: 1 };
}

/**
 * The live screen of one desk seat: content by the activity of its owner (nothing when nobody owns it or
 * they are leaving: the static layer shows the standby screen), the red attention frame while they wait
 * for a permission, smoke after a failed tool, mugs. Monitors seen from behind ('rear') show no content.
 */
function deskScreen(seat, t) {
  const w = seat.owner;
  const act = screenActivity(w);
  if (act === 'off') return null;
  const mon = monitorOf(seat);
  const f = mon.frame;
  const mugs = mugSpot(seat, mon);
  const atDesk = seatedAt(w, seat);
  // room for the smoke (up to ~14 px above, ±7 px around the monitor) and the mugs
  const x0 = Math.min(f.x - 6, mugs.x - 9);
  const x1 = Math.max(f.x + f.w + 9, mugs.x + 10);
  return {
    y: screenDepth(seat),
    box: { x: x0, y: f.y - 15, w: x1 - x0, h: Math.max(f.h, mugs.y - f.y) + 17 },
    draw: () => {
      if (mon.screen) drawScreen(mon.screen, act, t, seat.seed ?? 0);
      if (w.waiting) drawAttention(f, t);
      if (atDesk && w.errorUntil > now()) drawSmoke(f, t);
      if (atDesk && w.context != null) drawMugs(mugs.x, mugs.y, mugs.dir, w.context, seat.seed ?? 0);
    },
  };
}

/** Night lights of the moment: the screens of owned desks, the glow of ghosts. */
export function liveLights(desks, people) {
  const lights = [];
  for (const d of desks) {
    if (!d.owner || d.owner.leaving) continue;
    const f = monitorOf(d).frame;
    lights.push({ x: f.x + f.w / 2, y: f.y + f.h / 2, r: 22, s: 0.9 });
  }
  for (const p of people) if (p.ghost) lights.push({ x: p.x, y: p.y - 14, r: 16, s: 0.6 });
  return lights;
}

/**
 * Live drawables of floor `m`.
 * @param {object} m parsed floor (world/map.js)
 * @param {{ t: number, date: Date, desks: object[], printer?: object, standing: object[], meeting: boolean, done: number, director: object }} live
 *   desks = world desk seats of this floor, printer = its named printer spot, standing = people on this floor
 *   (x, y, walking), meeting = a plan-mode meeting runs at the boards, done = tasks finished today
 * @param {object[]} items drawables are pushed here
 */
export function liveDrawables(m, live, items) {
  const { t } = live;
  for (const seat of live.desks) {
    const screen = deskScreen(seat, t);
    if (screen) items.push(screen);
    if (seat.facing === 'back') items.push(backChairDrawable(seat, seatedAt(seat.owner, seat)));
  }
  const printer = m.of('printer')[0];
  const spot = live.printer;
  if (printer && spot && live.standing.some((p) => !p.walking && Math.hypot(p.x - spot.x, p.y - spot.y) < 4)) {
    items.push(printerBusyDrawable(printer, t));
  }
  wallItemDrawables(m, live, items);
}
