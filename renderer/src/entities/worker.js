/**
 * Employees (agent sessions) and interns (subagents). They come in through the courtyard gate (ground floor),
 * climb the stairs to their desk upstairs, slack off on either floor and leave the same way.
 */
import { GHOST_LINES, IDLE_LINES } from '../content/texts.js';
import { C } from '../core/palette.js';
import { clamp, now, rand, randItem } from '../core/util.js';
import { strikeActive } from '../limits.js';
import { puff } from '../life/particles.js';
import { FREE, WORKING } from './activity.js';
import { pickIdle } from './idle.js';
import { lookFor } from './look.js';
import { createMood, updateMood } from './mood.js';
import { Person } from './person.js';
import { workers } from '../state.js';
import { BOARD, ENTRY, IDLE_POOLS, claimSeat, floors, internSpot, otherFloor, randomFloorPoint, releaseSeat } from '../world/layout.js';

/** After this long without work (terminal still open) an employee turns into a ghost. */
export const GHOST_AFTER = 5 * 60_000;

const linesFor = (kind) => IDLE_LINES[kind];

/** What strolls stop at now and then (named `+` spots of the plans, on whichever floor the stroll is). */
const STROLL_STOPS = ['printer', 'drawers', 'bins', 'snack', 'darts', 'reception'];

/** Share of idle spots picked on the floor the employee is on (the rest anywhere). */
const SAME_FLOOR = 0.7;

export class Worker extends Person {
  constructor(ev) {
    const profile = ev.profile ?? null;
    // Employees are lasting members of a project's team: name from main, look from the employee key.
    super(lookFor(profile?.key ?? ev.sessionId, profile?.level ?? 0));
    this.key = profile?.key ?? ev.sessionId;
    this.name = ev.name ?? null;
    this.profile = profile;
    this.coverFor = ev.coverFor ?? null; // { name, whom } of the conversation's owner, busy elsewhere, this one covers for
    this.inPlan = ev.mode === 'plan';
    this.boardSpot = null;
    this.context = null;     // % of the context window used
    this.cost = null;        // session cost in USD ("salary")
    this.errorUntil = 0;
    this.id = ev.sessionId;
    this.source = ev.source || 'Claude';
    this.cwd = ev.cwd || '';
    this.project = ev.project || ev.cwd?.split('/').filter(Boolean).pop() || this.source;
    this.activity = 'idle';
    this.waiting = false;
    this.place = 'entering';
    this.seat = claimSeat(this);
    this.interns = [];
    this.extraInterns = 0;
    this.lastText = '';
    this.thinkAt = 0;
    this.idle = null;       // current slacking behaviour { kind, until, spot?, convo?, arrived }
    this.nextIdleAt = 0;    // when to pick the next behaviour
    this.freeSince = null;  // since when the agent has been waiting for the user
    this.talkingUntil = 0;
    this.mood = createMood();
    this.ghost = false;
    this.ghostPause = 0;   // ghost: when to float on
    this.leaving = false;
    this.gone = false;
  }

  get isFree() {
    return !this.leaving && !this.waiting && FREE.has(this.activity)
      && this.interns.every((i) => i.leaving) && this.extraInterns === 0;
  }

  enter() {
    this.place = 'entering';
    this.walkTo(this.seat, () => { this.place = 'desk'; });
  }

  get displayName() {
    return this.name ?? this.project;
  }

  setProfile(profile) {
    if (!profile) return;
    const oldLevel = this.profile?.level;
    const oldKey = this.key;
    this.profile = profile;
    this.key = profile.key ?? this.key;
    if (oldLevel !== profile.level || oldKey !== this.key) this.look = lookFor(this.key, profile.level);
  }

  setMode(mode) {
    const plan = mode === 'plan';
    if (plan === this.inPlan) return;
    this.inPlan = plan;
    if (this.leaving || this.isFree) return;
    if (plan) this.goBoard();
    else this.goDesk();
  }

  setStats(context, cost) {
    const before = this.context ?? 0;
    this.context = context;
    this.cost = cost;
    if (context >= 90 && before < 90) this.say('Hlava mi třeští… 🥵', 4, 'error');
  }

  goDesk() {
    if (this.leaving) return;
    this.releaseBoard();
    if (this.place === 'desk' || this.place === 'toDesk' || this.place === 'entering') return;
    this.place = 'toDesk';
    this.walkTo(this.seat, () => { this.place = 'desk'; });
  }

  /** Plan mode: the employee holds a "meeting" at the whiteboard. */
  goBoard() {
    if (this.leaving || this.place === 'board' || this.place === 'toBoard') return;
    const spot = BOARD.find((s) => !s.owner);
    if (!spot) {
      this.goDesk();
      return;
    }
    spot.owner = this;
    this.boardSpot = spot;
    this.place = 'toBoard';
    this.walkTo(spot, () => { this.place = 'board'; });
  }

