/** Bajt, the office cat. Lives upstairs (`cat.floor`) and never takes the stairs. */
import { play } from '../audio.js';
import { R } from '../core/canvas.js';
import { C } from '../core/palette.js';
import { clamp, now, rand, randItem } from '../core/util.js';
import { hearts } from './particles.js';
import { workers } from '../state.js';
import { DESKS, IDLE_POOLS, floors } from '../world/layout.js';
import { CELL } from '../world/map.js';

export const CAT_SPEED = 22;

const home = floors.upper;

/** Drawn height of the tops the cat jumps on (px, as draw/office/furniture.js draws the pieces). */
const LIFT = { printer: 11, drawers: 9, desk: 5 };

/** The middle of a piece's top face, with the depth boost that draws the cat over the piece (drawn at `depthY`). */
function onTopOf(rect, depthY, lift) {
  const y = rect.y + rect.h / 2 - lift;
  return { x: rect.x + rect.w / 2, y, onTop: depthY + 1 - y };
}

const glass = home.map.of('glassFloor')[0];

export const cat = {
  x: glass ? glass.x + glass.w / 2 : home.stairs.x, y: glass ? glass.y + glass.h / 2 : home.stairs.y, floor: home.name,
  path: [], state: 'sit', next: 'sit', until: 0, dir: 1, step: 0, onTop: 0, pendingTop: 0, bubble: null,
};


/** Favourite places upstairs: the glass floor panel, on the printer, on the drawers, by the windows, empty desks. */
export function catSpots() {
  const m = home.map;
  const spots = [];
  if (glass) spots.push({ x: glass.x + glass.w / 2, y: glass.y + glass.h / 2 });
  for (const type of ['printer', 'drawers']) {
    const it = m.of(type)[0];
    if (it) spots.push({ ...onTopOf(it, it.y + it.h, LIFT[type]), via: home.named[type] });
  }
  for (const w of IDLE_POOLS.window) {
    const x = home.isWalkable(w.x + CELL, w.y) ? w.x + CELL : w.x - CELL;
    spots.push({ x, y: w.y });
  }
  for (const d of DESKS) {
    if (!d.owner) spots.push({ ...onTopOf(d.desk, d.item.y + d.item.h, LIFT.desk), via: d }); // on an empty desk's keyboard
  }
  return spots;
}


/** Walk to (x, y); `via` = a floor point to jump up from (onto furniture). */
export function catGo(x, y, next, onTop = 0, via = null) {
  const from = { x: cat.x, y: cat.y, floor: cat.floor };
  cat.path = via ? [...home.route(from, via), { x, y }] : home.route(from, { x, y });
  cat.next = next;
  cat.pendingTop = onTop;
  cat.onTop = 0;
  cat.state = 'walk';
}


export function chooseCatTarget() {
  const roll = Math.random();
  const visitable = [...workers.values()].filter((w) => !w.gone && !w.walking && w.floor === cat.floor);
  if (roll < 0.35) {
    const s = randItem(catSpots());
    catGo(s.x, s.y, 'sleep', s.onTop ?? 0, s.via ?? null);
  } else if (roll < 0.6 && visitable.length) {
    const w = randItem(visitable);
    catGo(clamp(w.x + randItem([-9, 9]), 6, 314), w.y + 2, 'sit');
  } else {
    const p = home.randomPoint();
    if (p) catGo(p.x, p.y, 'sit');
  }
}


export function updateCat(dt) {
  const t = now();
  if (cat.state === 'walk') {
    let budget = CAT_SPEED * dt;
    while (budget > 0 && cat.path.length) {
      const p = cat.path[0];
      const dx = p.x - cat.x;
      const dy = p.y - cat.y;
      const d = Math.hypot(dx, dy);
      if (Math.abs(dx) > 0.3) cat.dir = dx > 0 ? 1 : -1;
      if (d <= budget) {
        cat.x = p.x;
        cat.y = p.y;
        budget -= d;
        cat.path.shift();
      } else {
        cat.x += (dx / d) * budget;
        cat.y += (dy / d) * budget;
        budget = 0;
      }
    }
    cat.step += dt * 10;
    if (!cat.path.length) {
      cat.state = cat.next;
      cat.onTop = cat.pendingTop;
      cat.until = t + (cat.state === 'sleep' ? rand(40_000, 120_000) : rand(5000, 15_000));
    }
  } else if (t > cat.until) {
    chooseCatTarget();
  }
  if (cat.bubble && t > cat.bubble.until) cat.bubble = null;
  if (!cat.bubble && cat.state !== 'sleep' && Math.random() < dt / 50) {
    cat.bubble = { text: randItem(['Mňau', 'Mňau?', 'Mrr…']), until: t + 2000 };
  }
}


export function petCat() {
  cat.bubble = { text: randItem(['Prrr ❤', 'Mňau ❤', 'Prrrrr…']), until: now() + 2500 };
  hearts(cat.x, cat.y - 8, 4, cat.floor);
  if (cat.state === 'sleep') {
    cat.state = 'sit';
    cat.until = now() + 6000;
  }
  play([392, 330, 392], { type: 'triangle', volume: 0.03, step: 0.08, length: 0.1 });
}


export function catHit(lx, ly) {
  return Math.abs(lx - cat.x) < 6 && ly >= cat.y - 9 && ly <= cat.y + 1;
}


export function drawCat(t) {
  const { x, y } = cat;
  const f = cat.dir;
  const fur = '#ef7d57';
  const stripe = '#c45a3a';
  const r = (dx, dy, w, h, col) => R(f > 0 ? x + dx : x - dx - w, y + dy, w, h, col);
  if (cat.state === 'sleep') {
    r(-3, -3, 6, 3, fur);
    r(-3, -3, 6, 0.8, stripe);
    r(1, -4, 3, 2.5, fur);
    r(1.3, -4.8, 0.8, 0.8, fur);
    r(3, -4.8, 0.8, 0.8, fur);
    r(-4, -1.2, 5, 1, stripe);
    return;
  }
  const leg = cat.state === 'walk' ? Math.floor(cat.step) % 2 : 0;
  r(-3, -4, 6, 3, fur);
  r(-3, -4, 6, 0.8, stripe);
  r(2, -6.5, 3, 3, fur);
  r(2, -7.5, 1, 1, fur);
  r(4, -7.5, 1, 1, fur);
  r(4, -5.6, 0.7, 0.7, C.ink);
  r(-2.5 + leg, -1, 1, 1, fur);
  r(1.5 - leg, -1, 1, 1, fur);
  r(-4.5, -6.5 + (Math.sin(t * 4) > 0 ? 1 : 0), 1, 3, stripe);
}
