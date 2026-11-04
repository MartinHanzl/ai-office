'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { normalize, toolCategory, celebrationFor, sessionKey } = require('../src/hook-events');

const base = { session_id: 's1', cwd: '/Users/x/projects/eshop' };
const hook = (name, extra = {}) => normalize({ ...base, hook_event_name: name, ...extra });

test('ignores payloads without session or event name', () => {
  assert.equal(normalize({}), null);
  assert.equal(normalize({ hook_event_name: 'Stop' }), null);
  assert.equal(normalize(null), null);
});

test('session lifecycle', () => {
  assert.equal(hook('SessionStart').type, 'join');
  assert.equal(hook('SessionEnd').type, 'leave');
  assert.equal(hook('Stop').type, 'done');
});

test('prompt is collapsed to one line', () => {
  const ev = hook('UserPromptSubmit', { prompt: 'Fix\n\n  the   bug' });
  assert.equal(ev.type, 'prompt');
  assert.equal(ev.text, 'Fix the bug');
});

test('tool events carry a short description', () => {
  assert.deepEqual(
    (({ type, tool, text }) => ({ type, tool, text }))(hook('PreToolUse', { tool_name: 'Read', tool_input: { file_path: '/a/b/Cart.php' } })),
    { type: 'tool', tool: 'Read', text: 'Cart.php' },
  );
  assert.equal(hook('PreToolUse', { tool_name: 'WebFetch', tool_input: { url: 'https://example.com/x' } }).text, 'example.com');
  assert.equal(hook('PreToolUse', { tool_name: 'mcp__jira__get_issue', tool_input: {} }).text, 'jira · get_issue');
});

test('Agent/Task tool spawns and finishes interns', () => {
  const start = hook('PreToolUse', { tool_name: 'Agent', tool_input: { description: 'Analyze schema' } });
  assert.equal(start.type, 'subStart');
  assert.equal(start.text, 'Analyze schema');
  assert.equal(hook('PostToolUse', { tool_name: 'Agent' }), null); // tracked via SubagentStop instead
  assert.equal(hook('SubagentStop').type, 'subStop');
});

test('notifications: permission vs idle vs other', () => {
  assert.equal(hook('Notification', { message: 'Claude needs your permission to use Bash' }).type, 'waiting');
  assert.equal(hook('Notification', { message: 'Claude is waiting for your input' }).type, 'idle');
  assert.equal(hook('Notification', { message: 'Something else' }).type, 'notice');
});

test('tool failures: error, but interrupts are not errors', () => {
  const ev = hook('PostToolUseFailure', { tool_name: 'Bash', error: 'Exit code 1' });
  assert.equal(ev.type, 'error');
  assert.equal(ev.text, 'Exit code 1');
  assert.equal(hook('PostToolUseFailure', { tool_name: 'Bash', is_interrupt: true }).type, 'toolDone');
  assert.equal(hook('PostToolUseFailure', { tool_name: 'Bash', is_timeout: true, error: 'x' }).text, 'timeout');
});

test('StopFailure detects rate limits', () => {
  assert.equal(hook('StopFailure', { error_type: 'rate_limit' }).limit, true);
  assert.equal(hook('StopFailure', { error_type: 'overloaded' }).limit, false);
});

test('mode and tty are passed through, invalid tty dropped', () => {
  assert.equal(hook('UserPromptSubmit', { permission_mode: 'plan' }).mode, 'plan');
  assert.equal(hook('Stop', { office_tty: 'ttys002' }).tty, 'ttys002');
  assert.equal(hook('Stop', { office_tty: '??' }).tty, null);
  assert.equal(hook('Stop', { office_tty: '"; rm -rf /' }).tty, null);
});

test('git commit / push celebrations', () => {
  assert.equal(celebrationFor('Bash', { command: 'git add . && git commit -m "x"' }), 'commit');
  assert.equal(celebrationFor('Bash', { command: 'git -C repo push origin main' }), 'push');
  assert.equal(celebrationFor('Bash', { command: 'git status' }), null);
  assert.equal(celebrationFor('Read', { command: 'git commit' }), null);
  assert.equal(hook('PostToolUse', { tool_name: 'Bash', tool_input: { command: 'git commit -m x' } }).celebrate, 'commit');
});

test('tool categories', () => {
  assert.equal(toolCategory('Bash'), 'terminal');
  assert.equal(toolCategory('Grep'), 'reading');
  assert.equal(toolCategory('MultiEdit'), 'editing');
  assert.equal(toolCategory('WebSearch'), 'web');
  assert.equal(toolCategory('mcp__x__y'), 'mcp');
  assert.equal(toolCategory('ExitPlanMode'), 'planning');
  assert.equal(toolCategory('Agent'), 'agents');
  assert.equal(toolCategory('Whatever'), 'other');
});

test('session keys: project folder, other AI, demo', () => {
  assert.equal(sessionKey({ sessionId: 'a', source: 'Claude', cwd: '/p/eshop' }), '/p/eshop');
  assert.equal(sessionKey({ sessionId: 'proc:Codex:ttys1', source: 'Codex', cwd: '' }), 'ai:Codex');
  assert.equal(sessionKey({ sessionId: 'demo-x', source: 'Claude', cwd: '/p/eshop' }), 'demo:/p/eshop');
});
