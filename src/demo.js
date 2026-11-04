'use strict';
/** Scripted fake hook payloads – previews the office without real agents. */

/** Idle scenario: four open sessions nobody works in – they slack off. */
function idleScript() {
  return ['eshop', 'billing-api', 'docs-web', 'crm'].map((name, i) => [
    i * 400,
    { session_id: `demo-idle-${name}`, cwd: `/Users/demo/projects/${name}`, hook_event_name: 'SessionStart' },
  ]);
}

function demoScript(kind = process.env.AI_OFFICE_DEMO) {
  if (kind === 'idle') return idleScript();
  const A = { session_id: 'demo-eshop', cwd: '/Users/demo/projects/eshop' };
  const B = { session_id: 'demo-billing', cwd: '/Users/demo/projects/billing-api' };
  const C = { session_id: 'demo-docs', cwd: '/Users/demo/projects/docs-web' };
  const e = (s, hook, extra = {}) => ({ ...s, hook_event_name: hook, ...extra });
  const pre = (s, tool, input, mode) => e(s, 'PreToolUse', { tool_name: tool, tool_input: input, ...(mode && { permission_mode: mode }) });
  const post = (s, tool, input) => e(s, 'PostToolUse', { tool_name: tool, ...(input && { tool_input: input }) });

  return [
    [0, e(A, 'SessionStart')],
    [500, e(B, 'SessionStart')],
    [1000, e(C, 'SessionStart')],
    [2000, e(A, 'UserPromptSubmit', { prompt: 'Přidej do košíku slevové kupóny' })],
    [2500, e(B, 'UserPromptSubmit', { prompt: 'Oprav padající testy fakturace' })],
    [3000, e(C, 'UserPromptSubmit', { prompt: 'Napiš dokumentaci k API' })],
    [5000, pre(A, 'Read', { file_path: '/src/Cart/CartService.php' })],
    [5500, pre(B, 'Bash', { command: 'vendor/bin/phpunit tests/Invoice' })],
    [6000, pre(C, 'Agent', { description: 'Projdi endpointy' })],
    [6400, pre(C, 'Agent', { description: 'Najdi příklady' })],
    [6800, pre(A, 'Agent', { description: 'Analyzuj DB schéma' })],
    [8000, post(A, 'Read')],
    [8200, pre(A, 'Edit', { file_path: '/src/Cart/Coupon.php' })],
    [8600, pre(B, 'Bash', { command: 'git diff' })],
    [9000, e(B, 'Notification', { message: 'Claude needs your permission to use Bash' })],
    [13000, post(C, 'WebSearch')],
    [13500, pre(C, 'Write', { file_path: '/docs/api.md' })],
    [15000, e(C, 'SubagentStop')],
    [16000, e(C, 'SubagentStop')],
    [17000, e(A, 'SubagentStop')],
    [18000, post(A, 'Edit')],
    [18500, e(A, 'Stop')],
    [20000, post(B, 'Bash')],
    [20500, pre(B, 'mcp__jira__get_issue', { key: 'AO-123' })],
    [23000, e(B, 'Stop')],
    [26000, e(C, 'Stop')],
    [30000, e(C, 'SessionEnd')],
    // newer features: status line stats, plan-mode meeting, tool failure, git commit celebration
    [3500, { status: { session_id: A.session_id, context_window: { used_percentage: 82 }, cost: { total_cost_usd: 1.37 } } }],
    [3600, { status: { session_id: B.session_id, context_window: { used_percentage: 55 }, cost: { total_cost_usd: 0.42 } } }],
    [4000, e(C, 'UserPromptSubmit', { prompt: 'Naplánuj strukturu dokumentace', permission_mode: 'plan' })],
    [7500, pre(C, 'WebSearch', { query: 'OpenAPI 3.1 best practices' }, 'plan')],
    [10500, e(A, 'PostToolUseFailure', { tool_name: 'Bash', tool_input: { command: 'npm test' }, error: 'Exit code 1: 3 tests failed' })],
    [12500, post(A, 'Bash', { command: 'git commit -m "feat: coupons"' })],
  ].sort((x, y) => x[0] - y[0]);
}

module.exports = { demoScript };
