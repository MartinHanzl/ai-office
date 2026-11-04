'use strict';
/**
 * AI Office – renderer.
 * A 320×180 logical-pixel office drawn with rectangles. Each running AI session
 * is an employee; subagents are interns. Everything is procedural pixel art.
 */

// ================================================================ setup

const W = 320;
const H = 180;
const COMPACT = new URLSearchParams(location.search).get('mode') === 'compact';
const canvas = document.getElementById('scene');
const ctx = canvas.getContext('2d');
const barLeft = document.getElementById('bar-left');
const barRight = document.getElementById('bar-right');
const tooltip = document.getElementById('tooltip');

let S = 1;
let OX = 0;
let OY = 0;
let DPR = 1;

function resize() {
  DPR = window.devicePixelRatio || 1;
  const r = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.round(r.width * DPR));
  canvas.height = Math.max(1, Math.round(r.height * DPR));
  S = Math.min(canvas.width / W, canvas.height / H);
  OX = Math.round((canvas.width - W * S) / 2);
  OY = Math.round((canvas.height - H * S) / 2);
}
window.addEventListener('resize', resize);
resize();

const now = () => performance.now();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** Filled rect in logical pixels, snapped to device pixels (no seams at any scale). */
function R(x, y, w, h, color) {
  const x0 = Math.round(OX + x * S);
  const y0 = Math.round(OY + y * S);
  const x1 = Math.round(OX + (x + w) * S);
  const y1 = Math.round(OY + (y + h) * S);
  if (x1 <= x0 || y1 <= y0) return;
  ctx.fillStyle = color;
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
}

const font = (size) => `${Math.max(1, Math.round(size * S))}px Menlo, Monaco, monospace`;

function text(str, x, y, size, color, align = 'center') {
  ctx.font = font(size);
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;
  ctx.fillText(str, OX + x * S, OY + y * S);
}

function measure(str, size) {
  ctx.font = font(size);
  return ctx.measureText(str).width / S;
}

function truncate(str, max) {
  const chars = [...String(str)];
  return chars.length > max ? `${chars.slice(0, max - 1).join('')}…` : chars.join('');
}

