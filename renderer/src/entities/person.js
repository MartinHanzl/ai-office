/** Base walking character (path following across both floors, speech bubbles). */
import { now, rand } from '../core/util.js';
import { ENTRY, SPEED, floors, otherFloor, route } from '../world/layout.js';
import { STAIRS_SECONDS, stairsPoint } from '../world/stairs.js';

/** Ghosts float slowly and straight through walls and furniture. */
export const GHOST_SPEED = 26;

export class Person {
  constructor(look) {
    this.look = look;
    this.floor = ENTRY.floor;
    this.x = ENTRY.x;
    this.y = ENTRY.y;
    this.speed = SPEED * rand(0.85, 1.15); // everyone walks at their own pace
    this.path = [];
    this.facing = 'down';
    this.step = 0;
    this.onArrive = null;
    this.bubble = null;
    /** On the stairs: { floor (shown on), dir: 'up'|'down', progress 0 → 1 }, else null. */
    this.stairs = null;
    /** Where to go once the climb is over: { loc, onArrive, opts }. */
    this.afterStairs = null;
  }

  get walking() {
    return this.path.length > 0 || this.stairs !== null;
  }

  /**
   * Walk to `loc` (on `loc.floor`, default the current floor). Another floor: to this floor's stairs, up or
   * down, then on to `loc`. `opts` go to the path finder (see world/path.js findPath), e.g. `{ detour: 0 }`.
   */
  walkTo(loc, onArrive, opts) {
    const floor = loc.floor ?? this.floor;
    if (this.stairs) {
      // mid-climb: finish the flight, then head for the new target from there
      this.path = [];
      this.onArrive = null;
      this.afterStairs = { loc, onArrive, opts };
      return;
    }
    if (floor === this.floor) {
      this.afterStairs = null;
      this.path = route({ x: this.x, y: this.y, floor }, { ...loc, floor }, opts);
      this.onArrive = onArrive ?? null;
      return;
    }
    this.afterStairs = { loc, onArrive, opts };
    this.path = route({ x: this.x, y: this.y, floor: this.floor }, floors[this.floor].stairs, opts);
    this.onArrive = () => this.climb();
  }

  /** At the stairs portal: start the climb to the other floor (unless the walk was called off meanwhile). */
  climb() {
    if (!this.afterStairs) return;
    this.stairs = { floor: this.floor, dir: this.floor === 'ground' ? 'up' : 'down', progress: 0 };
    this.facing = this.stairs.dir === 'up' ? 'up' : 'down';
  }

  /** Stop walking where you are (a climb already under way is finished, nothing follows it). */
  halt() {
    this.path = [];
    this.onArrive = null;
    this.afterStairs = null;
  }

  placeAt(loc) {
    this.x = loc.x;
    this.y = loc.y;
    this.floor = loc.floor ?? this.floor;
    this.path = [];
    this.stairs = null;
    this.afterStairs = null;
  }

  say(str, secs = 3, kind = 'info') {
    if (!str) return;
    this.bubble = { text: str, until: now() + secs * 1000, kind };
  }

  /** One leg of the climb: the floor flips halfway, at the top/bottom the walk goes on to the target. */
  moveOnStairs(dt) {
    const s = this.stairs;
    const before = s.progress;
    s.progress = Math.min(1, s.progress + dt / STAIRS_SECONDS);
    if (before < 0.5 && s.progress >= 0.5) {
      this.floor = otherFloor(this.floor);
      s.floor = this.floor;
    }
    const p = stairsPoint(s.floor, s.dir, s.progress);
    this.x = p.x;
    this.y = p.y;
    if (s.progress < 1) return;
    const { x, y } = floors[this.floor].stairs;
    this.x = x;
    this.y = y;
    this.stairs = null;
    const next = this.afterStairs;
    this.afterStairs = null;
    if (next) this.walkTo(next.loc, next.onArrive, next.opts);
  }

  move(dt) {
    if (this.stairs) {
      this.moveOnStairs(dt);
    } else {
      let budget = (this.ghost ? GHOST_SPEED : this.speed) * dt;
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
    }
    if (this.walking) {
      this.step += dt * 8;
    } else if (this.onArrive) {
      const cb = this.onArrive;
      this.onArrive = null;
      cb();
    }
    if (this.bubble && now() > this.bubble.until) this.bubble = null;
  }
}
