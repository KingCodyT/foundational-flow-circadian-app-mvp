const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-typescript.cjs');

const {
  FOOD_LOG_CONFIRMATION_WINDOW_MS,
  FOOD_LOG_DEDUP_WINDOW_MS,
  getRecentMealLogAt,
  shouldIgnoreRapidMealSubmit,
} = load('lib/personalization/food-timing-action.ts');

function snapshotWithLastMeal(at) {
  return {
    mealCount: at ? 1 : 0,
    firstMeal: at
      ? {
          evidenceId: 'meal-1',
          at,
          minutesFromWake: null,
          minutesFromMorningLight: null,
          minutesFromSunset: null,
          minutesFromDarkness: null,
          minutesBeforeTargetSleep: null,
        }
      : null,
    lastMeal: at
      ? {
          evidenceId: 'meal-1',
          at,
          minutesFromWake: null,
          minutesFromMorningLight: null,
          minutesFromSunset: null,
          minutesFromDarkness: null,
          minutesBeforeTargetSleep: null,
        }
      : null,
    eatingSpanMinutes: null,
    meals: at
      ? [
          {
            evidenceId: 'meal-1',
            at,
            minutesFromWake: null,
            minutesFromMorningLight: null,
            minutesFromSunset: null,
            minutesFromDarkness: null,
            minutesBeforeTargetSleep: null,
          },
        ]
      : [],
    intentSignals: [],
  };
}

test('recent meal log is acknowledged within the confirmation window', () => {
  const now = new Date('2026-09-14T19:20:00.000Z');
  const mealAt = new Date(now.getTime() - (FOOD_LOG_CONFIRMATION_WINDOW_MS - 5000)).toISOString();

  const recent = getRecentMealLogAt({
    snapshot: snapshotWithLastMeal(mealAt),
    now,
  });

  assert.ok(recent instanceof Date);
  assert.equal(recent.toISOString(), mealAt);
});

test('meal acknowledgment expires after the confirmation window', () => {
  const now = new Date('2026-09-14T19:20:00.000Z');
  const staleMealAt = new Date(now.getTime() - (FOOD_LOG_CONFIRMATION_WINDOW_MS + 1000)).toISOString();

  const recent = getRecentMealLogAt({
    snapshot: snapshotWithLastMeal(staleMealAt),
    now,
  });

  assert.equal(recent, null);
});

test('rapid duplicate meal submits are suppressed', () => {
  const firstAt = '2026-09-14T19:20:00.000Z';
  const duplicateAt = new Date(new Date(firstAt).getTime() + FOOD_LOG_DEDUP_WINDOW_MS - 5).toISOString();

  const suppressed = shouldIgnoreRapidMealSubmit({
    currentEvidence: [
      {
        id: 'meal-1',
        action: 'MEAL_STARTED',
        at: firstAt,
        source: 'USER',
      },
    ],
    nextAtIso: duplicateAt,
  });

  assert.equal(suppressed, true);
});

test('later meal submits remain allowed outside dedup window', () => {
  const firstAt = '2026-09-14T19:20:00.000Z';
  const laterAt = new Date(new Date(firstAt).getTime() + FOOD_LOG_DEDUP_WINDOW_MS + 60_000).toISOString();

  const suppressed = shouldIgnoreRapidMealSubmit({
    currentEvidence: [
      {
        id: 'meal-1',
        action: 'MEAL_STARTED',
        at: firstAt,
        source: 'USER',
      },
    ],
    nextAtIso: laterAt,
  });

  assert.equal(suppressed, false);
});
