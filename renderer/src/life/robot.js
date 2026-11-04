/** Cleaning robot roaming the empty office. */
import { R } from '../core/canvas.js';
import { C } from '../core/palette.js';
import { clamp, now, rand } from '../core/util.js';
import { workers } from '../state.js';

export const robot = { x: 110, y: 120, angle: 0.7, turnAt: 0 };


export function updateRobot(dt) {
  if (workers.size > 0) return;
  robot.x += Math.cos(robot.angle) * 14 * dt;
  robot.y += Math.sin(robot.angle) * 14 * dt;
  if (robot.x < 6 || robot.x > 314) robot.angle = Math.PI - robot.angle;
  if (robot.y < 52 || robot.y > 176) robot.angle = -robot.angle;
  robot.x = clamp(robot.x, 6, 314);
  robot.y = clamp(robot.y, 52, 176);
  if (now() > robot.turnAt) {
    robot.angle += rand(-1.2, 1.2);
    robot.turnAt = now() + rand(2000, 6000);
  }
}


export function drawRobot(t) {
  R(robot.x - 3.5, robot.y - 2.5, 7, 3, C.metalDark);
  R(robot.x - 3, robot.y - 3, 6, 1, C.metal);
  R(robot.x - 0.5, robot.y - 2.6, 1, 0.8, Math.floor(t * 2) % 2 ? C.lime : C.green);
  R(robot.x - 3.5, robot.y - 0.5, 7, 0.5, C.ink);
}
