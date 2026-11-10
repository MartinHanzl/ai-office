/** Evening / night lighting. */
import { H, OX, OY, S, W, canvas, ctx } from '../core/canvas.js';
import { personNearDoor } from '../draw/room.js';
import { hourOf } from '../limits.js';
import { workers } from '../state.js';
import { DESKS } from '../world/layout.js';

export let lightCanvas = null;


export function drawLighting(t, date) {
  const h = hourOf(date);
  const dark = h >= 21 || h < 6 ? 0.55 : h >= 19 || h < 7 ? 0.3 : 0;
  if (!dark) return;
  lightCanvas ??= document.createElement('canvas');
  if (lightCanvas.width !== canvas.width || lightCanvas.height !== canvas.height) {
    lightCanvas.width = canvas.width;
    lightCanvas.height = canvas.height;
  }
  const lc = lightCanvas.getContext('2d');
  lc.globalCompositeOperation = 'source-over';
  lc.clearRect(0, 0, lightCanvas.width, lightCanvas.height);
  lc.fillStyle = `rgba(6,8,28,${dark})`;
  lc.fillRect(OX, OY, W * S, H * S);
  lc.globalCompositeOperation = 'destination-out';
  const light = (x, y, radius, strength) => {
    const gx = OX + x * S;
    const gy = OY + y * S;
    const gr = radius * S;
    const g = lc.createRadialGradient(gx, gy, 0, gx, gy, gr);
    g.addColorStop(0, `rgba(0,0,0,${strength})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    lc.fillStyle = g;
    lc.fillRect(gx - gr, gy - gr, gr * 2, gr * 2);
  };
  for (const d of DESKS) if (d.owner && !d.owner.leaving) light(d.cx, d.deskY, 28, 0.95);
  for (const w of workers.values()) if (w.ghost && !w.gone) light(w.x, w.y - 14, 16, 0.6); // ghostly glow
  light(310, 110, 36, 0.95); // floor lamp
  light(178, 24, 12, 0.6);   // coffee machine
  light(160, 26, 14, 0.7);   // vending machine
  if ([...workers.values()].some((w) => w.idle?.kind === 'sofa' && w.idle.arrived)) light(276, 108, 34, 0.85);
  if (personNearDoor()) light(298, 40, 18, 0.7);
  ctx.drawImage(lightCanvas, 0, 0);

  // warm glow of the floor lamp
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const gx = OX + 310 * S;
  const gy = OY + 109 * S;
  const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, 22 * S);
  g.addColorStop(0, 'rgba(255,200,110,0.18)');
  g.addColorStop(1, 'rgba(255,200,110,0)');
  ctx.fillStyle = g;
  ctx.fillRect(gx - 22 * S, gy - 22 * S, 44 * S, 44 * S);
  ctx.restore();
}
