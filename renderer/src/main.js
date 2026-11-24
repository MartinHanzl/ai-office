/** Entry point: wire IPC, restore state, start the loop. */
import { PREVIEW } from './core/canvas.js';
import { lookFor } from './entities/look.js';
import { Convo } from './entities/idle.js';
import { handle, restore } from './events.js';
import { frame } from './loop.js';
import { state, workers } from './state.js';
import { updateBar } from './ui/bar.js';
import { openStats, refreshStats } from './ui/stats.js';
import { CHAT_PAIRS, DESKS, FLOOR_NAMES, IDLE_POOLS, floors } from './world/layout.js';
import { followWorker, peopleOn, showFloor } from './ui/floor.js'; // also registers the floor keys
import './ui/tooltip.js'; // registers canvas mouse handlers
import { setupChat } from './chat/index.js';
import { chat, closeChat, openChat, refreshList, showList } from './chat/store.js';
import { applyTodos, openTodos, todo } from './todo/store.js';
import { startPreview } from './preview.js';

// Handle for dev scripts (AI_OFFICE_EVAL screenshots) – modules are not globals.
// Floors: `floors.ground|upper` (map, named spots, stairs), DESKS and IDLE_POOLS (seats on both floors, with `owner`),
// showFloor('ground'|'upper'), followWorker(sessionId), peopleOn(floor); state.floor = the floor shown.
window.__office = {
  state, workers, Convo, CHAT_PAIRS, lookFor, openStats, chat, openChat, closeChat, refreshList, showList, todo, openTodos, applyTodos,
  floors, FLOOR_NAMES, DESKS, IDLE_POOLS, showFloor, followWorker, peopleOn,
};

if (PREVIEW) startPreview(); // ?mode=preview: one static floor, nothing else runs
else (async () => {
  if (window.office) {
    window.office.onEvent(handle);
    window.office.onSettings((s) => { state.soundOn = s.sound; });
    window.office.onLimits((l) => { state.limits = l; updateBar(); });
    window.office.onShowStats(openStats);
    try {
      restore(await window.office.snapshot());
      const info = await window.office.info();
      state.port = info.port;
      state.soundOn = info.sound;
      state.limits = info.limits;
    } catch { /* main process not ready */ }
  }
  setupChat();
  refreshStats();
  setInterval(refreshStats, 60_000);
  setInterval(updateBar, 500);
  updateBar();
  requestAnimationFrame(frame);
})();
