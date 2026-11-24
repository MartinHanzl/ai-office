/**
 * Drawing employees, interns and the director according to their state: the pose comes from where they
 * are (`place`) and the seat they use (`w.seat` at the desk, `w.idle.spot` at an idle seat) by its kind
 * and facing (office/furniture.js#seatPose). People on the stairs walk up (seen from behind) or down
 * (from the front) along stairsPoint() and fade where the floors swap.
 */
import { clipLogical, ctx } from '../core/canvas.js';
import { clamp, now } from '../core/util.js';
import { figure as drawFigure, ghostFigure } from './figure.js';
import { SEATED_KINDS, seatKind, seatPose } from './office/furniture.js';
import { EMOTIONS, moodSpeed } from '../entities/mood.js';
import { WORKING } from '../entities/activity.js';
import { FLOORS } from '../world/floors.js';
import { DEFAULT_FLOOR, floors } from '../world/layout.js';
import { stairsPoint } from '../world/stairs.js';

export const SEATED_ARMS = {
  typing: 'type', terminal: 'type', planning: 'type', reading: 'mouse', web: 'mouse',
  thinking: 'think', waiting: 'raise', phone: 'phone', sleeping: 'rest', idle: 'down', surfing: 'mouse',
};

/** Floor a person is drawn on: the stairs' floor while climbing, else their own. */
export const floorOf = (p) => p.stairs?.floor ?? p.floor ?? DEFAULT_FLOOR;

/** Logical box a figure can paint (raised arms, scale k), for redrawing what stands in front of it. */
export const figureBox = (x, y, k = 1) => ({ x: x - 10 * k, y: y - 37 * k, w: 20 * k, h: 39 * k });

/** Idle seats and what the hands do there. */
const IDLE_ARMS = { sofa: 'down', armchair: 'down', pouf: 'down', stool: 'mug', booth: 'phone', cafe: 'mug' };

/** The named spot of the person's floor they stand on (printer, drawers, darts…), if any. */
function namedSpotAt(p) {
  const named = floors[p.floor]?.named;
  if (!named) return null;
  for (const s of Object.values(named)) if (Math.abs(s.x - p.x) < 1.5 && Math.abs(s.y - p.y) < 1.5) return s;
  return null;
}

/**
 * Someone on the stairs: walking pose, back view going up, front view going down, at the point
 * stairsPoint() gives for the floor shown (falls back to the person's x/y). On the ground floor they
 * are drawn over the flight; upstairs they are cut at the near edge of the opening they climb out of.
 * Both fade out towards the middle of the climb, where the floors swap.
 */
function stairsLayout(p, k, extra) {
  const { floor, dir, progress } = p.stairs;
  const pt = stairsPoint?.(floor, dir, progress) ?? { x: p.x, y: p.y };
  const m = FLOORS[floor];
  const flight = m?.of('stairs')[0];
  const hole = m?.of('opening')[0];
  const lay = {
    x: pt.x, y: pt.y, k, depth: pt.y,
    alpha: clamp(Math.abs(progress - 0.5) / 0.1, 0, 1),
    pose: { ...extra, view: dir === 'up' ? 'back' : 'front', walking: p.step ?? 0, arms: 'down' },
  };
  if (flight) lay.depth = flight.y + flight.h + 1 + progress;
  if (hole) lay.clip = { x: 0, y: 0, w: 320, h: hole.y + hole.h };
  return lay;
}

/** Seated (or standing) at a seat object: offset, depth and view from seatPose, plus `pose` extras. */
function atSeat(p, seat, k, pose) {
  const sp = seatPose(seat);
  return { x: p.x + sp.dx, y: p.y + sp.dy, k, depth: sp.depth - seat.y + p.y, pose: { view: sp.view, seated: sp.seated, ...pose } };
}

/**
 * Where and how a worker is drawn: { x, y, k, depth, pose } (figure), { ghost } or with `clip`/`alpha`
 * on the stairs.
 */
