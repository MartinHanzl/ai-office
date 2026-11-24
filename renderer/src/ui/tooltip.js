/**
 * Hover tooltips, hit testing and click handling on the canvas. Only what is drawn on the floor shown
 * (state.floor) is hit: its people where draw/people.js lays them out, its wall items and the floor switch.
 */
import { ACTIVITY_CZ, DIRECTOR_CZ, FLOOR_CZ, IDLE_CZ } from '../content/texts.js';
import { COMPACT, canvas, toLogical } from '../core/canvas.js';
import { now } from '../core/util.js';
import { isManaged, openChat } from '../chat/store.js';
import { directorLayout, figureBox, floorOf, internLayout, workerLayout } from '../draw/people.js';
import { cat, catHit, petCat } from '../life/cat.js';
import { fmtReset, remaining, strikeActive, strikeUntil } from '../limits.js';
import { state, stats, workers } from '../state.js';
import { peopleOn, showFloor, switchAt } from './floor.js';
import { openStats } from './stats.js';
import { director } from '../entities/director.js';
import { EMOTIONS } from '../entities/mood.js';
import { openTodos } from '../todo/store.js';
import { PLAN_BOARD, TASK_BOARD, TVS, floors } from '../world/layout.js';

export const tooltip = document.getElementById('tooltip');

const inside = (r, lx, ly) => Boolean(r) && lx >= r.x && lx <= r.x + r.w && ly >= r.y && ly <= r.y + r.h;

/** Clickable things on the walls of each floor: [hit key, px rect]. */
const WALL = {
  upper: [
    ['taskBoard', TASK_BOARD],
    ['planBoard', PLAN_BOARD],
    ['portrait', floors.upper.map.wall.find((w) => w.type === 'portrait')],
  ],
  ground: [['receptionTv', TVS.reception]],
};

/**
 * Is (lx, ly) on a drawn person? Their figure's paint box (draw/people.js figureBox), less the room it keeps
 * for arms stretched out and raised; not while faded out on the stairs, only inside a clip.
 */
function onPerson(lay, lx, ly) {
  if (lay.alpha === 0) return false;
  const b = figureBox(lay.x, lay.y, lay.k);
  const side = b.w * 0.15;
  const top = b.h * 0.25;
  if (lx < b.x + side || lx > b.x + b.w - side || ly < b.y + top || ly > b.y + b.h + 3) return false;
  return !lay.clip || inside(lay.clip, lx, ly);
}

/** Employees, interns (also those still walking out after their boss) and the director drawn on the floor shown, frontmost first. */
function peopleShown(t) {
  const out = [];
  for (const w of workers.values()) {
    if (!w.gone && floorOf(w) === state.floor) out.push({ hit: { worker: w }, lay: workerLayout(w, t) });
    for (const i of w.interns) if (!i.gone && floorOf(i) === state.floor) out.push({ hit: { intern: i }, lay: internLayout(i, t) });
  }
  if (floorOf(director) === state.floor) out.push({ hit: { director: true }, lay: directorLayout(director, t) });
  return out.sort((a, b) => b.lay.depth - a.lay.depth);
}

export function hitTest(lx, ly) {
  const floor = switchAt(lx, ly);
  if (floor) return { floor };
  const person = peopleShown(now() / 1000).find((p) => onPerson(p.lay, lx, ly));
  if (person) return person.hit;
  if (cat.floor === state.floor && catHit(lx, ly)) return { cat: true };
  const wall = WALL[state.floor]?.find(([, r]) => inside(r, lx, ly));
  return wall ? { [wall[0]]: true } : null;
}


const pct = (v) => Math.round(((v + 1) / 2) * 100);

function moodLine(w) {
  const m = w.mood;
  return `nálada: ${EMOTIONS[m.current].icon ?? '🙂'} ${EMOTIONS[m.current].label} · pohoda ${pct(m.valence)} % · energie ${pct(m.energy)} %`;
}

/** A break by the seat's kind where it has its own label (armchair), else by the idle kind. */
const idleLabel = (idle) => IDLE_CZ[idle.spot?.kind] ?? IDLE_CZ[idle.kind] ?? idle.kind;

export function workerInfo(w) {
  const interns = w.interns.filter((i) => !i.leaving).length + w.extraInterns;
  const p = w.profile;
  const state = w.ghost ? '👻 duch – přes 5 min bez práce, terminál je otevřený'
    : w.waiting ? 'čeká na povolení'
    : w.place === 'board' || w.place === 'toBoard' ? 'porada v zasedačce (plan mód)'
      : w.idle ? `pauza – ${idleLabel(w.idle)}` : ACTIVITY_CZ[w.activity] ?? w.activity;
  const xp = p ? `${p.title} · ${p.xp} XP${p.nextXp ? ` (další úroveň ${p.nextXp})` : ''} · hotovo celkem ${p.done}` : '';
  return [
    w.name ? `${w.name} – ${w.project}  (${w.source})` : `${w.project}  (${w.source})`,
    w.coverFor ? `zastupuje ${w.coverFor.whom ?? w.coverFor.name} (vlastník konverzace)` : '',
    xp,
    w.cwd,
    `stav: ${state}`,
    moodLine(w),
    w.context != null ? `kontext: ${w.context} %${w.cost != null ? ` · výplata: $${w.cost.toFixed(2)}` : ''}` : '',
    w.lastText ? `poslední: ${w.lastText}` : '',
    interns ? `stážisti: ${interns}` : '',
    window.office ? (isManaged(w.id) ? '🖱 klik = otevřít konverzaci' : '🖱 klik = přepnout do terminálu') : '',
  ].filter(Boolean).join('\n');
}


