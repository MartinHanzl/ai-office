/** Static room: floor, walls, windows, whiteboard, wall panels. */
import { H, OX, OY, R, S, W, ctx, text } from '../core/canvas.js';
import { C } from '../core/palette.js';
import { noise, pad2 } from '../core/util.js';
import { figure } from './figure.js';
import { drawTV, plant } from './furniture.js';
import { lookFor } from '../entities/look.js';
import { WEEKDAYS, fmtReset, fuelColor, hourOf, remaining, strikeActive, strikeUntil } from '../limits.js';
import { state, stats, workers } from '../state.js';
import { DOOR } from '../world/layout.js';

/** Plan-mode diagram on the whiteboard, drawn step by step. */
export function drawDiagram(x, y, t) {
  const parts = [
    () => R(x + 3, y + 3, 9, 5, C.blue),
    () => R(x + 12, y + 5, 5, 1, C.ink),
    () => R(x + 17, y + 3, 9, 5, C.green),
    () => R(x + 21, y + 8, 1, 4, C.ink),
    () => R(x + 17, y + 12, 9, 5, C.orange),
    () => R(x + 26, y + 5, 4, 1, C.ink),
    () => R(x + 30, y + 3, 6, 5, C.purple),
    () => { R(x + 4, y + 12, 9, 1, C.metal); R(x + 4, y + 15, 7, 1, C.metal); R(x + 4, y + 18, 10, 1, C.metal); },
  ];
  const shown = Math.floor((t * 0.8) % (parts.length + 4));
  parts.slice(0, Math.min(shown + 1, parts.length)).forEach((draw) => draw());
}


export function drawPortrait(t) {
  R(4, 6, 20, 26, '#c8a24a');
  R(5, 7, 18, 24, '#a8842e');
  R(6, 8, 16, 18, '#29366f');
  if (state.employeeOfWeek) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(OX + 6 * S, OY + 8 * S, 16 * S, 18 * S);
    ctx.clip();
    figure(14, 40, lookFor(state.employeeOfWeek.key, state.employeeOfWeek.level), { view: 'front', arms: 'down', t }, 1.25);
    ctx.restore();
  } else {
    text('?', 14, 20, 7, C.metal);
  }
  R(6, 26, 16, 4, '#a8842e');
  text('★ TÝDNE', 14, 29.3, 2.4, C.yellow);
}


export function skyFor(hour) {
  if (hour >= 7 && hour < 17) return { top: '#73eff7', bottom: '#41a6f6', city: '#5d6dd8', night: false };
  if (hour >= 17 && hour < 20) return { top: '#ef7d57', bottom: '#b55088', city: '#5d275d', night: false };
  if (hour >= 5 && hour < 7) return { top: '#f4d35e', bottom: '#ef7d57', city: '#5d275d', night: false };
  return { top: '#1a1c2c', bottom: '#29366f', city: '#14162a', night: true };
}


export function drawWindow(x, y, w, h, sky, t) {
  R(x - 2, y - 2, w + 4, h + 4, C.trim);
  R(x, y, w, h / 2, sky.top);
  R(x, y + h / 2, w, h / 2, sky.bottom);
  if (sky.night) {
    for (let i = 0; i < 6; i++) {
      if ((Math.floor(t * 0.7) + i) % 5) R(x + 2 + noise(x + i) * (w - 4), y + 1 + noise(x * i + 3) * 8, 0.6, 0.6, C.white);
    }
  }
  let bx = x;
  let i = 0;
  while (bx < x + w) {
    const bw = 5 + Math.floor(noise(x + i * 17) * 6);
    const bh = 6 + Math.floor(noise(x * 3 + i) * 12);
    const bwClamped = Math.min(bw, x + w - bx);
    R(bx, y + h - bh, bwClamped, bh, sky.city);
    if (sky.night) {
      for (let wy = y + h - bh + 2; wy < y + h - 1; wy += 3) {
        for (let wx = bx + 1; wx < bx + bwClamped - 1; wx += 2) {
          if (noise(wx * 31 + wy * 7) > 0.6) R(wx, wy, 1, 1, C.yellow);
        }
      }
    }
    bx += bw;
    i += 1;
  }
  R(x + w / 2 - 0.5, y, 1, h, C.trim);
  R(x, y + h / 2 - 0.5, w, 1, C.trim);
  R(x - 3, y + h + 2, w + 6, 2, C.wallLight);
}


/** Wall panel under the clock: remaining % of the 5h window and the week. */
export function drawLimits(x, y) {
  const w = 28;
  const h = 15;
  R(x, y, w, h, C.trim);
  R(x + 1, y + 1, w - 2, h - 2, '#0d1117');
  const row = (label, win, ry) => {
    const left = remaining(win);
    text(label, x + 2, ry + 2.6, 2.6, C.metal, 'left');
    R(x + 8, ry, 11, 3, C.chair);
    if (left != null) R(x + 8, ry, (11 * left) / 100, 3, fuelColor(left));
    text(left == null ? '–' : `${left}%`, x + w - 1.5, ry + 2.6, 2.6, fuelColor(left), 'right');
  };
  row('5h', state.limits?.fiveHour, y + 3);
  row('7d', state.limits?.week, y + 9);
}


