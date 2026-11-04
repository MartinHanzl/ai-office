'use strict';
/* AI Office – boot: wire IPC, restore state, start the loop. Loaded last. */

(async () => {
  if (window.office) {
    window.office.onEvent(handle);
    window.office.onSettings((s) => { soundOn = s.sound; });
    window.office.onLimits((l) => { limits = l; updateBar(); });
    window.office.onShowStats(openStats);
    try {
      restore(await window.office.snapshot());
      const info = await window.office.info();
      port = info.port;
      soundOn = info.sound;
      limits = info.limits;
    } catch { /* main process not ready */ }
  }
  refreshStats();
  setInterval(refreshStats, 60_000);
  setInterval(updateBar, 500);
  updateBar();
  requestAnimationFrame(frame);
})();
