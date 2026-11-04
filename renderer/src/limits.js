/** Subscription limits, strike mode and time-of-day helpers. */
import { C } from './core/palette.js';
import { pad2, randItem } from './core/util.js';
import { state, workers } from './state.js';

/** Subscription limit reached (or known to be at 0 %): the office goes on strike until the reset. */
export let strikeUntil = 0;


export function strikeActive() {
  return Date.now() < strikeUntil || remaining(state.limits?.fiveHour) === 0 || remaining(state.limits?.week) === 0;
}


export function triggerStrike() {
  const reset = [state.limits?.fiveHour?.resetsAt, state.limits?.week?.resetsAt].filter((t) => t && t > Date.now());
  strikeUntil = reset.length ? Math.min(...reset) : Date.now() + 30 * 60_000;
  for (const w of workers.values()) {
    if (w.leaving) continue;
    w.say(randItem(['Došly tokeny! ✊', 'Stávka! ✊', 'Bez tokenů ani ránu!']), 4, 'error');
  }
}


export const hourOf = (date) => (typeof state.forceHour === 'number' ? state.forceHour : date.getHours());


/** Remaining % of a window; once its reset time has passed the window is fresh again. */
export function remaining(win) {
  if (!win) return null;
  if (win.resetsAt && Date.now() >= win.resetsAt) return 100;
  return Math.round(100 - win.used);
}


export const fuelColor = (left) => (left == null ? C.metalDark : left > 50 ? C.green : left > 20 ? C.yellow : C.red);


export const fmtReset = (ms) => {
  if (!ms) return '';
  const d = new Date(ms);
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay ? `${pad2(d.getHours())}:${pad2(d.getMinutes())}` : `${WEEKDAYS[d.getDay()]} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};


export const WEEKDAYS = ['ne', 'po', 'út', 'st', 'čt', 'pá', 'so'];
