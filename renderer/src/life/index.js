/** Office-life entry points used by the main loop. */
import { text } from '../core/canvas.js';
import { bubble } from '../draw/overlay.js';
import { cat, drawCat, updateCat } from './cat.js';
import { updateParticles } from './particles.js';
import { drawRobot, robot, updateRobot } from './robot.js';
import { workers } from '../state.js';

export function updateLife(dt) {
  updateParticles(dt);
  updateCat(dt);
  updateRobot(dt);
}


export function lifeItems(t) {
  const items = [{ y: cat.y + cat.onTop, draw: () => drawCat(t) }];
  if (workers.size === 0) items.push({ y: robot.y, draw: () => drawRobot(t) });
  return items;
}


export function drawLifeOverlay(t) {
  if (cat.bubble) bubble(cat.x, cat.y - 9, cat.bubble.text, 'chat', 3.2);
  else if (cat.state === 'sleep') {
    const p = (t * 0.6) % 1;
    text('z', cat.x + 3 + p * 2, cat.y - 5 - p * 5, 2.5 + p * 1.5, `rgba(244,244,244,${1 - p})`);
  }
}
