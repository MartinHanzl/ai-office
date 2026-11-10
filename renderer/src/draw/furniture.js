/** Desks, TV, sofa, plants, glass walls, conference table, reception, copier. */
import { R, text } from '../core/canvas.js';
import { C } from '../core/palette.js';
import { now, shade } from '../core/util.js';
import { drawScreen, screenActivity } from './screens.js';
import { GLASS_Y, ROOMS } from '../world/layout.js';

/** Lounge TV on a low cabinet; switches channels while someone watches. */
export function drawTV(t, on) {
  R(252, 118, 48, 9, C.deskEdge);
  R(254, 120, 20, 5, C.deskFront);
  R(276, 120, 22, 5, C.deskFront);
  R(253, 127, 2, 2, C.deskLeg);
  R(297, 127, 2, 2, C.deskLeg);
  R(273, 115, 6, 3, C.ink);
  R(256, 96, 40, 20, C.ink);
  const x = 258;
  const y = 98;
  const w = 36;
  const h = 16;
  if (!on) {
    R(x, y, w, h, '#151827');
    R(x + 3, y + 2, 1, 6, '#262b44');
    R(x + 6, y + 2, 1, 3, '#262b44');
    return;
  }
  const channel = Math.floor(t / 8) % 3;
  if (channel === 0) { // football
    for (let i = 0; i < 6; i++) R(x + i * 6, y, 6, h, i % 2 ? '#38b764' : '#2e9e56');
    R(x + w / 2 - 0.5, y, 1, h, C.white);
    R(x, y + h / 2 - 0.5, 2, 1, C.white);
    const bx = x + 2 + Math.abs(((t * 10) % 64) - 32);
    const by = y + 3 + Math.abs(((t * 7) % 20) - 10);
    R(bx, by, 1.5, 1.5, C.white);
    R(bx - 4, by + 2, 2, 3, C.red);
    R(x + w - 4 - Math.abs(((t * 6) % 20) - 10), y + 6, 2, 3, C.blue);
  } else if (channel === 1) { // cartoon
    R(x, y, w, h, C.teal);
    R(x, y + h - 4, w, 4, C.lime);
    R(x + w - 7, y + 2, 4, 4, C.yellow);
    const jump = Math.abs(Math.sin(t * 4)) * 5;
    R(x + 10 + Math.sin(t) * 6, y + h - 9 - jump, 6, 5, C.orange);
    R(x + 11 + Math.sin(t) * 6, y + h - 8 - jump, 1, 1, C.ink);
    R(x + 14 + Math.sin(t) * 6, y + h - 8 - jump, 1, 1, C.ink);
  } else { // news
    R(x, y, w, h, '#29366f');
    R(x + 14, y + 3, 8, 7, '#f5cfa8');
    R(x + 14, y + 2, 8, 2, C.ink);
    R(x + 12, y + 10, 12, 4, C.ink);
    R(x + 17, y + 10, 2, 3, C.red);
    R(x, y + h - 3, w, 3, C.red);
    const off = (t * 10) % 12;
    for (let i = 0; i < 4; i++) R(x + i * 12 - off, y + h - 2, 7, 1, C.white);
  }
  R(x, y, w, 1, '#ffffff22');
}


/** Sofa seen from behind (faces the TV); drawn over whoever sits on it. */
export function drawSofa() {
  R(242, 150, 66, 11, C.sofa);
  R(242, 150, 66, 1.5, shade(C.sofa, 0.25));
  for (let i = 1; i < 4; i++) R(242 + i * 16.5, 152, 0.6, 8, shade(C.sofa, -0.2));
  R(239, 148, 5, 14, shade(C.sofa, -0.15));
  R(306, 148, 5, 14, shade(C.sofa, -0.15));
  R(244, 161, 2, 2, C.deskLeg);
  R(304, 161, 2, 2, C.deskLeg);
}


