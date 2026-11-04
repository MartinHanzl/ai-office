'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Store, LEVELS } = require('../src/store');

const tmpStore = () => new Store(fs.mkdtempSync(path.join(os.tmpdir(), 'ai-office-test-')));

test('profiles get stable, unique names', () => {
  const store = tmpStore();
  const a = store.profile('/p/eshop', 'eshop');
  const b = store.profile('/p/api', 'api');
  assert.equal(store.profile('/p/eshop', 'eshop').name, a.name);
  assert.notEqual(a.name, b.name);
});

test('XP and promotion', () => {
  const store = tmpStore();
  store.profile('/p/x', 'x');
  let promoted = null;
  for (let i = 0; i < LEVELS[1].xp; i++) promoted = store.recordTool('/p/x', 'terminal') ?? promoted;
  assert.equal(promoted, 1);
  const p = store.publicProfile('/p/x');
  assert.equal(p.title, LEVELS[1].title);
  assert.equal(p.nextXp, LEVELS[2].xp);
});

test('daily stats and employee of the week', () => {
  const store = tmpStore();
  store.profile('/p/a', 'a');
  store.profile('/p/b', 'b');
  store.recordDone('/p/a', 60_000);
  store.recordDone('/p/b', 30_000);
  store.recordDone('/p/b', 30_000);
  store.recordCost('/p/b', 1.25);
  store.recordTool('/p/b', 'editing');
  const stats = store.stats();
  assert.equal(stats.today.length, 2);
  assert.equal(stats.employeeOfWeek.key, '/p/b');
  const b = stats.today.find((r) => r.key === '/p/b');
  assert.deepEqual([b.done, b.workMs, b.cost, b.tools.editing], [2, 60_000, 1.25, 1]);
});

test('ignores absurd values', () => {
  const store = tmpStore();
  store.profile('/p/a', 'a');
  store.recordWork('/p/a', -5);
  store.recordWork('/p/a', 48 * 3_600_000);
  store.recordCost('/p/a', -1);
  const row = store.stats().today.find((r) => r.key === '/p/a');
  assert.equal(row?.workMs ?? 0, 0);
  assert.equal(row?.cost ?? 0, 0);
});

test('persists real data but never demo sessions', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-office-test-'));
  const store = new Store(dir);
  store.profile('/p/real', 'real');
  store.profile('demo:/p/fake', 'fake');
  store.recordDone('/p/real', 1000);
  store.recordDone('demo:/p/fake', 1000);
  store.flush();
  const saved = JSON.parse(fs.readFileSync(path.join(dir, 'office-data.json'), 'utf8'));
  assert.ok(saved.profiles['/p/real']);
  assert.equal(saved.profiles['demo:/p/fake'], undefined);
  assert.ok(Object.values(saved.days).every((perKey) => !perKey['demo:/p/fake']));
  const reloaded = new Store(dir);
  assert.equal(reloaded.publicProfile('/p/real').done, 1);
});
