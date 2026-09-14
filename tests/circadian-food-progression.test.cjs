const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-typescript.cjs');

const { progressCircadianFoodTiming } = load('lib/personalization/circadian-food-progression.ts');
const { CoachingState } = load('lib/personalization/types.ts');

function day(date, minutesBeforeTargetSleep, { minutesFromSunset = -120, mealCount = 1 } = {}) {
  return {
    date,
    snapshot: {
      mealCount,
      firstMeal: mealCount ? { minutesFromWake: 60 } : null,
      lastMeal: mealCount ? { minutesBeforeTargetSleep, minutesFromSunset } : null,
      eatingSpanMinutes: null,
      meals: [],
      intentSignals: [],
    },
  };
}

function alignedDays(count, options) {
  return Array.from({ length: count }, (_, index) =>
    day(`2026-09-${String(index + 1).padStart(2, '0')}`, 180, options),
  );
}

test('one aligned day does not advance Needs Attention', () => {
  const result = progressCircadianFoodTiming(CoachingState.NEEDS_ATTENTION, alignedDays(1));
  assert.equal(result.nextState, CoachingState.NEEDS_ATTENTION);
  assert.equal(result.changed, false);
});

test('three aligned observed days can advance Needs Attention to Developing', () => {
  const result = progressCircadianFoodTiming(CoachingState.NEEDS_ATTENTION, alignedDays(3));
  assert.equal(result.nextState, CoachingState.DEVELOPING);
  assert.equal(result.alignedDays, 3);
});

test('seven aligned observed days can advance Developing to Established', () => {
  const result = progressCircadianFoodTiming(CoachingState.DEVELOPING, alignedDays(7));
  assert.equal(result.nextState, CoachingState.ESTABLISHED);
  assert.equal(result.alignedDays, 7);
});

test('after-sunset meals can still count as aligned when well separated from sleep', () => {
  const result = progressCircadianFoodTiming(
    CoachingState.NEEDS_ATTENTION,
    alignedDays(3, { minutesFromSunset: 75 }),
  );
  assert.equal(result.nextState, CoachingState.DEVELOPING);
  assert.equal(result.alignedDays, 3);
});

test('one unusual late meal does not regress Established', () => {
  const observed = [
    ...alignedDays(6),
    day('2026-09-07', 60, { minutesFromSunset: 90 }),
  ];
  const result = progressCircadianFoodTiming(CoachingState.ESTABLISHED, observed);
  assert.equal(result.nextState, CoachingState.ESTABLISHED);
  assert.equal(result.recentMismatchDays, 1);
});

test('two recent mismatch days reopen Established to Developing', () => {
  const observed = [
    ...alignedDays(5),
    day('2026-09-06', 60),
    day('2026-09-07', 45),
  ];
  const result = progressCircadianFoodTiming(CoachingState.ESTABLISHED, observed);
  assert.equal(result.nextState, CoachingState.DEVELOPING);
  assert.equal(result.recentMismatchDays, 2);
});

test('missing meal days remain unknown rather than counting as mismatch', () => {
  const observed = [
    day('2026-09-01', null, { mealCount: 0 }),
    ...alignedDays(3).map((entry, index) => ({ ...entry, date: `2026-09-0${index + 2}` })),
  ];
  const result = progressCircadianFoodTiming(CoachingState.NEEDS_ATTENTION, observed);
  assert.equal(result.alignedDays, 3);
  assert.equal(result.recentMismatchDays, 0);
  assert.equal(result.nextState, CoachingState.DEVELOPING);
});
