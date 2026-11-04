/** Mapping of agent tools to on-screen activities. */

export const WORKING = new Set(['typing', 'terminal', 'reading', 'web', 'planning', 'phone']);


export function activityFor(tool) {
  if (/^(Bash|BashOutput|KillShell|KillBash)$/.test(tool)) return 'terminal';
  if (/^(Read|Grep|Glob|LS|NotebookRead)$/.test(tool)) return 'reading';
  if (/^Web/.test(tool)) return 'web';
  if (tool === 'TodoWrite') return 'planning';
  if (tool.startsWith('mcp__')) return 'phone';
  return 'typing';
}


export function toolLabel(tool, txt) {
  if (tool === 'Proc') return '';
  if (/^Bash/.test(tool)) return `$ ${txt}`;
  if (/^(Read|NotebookRead)$/.test(tool)) return `📖 ${txt}`;
  if (/^(Grep|Glob|LS)$/.test(tool)) return `🔍 ${txt}`;
  if (/^(Edit|Write|MultiEdit|NotebookEdit)$/.test(tool)) return `✏️ ${txt}`;
  if (/^Web/.test(tool)) return `🌐 ${txt}`;
  if (tool === 'TodoWrite') return '📋 plánuje úkoly';
  if (tool.startsWith('mcp__')) return `☎️ ${txt}`;
  return txt || tool;
}


/** Activities in which the agent waits for the user – the employee is free to slack off. */
export const FREE = new Set(['idle', 'surfing', 'sleeping']);