export function drawDesk(d, t) {
  const { cx, deskY: y } = d;
  const w = d.owner;
  const waiting = w?.waiting && !w.leaving;

  R(cx - 20, y, 40, 8, C.deskTop);
  if (waiting && Math.floor(t * 3) % 2) R(cx - 13, y - 14, 26, 18, C.red);
  R(cx - 11, y - 12, 22, 14, C.frame);
  drawScreen(d, screenActivity(w), t);
  R(cx - 2, y + 2, 4, 2, C.metalDark);
  R(cx - 7, y + 4, 14, 2.5, C.key);
  for (let i = 0; i < 6; i++) R(cx - 6 + i * 2.2, y + 4.5, 1.2, 0.6, C.metalDark);
  R(cx + 10, y + 4, 2, 2.5, C.key);
  // mug
  R(cx - 17, y + 1, 3, 4, C.white);
  R(cx - 14, y + 2, 1, 2, C.white);
  R(cx - 17, y + 1, 3, 1, ['#5d3f2a', C.red, C.blue][d.seed % 3]);
  // fuller context → more coffee mugs piling up
  const mugs = w?.context >= 50 ? Math.min(3, 1 + Math.floor((w.context - 50) / 17)) : 0;
  [[cx - 13.5, y + 2.5], [cx - 18, y + 5], [cx + 14, y + 4.5]].slice(0, mugs).forEach(([mx, my], i) => {
    R(mx, my, 2.5, 3, C.white);
    R(mx, my, 2.5, 0.8, [C.orange, C.purple, C.green][i]);
  });
  // tool failure → smoke from the monitor
  if (w && w.errorUntil > now()) {
    for (let i = 0; i < 4; i++) {
      const p = (t * 1.1 + i / 4) % 1;
      const size = 1.5 + p * 3;
      R(cx - 6 + i * 4 + Math.sin(t * 3 + i) * 1.5 - size / 2, y - 13 - p * 12, size, size * 0.8, `rgba(148,163,184,${0.8 * (1 - p)})`);
    }
  }
  // occasional desk plant
  if (d.seed % 3 === 1) {
    R(cx + 13, y - 1, 5, 4, C.pot);
    R(cx + 12, y - 5, 2, 4, C.plant);
    R(cx + 15, y - 7, 2, 6, C.plantDark);
    R(cx + 17, y - 4, 2, 3, C.plant);
  }
  // front panel
  R(cx - 20, y + 8, 40, 9, C.deskFront);
  R(cx - 20, y + 8, 40, 1, C.deskEdge);
  R(cx + 6, y + 10, 11, 5, C.deskEdge);
  R(cx + 10, y + 12, 3, 1, C.deskTop);
  R(cx - 19, y + 17, 2, 3, C.deskLeg);
  R(cx + 17, y + 17, 2, 3, C.deskLeg);
}


export function plant(x, y) {
  R(x - 4, y - 7, 8, 7, C.pot);
  R(x - 4, y - 7, 8, 1.5, shade(C.pot, 0.2));
  R(x - 5, y - 14, 3, 7, C.plant);
  R(x - 1, y - 18, 3, 11, C.plantDark);
  R(x + 2, y - 15, 3, 8, C.plant);
  R(x - 3, y - 11, 2, 4, C.plantDark);
}


/**
 * Glass front wall of a back room, drawn over the people inside it. Door gap with a plaque;
 * the manager's office has half-closed blinds.
 */
