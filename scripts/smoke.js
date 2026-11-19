#!/usr/bin/env node
'use strict';
/**
 * Smoke test: starts the app on a spare port with an isolated profile, plays the demo,
 * forces the remaining states (idle chat, strike, night, the director's to-do list, stats panel),
 * shows both floors (the switch by a click and by a key) and fails when the renderer logs an error.
 * Leaves a screenshot of each floor for a visual check: the upper floor at the end, the ground floor
 * at night during the strike (`-ground` suffix).
 */
const { spawn } = require('node:child_process');
const os = require('node:os');
const path = require('node:path');

const shot = process.env.AI_OFFICE_SCREENSHOT || path.join(os.tmpdir(), 'ai-office-smoke.png');
const groundShot = shot.replace(/(\.png)?$/i, '-ground.png');
const root = path.join(__dirname, '..');
const evalCode = `(() => {
  const o = window.__office;
  // a conversation with the stand-in claude (scripts/fake-claude.js): new task, streamed reply, panel next to the office
  setTimeout(async () => {
    const id = await window.office.chat.create({ cwd: ${JSON.stringify(root)}, prompt: 'Zkontroluj README' });
    await o.openChat(id);
    // renamed, copied (fork), back to the list of all conversations, then into the copy
    await window.office.chat.rename(id, 'Kontrola README');
    const copy = await window.office.chat.fork(id, null);
    await o.refreshList();
    o.closeChat();
    setTimeout(() => o.openChat(copy), 1500);
  }, 500);
  // runs 8 s after start (see main.js); delays below are relative to that
  // two floors: down by a click on the ▼ arrow (day, newcomers and interns coming in), up again by PageUp,
  // down once more at night during the strike for the -ground screenshot (14.6 s), then upstairs to the end
  const clickAt = (lx, ly) => {
    const c = document.getElementById('scene');
    const r = c.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const s = Math.min(c.width / 320, c.height / 180);
    const ox = Math.round((c.width - 320 * s) / 2);
    const oy = Math.round((c.height - 180 * s) / 2);
    c.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: r.left + (ox + lx * s) / dpr, clientY: r.top + (oy + ly * s) / dpr }));
    c.dispatchEvent(new MouseEvent('mouseleave')); // no tooltip left in the screenshots
  };
  const expectFloor = (floor, how) => {
    if (o.state.floor !== floor) console.error(\`floor switch: \${how} did not show the \${floor} floor\`);
  };
  setTimeout(() => {
    const u = o.floors[o.state.floor].map.items.find((i) => i.type === 'floorSwitch');
    clickAt(u.x + u.w * 0.75, u.y + u.h / 2);
    expectFloor('ground', 'a click on ▼');
  }, 200);
  setTimeout(() => {
    document.activeElement?.blur(); // the keys are for text fields while one has the focus
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageUp', cancelable: true }));
    expectFloor('upper', 'PageUp');
  }, 3500);
  setTimeout(() => o.showFloor('ground'), 5300);
  setTimeout(() => o.showFloor('upper'), 6900);
  setTimeout(() => {
    const free = [...o.workers.values()];
    if (free.length >= 2) new o.Convo(free[0], free[1], o.CHAT_PAIRS[0]);
  }, 4000);
  setTimeout(() => {
    // free for over 5 minutes → ghost
    const idle = [...o.workers.values()].find((w) => w.isFree);
    if (idle) idle.freeSince = performance.now() - 6 * 60e3;
  }, 1000);
  setTimeout(() => { o.state.forceHour = 22; }, 5000);
  setTimeout(() => { o.state.limits = { fiveHour: { used: 100, resetsAt: Date.now() + 3600e3 }, week: { used: 40 } }; }, 6000);
  // the director's to-do list: opening asks the main process (no token there), then made-up Todoist data
  // replaces the answer so the list itself renders; nothing goes to the network
  setTimeout(() => o.openTodos(), 7000);
  setTimeout(() => {
    const day = (n) => new Date(Date.now() + n * 864e5).toLocaleDateString('sv-SE');
    const t = (id, due, extra = {}) => ({ id, content: \`Úkol \${id}\`, description: '', due, time: null, recurring: false, deadline: null, priority: 1, projectId: 'p1', project: 'Inbox', order: 0, url: 'https://app.todoist.com/app/task/' + id, ...extra });
    o.applyTodos({
      configured: true, tokenPage: 'https://app.todoist.com', syncedAt: Date.now(), error: null, encrypted: true,
      projects: [{ id: 'p1', name: 'Inbox', inbox: true, order: 0 }, { id: 'p2', name: 'Kancelář', inbox: false, order: 1 }],
      tasks: [t('1', day(-2), { priority: 4 }), t('2', day(0), { time: '14:00', recurring: true }), t('3', day(1)), t('4', day(5), { deadline: day(9), project: 'Kancelář' }), t('5', null)],
    });
    o.todo.filter = 'all';
  }, 7500);
  setTimeout(() => {
    // quick-add shortcuts typed into the new-task field: the preview and the fields driven by the text
    const input = document.querySelector('#chat .todo-add .text');
    input.value = '!!1 Domácí úkol #kanc @doma zítra v 18:00 // strana 42';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, 8000);
  setTimeout(() => o.openStats(), 9000);
  return 0;
})()`;

const electron = require('electron'); // path to the binary when required from node
const child = spawn(electron, ['.'], {
  cwd: root,
  env: {
    ...process.env,
    AI_OFFICE_CLAUDE_BIN: path.join(__dirname, 'fake-claude.js'),
    AI_OFFICE_PORT: process.env.AI_OFFICE_PORT || '4798',
    AI_OFFICE_SCREENSHOT: shot,
    AI_OFFICE_SCREENSHOT_DELAY: '17500',
    AI_OFFICE_SCREENSHOT_EXTRA: JSON.stringify([[14600, groundShot]]),
    AI_OFFICE_EVAL: evalCode,
  },
});

let errors = 0;
const onData = (buf) => {
  for (const line of buf.toString().split('\n')) {
    if (line.includes('[renderer error]') || /Uncaught|ReferenceError|TypeError/.test(line)) {
      errors += 1;
      console.error(line);
    }
  }
};
child.stdout.on('data', onData);
child.stderr.on('data', onData);
child.on('exit', (code) => {
  if (errors || code) {
    console.error(`✖ smoke test failed (${errors} renderer errors, exit ${code})`);
    process.exit(1);
  }
  console.log(`✔ smoke test passed – screenshots: ${shot}, ${groundShot}`);
});
