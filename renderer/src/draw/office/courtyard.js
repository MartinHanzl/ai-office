/**
 * The courtyard (photo 06) bottom left: cobbles toned by the sky, the ivy-covered yard wall with the
 * gate, the beer set, a planter and the blue BlueGhost banners; plus the floor-switch arrows.
 */
import { R, text } from '../../core/canvas.js';
import { BG } from '../../core/palette.js';
import { noise } from '../../core/util.js';
import { CELL } from '../../world/map.js';
import { bloom } from './decor.js';
import { ghost } from './sprites.js';
import { windowSpans } from './walls.js';

const inYard = (m, item) => m.floorAt(item.box.c, item.box.r) === 'yard';

/** Ivy on the yard wall along the left edge, the gate in it. */
function ivyWall(m, items) {
  const ivy = m.items.filter((i) => i.type === 'plant' && inYard(m, i) && i.box.c === 0);
  const yard = m.zones.yard;
  if (!yard) return;
  items.push({
    y: yard.y,
    draw: () => {
      // gate: open dark leaves in the wall where the yard reaches the edge
      for (let r = yard.box.r; r < yard.box.r + yard.box.h; r++) {
        if (m.at(0, r) !== ',') continue;
        const y = r * CELL;
        R(0, y - 3, 2, CELL + 3, BG.anthracite);
        R(0, y - 3, 2, 1, BG.anthraciteLight);
      }
    },
  });
  for (const v of ivy) {
    items.push({
      y: v.y + v.h,
      draw: () => {
        const { x, y, w, h } = v;
        R(x, y - 8, w, h + 8, BG.plantDark);
        for (let yy = y - 8; yy < y + h; yy++) {
          for (let xx = x; xx < x + w + 2; xx++) {
            const n = noise(xx * 41 + yy * 13);
            if (n > 0.72) R(xx, yy, 1, 1, BG.plant);
            else if (n > 0.6 && xx < x + w) R(xx, yy, 1, 1, BG.plantLight);
          }
        }
      },
    });
  }
}

/** Beer garden set: wooden table with folding legs, two benches. */
function beerSet(m, items) {
  for (const it of m.items.filter((i) => (i.type === 'bench' || i.type === 'table') && inYard(m, i))) {
    const { x, y, w, h } = it;
    const table = it.type === 'table';
    const th = table ? 7 : 4;
    items.push({
      y: y + h,
      draw: () => {
        R(x + 2, y + h - th, 1, th, BG.steelDark);
        R(x + w - 3, y + h - th, 1, th, BG.steelDark);
        R(x, y - th, w, h, BG.tableWood);
        for (let px = x; px < x + w; px += 8) R(px, y - th, 1, h, BG.tableWoodDark);
        R(x, y - th, w, 1, BG.tableWoodLight);
        R(x, y + h - th, w, 1, BG.tableWoodDark);
        if (table) {
          R(x + 6, y - th - 3, 2, 3, '#e9b865');
          R(x + 6, y - th - 3, 2, 1, BG.paper);
          R(x + w - 10, y - th - 3, 2, 3, '#e9b865');
          R(x + w - 10, y - th - 3, 2, 1, BG.paper);
        }
      },
    });
  }
}

/** Big planter with a shrub. */
function planter(m, items) {
  for (const p of m.items.filter((i) => i.type === 'plant' && inYard(m, i) && i.box.c > 1)) {
    const { x, y, w, h } = p;
    items.push({
      y: y + h,
      draw: () => {
        R(x, y + h - 7, w, 7, BG.concrete);
        R(x, y + h - 7, w, 1, BG.concreteLight);
        R(x - 1, y - 6, w + 2, h, BG.plantDark);
        for (let i = 0; i < 18; i++) R(x - 1 + Math.floor(noise(x + i * 7) * (w + 1)), y - 6 + Math.floor(noise(y + i * 5) * h), 2, 1, i % 2 ? BG.plant : BG.plantLight);
      },
    });
  }
}

/** Blue banner: white cloud at the top, the ghost, a hint of the wordmark (photo 06). */
function banner(x, y, w, h) {
  R(x - 1, y - 2, 1, h + 4, BG.steelDark); // pole
  R(x, y, w, h, BG.brand);
  R(x, y, w, 1, BG.brandLight);
  R(x + w - 1, y, 1, h, BG.brandDark);
  R(x + 1, y + 2, w - 3, 1, '#ffffff');
  R(x + 2, y + 1, 2, 1, '#ffffff');
  ghost(x + Math.round((w - 6) / 2), y + 5, '#ffffff', 0.25, { mirror: true });
  R(x + 1, y + h - 3, w - 3, 1, '#ffffff');
  R(x + 1, y + h - 2, 1, 1, '#ffffff');
}