/** The to-do counts, any Todoist error and what a click does – shared by the director and the task board. */
function todoLines() {
  const { configured, overdue, today, week, total, error } = director.todos;
  return [
    configured ? `${overdue} po termínu · ${today} na dnes · ${week} do týdne · ${total} celkem` : 'Todoist zatím není napojený',
    error ? `⚠️ ${error}` : '',
    '🖱 klik = úkoly a nastavení',
  ];
}

function directorInfo() {
  return [
    'Ředitel – to jsi ty. Sídlí v prosklené zasedačce a hlídá úkoly z Todoistu.',
    `stav: ${DIRECTOR_CZ[director.beat?.kind ?? 'idle'] ?? DIRECTOR_CZ.idle}`,
    ...todoLines(),
  ].filter(Boolean).join('\n');
}

const taskBoardInfo = () => [
  'Tabule ředitele – lísteček za každý úkol z Todoistu: červený po termínu, žlutý na dnes, zelený do týdne.',
  ...todoLines(),
].filter(Boolean).join('\n');

const planBoardInfo = () => [
  'Tabule plan módu – při poradě v plan módu na ni agenti kreslí diagram, v rohu jsou dnes hotové úkoly.',
  `hotovo dnes: ${stats.done}`,
  '🖱 klik = statistiky',
].join('\n');

function receptionTvInfo() {
  const { fiveHour, week } = state.limits ?? {};
  const left = (win) => (remaining(win) == null ? '?' : `${remaining(win)} %`);
  const limits = strikeActive()
    ? `✊ stávka – došly tokeny, do ${fmtReset(strikeUntil > Date.now() ? strikeUntil : fiveHour?.resetsAt) || '?'}`
    : state.limits ? `⛽ zbývá 5h ${left(fiveHour)} · týden ${left(week)}` : 'limity zatím nepřišly (status line Claude Code)';
  return ['TV na recepci – hodiny a zbývající limity předplatného', limits, '🖱 klik = statistiky'].join('\n');
}

function portraitInfo() {
  const eow = state.employeeOfWeek;
  return eow
    ? `Zaměstnanec týdne: ${eow.name} (${eow.label}, ${eow.title})\n${eow.done} hotových úkolů za 7 dní\n🖱 klik = statistiky`
    : 'Zaměstnanec týdne – zatím nikdo\n🖱 klik = statistiky';
}

/** 1 člověk, 2–4 lidé, 5 lidí. */
const peopleCz = (n) => (n === 1 ? 'člověk' : n >= 2 && n <= 4 ? 'lidé' : 'lidí');

/** One arrow of the floor switch: which floor, who is there, how to get there. */
function floorInfo(floor) {
  const n = peopleOn(floor);
  const shown = floor === state.floor;
  const keys = floor === 'upper' ? 'PageUp / ↑' : 'PageDown / ↓';
  return [
    `${floor === 'upper' ? '▲' : '▼'} ${FLOOR_CZ[floor].name}${shown ? ' – právě vidíš' : ''}`,
    FLOOR_CZ[floor].what,
    `👥 ${n ? `${n} ${peopleCz(n)}` : 'nikdo'}`,
    shown ? '' : `🖱 klik = přejít (${keys})`,
  ].filter(Boolean).join('\n');
}

function info(found) {
  if (found.floor) return floorInfo(found.floor);
  if (found.worker) return workerInfo(found.worker);
  if (found.director) return directorInfo();
  if (found.taskBoard) return taskBoardInfo();
  if (found.intern) return `stážista (subagent)\n${found.intern.label}\nšéf: ${found.intern.boss.displayName}\n🖱 klik = přepnout do terminálu`;
  if (found.cat) return 'Bajt – kancelářská kočka\n🖱 klik = pohladit';
  if (found.portrait) return portraitInfo();
  if (found.planBoard) return planBoardInfo();
  if (found.receptionTv) return receptionTvInfo();
  return '🖱 klik = statistiky';
}

function hover(e) {
  const found = hitTest(...toLogical(e));
  canvas.style.cursor = found ? 'pointer' : 'default';
  if (!found) {
    tooltip.hidden = true;
    return;
  }
  tooltip.textContent = info(found);
  tooltip.hidden = false;
  tooltip.style.left = `${Math.min(e.clientX + 14, window.innerWidth - 300)}px`;
  tooltip.style.top = `${e.clientY + 14}px`;
}

canvas.addEventListener('mousemove', hover);


canvas.addEventListener('mouseleave', () => {
  tooltip.hidden = true;
});


canvas.addEventListener('click', async (e) => {
  const found = hitTest(...toLogical(e));
  if (!found) return;
  if (found.floor) {
    showFloor(found.floor);
    hover(e); // the arrow under the pointer is the floor shown now
    return;
  }
  if (found.cat) {
    petCat();
    return;
  }
  if (found.portrait || found.planBoard || found.receptionTv) {
    openStats();
    return;
  }
  if (found.director || found.taskBoard) {
    // the popover has no panel – the main window opens with the list
    if (COMPACT) window.office?.todoist?.open();
    else openTodos();
    return;
  }
  const w = found.worker ?? found.intern.boss;
  if (isManaged(w.id) && !COMPACT) {
    openChat(w.id);
    return;
  }
  const app = await window.office?.focus(w.id);
  if (!app) w.say('Terminál nenalezen 🤷', 2.5, 'error');
});
