/** Office-life entry points used by the main loop: the cat and the cleaning robot, on their floor only. */
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


/** Depth-sorted drawables ({ y, box, draw }) of the cat and the robot on `floor`. */
export function lifeItems(t, floor) {
  const items = [];
  if (cat.floor === floor) {
    items.push({ y: cat.y + cat.onTop, box: { x: cat.x - 7, y: cat.y - 9, w: 14, h: 11 }, draw: () => drawCat(t) });
  }
  if (workers.size === 0 && robot.floor === floor) {
    items.push({ y: robot.y, box: { x: robot.x - 5, y: robot.y - 4, w: 10, h: 6 }, draw: () => drawRobot(t) });
  }
  return items;
}


/** The cat's bubble or its sleepy z, when the cat is on `floor`. */
export function drawLifeOverlay(t, floor) {
  if (cat.floor !== floor) return;
  if (cat.bubble) bubble(cat.x, cat.y - 9, cat.bubble.text, 'chat', 3.2);
  else if (cat.state === 'sleep') {
    const p = (t * 0.6) % 1;
    text('z', cat.x + 3 + p * 2, cat.y - 5 - p * 5, 2.5 + p * 1.5, `rgba(244,244,244,${1 - p})`);
  }
}