function hash(str) {
  let h = 2166136261;
  for (const ch of String(str)) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function noise(n) {
  let x = Math.imul((n | 0) ^ ((n | 0) >>> 15), 2246822507);
  x = Math.imul(x ^ (x >>> 13), 3266489909);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

const pick = (arr, h) => arr[h % arr.length];

const shadeCache = new Map();
function shade(hex, amt) {
  const key = hex + amt;
  if (shadeCache.has(key)) return shadeCache.get(key);
  const n = parseInt(hex.slice(1, 7), 16);
  const target = amt < 0 ? 0 : 255;
  const p = Math.abs(amt);
  const mix = (c) => Math.round(c + (target - c) * p);
  const out = `rgb(${mix(n >> 16)},${mix((n >> 8) & 255)},${mix(n & 255)})`;
  shadeCache.set(key, out);
  return out;
}

// ================================================================ palette & layout

const C = {
  ink: '#1a1c2c', night: '#14162a', wall: '#3b4466', wallLight: '#46507a', trim: '#262b44',
  floorA: '#9b7653', floorB: '#926f4e', seam: '#7a5c40',
  deskTop: '#d9a066', deskFront: '#b07a4a', deskEdge: '#8f5f3a', deskLeg: '#5d3f2a',
  frame: '#262b44', metal: '#94a3b8', metalDark: '#566c86', key: '#c7cfdd',
  white: '#f4f4f4', paper: '#e8e6d9', red: '#e43b44', yellow: '#f4d35e', green: '#38b764',
  lime: '#a7f070', blue: '#41a6f6', teal: '#73eff7', purple: '#b55088', orange: '#ef7d57',
  chair: '#333c57', chairDark: '#22263a', rug: '#5d275d', rugEdge: '#7e3a7e',
  plant: '#38b764', plantDark: '#257179', pot: '#a05b53', sofa: '#5d6dd8',
};
const SHIRTS = ['#41a6f6', '#e43b44', '#38b764', '#ef7d57', '#b55088', '#f4d35e', '#73eff7', '#a7f070', '#5d6dd8', '#ff9ec4'];
const HAIRS = ['#1a1c2c', '#5d3f2a', '#8f5f3a', '#f4d35e', '#c0c0c0', '#a05b53', '#ef7d57', '#333c57'];
const SKINS = ['#f5cfa8', '#e8b48a', '#c68863', '#8d5a3b', '#ffdcc1'];
const PANTS = ['#29366f', '#333c57', '#3b5dc9', '#5d3f2a', '#22263a'];

const SPEED = 60; // logical px / s
const CORRIDOR_X = 216;
const DOOR = { x: 297, y: 47, lane: 54 };

const DESKS = [];
for (const [deskY, seatY, lane] of [[62, 90, 100], [118, 146, 160]]) {
  for (const cx of [30, 82, 134, 186]) {
    DESKS.push({ cx, deskY, seatY, lane, seed: DESKS.length * 7919 + 13, owner: null });
  }
}
const SOFA = [0, 1, 2, 3].map((i) => ({ x: 253 + i * 14, y: 146, lane: 122, sofa: true, owner: null }));
const COFFEE = [0, 1, 2, 3, 4].map((i) => ({ x: 248 + i * 10, y: 60, lane: 68, owner: null }));
const CHAT_PAIRS = [
  [{ x: 52, y: 105, lane: 105 }, { x: 67, y: 105, lane: 105 }],   // left aisle (keeps the wall panels readable)
  [{ x: 104, y: 105, lane: 105 }, { x: 119, y: 105, lane: 105 }], // middle aisle
  [{ x: 230, y: 166, lane: 166 }, { x: 245, y: 166, lane: 166 }], // lounge corner
].map((pair) => pair.map((spot) => ({ ...spot, owner: null })));
const IDLE_POOLS = { coffee: COFFEE, sofa: SOFA };

const rand = (a, b) => a + Math.random() * (b - a);
const randItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

function route(from, to) {
  return [
    { x: from.x, y: from.lane },
    { x: CORRIDOR_X, y: from.lane },
    { x: CORRIDOR_X, y: to.lane },
    { x: to.x, y: to.lane },
    { x: to.x, y: to.y },
  ];
}

function claimSeat(worker) {
  const desk = DESKS.find((d) => !d.owner);
  if (desk) {
    desk.owner = worker;
    return { x: desk.cx, y: desk.seatY, lane: desk.lane, desk };
  }
  const spot = SOFA.find((s) => !s.owner);
  if (spot) {
    spot.owner = worker;
    return spot;
  }
  const h = hash(worker.id);
  return { x: 236 + (h % 70), y: 104 + ((h >>> 8) % 20), lane: 100, standing: true };
}

function releaseSeat(worker) {
  if (worker.seat.desk) worker.seat.desk.owner = null;
  else if (worker.seat.sofa) worker.seat.owner = null;
}

// ================================================================ characters

/** Look derived from a stable key; career level adds accessories (glasses → tie → headphones → suit). */
function lookFor(id, level = 0) {
  const h = hash(id);
  return {
    shirt: pick(SHIRTS, h),
    hair: pick(HAIRS, h >>> 4),
    skin: pick(SKINS, h >>> 8),
    pants: pick(PANTS, h >>> 12),
    tie: level >= 4 ? C.yellow : level >= 2 ? pick([C.red, C.ink, C.blue], h >>> 18) : null,
    glasses: level >= 1,
    headphones: level >= 3,
    suit: level >= 4,
    cap: null,
  };
}

/** Whiteboard spots for plan-mode "meetings". */
const BOARD = [{ x: 153, y: 50, lane: 50, owner: null }, { x: 164, y: 50, lane: 50, owner: null }];

class Person {
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

const WORKING = new Set(['typing', 'terminal', 'reading', 'web', 'planning', 'phone']);

function activityFor(tool) {
  if (/^(Bash|BashOutput|KillShell|KillBash)$/.test(tool)) return 'terminal';
  if (/^(Read|Grep|Glob|LS|NotebookRead)$/.test(tool)) return 'reading';
  if (/^Web/.test(tool)) return 'web';
  if (tool === 'TodoWrite') return 'planning';
  if (tool.startsWith('mcp__')) return 'phone';
  return 'typing';
}

function toolLabel(tool, txt) {
  if (tool === 'Proc') return '';
  if (/^Bash/.test(tool)) return `$ ${txt}`;
  if (/^(Read|NotebookRead)$/.test(tool)) return `📖 ${txt}`;
  if (/^(Grep|Glob|LS)$/.test(tool)) return `🔍 ${txt}`;
  if (/^(Edit|Write|MultiEdit|NotebookEdit)$/.test(tool)) return `✏️ ${txt}`;
  if (/^Web/.test(tool)) return `🌐 ${txt}`;
  if (tool === 'TodoWrite') return '📋 plánuje úkoly';
  if (tool.startsWith('mcp__')) return `☎️ ${txt}`;
  return txt || tool;
}

const GREETINGS = ['Dobré ráno!', 'Ahoj všichni!', 'Jdu na to.', 'Čau!', 'Tak co dneska?'];

/** Activities in which the agent waits for the user – the employee is free to slack off. */
const FREE = new Set(['idle', 'surfing', 'sleeping']);

const IDLE_LINES = {
  coffee: ['Mmm, kafe ☕', 'Třetí dnes…', 'Espresso ☕', 'Kdo zase nedoplnil vodu?'],
  sofa: ['Góól! ⚽', 'Haha 😂', 'Přepni to…', 'Ještě jeden díl', 'Psst!', 'Tohle už jsem viděl'],
  browse: ['lol 😂', 'Kočičí videa 🐱', 'Hmm…', 'To je dobrý', 'Jen jeden článek…'],
  nap: ['Z z z…'],
};

const DIALOGS = [
  ['Viděls ten nový framework?', 'Zase další? 🙄'],
  ['Kdo rozbil build?', 'Já ne!', 'Git blame říká, že ty 😅'],
  ['Jdeme na oběd?', 'Jasně, kam?', 'Vietnamské bistro?', 'Beru! 🍜'],
  ['Deploy v pátek?', 'Nikdy. 😱'],
  ['Tabs nebo spaces?', 'Spaces.', 'Tak to se nebavíme.'],
  ['Došlo kafe…', 'To je krize! ☕'],
  ['Kolik ti zbývá tokenů?', 'Radši se neptej.'],
  ['Máš ten ticket hotový?', 'Skoro…', 'Takže ne. 😄'],
  ['Viděls včera zápas?', 'Jo, bída.', 'Příště to bude lepší ⚽'],
  ['Code review?', 'Až po kafi.'],
  ['Kdo vypil moje mlíko?', '…', '🤐'],
  ['Zítra home office?', 'Jasně 🏠'],
  ['Ten bug v produkci…', 'To je feature!'],
  ['Refaktor?', 'Někdy příště.', 'Jako vždycky 😄'],
  ['Šéf dneska nic nezadává.', 'Psst, ať to nezakřikneš!'],
  ['Kdo napsal ty testy?', 'Nikdo, proto padaj.'],
];

class Worker extends Person {
  constructor(ev) {
    const profile = ev.profile ?? null;
    const key = profile?.key ?? ev.sessionId;
    // A second session in the same project is a colleague with the same name but a different look.
    const twin = [...workers.values()].filter((o) => o.key === key && !o.gone).length;
    const lookKey = twin ? `${key}#${twin}` : key;
    super(lookFor(lookKey, profile?.level ?? 0));
    this.key = key;
    this.lookKey = lookKey;
    this.twin = twin;
    this.profile = profile;
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
    if (!this.profile) return this.project;
    return this.twin ? `${this.profile.name} ${this.twin + 1}` : this.profile.name;
  }

  setProfile(profile) {
    if (!profile) return;
    const oldLevel = this.profile?.level;
    this.profile = profile;
    if (oldLevel !== profile.level) this.look = lookFor(this.lookKey, profile.level);
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

  /** Start an idle behaviour. Desk behaviours: browse, nap, sit. Spot behaviours: coffee, sofa, chat. */
  startIdle(kind, secs, { spot = null, convo = null } = {}) {
    this.stopIdle();
    const until = now() + secs * 1000;
    if (kind === 'browse' || kind === 'nap' || kind === 'sit') {
      this.idle = { kind, until, arrived: true };
      this.activity = kind === 'browse' ? 'surfing' : kind === 'nap' ? 'sleeping' : 'idle';
      this.goDesk();
      return true;
    }
    const target = spot ?? IDLE_POOLS[kind]?.find((s) => !s.owner);
    if (!target) return false;
    this.releaseBoard();
    target.owner = this;
    this.activity = 'idle';
    this.idle = { kind, until, spot: target, convo, arrived: false };
    this.place = 'toSpot';
    this.walkTo(target, () => {
      this.place = 'spot';
      if (!this.idle) return;
      this.idle.arrived = true;
      if (kind === 'coffee') this.say(randItem(IDLE_LINES.coffee), 3);
    });
    return true;
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
    if (this.idle) {
      const { kind, until, convo, arrived } = this.idle;
      if (!convo && t >= until) {
        this.stopIdle();
        this.nextIdleAt = t + rand(1500, 5000);
        return;
      }
      if (arrived && !this.walking && !this.bubble && IDLE_LINES[kind] && Math.random() < dt / 18) {
        this.say(randItem(IDLE_LINES[kind]), 2.5);
      }
      return;
    }
    if (!this.nextIdleAt) this.nextIdleAt = t + rand(2000, 6000);
    if (!this.walking && t >= this.nextIdleAt) {
      this.nextIdleAt = 0;
      pickIdle(this);
    }
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
    this.walkTo(DOOR, () => {
      this.gone = true;
      releaseSeat(this);
    });
  }

  update(dt) {
    this.move(dt);
    if (this.thinkAt && now() >= this.thinkAt) {
      this.thinkAt = 0;
      if (!this.waiting && WORKING.has(this.activity)) this.activity = 'thinking';
    }
    this.tickIdle(dt);
    for (const intern of this.interns) intern.move(dt);
    this.interns = this.interns.filter((i) => !i.gone);
  }
}

// ---- idle behaviour selection & conversations

/** @type {Set<Convo>} */
const convos = new Set();

class Convo {
  constructor(a, b, pair) {
    this.a = a;
    this.b = b;
    this.dialog = randItem(DIALOGS);
    this.idx = 0;
    this.nextAt = 0;
    this.until = now() + rand(18_000, 35_000);
    this.ended = false;
    convos.add(this);
    a.startIdle('chat', 3600, { spot: pair[0], convo: this });
    b.startIdle('chat', 3600, { spot: pair[1], convo: this });
    pair[0].owner = a;
    pair[1].owner = b;
  }

  tick(t) {
    if (this.ended || !this.a.idle?.arrived || !this.b.idle?.arrived) return;
    if (t >= this.until) {
      this.finish();
      return;
    }
    if (t < this.nextAt) return;
    if (this.idx >= this.dialog.length) {
      this.dialog = randItem(DIALOGS);
      this.idx = 0;
      this.nextAt = t + 2500;
      return;
    }
    const speaker = this.idx % 2 === 0 ? this.a : this.b;
    speaker.say(this.dialog[this.idx], 2.4, 'chat');
    speaker.talkingUntil = t + 2400;
    this.idx += 1;
    this.nextAt = t + 2700;
  }

  /** Natural end: both go do something else. */
  finish() {
    this.ended = true;
    convos.delete(this);
    for (const w of [this.a, this.b]) {
      if (w.idle?.convo !== this) continue;
      w.stopIdle();
      w.nextIdleAt = now() + rand(1000, 4000);
    }
  }

  /** One side was called away (work, leaving). */
  end(leaver) {
    if (this.ended) return;
    this.ended = true;
    convos.delete(this);
    const other = leaver === this.a ? this.b : this.a;
    if (other.idle?.convo === this) {
      other.stopIdle();
      other.say('Tak zatím!', 2, 'chat');
      other.nextIdleAt = now() + 2000;
    }
  }
}

function findPartner(w) {
  const candidates = [...workers.values()].filter((o) => o !== w && o.isFree && !o.idle?.convo && !o.walking);
  return candidates.length ? randItem(candidates) : null;
}

function pickIdle(w) {
  const freeFor = now() - (w.freeSince ?? now());
  const options = [
    { kind: 'chat', weight: 3 },
    { kind: 'coffee', weight: 2, secs: [20, 40] },
    { kind: 'sofa', weight: 2, secs: [30, 90] },
    { kind: 'browse', weight: 3, secs: [30, 90] },
    { kind: 'sit', weight: 1, secs: [10, 30] },
    { kind: 'nap', weight: freeFor > 5 * 60_000 ? 3 : 0, secs: [60, 180] },
  ];
  if (strikeActive()) {
    // on strike nobody even pretends to work: no browsing at the desk
    for (const o of options) if (o.kind === 'browse' || o.kind === 'sit') o.weight = 0;
  }
  while (options.length) {
    const total = options.reduce((n, o) => n + o.weight, 0);
    let roll = Math.random() * total;
    const idx = options.findIndex((o) => (roll -= o.weight) < 0);
    const [choice] = options.splice(idx === -1 ? 0 : idx, 1);
    if (choice.weight === 0) continue;
    if (choice.kind === 'chat') {
      const partner = findPartner(w);
      const pair = CHAT_PAIRS.find((p) => !p[0].owner && !p[1].owner);
      if (partner && pair) {
        new Convo(w, partner, pair); // eslint-disable-line no-new
        return;
      }
      continue;
    }
    if (w.startIdle(choice.kind, rand(...choice.secs))) return;
  }
  w.startIdle('sit', 15);
}

class Intern extends Person {
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

  spot() {
    const s = this.boss.seat;
    const [dx, dy] = [[-14, 1], [14, 1], [0, 10]][this.slot];
    return { x: s.x + dx, y: s.y + dy, lane: s.lane };
  }

  leave() {
    this.leaving = true;
    this.arrived = false;
    this.walkTo(DOOR, () => {
      this.gone = true;
    });
  }
}

// ================================================================ state & events

/** @type {Map<string, Worker>} */
const workers = new Map();
const stats = { doneKey: `ai-office:done:${new Date().toISOString().slice(0, 10)}`, done: 0 };
try {
  stats.done = Number(localStorage.getItem(stats.doneKey)) || 0;
} catch { /* storage unavailable */ }

function bumpDone() {
  stats.done += 1;
  try {
    localStorage.setItem(stats.doneKey, String(stats.done));
  } catch { /* storage unavailable */ }
}

function spawn(ev) {
  const w = new Worker(ev);
  workers.set(w.id, w);
  w.enter();
  return w;
}

function handle(ev) {
  if (ev.type === 'meta') {
    const w = workers.get(ev.sessionId);
    if (w) {
      w.project = ev.project;
      w.cwd = ev.cwd;
    }
    return;
  }

  if (ev.type === 'levelUp') {
    const lw = workers.get(ev.sessionId);
    if (lw) {
      lw.setProfile(ev.profile);
      lw.say(`⭐ Povýšení: ${ev.profile.title}!`, 5, 'ok');
      confetti(lw.x, lw.y - 20, 50);
      fanfare();
    }
    return;
  }
  if (ev.type === 'stats') {
    workers.get(ev.sessionId)?.setStats(ev.context, ev.cost);
    return;
  }

  let w = workers.get(ev.sessionId);
  if (ev.type === 'leave') {
    w?.leave();
    return;
  }
  if (w?.leaving) return;
  if (!w) {
    w = spawn(ev);
    if (ev.type === 'join') w.say(pick(GREETINGS, hash(w.id)), 3);
  }
  if (ev.project && !w.project.includes('·')) w.project = ev.project;
  if (ev.profile) w.setProfile(ev.profile);
  if (ev.mode) w.setMode(ev.mode);

  switch (ev.type) {
    case 'error':
      w.lastText = `💥 ${ev.tool}: ${ev.text}`;
      w.work(activityFor(ev.tool));
      w.errorUntil = now() + 3500;
      w.say(`💥 ${ev.text || ev.tool}`, 3.5, 'error');
      buzz();
      break;
    case 'failure':
      w.becomeFree(rand(3000, 6000));
      if (ev.limit) triggerStrike();
      else w.say(`⚠️ API: ${ev.text}`, 5, 'error');
      buzz();
      break;
    case 'prompt':
      w.lastText = ev.text;
      w.work('thinking', `„${ev.text}“`, 5, 'prompt');
      break;
    case 'tool':
      w.lastText = toolLabel(ev.tool, ev.text);
      w.work(activityFor(ev.tool), w.lastText, 3);
      break;
    case 'toolDone':
      w.waiting = false;
      w.thinkAt = now() + 1200;
      if (ev.celebrate) celebrate(w, ev.celebrate);
      break;
    case 'subStart':
      w.work(w.activity === 'idle' || w.activity === 'sleeping' ? 'thinking' : w.activity);
      w.addIntern(ev.text || 'subagent');
      break;
    case 'subStop':
      w.removeIntern();
      break;
    case 'waiting':
      w.work('waiting');
      w.waiting = true;
      w.lastText = ev.text;
      w.say('Potřebuju povolení!', 3600, 'alert');
      ding();
      break;
    case 'done':
      w.becomeFree(rand(4000, 8000));
      w.say('Hotovo ✓', 4, 'ok');
      bumpDone();
      chime();
      break;
    case 'idle':
      if (!w.isFree) w.becomeFree(rand(2000, 5000));
      break;
    case 'notice':
      w.say(ev.text, 4);
      break;
    default:
      break;
  }
}

/** git commit / push celebration: confetti and applause from colleagues with nothing to do. */
function celebrate(w, kind) {
  w.say(kind === 'push' ? '🚀 Push!' : '🎉 Commit!', 3, 'ok');
  confetti(w.x, w.y - 20, kind === 'push' ? 45 : 30);
  pop();
  let delay = 400;
  for (const other of workers.values()) {
    if (other === w || !other.isFree || other.walking) continue;
    setTimeout(() => other.say(randItem(['👏', '👏 Paráda!', '🙌']), 2, 'chat'), delay);
    delay += 350;
  }
}

/** Subscription limit reached (or known to be at 0 %): the office goes on strike until the reset. */
let strikeUntil = 0;

function strikeActive() {
  return Date.now() < strikeUntil || remaining(limits?.fiveHour) === 0 || remaining(limits?.week) === 0;
}

function triggerStrike() {
  const reset = [limits?.fiveHour?.resetsAt, limits?.week?.resetsAt].filter((t) => t && t > Date.now());
  strikeUntil = reset.length ? Math.min(...reset) : Date.now() + 30 * 60_000;
  for (const w of workers.values()) {
    if (w.leaving) continue;
    w.say(randItem(['Došly tokeny! ✊', 'Stávka! ✊', 'Bez tokenů ani ránu!']), 4, 'error');
  }
}

function restore(sessions) {
  for (const s of sessions) {
    const w = new Worker({ sessionId: s.id, source: s.source, cwd: s.cwd, project: s.project, profile: s.profile, mode: s.mode });
    workers.set(w.id, w);
    w.placeAt(w.seat);
    w.place = 'desk';
    w.lastText = s.text || '';
    w.context = s.context;
    w.cost = s.cost;
    w.activity = s.status === 'working' ? activityFor(s.tool || '') : 'idle';
    if (s.waiting) {
      w.activity = 'waiting';
      w.waiting = true;
      w.say('Potřebuju povolení!', 3600, 'alert');
    } else if (s.status !== 'working') {
      w.becomeFree(rand(1000, 6000));
    }
    for (let i = 0; i < s.subagents; i++) w.addIntern('subagent');
    for (const intern of w.interns) {
      intern.placeAt(intern.spot());
      intern.onArrive = null;
      intern.arrived = true;
    }
  }
}

// ================================================================ sound

let audio = null;
let soundOn = true;

/** Plays a short chiptune phrase. Only the main window plays sounds (popover would double them). */
function play(notes, { type = 'square', volume = 0.05, step = 0.12, length = 0.18 } = {}) {
  if (COMPACT || !soundOn) return;
  try {
    audio ??= new AudioContext();
    const t0 = audio.currentTime;
    notes.forEach((freq, i) => {
      const start = t0 + i * step;
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
      osc.connect(gain).connect(audio.destination);
      osc.start(start);
      osc.stop(start + length + 0.02);
    });
  } catch { /* audio unavailable */ }
}

const fanfare = () => play([523, 659, 784, 1047, 784, 1047], { type: 'triangle', volume: 0.07, step: 0.1, length: 0.22 });
const pop = () => play([660, 990], { type: 'triangle', volume: 0.05, step: 0.07, length: 0.12 });
const buzz = () => play([196, 147], { type: 'sawtooth', volume: 0.025, step: 0.14, length: 0.2 });
const ding = () => play([880, 1320]);                                                 // needs permission
const chime = () => play([523, 659, 784, 1047], { type: 'triangle', volume: 0.07, step: 0.09, length: 0.25 }); // task done

// ================================================================ drawing: figures

/**
 * Draw a person with feet at (x, y).
 * pose: { view: 'front'|'back', walking?: number, seated?: bool, arms, animate?, t, headDrop? }
 */
function figure(x, y, look, pose, k = 1) {
  const r = (dx, dy, w, h, c) => R(x + dx * k, y + dy * k, w * k, h * k, c);
  const top = look.suit ? '#2c3352' : look.shirt;
  const sleeve = shade(top, -0.22);
  const back = pose.view === 'back';
  const hd = pose.headDrop || 0;
  const t = pose.t || 0;

  if (!pose.seated) {
    const phase = pose.walking != null ? Math.floor(pose.walking) % 2 : -1;
    const liftA = phase === 0 ? 1 : 0;
    const liftB = phase === 1 ? 1 : 0;
    r(-4, -7, 3, 5 - liftA, look.pants);
    r(1, -7, 3, 5 - liftB, look.pants);
    r(-4, -2 - liftA, 3, 2, C.ink);
    r(1, -2 - liftB, 3, 2, C.ink);
  } else if (pose.view === 'front') {
    r(-4, -7, 8, 3, look.pants);
    r(-4, -4, 3, 3, look.pants);
    r(1, -4, 3, 3, look.pants);
    r(-4, -1, 3, 1, C.ink);
    r(1, -1, 3, 1, C.ink);
  }

  // torso
  r(-5, -15, 10, 8, top);
  r(-5, -8, 10, 1, sleeve);
  if (!back && look.suit) r(-1.5, -15, 3, 6, C.white);
  if (!back && look.tie) r(-0.5, -15, 1.5, 6, look.tie);

  // head
  r(-1, -16 + hd, 2, 1, look.skin);
  if (back) {
    r(-4, -23 + hd, 8, 7, look.hair);
    r(-5, -20 + hd, 1, 2, look.skin);
    r(4, -20 + hd, 1, 2, look.skin);
  } else {
    r(-4, -23 + hd, 8, 7, look.skin);
    r(-4, -24 + hd, 8, 3, look.hair);
    r(-4, -21 + hd, 1, 2, look.hair);
    r(3, -21 + hd, 1, 2, look.hair);
    const blink = (t + (look.skin.charCodeAt(2) % 7)) % 4 < 0.12;
    r(-2, -19 + hd, 1, blink ? 0.3 : 1, C.ink);
    r(1, -19 + hd, 1, blink ? 0.3 : 1, C.ink);
    r(-1, -17 + hd, 2, 0.5, shade(look.skin, -0.35));
    if (look.glasses) {
      r(-3.2, -20 + hd, 3, 2.4, C.ink);
      r(0.2, -20 + hd, 3, 2.4, C.ink);
      r(-2.7, -19.6 + hd, 2, 1.6, '#cfe8ff');
      r(0.7, -19.6 + hd, 2, 1.6, '#cfe8ff');
      r(-2.2, -19.2 + hd, 1, 1, C.ink);
      r(1.2, -19.2 + hd, 1, 1, C.ink);
    }
  }
  if (look.headphones) {
    r(-4.5, -25 + hd, 9, 1, C.ink);
    r(-5.5, -22 + hd, 1.6, 3.5, C.red);
    r(3.9, -22 + hd, 1.6, 3.5, C.red);
  }
  if (look.cap) {
    r(-4, -25 + hd, 8, 2.5, look.cap);
    if (!back) r(-4, -23 + hd, 10, 1, shade(look.cap, -0.25));
  }

  // arms
  const tap = pose.animate ? Math.floor(t * 10) % 2 : 0;
  switch (pose.arms) {
    case 'type':
      r(-7, -20, 2, 6, sleeve);
      r(5, -20, 2, 6, sleeve);
      r(-7, -22 - tap, 2, 2, look.skin);
      r(5, -22 - (pose.animate ? 1 - tap : 0), 2, 2, look.skin);
      break;
    case 'mouse':
      r(-7, -20, 2, 6, sleeve);
      r(-7, -22, 2, 2, look.skin);
      r(5, -19, 3, 5, sleeve);
      r(7, -21 - (Math.floor(t * 2) % 2) * 0.5, 2, 2, look.skin);
      break;
    case 'think':
      r(-7, -15, 2, 7, sleeve);
      r(-7, -8, 2, 2, look.skin);
      r(5, -21, 2, 6, sleeve);
      r(4, -23 + hd, 2, 2, look.skin);
      break;
    case 'raise': {
      const wave = Math.round(Math.sin(t * 8));
      r(-7, -15, 2, 7, sleeve);
      r(-7, -8, 2, 2, look.skin);
      r(5 + wave * 0.5, -31, 2, 16, sleeve);
      r(5 + wave, -34, 2, 3, look.skin);
      break;
    }
    case 'phone':
      r(5, -15, 2, 7, sleeve);
      r(5, -8, 2, 2, look.skin);
      r(-7, -21, 2, 6, sleeve);
      r(-6, -23, 2, 4, C.ink);
      break;
    case 'rest':
      r(-7, -17, 14, 2, sleeve);
      break;
    case 'facepalm':
      r(-7, -21, 2, 6, sleeve);
      r(5, -21, 2, 6, sleeve);
      r(-6, -24 + hd, 2, 2, look.skin);
      r(4, -24 + hd, 2, 2, look.skin);
      break;
    case 'draw': {
      const wx = Math.sin(t * 5) * 1.5;
      const wy = Math.cos(t * 3.7);
      r(-7, -15, 2, 7, sleeve);
      r(-7, -8, 2, 2, look.skin);
      r(5, -27, 2, 12, sleeve);
      r(5 + wx, -30 + wy, 2, 2, look.skin);
      r(5.5 + wx, -32 + wy, 1, 2, C.blue);
      break;
    }
    case 'talk': {
      const g = Math.round(Math.sin(t * 7) * 1.5);
      r(-7, -15, 2, 7, sleeve);
      r(-7, -8, 2, 2, look.skin);
      r(5, -15, 2, 4, sleeve);
      r(6, -13 + g, 2, 2, look.skin);
      break;
    }
    case 'mug':
      r(-7, -15, 2, 7, sleeve);
      r(-7, -8, 2, 2, look.skin);
      r(5, -15, 2, 5, sleeve);
      r(3, -11, 2, 2, look.skin);
      r(1, -13, 3, 4, C.white);
      r(4, -12, 1, 2, C.white);
      if (Math.floor(t * 3) % 2) r(2, -15 - (t * 2) % 2, 1, 1, '#ffffff99');
      break;
    case 'laptop':
      r(-7, -15, 2, 5, sleeve);
      r(5, -15, 2, 5, sleeve);
      r(-6, -14, 12, 5, C.metal);
      r(-1, -12, 2, 1, C.white);
      r(-6, -9, 12, 1, C.metalDark);
      r(-6 + tap * 9, -10, 2, 1.5, look.skin);
      break;
    default:
      r(-7, -15, 2, 7, sleeve);
      r(5, -15, 2, 7, sleeve);
      r(-7, -8, 2, 2, look.skin);
      r(5, -8, 2, 2, look.skin);
  }
}

function chairBack(x, y, occupied) {
  const dy = occupied ? 0 : -3;
  R(x - 7, y - 10 + dy, 14, 7, C.chair);
  R(x - 7, y - 10 + dy, 14, 1, shade(C.chair, 0.2));
  R(x - 1, y - 3 + dy, 2, 3, C.chairDark);
  R(x - 5, y + dy, 10, 1, C.chairDark);
}

const SEATED_ARMS = {
  typing: 'type', terminal: 'type', planning: 'type', reading: 'mouse', web: 'mouse',
  thinking: 'think', waiting: 'raise', phone: 'phone', sleeping: 'rest', idle: 'down', surfing: 'mouse',
};

function drawWorker(w, t) {
  const look = w.look;
  if (w.walking) {
    figure(w.x, w.y, look, { view: w.facing === 'up' ? 'back' : 'front', walking: w.step, arms: 'down', t });
    return;
  }
  const oops = w.errorUntil > now();
  if (w.place === 'board') {
    figure(w.x, w.y, look, { view: 'back', arms: w.waiting ? 'raise' : oops ? 'facepalm' : 'draw', t });
    return;
  }
  if (w.place === 'desk' && w.seat.desk) {
    const animate = ['typing', 'terminal', 'planning'].includes(w.activity);
    figure(w.x, w.y, look, {
      view: 'back', seated: true, arms: oops && !w.waiting ? 'facepalm' : SEATED_ARMS[w.activity] ?? 'down', animate, t,
      headDrop: w.activity === 'sleeping' ? 2 : 0,
    });
    chairBack(w.x, w.y, true);
    return;
  }
  if (w.place === 'desk' && w.seat.sofa) {
    // overflow seat: works on a laptop on the sofa (seen from behind, sofa back drawn over)
    figure(w.x, w.y, look, { view: 'back', seated: true, arms: WORKING.has(w.activity) ? 'type' : 'down', animate: WORKING.has(w.activity), t });
    return;
  }
  if (w.place === 'desk' && w.seat.standing) {
    figure(w.x, w.y, look, { view: 'front', arms: 'laptop', animate: WORKING.has(w.activity), t });
    return;
  }
  if (w.place === 'spot' && w.idle) {
    switch (w.idle.kind) {
      case 'coffee':
        figure(w.x, w.y, look, { view: 'front', arms: 'mug', t });
        return;
      case 'sofa': {
        const laugh = w.bubble && Math.floor(t * 6) % 2 ? -0.5 : 0;
        figure(w.x, w.y + laugh, look, { view: 'back', seated: true, arms: 'down', t });
        return;
      }
      case 'chat':
        figure(w.x, w.y, look, { view: 'front', arms: w.talkingUntil > now() ? 'talk' : 'down', t });
        return;
      default:
        break;
    }
  }
  figure(w.x, w.y, look, { view: 'front', arms: 'down', t });
}

function drawIntern(i, t) {
  if (i.walking) {
    figure(i.x, i.y, i.look, { view: i.facing === 'up' ? 'back' : 'front', walking: i.step, arms: 'down', t }, 0.8);
    return;
  }
  figure(i.x, i.y, i.look, { view: 'front', arms: 'laptop', animate: true, t: t + i.slot }, 0.8);
}

// ================================================================ drawing: desks & screens

function screenActivity(w) {
  if (!w || w.leaving) return 'off';
  if (w.place !== 'desk') return 'sleeping';
  if (w.waiting) return 'waiting';
  return w.activity;
}

function drawScreen(d, act, t) {
  const x = d.cx - 10;
  const y = d.deskY - 11;
  const w = 20;
  const h = 12;
  const tick = Math.floor(t * 5);
  const codeColors = [C.teal, C.yellow, C.purple, C.lime, C.metal, C.orange];

  const codeLines = (speed, bright) => {
    const scroll = Math.floor(t * speed);
    for (let i = 0; i < 5; i++) {
      const n = d.seed + scroll + i;
      const indent = Math.floor(noise(n * 3) * 3) * 2;
      const len = i === 4 && speed > 0 ? 2 + (tick % 10) : 3 + Math.floor(noise(n) * 11);
      const color = codeColors[n % codeColors.length];
      R(x + 4 + indent, y + 1.5 + i * 2, Math.min(len, w - 5 - indent), 1, bright ? color : shade(color, -0.55));
    }
  };

  switch (act) {
    case 'typing':
    case 'phone':
      R(x, y, w, h, '#1e2233');
      R(x, y, 3, h, C.trim);
      codeLines(act === 'typing' ? 1.5 : 0.4, true);
      break;
    case 'planning': {
      R(x, y, w, h, '#e8e6d9');
      const notes = [C.yellow, C.lime, C.orange, C.teal, '#ff9ec4'];
      for (let i = 0; i < 6; i++) {
        const col = i % 3;
        const row = Math.floor(i / 3);
        if ((i + tick) % 9 === 0) continue;
        R(x + 1.5 + col * 6.5, y + 1.5 + row * 5, 4, 4, notes[(i + d.seed) % notes.length]);
      }
      break;
    }
    case 'terminal': {
      R(x, y, w, h, '#0d1117');
      const scroll = Math.floor(t * 4);
      for (let i = 0; i < 5; i++) {
        const n = d.seed * 3 + scroll + i;
        R(x + 1, y + 1.5 + i * 2, 1, 1, C.lime);
        R(x + 3, y + 1.5 + i * 2, 2 + Math.floor(noise(n) * 14), 1, i === 4 ? C.white : C.green);
      }
      if (tick % 2) R(x + 18, y + 9.5, 1, 1, C.white);
      break;
    }
    case 'reading': {
      R(x, y, w, h, C.paper);
      const scroll = Math.floor(t * 1.2);
      for (let i = 0; i < 5; i++) {
        const n = d.seed + scroll + i;
        R(x + 2, y + 1.5 + i * 2, 4 + Math.floor(noise(n) * 12), 1, (n % 4 === 0) ? C.metalDark : '#9aa3b5');
      }
      R(x + w - 1.5, y + 1 + (scroll % 8), 1, 3, C.metalDark);
      break;
    }
    case 'web':
      R(x, y, w, h, C.white);
      R(x, y, w, 2, C.blue);
      R(x + 2, y + 3, 16, 2, '#d0d6e2');
      R(x + 2, y + 6, 6, 5, pick([C.orange, C.purple, C.green], Math.floor(t / 2)));
      R(x + 10, y + 6, 8, 1, '#9aa3b5');
      R(x + 10, y + 8, 6, 1, '#9aa3b5');
      R(x + 10, y + 10, 7, 1, '#9aa3b5');
      break;
    case 'thinking': {
      R(x, y, w, h, '#1e2233');
      R(x, y, 3, h, C.trim);
      codeLines(0, false);
      const spin = tick % 4;
      R(x + 9 + (spin === 1 ? 2 : spin === 3 ? -2 : 0), y + 5 + (spin === 0 ? -2 : spin === 2 ? 2 : 0), 2, 2, C.white);
      break;
    }
    case 'waiting': {
      R(x, y, w, h, '#1e2233');
      codeLines(0, false);
      const blink = tick % 4 < 2;
      R(x + 2, y + 2, 16, 8, C.ink);
      R(x + 2.5, y + 2.5, 15, 7, blink ? C.yellow : C.orange);
      R(x + 4, y + 4, 9, 1, C.ink);
      R(x + 4, y + 7, 4, 1.5, C.green);
      R(x + 10, y + 7, 4, 1.5, C.red);
      break;
    }
    case 'surfing':
      drawFunScreen(x, y, w, h, Math.floor(t / 7 + d.seed) % 3, t);
      break;
    case 'idle':
      R(x, y, w, h, '#1e2233');
      R(x, y, 3, h, C.trim);
      codeLines(0, false);
      break;
    case 'sleeping': {
      R(x, y, w, h, '#0b0d18');
      const px = Math.abs(((t * 6) % 34) - 17);
      const py = Math.abs(((t * 4) % 18) - 9);
      R(x + 1 + px, y + 1 + py, 2, 1, codeColors[Math.floor(t) % codeColors.length]);
      break;
    }
    default:
      R(x, y, w, h, '#151827');
      R(x + 2, y + 1, 1, 4, '#262b44');
      R(x + 4, y + 1, 1, 2, '#262b44');
  }
}

/** Procrastination content: 0 = video, 1 = social feed, 2 = cat. */
function drawFunScreen(x, y, w, h, kind, t) {
  if (kind === 0) {
    R(x, y, w, h, C.ink);
    R(x + 1, y + 1, w - 2, h - 4, '#29366f');
    const bx = x + 2 + Math.abs(((t * 8) % 28) - 14);
    R(bx, y + 3 + Math.abs(Math.sin(t * 4)) * -1.5 + 1.5, 3, 3, C.yellow);
    R(x + 1, y + h - 2, w - 2, 1, C.chair);
    R(x + 1, y + h - 2, ((t * 1.5) % (w - 2)), 1, C.red);
    return;
  }
  if (kind === 1) {
    R(x, y, w, h, C.white);
    const scroll = (t * 3) % 8;
    for (let i = -1; i < 3; i++) {
      const py = y + 1 + i * 8 - scroll + 8;
      if (py < y || py > y + h - 2) continue;
      R(x + 2, py, 6, Math.min(5, y + h - py), pick([C.orange, C.purple, C.blue, C.green], i + Math.floor(t / 2.7)));
      R(x + 10, py + 1, 8, 1, '#9aa3b5');
      R(x + 10, py + 3, 5, 1, '#9aa3b5');
    }
    return;
  }
  // cat
  R(x, y, w, h, '#ff9ec4');
  const tail = Math.floor(t * 4) % 2;
  R(x + 6, y + 5, 8, 5, C.orange);       // body
  R(x + 11, y + 2, 5, 4, C.orange);      // head
  R(x + 11, y + 1, 1, 1, C.orange);      // ears
  R(x + 15, y + 1, 1, 1, C.orange);
  R(x + 12, y + 3, 1, Math.floor(t * 1.3) % 5 ? 1 : 0.3, C.ink);
  R(x + 14, y + 3, 1, Math.floor(t * 1.3) % 5 ? 1 : 0.3, C.ink);
  R(x + 4, y + 3 + tail, 2, 3, C.orange); // tail
  R(x + 7, y + 10, 1, 1, C.orange);
  R(x + 12, y + 10, 1, 1, C.orange);
}

/** Lounge TV on a low cabinet; switches channels while someone watches. */
function drawTV(t, on) {
  R(252, 104, 48, 9, C.deskEdge);
  R(254, 106, 20, 5, C.deskFront);
  R(276, 106, 22, 5, C.deskFront);
  R(253, 113, 2, 2, C.deskLeg);
  R(297, 113, 2, 2, C.deskLeg);
  R(273, 101, 6, 3, C.ink);
  R(256, 82, 40, 20, C.ink);
  const x = 258;
  const y = 84;
  const w = 36;
  const h = 16;
  if (!on) {
    R(x, y, w, h, '#151827');
    R(x + 3, y + 2, 1, 6, '#262b44');
    R(x + 6, y + 2, 1, 3, '#262b44');
    return;
  }
  const channel = Math.floor(t / 8) % 3;
  if (channel === 0) { // football
    for (let i = 0; i < 6; i++) R(x + i * 6, y, 6, h, i % 2 ? '#38b764' : '#2e9e56');
    R(x + w / 2 - 0.5, y, 1, h, C.white);
    R(x, y + h / 2 - 0.5, 2, 1, C.white);
    const bx = x + 2 + Math.abs(((t * 10) % 64) - 32);
    const by = y + 3 + Math.abs(((t * 7) % 20) - 10);
    R(bx, by, 1.5, 1.5, C.white);
    R(bx - 4, by + 2, 2, 3, C.red);
    R(x + w - 4 - Math.abs(((t * 6) % 20) - 10), y + 6, 2, 3, C.blue);
  } else if (channel === 1) { // cartoon
    R(x, y, w, h, C.teal);
    R(x, y + h - 4, w, 4, C.lime);
    R(x + w - 7, y + 2, 4, 4, C.yellow);
    const jump = Math.abs(Math.sin(t * 4)) * 5;
    R(x + 10 + Math.sin(t) * 6, y + h - 9 - jump, 6, 5, C.orange);
    R(x + 11 + Math.sin(t) * 6, y + h - 8 - jump, 1, 1, C.ink);
    R(x + 14 + Math.sin(t) * 6, y + h - 8 - jump, 1, 1, C.ink);
  } else { // news
    R(x, y, w, h, '#29366f');
    R(x + 14, y + 3, 8, 7, '#f5cfa8');
    R(x + 14, y + 2, 8, 2, C.ink);
    R(x + 12, y + 10, 12, 4, C.ink);
    R(x + 17, y + 10, 2, 3, C.red);
    R(x, y + h - 3, w, 3, C.red);
    const off = (t * 10) % 12;
    for (let i = 0; i < 4; i++) R(x + i * 12 - off, y + h - 2, 7, 1, C.white);
  }
  R(x, y, w, 1, '#ffffff22');
}

/** Sofa seen from behind (faces the TV); drawn over whoever sits on it. */
function drawSofa() {
  R(242, 136, 66, 11, C.sofa);
  R(242, 136, 66, 1.5, shade(C.sofa, 0.25));
  for (let i = 1; i < 4; i++) R(242 + i * 16.5, 138, 0.6, 8, shade(C.sofa, -0.2));
  R(239, 134, 5, 14, shade(C.sofa, -0.15));
  R(306, 134, 5, 14, shade(C.sofa, -0.15));
  R(244, 147, 2, 2, C.deskLeg);
  R(304, 147, 2, 2, C.deskLeg);
}

function drawDesk(d, t) {
  const { cx, deskY: y } = d;
  const w = d.owner;
  const waiting = w?.waiting && !w.leaving;

  R(cx - 20, y, 40, 8, C.deskTop);
  if (waiting && Math.floor(t * 3) % 2) R(cx - 13, y - 14, 26, 18, C.red);
  R(cx - 11, y - 12, 22, 14, C.frame);
  drawScreen(d, screenActivity(w), t);
  R(cx - 2, y + 2, 4, 2, C.metalDark);
  R(cx - 7, y + 4, 14, 2.5, C.key);
  for (let i = 0; i < 6; i++) R(cx - 6 + i * 2.2, y + 4.5, 1.2, 0.6, C.metalDark);
  R(cx + 10, y + 4, 2, 2.5, C.key);
  // mug
  R(cx - 17, y + 1, 3, 4, C.white);
  R(cx - 14, y + 2, 1, 2, C.white);
  R(cx - 17, y + 1, 3, 1, ['#5d3f2a', C.red, C.blue][d.seed % 3]);
  // fuller context → more coffee mugs piling up
  const mugs = w?.context >= 50 ? Math.min(3, 1 + Math.floor((w.context - 50) / 17)) : 0;
  [[cx - 13.5, y + 2.5], [cx - 18, y + 5], [cx + 14, y + 4.5]].slice(0, mugs).forEach(([mx, my], i) => {
    R(mx, my, 2.5, 3, C.white);
    R(mx, my, 2.5, 0.8, [C.orange, C.purple, C.green][i]);
  });
  // tool failure → smoke from the monitor
  if (w && w.errorUntil > now()) {
    for (let i = 0; i < 4; i++) {
      const p = (t * 1.1 + i / 4) % 1;
      const size = 1.5 + p * 3;
      R(cx - 6 + i * 4 + Math.sin(t * 3 + i) * 1.5 - size / 2, y - 13 - p * 12, size, size * 0.8, `rgba(148,163,184,${0.8 * (1 - p)})`);
    }
  }
  // occasional desk plant
  if (d.seed % 3 === 1) {
    R(cx + 13, y - 1, 5, 4, C.pot);
    R(cx + 12, y - 5, 2, 4, C.plant);
    R(cx + 15, y - 7, 2, 6, C.plantDark);
    R(cx + 17, y - 4, 2, 3, C.plant);
  }
  // front panel
  R(cx - 20, y + 8, 40, 9, C.deskFront);
  R(cx - 20, y + 8, 40, 1, C.deskEdge);
  R(cx + 6, y + 10, 11, 5, C.deskEdge);
  R(cx + 10, y + 12, 3, 1, C.deskTop);
  R(cx - 19, y + 17, 2, 3, C.deskLeg);
  R(cx + 17, y + 17, 2, 3, C.deskLeg);
}

// ================================================================ drawing: room

/** Test hook: set to an hour (0–23) to preview day/night. */
let FORCE_HOUR = null;
const hourOf = (date) => (typeof FORCE_HOUR === 'number' ? FORCE_HOUR : date.getHours());

/** Plan-mode diagram on the whiteboard, drawn step by step. */
function drawDiagram(x, y, t) {
  const parts = [
    () => R(x + 3, y + 3, 9, 5, C.blue),
    () => R(x + 12, y + 5, 5, 1, C.ink),
    () => R(x + 17, y + 3, 9, 5, C.green),
    () => R(x + 21, y + 8, 1, 4, C.ink),
    () => R(x + 17, y + 12, 9, 5, C.orange),
    () => R(x + 26, y + 5, 4, 1, C.ink),
    () => R(x + 30, y + 3, 6, 5, C.purple),
    () => { R(x + 4, y + 12, 9, 1, C.metal); R(x + 4, y + 15, 7, 1, C.metal); R(x + 4, y + 18, 10, 1, C.metal); },
  ];
  const shown = Math.floor((t * 0.8) % (parts.length + 4));
  parts.slice(0, Math.min(shown + 1, parts.length)).forEach((draw) => draw());
}

/** Employee-of-the-week portrait (data from the stats module). */
let employeeOfWeek = null;

function drawPortrait(t) {
  R(4, 6, 20, 26, '#c8a24a');
  R(5, 7, 18, 24, '#a8842e');
  R(6, 8, 16, 18, '#29366f');
  if (employeeOfWeek) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(OX + 6 * S, OY + 8 * S, 16 * S, 18 * S);
    ctx.clip();
    figure(14, 40, lookFor(employeeOfWeek.key, employeeOfWeek.level), { view: 'front', arms: 'down', t }, 1.25);
    ctx.restore();
  } else {
    text('?', 14, 20, 7, C.metal);
  }
  R(6, 26, 16, 4, '#a8842e');
  text('★ TÝDNE', 14, 29.3, 2.4, C.yellow);
}

function skyFor(hour) {
  if (hour >= 7 && hour < 17) return { top: '#73eff7', bottom: '#41a6f6', city: '#5d6dd8', night: false };
  if (hour >= 17 && hour < 20) return { top: '#ef7d57', bottom: '#b55088', city: '#5d275d', night: false };
  if (hour >= 5 && hour < 7) return { top: '#f4d35e', bottom: '#ef7d57', city: '#5d275d', night: false };
  return { top: '#1a1c2c', bottom: '#29366f', city: '#14162a', night: true };
}

function drawWindow(x, y, w, h, sky, t) {
  R(x - 2, y - 2, w + 4, h + 4, C.trim);
  R(x, y, w, h / 2, sky.top);
  R(x, y + h / 2, w, h / 2, sky.bottom);
  if (sky.night) {
    for (let i = 0; i < 6; i++) {
      if ((Math.floor(t * 0.7) + i) % 5) R(x + 2 + noise(x + i) * (w - 4), y + 1 + noise(x * i + 3) * 8, 0.6, 0.6, C.white);
    }
  }
  let bx = x;
  let i = 0;
  while (bx < x + w) {
    const bw = 5 + Math.floor(noise(x + i * 17) * 6);
    const bh = 6 + Math.floor(noise(x * 3 + i) * 12);
    const bwClamped = Math.min(bw, x + w - bx);
    R(bx, y + h - bh, bwClamped, bh, sky.city);
    if (sky.night) {
      for (let wy = y + h - bh + 2; wy < y + h - 1; wy += 3) {
        for (let wx = bx + 1; wx < bx + bwClamped - 1; wx += 2) {
          if (noise(wx * 31 + wy * 7) > 0.6) R(wx, wy, 1, 1, C.yellow);
        }
      }
    }
    bx += bw;
    i += 1;
  }
  R(x + w / 2 - 0.5, y, 1, h, C.trim);
  R(x, y + h / 2 - 0.5, w, 1, C.trim);
  R(x - 3, y + h + 2, w + 6, 2, C.wallLight);
}

/** Subscription usage { fiveHour: {used, resetsAt}, week: {...}, ts } from the main process. */
let limits = null;

/** Remaining % of a window; once its reset time has passed the window is fresh again. */
function remaining(win) {
  if (!win) return null;
  if (win.resetsAt && Date.now() >= win.resetsAt) return 100;
  return Math.round(100 - win.used);
}

const fuelColor = (left) => (left == null ? C.metalDark : left > 50 ? C.green : left > 20 ? C.yellow : C.red);

/** Wall panel under the clock: remaining % of the 5h window and the week. */
function drawLimits(x, y) {
  const w = 28;
  const h = 15;
  R(x, y, w, h, C.trim);
  R(x + 1, y + 1, w - 2, h - 2, '#0d1117');
  const row = (label, win, ry) => {
    const left = remaining(win);
    text(label, x + 2, ry + 2.6, 2.6, C.metal, 'left');
    R(x + 8, ry, 11, 3, C.chair);
    if (left != null) R(x + 8, ry, (11 * left) / 100, 3, fuelColor(left));
    text(left == null ? '–' : `${left}%`, x + w - 1.5, ry + 2.6, 2.6, fuelColor(left), 'right');
  };
  row('5h', limits?.fiveHour, y + 3);
  row('7d', limits?.week, y + 9);
}

const fmtReset = (ms) => {
  if (!ms) return '';
  const d = new Date(ms);
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay ? `${pad2(d.getHours())}:${pad2(d.getMinutes())}` : `${WEEKDAYS[d.getDay()]} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

const WEEKDAYS = ['ne', 'po', 'út', 'st', 'čt', 'pá', 'so'];
const pad2 = (n) => String(n).padStart(2, '0');

/** Digital wall clock: HH:MM:SS + weekday and date, LED style. (x, y) = top-left corner. */
function drawClock(x, y, date) {
  const w = 28;
  const h = 15;
  R(x, y, w, h, C.trim);
  R(x + 1, y + 1, w - 2, h - 2, '#0d1117');
  R(x + 1, y + 1, w - 2, 0.5, '#262b44');
  const time = `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
  const day = `${WEEKDAYS[date.getDay()]} ${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
  text(time, x + w / 2, y + 7, 4, C.red);
  text(day, x + w / 2, y + 12.3, 2.6, C.teal);
}

function personNearDoor() {
  for (const w of workers.values()) {
    if (Math.hypot(w.x - DOOR.x, w.y - DOOR.y) < 12) return true;
    if (w.interns.some((i) => Math.hypot(i.x - DOOR.x, i.y - DOOR.y) < 12)) return true;
  }
  return false;
}

function drawRoom(t, date) {
  // floor
  R(0, 46, W, H - 46, C.floorA);
  for (let row = 0, y = 46; y < H; row++, y += 6) {
    if (row % 2) R(0, y, W, 6, C.floorB);
    R(0, y, W, 0.5, C.seam);
    for (let x = (row * 23) % 48; x < W; x += 48) R(x, y, 0.5, 6, C.seam);
  }
  // lounge rug
  R(226, 92, 90, 78, C.rugEdge);
  R(228, 94, 86, 74, C.rug);
  for (let i = 0; i < 6; i++) R(232 + i * 14, 98, 6, 1, C.rugEdge);

  // wall
  R(0, 0, W, 46, C.wall);
  R(0, 0, W, 2, C.trim);
  R(0, 30, W, 1, C.wallLight);
  R(0, 44, W, 2, C.trim);

  const sky = skyFor(hourOf(date));
  drawWindow(30, 8, 50, 20, sky, t);
  drawWindow(90, 8, 50, 20, sky, t);
  drawPortrait(t);

  // whiteboard: today's finished tasks / plan-mode meeting diagram / strike notice
  R(147, 7, 40, 26, C.metalDark);
  R(148, 8, 38, 24, C.white);
  const meeting = [...workers.values()].some((w) => w.place === 'board');
  if (strikeActive()) {
    text('STÁVKA', 167, 17, 5.5, C.red);
    text('došly tokeny', 167, 23, 3, C.metalDark);
    text(`do ${fmtReset(strikeUntil > Date.now() ? strikeUntil : limits?.fiveHour?.resetsAt) || '?'}`, 167, 28.5, 3, C.metalDark);
  } else if (meeting) {
    drawDiagram(148, 8, t);
    text(`✓ ${stats.done}`, 184.5, 30.5, 2.6, C.green, 'right');
  } else {
    text('HOTOVO DNES', 167, 14, 3.2, C.metalDark);
    text(String(stats.done), 167, 26, 9, C.green);
  }
  R(149, 33, 36, 1.5, C.metal);
  R(155, 32, 3, 1, C.red);
  R(160, 32, 3, 1, C.blue);

  drawClock(190, 9, date);
  drawLimits(190, 27);

  // water cooler
  R(220, 24, 8, 22, C.white);
  R(220, 44, 8, 2, C.metal);
  R(221, 13, 6, 11, '#73eff7cc');
  R(222, 14, 1.5, 8, '#ffffff88');
  R(222, 30, 2, 2, C.blue);
  R(225, 30, 2, 2, C.red);

  // kitchenette counter
  R(232, 30, 54, 3, C.paper);
  R(232, 33, 54, 13, C.deskEdge);
  for (let i = 0; i < 3; i++) {
    R(234 + i * 18, 35, 16, 9, C.deskFront);
    R(240 + i * 18, 39, 4, 1, C.deskTop);
  }
  // coffee machine
  R(236, 16, 12, 14, C.ink);
  R(237, 17, 10, 4, C.chair);
  R(245, 18, 1.5, 1.5, Math.floor(t * 2) % 2 ? C.red : C.green);
  R(240, 22, 4, 2, C.metal);
  R(240, 26, 4, 4, C.white);
  // microwave
  R(254, 21, 16, 9, C.metal);
  R(255, 22, 10, 7, C.ink);
  R(267, 23, 2, 1, C.green);
  // fruit bowl
  R(274, 27, 9, 3, C.white);
  R(275, 25, 2.5, 2.5, C.red);
  R(278, 25, 2.5, 2.5, C.yellow);
  R(280, 26, 2.5, 2.5, C.lime);

  // door
  R(288, 12, 20, 34, C.trim);
  if (personNearDoor()) {
    R(290, 14, 16, 32, C.night);
    R(290, 14, 3, 32, C.deskEdge);
  } else {
    R(290, 14, 16, 32, C.deskEdge);
    R(292, 16, 12, 12, C.deskFront);
    R(292, 30, 12, 13, C.deskFront);
    R(302, 29, 2, 2, C.yellow);
  }
  text('EXIT', 298, 10.5, 3, C.lime);

  // plants
  plant(6, 52);
  plant(312, 172);
  plant(220, 178);

  // lounge: TV (sofa is depth-sorted in front of its sitters)
  const watching = [...workers.values()].some((w) => w.idle?.kind === 'sofa' && w.idle.arrived);
  drawTV(t, watching);
  // floor lamp
  R(309, 96, 2, 26, C.metalDark);
  R(305, 92, 10, 5, C.yellow);
  R(306, 122, 8, 2, C.metalDark);
}

function plant(x, y) {
  R(x - 4, y - 7, 8, 7, C.pot);
  R(x - 4, y - 7, 8, 1.5, shade(C.pot, 0.2));
  R(x - 5, y - 14, 3, 7, C.plant);
  R(x - 1, y - 18, 3, 11, C.plantDark);
  R(x + 2, y - 15, 3, 8, C.plant);
  R(x - 3, y - 11, 2, 4, C.plantDark);
}

// ================================================================ drawing: overlay

const BUBBLE_STYLE = {
  info: { bg: C.white, fg: C.ink },
  prompt: { bg: '#fff5c2', fg: C.ink },
  alert: { bg: C.red, fg: C.white },
  ok: { bg: C.green, fg: C.white },
  chat: { bg: '#d6f0ff', fg: C.ink },
  error: { bg: C.orange, fg: C.white },
};

function bubble(x, bottom, str, kind = 'info', size = 4) {
  const style = BUBBLE_STYLE[kind] ?? BUBBLE_STYLE.info;
  const label = truncate(str, kind === 'prompt' ? 30 : 24);
  const pad = 2;
  const w = Math.ceil(measure(label, size)) + pad * 2;
  const h = size + pad * 2 - 0.5;
  const bx = clamp(Math.round(x - w / 2), 1, W - w - 1);
  const by = Math.round(bottom - h - 2);
  R(bx - 0.5, by - 0.5, w + 1, h + 1, C.ink);
  R(bx, by, w, h, style.bg);
  R(x - 1.5, by + h, 3, 1.5, C.ink);
  R(x - 1, by + h, 2, 1, style.bg);
  text(label, bx + w / 2, by + pad + size * 0.82, size, style.fg);
}

function nameTag(x, y, label, color) {
  const size = 3;
  const str = truncate(label, 22);
  const w = Math.ceil(measure(str, size)) + 5;
  const bx = clamp(Math.round(x - w / 2), 1, W - w - 1);
  R(bx, y, w, 4.5, 'rgba(20,22,42,0.85)');
  R(bx + 1, y + 1.5, 1.5, 1.5, color);
  text(str, bx + 3 + (w - 3) / 2, y + 3.6, size, C.white);
}

function drawOverlay(t) {
  const list = [...workers.values()].filter((w) => !w.gone);
  // waiting bubbles last so they stay on top
  list.sort((a, b) => Number(a.waiting) - Number(b.waiting));

  for (const w of list) {
    const atDesk = w.place === 'desk' && !w.walking && w.seat.desk;
    const anchorY = atDesk ? w.seat.desk.deskY - 14 : w.y - 27;

    const onSofa = w.idle?.kind === 'sofa' || (w.seat.sofa && w.place === 'desk');
    if (!w.walking && !onSofa) {
      const project = w.source !== 'Claude' && !w.project.includes('·') ? `${w.source} · ${w.project}` : w.project;
      const label = w.profile ? `${w.displayName} · ${project}` : project;
      const convo = w.idle?.convo;
      nameTag(w.x, w.y + (convo && convo.b === w ? 7.5 : 2.5), label, w.look.shirt);
    }

    // full context → sweating
    if (atDesk && w.context >= 75 && (WORKING.has(w.activity) || w.activity === 'thinking')) {
      const p = (t * 1.4) % 1;
      R(w.x + 5.5, w.y - 22 + p * 6, 1, 1.5, `rgba(115,239,247,${1 - p})`);
      if (w.context >= 90) R(w.x - 6.5, w.y - 21 + ((p + 0.5) % 1) * 6, 1, 1.5, `rgba(115,239,247,${1 - ((p + 0.5) % 1)})`);
    }

    // on strike: picket sign
    if (strikeActive() && w.isFree && !w.walking && (w.place === 'spot' && w.idle?.kind !== 'sofa')) {
      R(w.x + 6.5, w.y - 30, 0.8, 16, C.deskEdge);
      R(w.x + 0.5, w.y - 37, 14, 7, C.ink);
      R(w.x + 1, w.y - 36.5, 13, 6, C.white);
      text('STÁVKA', w.x + 7.5, w.y - 32.3, 2.3, C.red);
    }

    if (w.extraInterns > 0 && atDesk) text(`+${w.extraInterns} 🧑‍🎓`, w.x + 24, w.y - 2, 3.5, C.lime);

    if (!w.bubble && atDesk) {
      if (w.activity === 'sleeping') {
        const p = (t * 0.8) % 1;
        text('z', w.x + 6 + p * 3, w.y - 22 - p * 6, 3 + p * 2, `rgba(244,244,244,${1 - p})`);
      } else if (w.activity === 'thinking') {
        const n = Math.floor(t * 3) % 4;
        for (let i = 0; i < n; i++) R(w.x - 3 + i * 2.5, w.y - 27, 1.5, 1.5, C.white);
      }
    }

    for (const i of w.interns) {
      if (i.bubble) bubble(i.x, i.y - 22, i.bubble.text, i.bubble.kind, 3.4);
    }
    if (w.bubble) {
      const kind = w.bubble.kind;
      const flash = kind === 'alert' && Math.floor(t * 2) % 2 === 0;
      bubble(w.x, anchorY, w.bubble.text, flash ? 'info' : kind);
    }
  }
}

let dim = 1;
function drawEmptyOverlay(dt) {
  const target = workers.size === 0 ? 1 : 0;
  dim += (target - dim) * Math.min(1, dt * 2);
  if (dim < 0.01) return;
  ctx.fillStyle = `rgba(8,10,24,${0.55 * dim})`;
  ctx.fillRect(OX, OY, W * S, H * S);
  ctx.globalAlpha = dim;
  text('Kancelář je prázdná', W / 2, H / 2 - 2, 8, C.white);
  text('Spusť Claude Code a někdo přijde do práce', W / 2, H / 2 + 8, 4, C.metal);
  ctx.globalAlpha = 1;
}

// ================================================================ main loop

function draw(t, dt) {
  const date = new Date();
  ctx.fillStyle = C.ink;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.beginPath();
  ctx.rect(OX, OY, W * S, H * S);
  ctx.clip();

  drawRoom(t, date);

  // depth-sorted scene objects
  const items = [];
  for (const d of DESKS) {
    items.push({ y: d.deskY + 17, draw: () => drawDesk(d, t) });
    if (!d.owner || d.owner.place !== 'desk' || d.owner.walking) {
      items.push({ y: d.seatY - 0.1, draw: () => chairBack(d.cx, d.seatY, false) });
    }
  }
  items.push({ y: 147, draw: drawSofa });
  for (const w of workers.values()) {
    if (!w.gone) items.push({ y: w.y, draw: () => drawWorker(w, t) });
    for (const i of w.interns) items.push({ y: i.y + 0.2, draw: () => drawIntern(i, t) });
  }
  items.push(...lifeItems(t));
  items.sort((a, b) => a.y - b.y);
  for (const item of items) item.draw();

  drawLighting(t, date);
  drawParticles();
  drawOverlay(t);
  drawLifeOverlay(t);
  drawEmptyOverlay(dt);
  ctx.restore();
}

let last = now();
function frame() {
  const ts = now();
  const dt = Math.min(0.1, (ts - last) / 1000);
  last = ts;
  for (const convo of convos) convo.tick(ts);
  updateLife(dt);
  for (const [id, w] of workers) {
    w.update(dt);
    if (w.gone && w.interns.length === 0) workers.delete(id);
  }
  draw(ts / 1000, dt);
  requestAnimationFrame(frame);
}

// ================================================================ status bar & tooltip

let port = 4747;

function span(textContent, cls) {
  const el = document.createElement(cls === 'b' ? 'b' : 'span');
  if (cls && cls !== 'b') el.className = cls;
  el.textContent = textContent;
  return el;
}

function updateBar() {
  const list = [...workers.values()].filter((w) => !w.leaving);
  const busy = list.filter((w) => WORKING.has(w.activity) || w.activity === 'thinking').length;
  const interns = list.reduce((n, w) => n + w.interns.filter((i) => !i.leaving).length + w.extraInterns, 0);
  const waiting = list.filter((w) => w.waiting);

  const left = [];
  const dot = document.createElement('span');
  dot.className = list.length ? 'dot' : 'dot off';
  left.push(dot, span(String(list.length), 'b'), span(' v kanceláři · '), span(String(busy), 'b'), span(' pracuje'));
  if (interns) left.push(span(' · '), span(String(interns), 'b'), span(' stážistů'));
  if (waiting.length) left.push(span(` · ❗ čeká: ${waiting.map((w) => w.project).join(', ')}`, 'warn'));
  barLeft.replaceChildren(...left);
  const right = [];
  if (limits) {
    const part = (label, win) => {
      const left = remaining(win);
      if (left == null) return;
      const el = span(`${label} ${left} %`, 'b');
      el.style.color = fuelColor(left);
      right.push(span(right.length ? ' · ' : '⛽ zbývá '), el);
      const reset = win.resetsAt && Date.now() < win.resetsAt ? fmtReset(win.resetsAt) : '';
      if (reset && !COMPACT) right.push(span(` (reset ${reset})`));
    };
    part('5h', limits.fiveHour);
    part('týden', limits.week);
    right.push(span(' · '));
  }
  right.push(span(COMPACT ? `✓ ${stats.done}` : `hotovo dnes: ${stats.done}`));
  barRight.replaceChildren(...right);
}

function hitTest(lx, ly) {
  const hit = (p, k = 1) => lx >= p.x - 7 * k && lx <= p.x + 7 * k && ly >= p.y - 26 * k && ly <= p.y + 6;
  for (const w of workers.values()) {
    if (w.gone) continue;
    for (const i of w.interns) if (hit(i, 0.8)) return { intern: i };
    if (hit(w)) return { worker: w };
  }
  if (catHit(lx, ly)) return { cat: true };
  if (lx >= 147 && lx <= 187 && ly >= 7 && ly <= 34) return { board: true };
  if (lx >= 4 && lx <= 24 && ly >= 6 && ly <= 32) return { portrait: true };
  return null;
}

const ACTIVITY_CZ = {
  typing: 'píše kód', terminal: 'v terminálu', reading: 'čte / hledá', web: 'na webu', planning: 'plánuje',
  phone: 'volá (MCP)', thinking: 'přemýšlí', waiting: 'čeká na povolení', sleeping: 'dřímá', idle: 'volno',
  surfing: 'surfuje po internetu',
};
const IDLE_CZ = { coffee: 'pije kafe', sofa: 'kouká na televizi', chat: 'klábosí', browse: 'surfuje po internetu', nap: 'dřímá', sit: 'odpočívá' };

function workerInfo(w) {
  const interns = w.interns.filter((i) => !i.leaving).length + w.extraInterns;
  const p = w.profile;
  const state = w.waiting ? 'čeká na povolení'
    : w.place === 'board' || w.place === 'toBoard' ? 'porada u tabule (plan mód)'
      : w.idle ? `pauza – ${IDLE_CZ[w.idle.kind]}` : ACTIVITY_CZ[w.activity] ?? w.activity;
  const xp = p ? `${p.title} · ${p.xp} XP${p.nextXp ? ` (další úroveň ${p.nextXp})` : ''} · hotovo celkem ${p.done}` : '';
  return [
    p ? `${w.displayName} – ${w.project}  (${w.source})` : `${w.project}  (${w.source})`,
    xp,
    w.cwd,
    `stav: ${state}`,
    w.context != null ? `kontext: ${w.context} %${w.cost != null ? ` · výplata: $${w.cost.toFixed(2)}` : ''}` : '',
    w.lastText ? `poslední: ${w.lastText}` : '',
    interns ? `stážisti: ${interns}` : '',
    window.office ? '🖱 klik = přepnout do terminálu' : '',
  ].filter(Boolean).join('\n');
}

function toLogical(e) {
  const rect = canvas.getBoundingClientRect();
  return [((e.clientX - rect.left) * DPR - OX) / S, ((e.clientY - rect.top) * DPR - OY) / S];
}

canvas.addEventListener('mousemove', (e) => {
  const found = hitTest(...toLogical(e));
  canvas.style.cursor = found ? 'pointer' : 'default';
  if (!found) {
    tooltip.hidden = true;
    return;
  }
  let info;
  if (found.worker) info = workerInfo(found.worker);
  else if (found.intern) info = `stážista (subagent)\n${found.intern.label}\nšéf: ${found.intern.boss.displayName}\n🖱 klik = přepnout do terminálu`;
  else if (found.cat) info = 'Bajt – kancelářská kočka\n🖱 klik = pohladit';
  else if (found.portrait) info = employeeOfWeek ? `Zaměstnanec týdne: ${employeeOfWeek.name} (${employeeOfWeek.label})\n${employeeOfWeek.done} hotových úkolů za 7 dní\n🖱 klik = statistiky` : 'Zaměstnanec týdne – zatím nikdo\n🖱 klik = statistiky';
  else info = '🖱 klik = statistiky';
  tooltip.textContent = info;
  tooltip.hidden = false;
  tooltip.style.left = `${Math.min(e.clientX + 14, window.innerWidth - 300)}px`;
  tooltip.style.top = `${e.clientY + 14}px`;
});

canvas.addEventListener('mouseleave', () => {
  tooltip.hidden = true;
});

canvas.addEventListener('click', async (e) => {
  const found = hitTest(...toLogical(e));
  if (!found) return;
  if (found.cat) {
    petCat();
    return;
  }
  if (found.board || found.portrait) {
    openStats();
    return;
  }
  const w = found.worker ?? found.intern.boss;
  const app = await window.office?.focus(w.id);
  if (!app) w.say('Terminál nenalezen 🤷', 2.5, 'error');
});
