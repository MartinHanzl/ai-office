#!/usr/bin/env node
'use strict';
/**
 * Renders the new BlueGhost floors to PNGs for review: `npm run preview` → docs/office/preview/.
 * Runs itself inside Electron (offscreen 1280×720 window, device scale 1, so 4× pixels) and loads the
 * renderer with ?mode=preview. Optional args pick shots by name, e.g. `npm run preview -- upper-day`.
 */
const path = require('node:path');
const fs = require('node:fs');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'docs', 'office', 'preview');
const SHOTS = [
  { name: 'ground-day', floor: 'ground', hour: 14, people: 0 },
  { name: 'ground-night', floor: 'ground', hour: 22, people: 0 },
  { name: 'upper-day', floor: 'upper', hour: 14, people: 0 },
  { name: 'upper-night', floor: 'upper', hour: 22, people: 0 },
  { name: 'upper-day-people', floor: 'upper', hour: 14, people: 1 },
  { name: 'ground-day-people', floor: 'ground', hour: 14, people: 1 },
  { name: 'ground-evening-people', floor: 'ground', hour: 18, people: 1, extra: true },
];

if (!process.versions.electron) {
  // launched from node: start Electron with this file as its main script
  const { spawn } = require('node:child_process');
  const electron = require('electron');
  const child = spawn(electron, [__filename, ...process.argv.slice(2)], { cwd: root, stdio: 'inherit', env: { ...process.env, ELECTRON_ENABLE_LOGGING: '' } });
  child.on('exit', (code) => process.exit(code ?? 1));
} else {
  runInElectron();
}

function runInElectron() {
  const { app, BrowserWindow } = require('electron');
  const wanted = process.argv.slice(2).filter((a) => !a.startsWith('-') && a !== __filename && !a.endsWith('preview.js'));
  const shots = wanted.length ? SHOTS.filter((s) => wanted.includes(s.name)) : SHOTS.filter((s) => !s.extra);
  app.commandLine.appendSwitch('force-device-scale-factor', '1');
  app.setPath('userData', path.join(app.getPath('temp'), 'ai-office-preview'));
  app.dock?.hide();
  let errors = 0;
  app.whenReady().then(async () => {
    fs.mkdirSync(outDir, { recursive: true });
    const win = new BrowserWindow({
      width: 1280, height: 720, useContentSize: true, show: false, backgroundColor: '#1a1c2c',
      webPreferences: { offscreen: true, backgroundThrottling: false },
    });
    win.webContents.on('console-message', (e) => {
      if (e.level !== 'error') return;
      errors += 1;
      console.error(`[renderer error] ${e.message}`);
    });
    for (const shot of shots) {
      await win.loadFile(path.join(root, 'renderer', 'index.html'), {
        query: { mode: 'preview', floor: shot.floor, hour: String(shot.hour), people: String(shot.people) },
      });
      const t0 = Date.now();
      while (!(await win.webContents.executeJavaScript('window.__previewReady === true'))) {
        if (Date.now() - t0 > 10000) throw new Error(`${shot.name}: preview not ready`);
        await new Promise((r) => setTimeout(r, 50));
      }
      const img = await win.webContents.capturePage();
      const file = path.join(outDir, `${shot.name}.png`);
      fs.writeFileSync(file, img.toPNG());
      const { width, height } = img.getSize();
      console.log(`✔ ${path.relative(root, file)} (${width}×${height})`);
    }
    app.exit(errors ? 1 : 0);
  }).catch((err) => {
    console.error(err);
    app.exit(1);
  });
}
