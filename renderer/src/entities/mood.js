/**
 * Employee moods. Each employee has two values that events push around and that slowly
 * drift back to a baseline:
 *   valence – how good they feel (-1 … 1)
 *   energy  – how rested they are (-1 … 1)
 * The visible emotion is derived from these plus the current situation (errors, waiting,
 * context fill, interns, limits). Everything here is local – no tokens involved.
 */
import { clamp, now, randItem } from '../core/util.js';
import { MOOD_LINES } from '../content/texts.js';
import { hourOf, remaining } from '../limits.js';
import { state } from '../state.js';
import { WORKING } from './activity.js';

/** How each emotion looks: emote above the head, facial expression, Czech label. */
export const EMOTIONS = {
  neutral: { icon: null, face: 'neutral', label: 'v pohodě' },
  happy: { icon: '♪', face: 'smile', label: 'šťastný', mild: true },
  content: { icon: '❤', face: 'smile', label: 'spokojený', mild: true },
  proud: { icon: '⭐', face: 'smile', label: 'hrdý' },
  frustrated: { icon: '💢', face: 'angry', label: 'frustrovaný' },
  stressed: { icon: '💦', face: 'worried', label: 've stresu' },
  impatient: { icon: '⌛', face: 'flat', label: 'netrpělivý' },
  worried: { icon: '😟', face: 'worried', label: 'ustaraný' },
  overwhelmed: { icon: '🌀', face: 'worried', label: 'zahlcený' },
  tired: { icon: '💤', face: 'tired', label: 'unavený' },
  bored: { icon: '…', face: 'flat', label: 'znuděný', mild: true },
  sad: { icon: '☁', face: 'sad', label: 'smutný' },
};

const ERROR_WINDOW_MS = 90_000;

export function createMood() {
  return {
    valence: 0.2,
    energy: 0.4,
    errors: [],          // timestamps of recent tool failures
    flash: null,         // short forced emotion { kind, until }
    waitingSince: 0,
    current: 'neutral',
    lastSpoke: 0,
  };
}

/** Event-driven mood changes. */
export function moodEvent(w, kind, data = {}) {
  const m = w.mood;
  const t = now();
  const nudge = (dv, de) => {
    m.valence = clamp(m.valence + dv, -1, 1);
    m.energy = clamp(m.energy + de, -1, 1);
  };
  switch (kind) {
    case 'error':
      m.errors = m.errors.filter((ts) => t - ts < ERROR_WINDOW_MS);
      m.errors.push(t);
      nudge(-0.15 * m.errors.length, 0.05);
      break;
    case 'failure':
      nudge(-0.3, 0);
      break;
    case 'done': {
      // finishing feels good; long tasks are tiring
      const minutes = (data.workMs ?? 0) / 60_000;
      nudge(m.errors.length ? 0.1 : 0.25, -Math.min(0.35, minutes * 0.02));
      m.errors = [];
      if (minutes >= 10) flash(m, 'happy', 4000);
      break;
    }
    case 'celebrate':
      nudge(0.35, 0.15);
      flash(m, 'happy', 4500);
      break;
    case 'levelUp':
      nudge(0.6, 0.3);
      flash(m, 'proud', 10_000);
      break;
    case 'waiting':
      m.waitingSince = t;
      break;
    case 'friendChat':
      nudge(0.2, 0.05);
      break;
    default:
      break;
  }
}

function flash(m, kind, ms) {
  m.flash = { kind, until: now() + ms };
}

const isNight = () => {
  const h = hourOf(new Date());
  return h >= 22 || h < 6;
};

/** Continuous drift: work drains energy, breaks recharge it, waiting sours the mood. */
export function updateMood(w, dt) {
  const m = w.mood;
  const working = WORKING.has(w.activity) || w.activity === 'thinking';
  const restBaseline = isNight() ? -0.4 : 0.3;
  let de = (restBaseline - m.energy) * 0.004;
  if (working) de -= isNight() ? 0.004 : 0.0015;
  const idle = w.idle?.arrived ? w.idle.kind : null;
  if (idle === 'coffee') de += 0.012;
  if (idle === 'nap') de += 0.02;
  if (idle === 'sofa' || idle === 'chat') de += 0.006;
  let dv = (0.1 - m.valence) * 0.01;
  if (w.waiting && now() - m.waitingSince > 60_000) dv -= 0.004;
  if (idle === 'window') dv += 0.01;
  m.valence = clamp(m.valence + dv * dt, -1, 1);
  m.energy = clamp(m.energy + de * dt, -1, 1);

  const next = emotionOf(w);
  if (next !== m.current) {
    m.current = next;
    maybeSpeak(w, next);
  }
}

function maybeSpeak(w, emotion) {
  const m = w.mood;
  const lines = MOOD_LINES[emotion];
  if (!lines || w.bubble || w.walking || w.leaving || now() - m.lastSpoke < 45_000) return;
  if (EMOTIONS[emotion].mild && Math.random() < 0.6) return;
  m.lastSpoke = now();
  w.say(randItem(lines), 3, emotion === 'frustrated' || emotion === 'impatient' ? 'error' : 'chat');
}

/** The emotion currently shown, by priority. */
export function emotionOf(w) {
  const m = w.mood;
  const t = now();
  if (m.flash && t < m.flash.until) return m.flash.kind;
  const activeInterns = w.interns.filter((i) => !i.leaving).length + w.extraInterns;
  const working = WORKING.has(w.activity) || w.activity === 'thinking';
  const recentErrors = m.errors.filter((ts) => t - ts < ERROR_WINDOW_MS).length;
  const left = remaining(state.limits?.fiveHour);

  if (w.waiting && t - m.waitingSince > 45_000) return 'impatient';
  if (recentErrors >= 2) return 'frustrated';
  if (activeInterns >= 3) return 'overwhelmed';
  if (working && w.context >= 80) return 'stressed';
  if (working && left != null && left > 0 && left < 15) return 'worried';
  if (m.energy < -0.5) return 'tired';
  if (w.idle?.kind === 'chat' && w.idle.convo?.friends) return 'content';
  if (w.isFree && w.freeSince && t - w.freeSince > 10 * 60_000 && !w.idle?.arrived) return 'bored';
  if (m.valence > 0.55) return 'happy';
  if (m.valence < -0.45) return 'sad';
  return 'neutral';
}

/** Should the emote above the head be visible right now? Mild emotions blink in and out. */
export function showEmote(w, t) {
  const info = EMOTIONS[w.mood.current];
  if (!info?.icon) return false;
  if (!info.mild) return true;
  return (t + (w.x % 7)) % 8 < 2.5;
}

/** Animation tempo: stressed/frustrated type faster, tired slower. */
export function moodSpeed(w) {
  switch (w.mood.current) {
    case 'frustrated': case 'stressed': case 'impatient': return 1.8;
    case 'tired': return 0.5;
    default: return 1;
  }
}

/** Idle-behaviour weight multipliers by mood. */
export function moodIdleWeights(w) {
  const e = w.mood.current;
  const m = w.mood;
  return {
    coffee: m.energy < -0.2 ? 3 : 1,
    nap: m.energy < -0.4 ? 2 : 1,
    chat: m.energy > 0.3 && m.valence > 0 ? 2 : 1,
    window: e === 'frustrated' || e === 'sad' || m.valence < -0.2 ? 6 : 1,
    sofa: e === 'tired' ? 2 : 1,
  };
}
