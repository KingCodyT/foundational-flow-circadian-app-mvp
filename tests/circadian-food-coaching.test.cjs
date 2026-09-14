const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-typescript.cjs');

const { interpretFoodTimingPattern } = load('lib/personalization/circadian-food-coaching.ts');

function day(date, {
  minutesBeforeTargetSleep = 180,
  minutesFromSunset = -60,
  minutesFromWake = 60,
  mealCount = 1,
} = {}) {
  const meal = mealCount ? {
    minutesBeforeTargetSleep,
    minutesFromSunset,
    minutesFromWake,
  } : null;
  return {
    date,
    snapshot: {
      mealCount,
      firstMeal: meal,
      lastMeal: meal,
      eatingSpanMinutes: null,
      meals: [],
      intentSignals: [],
    },
  };
}

test('requires repeated direct observation before contributing evidence', () => {
  const result = interpretFoodTimingPattern([
    day('2026-09-01', { minutesBeforeTargetSleep: 60 }),
    day('2026-09-02', { minutesBeforeTargetSleep: 60 }),
  ]);
  assert.equal(result.pattern, 'INSUFFICIENT_EVIDENCE');
  assert.equal(result.shouldContributeEvidence, false);
});

test('one unusual late dinner stays quiet', () => {
  const result = interpretFoodTimingPattern([
    day('2026-09-01', { minutesBeforeTargetSleep: 180 }),
    day('2026-09-02', { minutesBeforeTargetSleep: 60 }),
    day('2026-09-03', { minutesBeforeTargetSleep: 180 }),
  ]);
  assert.equal(result.pattern, 'ALIGNED_OR_VARIABLE');
  assert.equal(result.shouldContributeEvidence, false);
});

test('repeated meals close to target sleep contribute to last-meal timing', () => {
  const result = interpretFoodTimingPattern([
    day('2026-09-01', { minutesBeforeTargetSleep: 60, minutesFromSunset: -30 }),
    day('2026-09-02', { minutesBeforeTargetSleep: 75, minutesFromSunset: -15 }),
    day('2026-09-03', { minutesBeforeTargetSleep: 180 }),
  ]);
  assert.equal(result.pattern, 'LATE_LAST_MEAL_PATTERN');
  assert.equal(result.signalId, 'last_meal_timing');
  assert.equal(result.qualifyingDays, 2);
  assert.equal(result.shouldContributeEvidence, true);
});

test('sunset alone does not make a meal late', () => {
  const result = interpretFoodTimingPattern([
    day('2026-09-01', { minutesBeforeTargetSleep: 240, minutesFromSunset: 60 }),
    day('2026-09-02', { minutesBeforeTargetSleep: 210, minutesFromSunset: 90 }),
    day('2026-09-03', { minutesBeforeTargetSleep: 180, minutesFromSunset: 120 }),
  ]);
  assert.equal(result.pattern, 'ALIGNED_OR_VARIABLE');
  assert.equal(result.shouldContributeEvidence, false);
});

test('sunset may describe a repeated late-eating pattern only when meals are also close to sleep', () => {
  const result = interpretFoodTimingPattern([
    day('2026-09-01', { minutesBeforeTargetSleep: 60, minutesFromSunset: 120 }),
    day('2026-09-02', { minutesBeforeTargetSleep: 45, minutesFromSunset: 150 }),
    day('2026-09-03', { minutesBeforeTargetSleep: 180, minutesFromSunset: 60 }),
  ]);
  assert.equal(result.pattern, 'LATE_EATING_DAY_PATTERN');
  assert.equal(result.signalId, 'last_meal_timing');
});

test('a consistently delayed first meal remains observation, not a coaching mismatch', () => {
  const result = interpretFoodTimingPattern([
    day('2026-09-01', { minutesFromWake: 480, minutesBeforeTargetSleep: 240 }),
    day('2026-09-02', { minutesFromWake: 510, minutesBeforeTargetSleep: 240 }),
    day('2026-09-03', { minutesFromWake: 450, minutesBeforeTargetSleep: 240 }),
  ]);
  assert.equal(result.pattern, 'ALIGNED_OR_VARIABLE');
  assert.equal(result.signalId, null);
  assert.equal(result.shouldContributeEvidence, false);
});
