/** Bajt, the office cat. */
import { play } from '../audio.js';
import { R } from '../core/canvas.js';
import { C } from '../core/palette.js';
import { clamp, now, rand, randItem } from '../core/util.js';
import { hearts } from './particles.js';
import { workers } from '../state.js';
import { DESKS, randomFloorPoint, route } from '../world/layout.js';

export const CAT_SPEED = 22;

export const cat = { x: 130, y: 134, path: [], state: 'sit', next: 'sit', until: 0, dir: 1, step: 0, onTop: 0, pendingTop: 0, bubble: null };


export function catSpots() {
  const spots = [
    { x: 270, y: 141 },             // rug in front of the TV
    { x: 262, y: 118, onTop: 2 },   // on top of the TV cabinet
    { x: 209, y: 97, onTop: 20 },   // on the warm copier
    { x: 266, y: 59, onTop: 17 },   // on the reception counter
  ];
  for (const d of DESKS) {
    if (!d.owner) spots.push({ x: d.cx + 5, y: d.deskY + 5, onTop: 13 }); // on an empty desk's keyboard
  }
  return spots;
}


export function catGo(x, y, next, onTop = 0) {
  cat.path = route({ x: cat.x, y: cat.y }, { x, y });
  cat.next = next;
  cat.pendingTop = onTop;
  cat.onTop = 0;
  cat.state = 'walk';
}


export function chooseCatTarget() {
  const roll = Math.random();
  const visitable = [...workers.values()].filter((w) => !w.gone && !w.walking);
  if (roll < 0.35) {
    const s = randItem(catSpots());
    catGo(s.x, s.y, 'sleep', s.onTop);
  } else if (roll < 0.6 && visitable.length) {
    const w = randItem(visitable);
    catGo(clamp(w.x + randItem([-9, 9]), 6, 314), w.y + 2, 'sit');
  } else {
    const p = randomFloorPoint({ x: 0, y: 48, w: 320, h: 132 });
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
  hearts(cat.x, cat.y - 8);
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
