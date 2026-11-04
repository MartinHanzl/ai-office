/** Base walking character (path following, speech bubbles). */
import { now } from '../core/util.js';
import { DOOR, SPEED, route } from '../world/layout.js';

export class Person {
  constructor(look) {
    this.look = look;
    this.x = DOOR.x;
    this.y = DOOR.y - 6;
    this.lane = DOOR.lane;
    this.path = [];
    this.facing = 'down';
    this.step = 0;
    this.onArrive = null;
    this.bubble = null;
  }

  get walking() {
    return this.path.length > 0;
  }

  walkTo(loc, onArrive) {
    const from = { x: this.x, lane: this.walking ? this.y : this.lane };
    this.path = route(from, loc);
    this.lane = loc.lane;
    this.onArrive = onArrive ?? null;
  }

  placeAt(loc) {
    this.x = loc.x;
    this.y = loc.y;
    this.lane = loc.lane;
    this.path = [];
  }

  say(str, secs = 3, kind = 'info') {
    if (!str) return;
    this.bubble = { text: str, until: now() + secs * 1000, kind };
  }

  move(dt) {
    let budget = SPEED * dt;
    while (budget > 0 && this.path.length) {
      const p = this.path[0];
      const dx = p.x - this.x;
      const dy = p.y - this.y;
      const d = Math.hypot(dx, dy);
      if (d <= budget) {
        this.x = p.x;
        this.y = p.y;
        budget -= d;
        this.path.shift();
      } else {
        this.x += (dx / d) * budget;
        this.y += (dy / d) * budget;
        this.facing = Math.abs(dy) > Math.abs(dx) && dy < 0 ? 'up' : 'down';
        budget = 0;
      }
    }
    if (this.path.length) {
      this.step += dt * 8;
    } else if (this.onArrive) {
      const cb = this.onArrive;
      this.onArrive = null;
      cb();
    }
    if (this.bubble && now() > this.bubble.until) this.bubble = null;
  }
}
