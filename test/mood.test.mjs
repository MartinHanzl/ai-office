import test from 'node:test';
import assert from 'node:assert/strict';
import { createMood, emotionOf, moodEvent, moodIdleWeights, moodSpeed } from '../renderer/src/entities/mood.js';
import { now } from '../renderer/src/core/util.js';

const worker = (extra = {}) => ({
  mood: createMood(), interns: [], extraInterns: 0, activity: 'typing', waiting: false,
  context: 20, idle: null, isFree: false, freeSince: null, bubble: null, walking: false, say() {},
  ...extra,
});

test('a fresh employee is neutral', () => {
  assert.equal(emotionOf(worker()), 'neutral');
});

test('repeated errors frustrate, success relieves', () => {
  const w = worker();
  moodEvent(w, 'error');
  assert.notEqual(emotionOf(w), 'frustrated');
  moodEvent(w, 'error');
  assert.equal(emotionOf(w), 'frustrated');
  assert.ok(moodSpeed({ mood: { current: 'frustrated' } }) > 1);
  moodEvent(w, 'done', { workMs: 60_000 });
  assert.notEqual(emotionOf(w), 'frustrated');
});

test('waiting long for permission makes them impatient', () => {
  const w = worker({ waiting: true, activity: 'waiting' });
  moodEvent(w, 'waiting');
  assert.notEqual(emotionOf(w), 'impatient');
  w.mood.waitingSince = now() - 60_000;
  assert.equal(emotionOf(w), 'impatient');
});

test('full context while working is stressful', () => {
  assert.equal(emotionOf(worker({ context: 85 })), 'stressed');
  assert.notEqual(emotionOf(worker({ context: 85, activity: 'idle' })), 'stressed');
});

test('promotion and celebrations flash an emotion', () => {
  const w = worker();
  moodEvent(w, 'levelUp');
  assert.equal(emotionOf(w), 'proud');
  const c = worker();
  moodEvent(c, 'celebrate');
  assert.equal(emotionOf(c), 'happy');
});

test('three interns at once are overwhelming', () => {
  const w = worker({ extraInterns: 1, interns: [{ leaving: false }, { leaving: false }] });
  assert.equal(emotionOf(w), 'overwhelmed');
});

test('low energy means tired and steers breaks to coffee', () => {
  const w = worker();
  w.mood.energy = -0.8;
  assert.equal(emotionOf(w), 'tired');
  w.mood.current = 'tired';
  assert.ok(moodIdleWeights(w).coffee > 1);
  assert.ok(moodSpeed(w) < 1);
});

test('long tasks tire employees out', () => {
  const short = worker();
  const long = worker();
  moodEvent(short, 'done', { workMs: 60_000 });
  moodEvent(long, 'done', { workMs: 30 * 60_000 });
  assert.ok(long.mood.energy < short.mood.energy);
});