function banners(m, items) {
  for (const b of m.items.filter((i) => i.type === 'banner')) {
    const h = Math.min(20, b.h + 6);
    items.push({ y: b.y + b.h, draw: () => banner(b.x + 1, b.y + b.h - h - 1, b.w - 1, h) });
  }
}

export function courtyardDrawables(m, env, items) {
  ivyWall(m, items);
  beerSet(m, items);
  planter(m, items);
  banners(m, items);
}

/**
 * Light on the yard by time of day (skyFor): warm sun and a building shadow, an orange evening,
 * a dark blue night with window light and the lamp at the entrance. Upstairs it is a floor below
 * the viewer: a little darker.
 */
export function drawYardLight(m, env) {
  const yard = m.zones.yard;
  if (!yard) return;
  const { x, y, w, h } = yard;
  const sky = env.sky;
  const hour = env.hour;
  if (!sky.night && hour >= 7 && hour < 17) {
    R(x, y, w, h, 'rgba(255,236,190,0.10)');
    R(x, y, w, 5, 'rgba(40,36,30,0.16)'); // shadow of the building
    R(x, y + 5, w, 2, 'rgba(40,36,30,0.07)');
  } else if (!sky.night) {
    R(x, y, w, h, hour >= 17 ? 'rgba(239,125,87,0.20)' : 'rgba(244,211,94,0.14)');
    R(x, y, w, 7, 'rgba(60,30,40,0.18)');
  } else {
    R(x, y, w, h, 'rgba(18,24,58,0.55)');
    for (const s of windowSpans(m)) {
      for (let i = 0; i < 9; i++) R(s.x - i * 0.5, s.y + CELL + 2 + i, s.w + i, 1, `rgba(255,210,122,${(0.22 - i * 0.022).toFixed(3)})`);
    }
    const door = m.items.find((i) => i.type === 'door' && inYardEdge(m, i));
    if (door) {
      R(door.x - 1, door.y - 30, 3, 2, BG.bulb);
      bloom(door.x, door.y - 8, 26, 'rgba(255,210,122,A)', 0.35);
      env.lights.push({ x: door.x, y: door.y + 4, r: 26, s: 0.85 });
    }
  }
  if (m.floor === 'upper') R(x, y, w, h, 'rgba(10,12,20,0.12)');
}

const inYardEdge = (m, i) => i.cells.some(([c, r]) => m.at(c - 1, r + 1) === ',' || m.at(c, r + 1) === ',');

/**
 * Floor-switch arrows in the map's `U` rect (▲ upper on the left, ▼ ground on the right), the floor shown
 * highlighted; `others` = how many people are on the other floor, as a badge on its button.
 */
export function drawFloorSwitch(m, others = 0) {
  const u = m.items.find((i) => i.type === 'floorSwitch');
  if (!u) return;
  const { x, y, w, h } = u;
  R(x, y, w, h, 'rgba(0,48,63,0.85)');
  R(x, y, w, 1, 'rgba(189,216,229,0.35)');
  const bw = Math.floor((w - 3) / 2);
  const by = y + Math.floor((h - bw) / 2);
  const buttons = [{ up: true, active: m.floor === 'upper', bx: x + 1 }, { up: false, active: m.floor === 'ground', bx: x + 2 + bw }];
  for (const { up, active, bx } of buttons) {
    R(bx, by, bw, bw, active ? BG.brand : 'rgba(255,255,255,0.08)');
    if (active) R(bx, by, bw, 1, BG.brandLight);
    const col = active ? '#ffffff' : '#7f98a3';
    const cx = bx + Math.floor(bw / 2);
    for (let i = 0; i < 4; i++) {
      const ry = up ? by + 2 + i : by + bw - 3 - i;
      R(cx - i, ry, i * 2 + 1, 1, col);
    }
    if (!active && others > 0) {
      // badge on the top right corner of the other floor's button, clear of its arrow
      const label = others > 99 ? '99' : String(others);
      const bwid = label.length * 2 + 3;
      const bxx = bx + bw - bwid + 2;
      const byy = by - 3;
      R(bxx, byy, bwid, 5, BG.brandInk);
      R(bxx + 0.5, byy + 0.5, bwid - 1, 4, '#f4f1ea');
      text(label, bxx + bwid / 2, byy + 4, 3.6, BG.brandInk);
    }
  }
}
