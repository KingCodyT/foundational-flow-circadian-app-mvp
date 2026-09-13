const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-typescript.cjs');

const { buildCircadianFoodTimingSnapshot } = load('lib/personalization/circadian-food-timing.ts');

const anchors = {
  wakeAt: '2026-09-13T06:30:00-07:00',
  morningLightAt: '2026-09-13T06:50:00-07:00',
  sunsetAt: '2026-09-13T19:05:00-07:00',
  darknessAt: '2026-09-13T20:00:00-07:00',
  targetSleepAt: '2026-09-13T22:15:00-07:00',
};

test('builds first meal, last meal, eating span, and anchor relationships', () => {
  const result = buildCircadianFoodTimingSnapshot({
    anchors,
    evidence: [
      { id: 'lunch', action: 'MEAL_STARTED', at: '2026-09-13T12:40:00-07:00', source: 'USER' },
      { id: 'breakfast', action: 'MEAL_STARTED', at: '2026-09-13T08:05:00-07:00', source: 'USER' },
      { id: 'dinner', action: 'MEAL_STARTED', at: '2026-09-13T18:35:00-07:00', source: 'USER' },
    ],
  });

  assert.equal(result.mealCount, 3);
  assert.equal(result.firstMeal.evidenceId, 'breakfast');
  assert.equal(result.lastMeal.evidenceId, 'dinner');
  assert.equal(result.eatingSpanMinutes, 630);
  assert.equal(result.firstMeal.minutesFromWake, 95);
  assert.equal(result.firstMeal.minutesFromMorningLight, 75);
  assert.equal(result.lastMeal.minutesFromSunset, -30);
  assert.equal(result.lastMeal.minutesBeforeTargetSleep, 220);
});

test('keeps not-yet and eating-later as intent rather than meal evidence', () => {
  const result = buildCircadianFoodTimingSnapshot({
    anchors,
    evidence: [
      { id: 'later', action: 'EATING_LATER', at: '2026-09-13T18:00:00-07:00', source: 'USER' },
      { id: 'not-yet', action: 'NOT_YET', at: '2026-09-13T08:00:00-07:00', source: 'USER' },
    ],
  });

  assert.equal(result.mealCount, 0);
  assert.equal(result.firstMeal, null);
  assert.equal(result.lastMeal, null);
  assert.equal(result.eatingSpanMinutes, null);
  assert.deepEqual(result.intentSignals.map((item) => item.action), ['NOT_YET', 'EATING_LATER']);
});

test('does not invent relationships when a biological anchor is unavailable', () => {
  const result = buildCircadianFoodTimingSnapshot({
    anchors: {
      wakeAt: '2026-09-13T06:30:00-07:00',
      targetSleepAt: null,
      sunsetAt: null,
    },
    evidence: [
      { id: 'meal', action: 'MEAL_STARTED', at: '2026-09-13T09:00:00-07:00', source: 'USER' },
    ],
  });

  assert.equal(result.firstMeal.minutesFromWake, 150);
  assert.equal(result.firstMeal.minutesFromSunset, null);
  assert.equal(result.firstMeal.minutesBeforeTargetSleep, null);
});

test('ignores malformed meal timestamps rather than manufacturing evidence', () => {
  const result = buildCircadianFoodTimingSnapshot({
    anchors,
    evidence: [
      { id: 'bad', action: 'MEAL_STARTED', at: 'not-a-date', source: 'USER' },
      { id: 'good', action: 'MEAL_STARTED', at: '2026-09-13T09:15:00-07:00', source: 'USER' },
    ],
  });

  assert.equal(result.mealCount, 1);
  assert.equal(result.firstMeal.evidenceId, 'good');
});

test('does not invent a fasting/eating window from a single meal', () => {
  const result = buildCircadianFoodTimingSnapshot({
    anchors,
    evidence: [
      { id: 'only-meal', action: 'MEAL_STARTED', at: '2026-09-13T12:00:00-07:00', source: 'USER' },
    ],
  });

  assert.equal(result.mealCount, 1);
  assert.equal(result.eatingSpanMinutes, null);
});
