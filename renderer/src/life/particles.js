/** Confetti and heart particles. */
import { R, ctx, text } from '../core/canvas.js';
import { C } from '../core/palette.js';
import { rand, randItem } from '../core/util.js';

export const particles = [];

export const CONFETTI = [C.red, C.yellow, C.green, C.blue, C.purple, C.orange, C.teal];


export function confetti(x, y, n = 30) {
  for (let i = 0; i < n; i++) {
    particles.push({
      x, y, vx: rand(-45, 45), vy: rand(-80, -25), color: randItem(CONFETTI),
      life: rand(1.2, 2.2), size: rand(0.8, 1.6), float: false,
    });
  }
}


export function hearts(x, y, n = 4) {
  for (let i = 0; i < n; i++) {
    particles.push({ x: x + rand(-4, 4), y, vx: rand(-4, 4), vy: rand(-14, -8), life: rand(1.2, 1.8), heart: true, float: true });
  }
}


export function updateParticles(dt) {
  for (const p of particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (!p.float) {
      p.vy += 95 * dt;
      p.vx *= 0.985;
    }
  }
  for (let i = particles.length - 1; i >= 0; i--) if (particles[i].life <= 0) particles.splice(i, 1);
}


export function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = Math.min(1, p.life * 2);
    if (p.heart) text('❤', p.x, p.y, 3.5, C.red);
    else R(p.x, p.y, p.size, p.size, p.color);
  }
  ctx.globalAlpha = 1;
}