export function workerLayout(w, t) {
  if (w.ghost) return { ghost: true, x: w.x, y: w.y, k: 1, depth: 1000 + w.y };
  const emotion = w.mood.current;
  const mood = { face: EMOTIONS[emotion].face, speed: moodSpeed(w), t };
  if (w.stairs) return stairsLayout(w, 1, mood);
  const stand = (view, arms, extra = {}) => ({ x: w.x, y: w.y, k: 1, depth: w.y, pose: { ...mood, view, arms, ...extra } });
  if (w.walking) return stand(w.facing === 'up' ? 'back' : 'front', 'down', { walking: w.step });
  const oops = w.errorUntil > now();
  const celebrating = (emotion === 'happy' || emotion === 'proud') && w.mood.flash?.until > now();
  if (w.place === 'board') return stand('back', w.waiting ? 'raise' : oops ? 'facepalm' : 'draw');
  if (w.place === 'desk' && w.seat) {
    const kind = seatKind(w.seat);
    if (kind === 'desk') {
      const animate = ['typing', 'terminal', 'planning'].includes(w.activity);
      const arms = oops && !w.waiting ? 'facepalm'
        : celebrating && !w.waiting ? 'cheer'
          : SEATED_ARMS[w.activity] ?? 'down';
      const lay = atSeat(w, w.seat, 1, {
        ...mood, arms, animate, headDrop: w.activity === 'sleeping' ? 2 : emotion === 'tired' ? 1 : 0,
      });
      if (emotion === 'frustrated' && animate) lay.x += Math.sin(t * 25) * 0.4;
      return lay;
    }
    if (SEATED_KINDS.has(kind)) {
      // overflow seat (café table, sofa): works on a laptop
      const work = WORKING.has(w.activity);
      const view = seatPose(w.seat).view;
      return atSeat(w, w.seat, 1, { ...mood, arms: w.waiting ? 'raise' : view === 'back' ? (work ? 'type' : 'down') : 'laptop', animate: work });
    }
    return stand('front', 'laptop', { animate: WORKING.has(w.activity) });
  }
  if (w.place === 'spot' && w.idle) {
    const spot = w.idle.spot;
    switch (w.idle.kind) {
      case 'coffee':
        return stand('back', 'mug');
      case 'window':
        return stand('front', 'down');
      case 'chat': {
        // face the partner (standing profile) once both stand at their spots
        const c = w.idle.convo;
        const partner = c && (c.a === w ? c.b : c.a);
        const talk = w.talkingUntil > now() ? 'talk' : 'down';
        if (partner && w.idle.arrived && Math.abs(partner.x - w.x) > 4 && !partner.walking) return stand(partner.x > w.x ? 'right' : 'left', talk);
        return stand('front', talk);
      }
      case 'stroll': {
        // a stop at the printer, the drawers, the darts…: turned to it
        const at = w.idle.arrived ? namedSpotAt(w) : null;
        if (at) return stand(at.facing ?? 'front', 'down');
        return stand('front', 'down');
      }
      default:
        if (spot && SEATED_KINDS.has(seatKind(spot))) {
          const kind = seatKind(spot);
          const lay = atSeat(w, spot, 1, { ...mood, arms: IDLE_ARMS[kind] ?? 'down' });
          if ((kind === 'sofa' || kind === 'armchair') && w.bubble && Math.floor(t * 6) % 2) lay.y -= 0.5; // laughing
          return lay;
        }
    }
  }
  return stand('front', 'down');
}

/** Interns: smaller, standing by their boss with a laptop once there. */
export function internLayout(i, t) {
  if (i.stairs) return stairsLayout(i, 0.8, { t });
  if (i.walking) return { x: i.x, y: i.y, k: 0.8, depth: i.y + 0.2, pose: { view: i.facing === 'up' ? 'back' : 'front', walking: i.step, arms: 'down', t } };
  return { x: i.x, y: i.y, k: 0.8, depth: i.y + 0.2, pose: { view: 'front', arms: 'laptop', animate: true, t: t + i.slot } };
}

/**
 * The director walks about the meeting room: strolls and looks around (facing the room), paces on the
 * phone, writes on the task board or watches the TV (seen from behind), looks out through the glass.
 */
export function directorLayout(d, t) {
  const beat = d.beat;
  if (d.stairs) return stairsLayout(d, 1, { t, face: d.face });
  const at = (pose) => ({ x: d.x, y: d.y, k: 1, depth: d.y, pose: { t, ...pose } });
  if (d.walking) return at({ view: d.facing === 'up' ? 'back' : 'front', walking: d.step, arms: beat?.kind === 'phone' ? 'phone' : 'down', face: d.face });
  if (beat?.spot && beat.spot !== 'glass') return at({ view: 'back', arms: beat.arms, animate: true });
  return at({ view: 'front', arms: beat?.arms ?? 'down', face: d.face });
}

/** Draws a laid-out person (see workerLayout). */
export function drawLayout(lay, look, t) {
  if (lay.ghost) {
    ghostFigure(lay.x, lay.y, look, t);
    return;
  }
  if (lay.alpha === 0) return;
  if (lay.clip) clipLogical(lay.clip.x, lay.clip.y, lay.clip.w, lay.clip.h);
  const alpha = ctx.globalAlpha;
  if (lay.alpha != null) ctx.globalAlpha = alpha * lay.alpha;
  drawFigure(lay.x, lay.y, look, lay.pose, lay.k);
  ctx.globalAlpha = alpha;
  if (lay.clip) ctx.restore();
}

/** Depth-sorted drawable of a laid-out person. */
export function personDrawable(lay, look, t) {
  return { y: lay.depth, box: figureBox(lay.x, lay.y, lay.k), draw: () => drawLayout(lay, look, t) };
}
