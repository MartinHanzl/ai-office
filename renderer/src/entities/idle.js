/** Slacking behaviour selection and conversations between idle employees. */
import { DIALOGS } from '../content/texts.js';
import { now, rand, randItem } from '../core/util.js';
import { strikeActive } from '../limits.js';
import { convos, workers } from '../state.js';
import { CHAT_PAIRS } from '../world/layout.js';
import { moodEvent, moodIdleWeights } from './mood.js';

/** How many times two employees (by project key) chatted – two chats make them friends. */
const chatCounts = new Map();
const pairKey = (a, b) => [a.key, b.key].sort().join('|');
export const areFriends = (a, b) => (chatCounts.get(pairKey(a, b)) ?? 0) >= 2;

export class Convo {
  constructor(a, b, pair) {
    this.a = a;
    this.b = b;
    this.friends = areFriends(a, b);
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
    const key = pairKey(this.a, this.b);
    chatCounts.set(key, (chatCounts.get(key) ?? 0) + 1);
    if (this.friends) for (const w of [this.a, this.b]) moodEvent(w, 'friendChat');
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


export function findPartner(w) {
  const candidates = [...workers.values()].filter((o) => o !== w && o.isFree && !o.idle?.convo && !o.walking);
  if (!candidates.length) return null;
  // friends are three times as likely to be picked
  const pool = candidates.flatMap((o) => (areFriends(w, o) ? [o, o, o] : [o]));
  return randItem(pool);
}


export function pickIdle(w) {
  const freeFor = now() - (w.freeSince ?? now());
  const mood = moodIdleWeights(w);
  const options = [
    { kind: 'chat', weight: 3 * mood.chat },
    { kind: 'coffee', weight: 2 * mood.coffee, secs: [20, 40] },
    { kind: 'sofa', weight: 2 * mood.sofa, secs: [30, 90] },
    { kind: 'browse', weight: 3, secs: [30, 90] },
    { kind: 'sit', weight: 1, secs: [10, 30] },
    { kind: 'window', weight: 0.5 * mood.window, secs: [15, 40] },
    { kind: 'nap', weight: freeFor > 5 * 60_000 || w.mood.energy < -0.4 ? 3 * mood.nap : 0, secs: [60, 180] },
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
        new Convo(w, partner, pair);
        return;
      }
      continue;
    }
    if (w.startIdle(choice.kind, rand(...choice.secs))) return;
  }
  w.startIdle('sit', 15);
}