  releaseBoard() {
    if (this.boardSpot) this.boardSpot.owner = null;
    this.boardSpot = null;
  }

  // ---- work

  work(activity, label, secs = 3, kind = 'info') {
    if (this.leaving) return;
    this.unGhost();
    this.stopIdle();
    this.freeSince = null;
    this.nextIdleAt = 0;
    if (this.inPlan) this.goBoard();
    else this.goDesk();
    this.activity = activity;
    this.waiting = false;
    this.thinkAt = 0;
    if (label) this.say(label, secs, kind);
  }

  becomeFree(delayMs) {
    this.waiting = false;
    this.thinkAt = 0;
    if (!FREE.has(this.activity)) this.activity = 'idle';
    this.freeSince ??= now();
    if (!this.idle) this.nextIdleAt = now() + delayMs;
  }

  // ---- slacking

  /**
   * Start an idle behaviour. Desk behaviours: browse, nap, sit. Spot behaviours (IDLE_POOLS, on either floor):
   * coffee, sofa, window, booth (phone call), cafe (klubovna table), stool (bar), pouf (by the hooks); chat.
   */
  startIdle(kind, secs, { spot = null, convo = null } = {}) {
    this.stopIdle();
    const until = now() + secs * 1000;
    if (kind === 'browse' || kind === 'nap' || kind === 'sit') {
      this.idle = { kind, until, arrived: true };
      this.activity = kind === 'browse' ? 'surfing' : kind === 'nap' ? 'sleeping' : 'idle';
      this.goDesk();
      return true;
    }
    if (kind === 'stroll') {
      this.releaseBoard();
      this.activity = 'idle';
      // now and then the stroll is on the other floor
      const floor = Math.random() < 0.25 ? otherFloor(this.floor) : this.floor;
      this.idle = { kind, until, arrived: false, pauseUntil: 0, floor };
      this.place = 'spot';
      this.strollOn();
      return true;
    }
    const free = IDLE_POOLS[kind]?.filter((s) => !s.owner) ?? [];
    const here = free.filter((s) => s.floor === this.floor);
    const target = spot ?? (here.length && Math.random() < SAME_FLOOR ? randItem(here) : free.length ? randItem(free) : null);
    if (!target) return false;
    this.releaseBoard();
    target.owner = this;
    this.activity = 'idle';
    // the break starts on arrival: the walk there (maybe across the stairs) does not eat it up
    this.idle = { kind, until: Infinity, spot: target, convo, arrived: false };
    this.place = 'toSpot';
    this.walkTo(target, () => {
      this.place = 'spot';
      if (!this.idle) return;
      this.idle.arrived = true;
      this.idle.until = now() + secs * 1000;
      if (kind === 'coffee') this.say(randItem(IDLE_LINES.coffee), 3);
      if (kind === 'booth') this.say(linesFor('booth')[0], 2.5, 'chat');
    });
    return true;
  }

  /** Stroll: walk to a random spot in the open areas (sometimes by the printer, bins…), look around, repeat. */
  strollOn() {
    const { floor } = this.idle;
    const stops = STROLL_STOPS.map((n) => floors[floor].named[n]).filter(Boolean);
    const p = stops.length && Math.random() < 0.2 ? randItem(stops) : randomFloorPoint(null, floor);
    if (!p) {
      this.stopIdle();
      return;
    }
    this.idle.arrived = false;
    this.walkTo(p, () => {
      if (this.idle?.kind !== 'stroll') return;
      this.idle.arrived = true;
      this.idle.pauseUntil = now() + rand(1500, 5000);
    });
  }

  stopIdle() {
    const idle = this.idle;
    if (!idle) return;
    this.idle = null;
    if (idle.spot) idle.spot.owner = null;
    if (idle.convo) idle.convo.end(this);
    if (this.activity === 'surfing' || this.activity === 'sleeping') this.activity = 'idle';
  }

  tickIdle(dt) {
    const t = now();
    if (!this.isFree) return;
    if (this.ghost) {
      this.tickGhost(t);
      return;
    }
    // long without work, but the session is still open → ghost (not while picketing or mid-chat)
    if (this.freeSince && t - this.freeSince >= GHOST_AFTER && !strikeActive() && !this.idle?.convo) {
      this.becomeGhost();
      return;
    }
    if (this.idle) {
      const { kind, until, convo, arrived } = this.idle;
      if (!convo && t >= until) {
        this.stopIdle();
        this.nextIdleAt = t + rand(1500, 5000);
        return;
      }
      if (kind === 'stroll' && arrived && !this.walking && t >= this.idle.pauseUntil) {
        this.strollOn();
        return;
      }
      if (arrived && !this.walking && !this.bubble && linesFor(kind) && Math.random() < dt / 18) {
        this.say(randItem(linesFor(kind)), 2.5);
      }
      return;
    }
    if (!this.nextIdleAt) this.nextIdleAt = t + rand(2000, 6000);
    if (!this.walking && t >= this.nextIdleAt) {
      this.nextIdleAt = 0;
      pickIdle(this);
    }
  }

