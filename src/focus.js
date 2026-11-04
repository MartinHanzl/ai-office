'use strict';
/**
 * Brings the terminal running a given session to the front.
 * Finds the GUI app owning the session's TTY by walking the process tree;
 * Terminal.app and iTerm2 additionally get the exact tab selected via AppleScript.
 */
const { execFile } = require('node:child_process');

const run = (cmd, args) => new Promise((resolve) => {
  execFile(cmd, args, { timeout: 5000 }, (err, out) => resolve(err ? null : out));
});

const VALID_TTY = /^tty[a-z]*\d+$/;

async function appForTty(tty) {
  const out = await run('ps', ['-axo', 'pid=,ppid=,tty=,comm=']);
  if (!out) return null;
  const procs = new Map();
  let start = null;
  for (const line of out.split('\n')) {
    const m = line.match(/^\s*(\d+)\s+(\d+)\s+(\S+)\s+(.*)$/);
    if (!m) continue;
    const proc = { pid: Number(m[1]), ppid: Number(m[2]), tty: m[3], comm: m[4] };
    procs.set(proc.pid, proc);
    if (proc.tty === tty && (!start || proc.pid < start.pid)) start = proc; // oldest process = the shell
  }
  for (let p = start, depth = 0; p && depth < 40; p = procs.get(p.ppid), depth++) {
    const idx = p.comm.indexOf('.app/');
    if (idx !== -1) {
      const bundle = p.comm.slice(0, idx + 4);
      return { bundle, name: bundle.split('/').pop().replace(/\.app$/, '') };
    }
  }
  return null;
}

const terminalScript = (dev) => `
tell application "Terminal"
  repeat with w in windows
    repeat with t in tabs of w
      if tty of t is "${dev}" then
        set selected of t to true
        set index of w to 1
        activate
        return "ok"
      end if
    end repeat
  end repeat
end tell`;

const itermScript = (dev) => `
tell application "iTerm2"
  repeat with w in windows
    repeat with t in tabs of w
      repeat with s in sessions of t
        if tty of s is "${dev}" then
          select w
          select t
          select s
          activate
          return "ok"
        end if
      end repeat
    end repeat
  end repeat
end tell`;

/** @returns {Promise<string|null>} name of the focused app, or null when nothing was found */
async function focusTty(tty) {
  if (!VALID_TTY.test(String(tty))) return null;
  const app = await appForTty(tty);
  if (!app) return null;
  const dev = `/dev/${tty}`;
  if (app.name === 'Terminal' && (await run('osascript', ['-e', terminalScript(dev)]))?.includes('ok')) return app.name;
  if (/^iTerm/.test(app.name) && (await run('osascript', ['-e', itermScript(dev)]))?.includes('ok')) return app.name;
  await run('open', [app.bundle]);
  return app.name;
}

module.exports = { focusTty, VALID_TTY };
