'use strict';
/**
 * Persistent office data (userData/office-data.json):
 *  - profiles: one named employee per project with XP and a career level
 *  - days: per-day statistics per project (tasks, tool usage, working time, cost)
 */
const fs = require('node:fs');
const path = require('node:path');

const NAMES = [
  'Pepa', 'Jarda', 'Franta', 'Věra', 'Hanka', 'Lojza', 'Bára', 'Mirek', 'Zdena', 'Tonda',
  'Jitka', 'Karel', 'Olga', 'Venca', 'Marta', 'Ruda', 'Eva', 'Standa', 'Lenka', 'Bohouš',
  'Dáša', 'Kuba', 'Iva', 'Ota', 'Petra', 'Láďa', 'Míša', 'Radek', 'Šárka', 'Vilda',
];

const LEVELS = [
  { title: 'Junior', xp: 0 },
  { title: 'Medior', xp: 150 },
  { title: 'Senior', xp: 600 },
  { title: 'Lead', xp: 1500 },
  { title: 'Ředitel', xp: 4000 },
];
const XP_DONE = 10;
const XP_TOOL = 1;
const KEEP_DAYS = 60;

function levelFor(xp) {
  let i = 0;
  while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1].xp) i += 1;
  return i;
}

function hash(str) {
  let h = 2166136261;
  for (const ch of String(str)) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const isDemo = (key) => key.startsWith('demo:');

const dayKey = (date = new Date()) => date.toLocaleDateString('sv-SE'); // YYYY-MM-DD, local time

class Store {
  constructor(dir) {
    this.file = path.join(dir, 'office-data.json');
    this.data = { profiles: {}, days: {} };
    this.timer = null;
    try {
      const saved = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      this.data = { profiles: saved.profiles ?? {}, days: saved.days ?? {} };
    } catch { /* first run */ }
    this.prune();
  }

  save() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), 2000);
  }

  flush() {
    clearTimeout(this.timer);
    // demo sessions live only in memory
    const real = (obj) => Object.fromEntries(Object.entries(obj).filter(([k]) => !isDemo(k)));
    const days = Object.fromEntries(Object.entries(this.data.days).map(([d, perKey]) => [d, real(perKey)]));
    try {
      fs.writeFileSync(this.file, JSON.stringify({ profiles: real(this.data.profiles), days }));
    } catch (err) {
      console.error(`[ai-office] store: ${err.message}`);
    }
  }

  prune() {
    const cutoff = dayKey(new Date(Date.now() - KEEP_DAYS * 86_400_000));
    for (const day of Object.keys(this.data.days)) if (day < cutoff) delete this.data.days[day];
  }

  /** Get or create the employee for a project. */
  profile(key, label) {
    let p = this.data.profiles[key];
    if (!p) {
      const used = new Set(Object.values(this.data.profiles).map((x) => x.name));
      const start = hash(key) % NAMES.length;
      let name = NAMES[start];
      for (let i = 1; i < NAMES.length && used.has(name); i++) name = NAMES[(start + i) % NAMES.length];
      if (used.has(name)) name = `${NAMES[start]} ${Object.keys(this.data.profiles).length + 1}`;
      p = { name, label, xp: 0, done: 0, since: Date.now() };
      this.data.profiles[key] = p;
      this.save();
    }
    return p;
  }

  publicProfile(key) {
    const p = this.data.profiles[key];
    if (!p) return null;
    const level = levelFor(p.xp);
    return {
      key, name: p.name, label: p.label, xp: p.xp, done: p.done, level,
      title: LEVELS[level].title, levelXp: LEVELS[level].xp, nextXp: LEVELS[level + 1]?.xp ?? null,
    };
  }

  /** @returns {number|null} new level index when the employee got promoted */
  addXp(key, amount) {
    const p = this.data.profiles[key];
    if (!p) return null;
    const before = levelFor(p.xp);
    p.xp += amount;
    this.save();
    const after = levelFor(p.xp);
    return after > before ? after : null;
  }

  day(key) {
    const d = dayKey();
    this.data.days[d] ??= {};
    this.data.days[d][key] ??= { done: 0, tools: {}, workMs: 0, cost: 0 };
    return this.data.days[d][key];
  }

  recordTool(key, category) {
    const day = this.day(key);
    day.tools[category] = (day.tools[category] ?? 0) + 1;
    return this.addXp(key, XP_TOOL);
  }

  recordWork(key, ms) {
    if (ms > 0 && ms < 12 * 3_600_000) this.day(key).workMs += ms;
    this.save();
  }

  recordDone(key, ms) {
    this.recordWork(key, ms);
    this.day(key).done += 1;
    const p = this.data.profiles[key];
    if (p) p.done += 1;
    return this.addXp(key, XP_DONE);
  }

  recordCost(key, usd) {
    if (usd > 0 && usd < 1000) this.day(key).cost += usd;
    this.save();
  }

  /** Aggregates for the stats panel: today, last 7 days, employee of the week. */
  stats() {
    const today = dayKey();
    const weekStart = dayKey(new Date(Date.now() - 6 * 86_400_000));
    const collect = (filter) => {
      const rows = new Map();
      for (const [day, perKey] of Object.entries(this.data.days)) {
        if (!filter(day)) continue;
        for (const [key, s] of Object.entries(perKey)) {
          if (isDemo(key) && !this.showDemo) continue;
          const row = rows.get(key) ?? { ...this.publicProfile(key), key, done: 0, workMs: 0, cost: 0, tools: {} };
          row.done += s.done;
          row.workMs += s.workMs;
          row.cost += s.cost;
          for (const [cat, n] of Object.entries(s.tools)) row.tools[cat] = (row.tools[cat] ?? 0) + n;
          rows.set(key, row);
        }
      }
      return [...rows.values()].sort((a, b) => b.done - a.done || b.workMs - a.workMs);
    };
    const week = collect((d) => d >= weekStart);
    const top = week.find((r) => r.done > 0) ?? null;
    return {
      today: collect((d) => d === today),
      week,
      employeeOfWeek: top ? { key: top.key, name: top.name, label: top.label, level: top.level, title: top.title, done: top.done } : null,
    };
  }
}

module.exports = { Store, LEVELS };