/** Digital wall clock: HH:MM:SS + weekday and date, LED style. (x, y) = top-left corner. */
export function drawClock(x, y, date) {
  const w = 28;
  const h = 15;
  R(x, y, w, h, C.trim);
  R(x + 1, y + 1, w - 2, h - 2, '#0d1117');
  R(x + 1, y + 1, w - 2, 0.5, '#262b44');
  const time = `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
  const day = `${WEEKDAYS[date.getDay()]} ${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
  text(time, x + w / 2, y + 7, 4, C.red);
  text(day, x + w / 2, y + 12.3, 2.6, C.teal);
}


export function personNearDoor() {
  for (const w of workers.values()) {
    if (Math.hypot(w.x - DOOR.x, w.y - DOOR.y) < 12) return true;
    if (w.interns.some((i) => Math.hypot(i.x - DOOR.x, i.y - DOOR.y) < 12)) return true;
  }
  return false;
}


export function drawRoom(t, date) {
  // floor
  R(0, 46, W, H - 46, C.floorA);
  for (let row = 0, y = 46; y < H; row++, y += 6) {
    if (row % 2) R(0, y, W, 6, C.floorB);
    R(0, y, W, 0.5, C.seam);
    for (let x = (row * 23) % 48; x < W; x += 48) R(x, y, 0.5, 6, C.seam);
  }
  // lounge rug
  R(226, 92, 90, 78, C.rugEdge);
  R(228, 94, 86, 74, C.rug);
  for (let i = 0; i < 6; i++) R(232 + i * 14, 98, 6, 1, C.rugEdge);

  // wall
  R(0, 0, W, 46, C.wall);
  R(0, 0, W, 2, C.trim);
  R(0, 30, W, 1, C.wallLight);
  R(0, 44, W, 2, C.trim);

  const sky = skyFor(hourOf(date));
  drawWindow(30, 8, 50, 20, sky, t);
  drawWindow(90, 8, 50, 20, sky, t);
  drawPortrait(t);

  // whiteboard: today's finished tasks / plan-mode meeting diagram / strike notice
  R(147, 7, 40, 26, C.metalDark);
  R(148, 8, 38, 24, C.white);
  const meeting = [...workers.values()].some((w) => w.place === 'board');
  if (strikeActive()) {
    text('STÁVKA', 167, 17, 5.5, C.red);
    text('došly tokeny', 167, 23, 3, C.metalDark);
    text(`do ${fmtReset(strikeUntil > Date.now() ? strikeUntil : state.limits?.fiveHour?.resetsAt) || '?'}`, 167, 28.5, 3, C.metalDark);
  } else if (meeting) {
    drawDiagram(148, 8, t);
    text(`✓ ${stats.done}`, 184.5, 30.5, 2.6, C.green, 'right');
  } else {
    text('HOTOVO DNES', 167, 14, 3.2, C.metalDark);
    text(String(stats.done), 167, 26, 9, C.green);
  }
  R(149, 33, 36, 1.5, C.metal);
  R(155, 32, 3, 1, C.red);
  R(160, 32, 3, 1, C.blue);

  drawClock(190, 9, date);
  drawLimits(190, 27);

  // water cooler
  R(220, 24, 8, 22, C.white);
  R(220, 44, 8, 2, C.metal);
  R(221, 13, 6, 11, '#73eff7cc');
  R(222, 14, 1.5, 8, '#ffffff88');
  R(222, 30, 2, 2, C.blue);
  R(225, 30, 2, 2, C.red);

  // kitchenette counter
  R(232, 30, 54, 3, C.paper);
  R(232, 33, 54, 13, C.deskEdge);
  for (let i = 0; i < 3; i++) {
    R(234 + i * 18, 35, 16, 9, C.deskFront);
    R(240 + i * 18, 39, 4, 1, C.deskTop);
  }
  // coffee machine
  R(236, 16, 12, 14, C.ink);
  R(237, 17, 10, 4, C.chair);
  R(245, 18, 1.5, 1.5, Math.floor(t * 2) % 2 ? C.red : C.green);
  R(240, 22, 4, 2, C.metal);
  R(240, 26, 4, 4, C.white);
  // microwave
  R(254, 21, 16, 9, C.metal);
  R(255, 22, 10, 7, C.ink);
  R(267, 23, 2, 1, C.green);
  // fruit bowl
  R(274, 27, 9, 3, C.white);
  R(275, 25, 2.5, 2.5, C.red);
  R(278, 25, 2.5, 2.5, C.yellow);
  R(280, 26, 2.5, 2.5, C.lime);

  // door
  R(288, 12, 20, 34, C.trim);
  if (personNearDoor()) {
    R(290, 14, 16, 32, C.night);
    R(290, 14, 3, 32, C.deskEdge);
  } else {
    R(290, 14, 16, 32, C.deskEdge);
    R(292, 16, 12, 12, C.deskFront);
    R(292, 30, 12, 13, C.deskFront);
    R(302, 29, 2, 2, C.yellow);
  }
  text('EXIT', 298, 10.5, 3, C.lime);

  // plants
  plant(6, 52);
  plant(312, 172);
  plant(220, 178);

  // lounge: TV (sofa is depth-sorted in front of its sitters)
  const watching = [...workers.values()].some((w) => w.idle?.kind === 'sofa' && w.idle.arrived);
  drawTV(t, watching);
  // floor lamp
  R(309, 96, 2, 26, C.metalDark);
  R(305, 92, 10, 5, C.yellow);
  R(306, 122, 8, 2, C.metalDark);
}
