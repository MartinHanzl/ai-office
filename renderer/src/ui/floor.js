/**
 * Which floor the office shows (state.floor): the arrows in the bottom-left corner (drawn by
 * draw/office/courtyard.js#drawFloorSwitch – ▲ upper on the left half, ▼ ground on the right),
 * PageUp/PageDown and ↑/↓, and following a person whose conversation you open. The main window and
 * the menu-bar popover each remember their floor across reloads.
 */
import { COMPACT } from '../core/canvas.js';
import { floorOf } from '../draw/people.js';
import { director } from '../entities/director.js';
import { state, workers } from '../state.js';
import { DEFAULT_FLOOR, FLOOR_NAMES, floors } from '../world/layout.js';

const FLOOR_KEY = COMPACT ? 'ai-office:floor:compact' : 'ai-office:floor';

const KEYS = { PageUp: 'upper', ArrowUp: 'upper', PageDown: 'ground', ArrowDown: 'ground' };

function load() {
  try {
    return localStorage.getItem(FLOOR_KEY);
  } catch {
    return null;
  }
}

const stored = load();
state.floor = FLOOR_NAMES.includes(stored) ? stored : DEFAULT_FLOOR;

/** Shows a floor ('ground' | 'upper') and remembers it. */
export function showFloor(name) {
  if (!FLOOR_NAMES.includes(name) || name === state.floor) return;
  state.floor = name;
  try {
    localStorage.setItem(FLOOR_KEY, name);
  } catch { /* storage unavailable */ }
}

/** The floor a person is headed for: past the stairs they walk to or climb (Person.afterStairs / stairs), else theirs. */
function headedFor(p) {
  const climbTo = p.stairs && (p.stairs.dir === 'up' ? 'upper' : 'ground');
  return p.afterStairs?.loc?.floor ?? climbTo ?? floorOf(p);
}

/** Shows the floor a session's employee is on – or about to be on, when on the way across the stairs. */
export function followWorker(id) {
  const w = workers.get(id);
  if (w && !w.gone) showFloor(headedFor(w));
}

/**
 * People on a floor: employees, interns and the director, the stairs counting for the floor they are drawn on,
 * leaving ones not (as the badge on the switch, loop.js).
 */
export function peopleOn(floor) {
  let n = floorOf(director) === floor ? 1 : 0;
  for (const w of workers.values()) {
    if (w.gone || w.leaving) continue;
    if (floorOf(w) === floor) n += 1;
    for (const i of w.interns) if (!i.gone && !i.leaving && floorOf(i) === floor) n += 1;
  }
  return n;
}

/** The floor whose arrow is at logical (lx, ly), or null off the switch. */
export function switchAt(lx, ly) {
  const u = floors[state.floor].map.items.find((i) => i.type === 'floorSwitch');
  if (!u || lx < u.x || lx >= u.x + u.w || ly < u.y || ly >= u.y + u.h) return null;
  return lx < u.x + u.w / 2 ? 'upper' : 'ground';
}

/** Typing somewhere: the keys belong to the field. */
function typing() {
  const el = document.activeElement;
  return Boolean(el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)));
}

// the last click went into the side panel, the statistics or a dialog: while that is open, the keys scroll it, not the office
let panel = null;
window.addEventListener('pointerdown', (e) => {
  panel = e.target instanceof Element ? e.target.closest('#chat, #stats, #modal') : null;
}, true);

/** The panel clicked last is still there (a closed dialog leaves #modal empty). */
const panelOpen = () => Boolean(panel?.isConnected && !panel.hidden && panel.childElementCount);

window.addEventListener('keydown', (e) => {
  const floor = KEYS[e.key];
  if (!floor || e.defaultPrevented || e.isComposing || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
  if (typing() || panelOpen() || document.getElementById('stats')?.hidden === false) return;
  e.preventDefault();
  showFloor(floor);
});
