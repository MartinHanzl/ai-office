/** Bottom status bar. */
import { COMPACT } from '../core/canvas.js';
import { WORKING } from '../entities/activity.js';
import { fmtReset, fuelColor, remaining } from '../limits.js';
import { state, stats, workers } from '../state.js';

export const barLeft = document.getElementById('bar-left');

export const barRight = document.getElementById('bar-right');

export function span(textContent, cls) {
  const el = document.createElement(cls === 'b' ? 'b' : 'span');
  if (cls && cls !== 'b') el.className = cls;
  el.textContent = textContent;
  return el;
}


export function updateBar() {
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
  if (state.limits) {
    const part = (label, win) => {
      const left = remaining(win);
      if (left == null) return;
      const el = span(`${label} ${left} %`, 'b');
      el.style.color = fuelColor(left);
      right.push(span(right.length ? ' · ' : '⛽ zbývá '), el);
      const reset = win.resetsAt && Date.now() < win.resetsAt ? fmtReset(win.resetsAt) : '';
      if (reset && !COMPACT) right.push(span(` (reset ${reset})`));
    };
    part('5h', state.limits.fiveHour);
    part('týden', state.limits.week);
    right.push(span(' · '));
  }
  right.push(span(COMPACT ? `✓ ${stats.done}` : `hotovo dnes: ${stats.done}`));
  barRight.replaceChildren(...right);
}
