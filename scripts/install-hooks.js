#!/usr/bin/env node
'use strict';
/**
 * Registers (or with --uninstall removes) the AI Office hook in the global
 * Claude Code settings (~/.claude/settings.json). A timestamped backup of the
 * settings file is written before every change. Other hooks are left untouched.
 */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const SETTINGS = process.env.CLAUDE_SETTINGS || path.join(os.homedir(), '.claude', 'settings.json');
const HOOK = path.resolve(__dirname, '..', 'hooks', 'office-hook.sh');
const MARK = 'office-hook.sh';
const TOOL_EVENTS = ['PreToolUse', 'PostToolUse', 'PostToolUseFailure'];
const OTHER_EVENTS = ['SessionStart', 'SessionEnd', 'UserPromptSubmit', 'Notification', 'Stop', 'StopFailure', 'SubagentStop'];
const uninstall = process.argv.includes('--uninstall');

const settings = fs.existsSync(SETTINGS) ? JSON.parse(fs.readFileSync(SETTINGS, 'utf8')) : {};
if (fs.existsSync(SETTINGS)) {
  const backup = `${SETTINGS}.bak-ai-office-${Date.now()}`;
  fs.copyFileSync(SETTINGS, backup);
  console.log(`Záloha: ${backup}`);
}

// Remove any previous AI Office entries so the script is idempotent.
const hooks = settings.hooks ?? {};
for (const event of Object.keys(hooks)) {
  hooks[event] = hooks[event]
    .map((group) => ({ ...group, hooks: (group.hooks ?? []).filter((h) => !String(h.command ?? '').includes(MARK)) }))
    .filter((group) => group.hooks.length > 0);
  if (hooks[event].length === 0) delete hooks[event];
}

if (!uninstall) {
  fs.chmodSync(HOOK, 0o755);
  const entry = { type: 'command', command: `"${HOOK}"`, timeout: 5 };
  for (const event of TOOL_EVENTS) (hooks[event] ??= []).push({ matcher: '*', hooks: [entry] });
  for (const event of OTHER_EVENTS) (hooks[event] ??= []).push({ hooks: [entry] });
}

// Status line feeds subscription rate limits (5h window / week) to the office.
const STATUSLINE = path.resolve(__dirname, '..', 'hooks', 'office-statusline.sh');
const ours = String(settings.statusLine?.command ?? '').includes('office-statusline.sh');
if (uninstall) {
  if (ours) delete settings.statusLine;
} else if (!settings.statusLine || ours) {
  fs.chmodSync(STATUSLINE, 0o755);
  settings.statusLine = { type: 'command', command: `"${STATUSLINE}"` };
} else {
  console.warn('Pozor: máš vlastní statusLine – limity tokenů se do AI Office posílat nebudou.');
  console.warn(`Přidej do svého skriptu přeposlání stdin: curl -s -m 2 -X POST --data-binary @- http://127.0.0.1:4747/status`);
}

if (Object.keys(hooks).length > 0) settings.hooks = hooks;
else delete settings.hooks;

fs.mkdirSync(path.dirname(SETTINGS), { recursive: true });
fs.writeFileSync(SETTINGS, `${JSON.stringify(settings, null, 2)}\n`);
console.log(uninstall ? 'AI Office hooky odebrány.' : `AI Office hooky nainstalovány → ${SETTINGS}`);