export function drawGlassFront(room, label, blinds) {
  const top = GLASS_Y - 22;
  const x1 = room.x + room.w + (room.x ? 1 : 0);
  const [d0, d1] = room.door;
  for (const [a, b] of [[room.x, d0], [d1, x1]]) {
    if (b <= a) continue;
    R(a, top, b - a, 22, C.glass);
    if (blinds) for (let y = top + 1.5; y < top + 11; y += 2) R(a, y, b - a, 0.8, C.blinds);
    R(a, top, b - a, 1.2, C.glassFrame);
    R(a, GLASS_Y - 1, b - a, 3, C.trim);
    for (let x = a; x < b; x += 16) R(x, top, 1, 22, C.glassFrame);
    R(b - 1, top, 1, 22, C.glassFrame);
    // reflection
    R(a + 3, top + 4, 1, 8, 'rgba(255,255,255,0.18)');
  }
  // door frame and plaque
  R(d0 - 1, top - 2, 2, 24, C.trim);
  R(d1 - 1, top - 2, 2, 24, C.trim);
  R(d0 - 1, top - 2, d1 - d0 + 2, 1.5, C.trim);
  const pw = label.length * 1.6 + 3;
  R((d0 + d1) / 2 - pw / 2, top - 6, pw, 4, C.trim);
  text(label, (d0 + d1) / 2, top - 3, 2.4, C.paper);
}

export const drawManagerGlass = () => drawGlassFront(ROOMS.manager, 'VEDOUCÍ', true);
export const drawConferenceGlass = () => drawGlassFront(ROOMS.conference, 'ZASEDAČKA', false);


/** Conference table with chairs on both sides and some papers. */
export function drawConferenceTable() {
  for (let i = 0; i < 4; i++) {
    const x = 82 + i * 16;
    R(x, 76, 8, 3, C.chair);
    R(x + 1, 79, 6, 1, C.chairDark);
  }
  R(74, 58, 68, 2, shade(C.deskTop, 0.15));
  R(74, 60, 68, 10, C.deskTop);
  R(74, 70, 68, 4, C.deskFront);
  R(75, 74, 2, 2, C.deskLeg);
  R(139, 74, 2, 2, C.deskLeg);
  R(84, 62, 6, 4, C.white);
  R(110, 63, 7, 4, C.paper);
  R(111, 64, 5, 0.6, C.metal);
  R(128, 61, 3, 3, C.white);
  R(128, 61, 3, 1, C.blue);
}

/** Reception counter by the entrance: monitor (back side), bell, name plate, candy jar. */
export function drawReception(t) {
  R(232, 52, 10, 8, C.frame);
  R(236, 60, 2, 2, C.metalDark);
  R(230, 58, 50, 4, C.deskTop);
  R(230, 58, 50, 1, shade(C.deskTop, 0.2));
  R(230, 62, 50, 13, C.deskFront);
  R(230, 62, 50, 1, C.deskEdge);
  R(240, 66, 30, 5, C.deskEdge);
  text('RECEPCE', 255, 70, 2.6, C.paper);
  // bell
  R(258, 56, 4, 2, C.yellow);
  R(257, 58, 6, 0.8, C.metalDark);
  // candy jar
  R(270, 54, 5, 4, 'rgba(244,244,244,0.7)');
  R(271, 56, 1, 1, C.red);
  R(273, 55.5, 1, 1, C.lime);
  R(270, 53, 5, 1, C.blue);
  // little plant
  R(276, 54, 3, 4, C.pot);
  R(276, 51 + Math.sin(t) * 0.2, 1, 3, C.plant);
  R(278, 52, 1, 2, C.plantDark);
}


/** The copier – what else would a paper company have in the break room. */
export function drawCopier(t, busy) {
  R(200, 96, 18, 6, C.metal);
  R(201, 95, 16, 1.5, shade(C.metal, 0.2));
  R(200, 102, 18, 14, shade(C.metal, -0.1));
  R(202, 104, 14, 3, C.metalDark);
  R(202, 108, 14, 3, C.metalDark);
  R(203, 99, 4, 2, C.ink);
  R(213, 98.5, 1.5, 1.5, busy && Math.floor(t * 4) % 2 ? C.green : C.lime);
  R(204, 93.5, 8, 2, C.white);
  R(201, 116, 2, 1, C.deskLeg);
  R(215, 116, 2, 1, C.deskLeg);
}
