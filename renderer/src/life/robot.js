/** Cleaning robot roaming the empty office. */
import { R } from '../core/canvas.js';
import { C } from '../core/palette.js';
import { now, rand } from '../core/util.js';
import { workers } from '../state.js';
import { isWalkable } from '../world/layout.js';

export const robot = { x: 110, y: 134, angle: 0.7, turnAt: 0 };


export function updateRobot(dt) {
  if (workers.size > 0) return;
  const nx = robot.x + Math.cos(robot.angle) * 14 * dt;
  const ny = robot.y + Math.sin(robot.angle) * 14 * dt;
  if (isWalkable(nx, ny)) {
    robot.x = nx;
    robot.y = ny;
  } else {
    // bumped into furniture or a wall: turn around somewhere random
    robot.angle += Math.PI + rand(-0.9, 0.9);
    robot.turnAt = now() + rand(1500, 4000);
  }
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
