/** Evening and night darkness over a floor, with holes where its lights shine. */
import { H, OX, OY, S, W, canvas, ctx } from '../../core/canvas.js';

let lightCanvas = null;

/** Darkness by hour (same steps as the old office). */
export const darknessAt = (hour) => (hour >= 21 || hour < 6 ? 0.55 : hour >= 19 || hour < 7 ? 0.3 : 0);

/** @param {{ x: number, y: number, r: number, s: number }[]} lights */
export function drawDarkness(dark, lights) {
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
  for (const { x, y, r, s } of lights) {
    const gx = OX + x * S;
    const gy = OY + y * S;
    const gr = r * S;
    const g = lc.createRadialGradient(gx, gy, 0, gx, gy, gr);
    g.addColorStop(0, `rgba(0,0,0,${s})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    lc.fillStyle = g;
    lc.fillRect(gx - gr, gy - gr, gr * 2, gr * 2);
  }
  ctx.drawImage(lightCanvas, 0, 0);
}