  // ---- ghost

  becomeGhost() {
    this.stopIdle();
    this.releaseBoard();
    this.ghost = true;
    this.activity = 'idle';
    this.place = 'ghost';
    this.halt();
    puff(this.x, this.y, 14, this.floor);
    this.say(randItem(GHOST_LINES), 3);
    this.ghostPause = now() + rand(1000, 3000);
  }

  /** Back to human form (work arrived, or the session needs attention). */
  unGhost() {
    if (!this.ghost) return;
    this.ghost = false;
    this.halt();
    this.place = 'spot';
    puff(this.x, this.y, 14, this.floor);
  }

  /** Float anywhere on this floor – straight through walls and desks – sometimes haunting a busy colleague. */
  tickGhost(t) {
    if (this.walking || t < this.ghostPause) return;
    const top = floors[this.floor].floorY + 4;
    const busy = [...workers.values()].filter((o) => o !== this && !o.gone && !o.ghost && !o.isFree && o.floor === this.floor && !o.stairs);
    const victim = busy.length && Math.random() < 0.3 ? randItem(busy) : null;
    const target = victim
      ? { x: clamp(victim.x + randItem([-12, 12]), 10, 310), y: clamp(victim.y - 4, top, 174) }
      : { x: rand(10, 310), y: rand(top, 174) };
    this.path = [target];
    this.onArrive = () => {
      this.ghostPause = now() + rand(1500, 6000);
      if (!this.bubble && Math.random() < 0.3) this.say(randItem(GHOST_LINES), 2.5);
    };
  }

  // ---- interns

  addIntern(label) {
    const active = this.interns.filter((i) => !i.leaving);
    if (active.length >= 3) {
      this.extraInterns += 1;
      return;
    }
    const used = new Set(active.map((i) => i.slot));
    const slot = [0, 1, 2].find((s) => !used.has(s));
    this.interns.push(new Intern(this, label, slot));
  }

  removeIntern() {
    if (this.extraInterns > 0) {
      this.extraInterns -= 1;
      return;
    }
    this.interns.find((i) => !i.leaving)?.leave();
  }

  leave() {
    if (this.leaving) return;
    this.stopIdle();
    this.releaseBoard();
    this.leaving = true;
    this.waiting = false;
    this.activity = 'idle';
    this.say('Nashle! 👋', 3);
    this.interns.forEach((i) => i.leave());
    this.extraInterns = 0;
    this.place = 'toDoor';
    const exit = () => {
      this.gone = true;
      releaseSeat(this);
    };
    if (this.ghost) {
      // a ghost just floats out towards the gate (upstairs: through the window over the courtyard)
      this.afterStairs = null;
      this.path = [{ x: ENTRY.x, y: ENTRY.y }];
      this.onArrive = exit;
    } else {
      this.walkTo(ENTRY, exit);
    }
  }

  update(dt) {
    if (this.ghost && !this.isFree && !this.leaving) {
      // e.g. a permission request or a subagent: become human again and go to the desk
      this.unGhost();
      this.goDesk();
    }
    this.move(dt);
    if (this.thinkAt && now() >= this.thinkAt) {
      this.thinkAt = 0;
      if (!this.waiting && WORKING.has(this.activity)) this.activity = 'thinking';
    }
    this.tickIdle(dt);
    updateMood(this, dt);
    for (const intern of this.interns) intern.move(dt);
    this.interns = this.interns.filter((i) => !i.gone);
  }
}


export class Intern extends Person {
  constructor(boss, label, slot) {
    const look = lookFor(`${boss.id}:${slot}:${Math.random()}`);
    look.cap = C.lime;
    look.tie = null;
    super(look);
    this.boss = boss;
    this.label = label;
    this.slot = slot;
    this.leaving = false;
    this.gone = false;
    this.arrived = false;
    this.walkTo(this.spot(), () => {
      this.arrived = true;
      this.say(`🧑‍🎓 ${label}`, 3);
    });
  }

  /** Next to the boss's seat, on whichever floor it is (the walk there and back crosses the stairs). */
  spot() {
    return internSpot(this.boss.seat, this.slot);
  }

  leave() {
    this.leaving = true;
    this.arrived = false;
    this.walkTo(ENTRY, () => {
      this.gone = true;
    });
  }
}
