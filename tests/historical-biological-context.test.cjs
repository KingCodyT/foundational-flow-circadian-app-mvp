const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-typescript.cjs');

const { captureHistoricalBiologicalContext } = load('lib/personalization/biological-context.ts');
const { buildCircadianFoodTimingSnapshot } = load('lib/personalization/circadian-food-timing.ts');

test('captures wake, sleep, solar, timezone, and location with evidence context', () => {
  const context = captureHistoricalBiologicalContext({
    at: '2026-09-13T19:00:00.000Z',
    profile: {
      wakeTime: '07:00',
      targetBedtime: '22:30',
      timeZone: 'America/Los_Angeles',
      latitude: 33.54,
      longitude: -117.78,
    },
  });

  assert.equal(context.timeZone, 'America/Los_Angeles');
  assert.equal(context.latitude, 33.54);
  assert.equal(context.longitude, -117.78);
  assert.ok(context.wakeAt);
  assert.ok(context.targetSleepAt);
  assert.ok(context.sunriseAt);
  assert.ok(context.sunsetAt);
});

test('stored historical context wins over a changed current profile fallback', () => {
  const historicalContext = {
    capturedAt: '2026-09-13T19:00:00.000Z',
    timeZone: 'America/Los_Angeles',
    latitude: 33.54,
    longitude: -117.78,
    wakeAt: '2026-09-13T14:00:00.000Z',
    morningLightAt: '2026-09-13T14:00:00.000Z',
    sunriseAt: '2026-09-13T13:30:00.000Z',
    sunsetAt: '2026-09-14T01:00:00.000Z',
    targetSleepAt: '2026-09-14T05:30:00.000Z',
  };

  const evidence = [{
    id: 'meal-1',
    action: 'MEAL_STARTED',
    at: '2026-09-14T02:30:00.000Z',
    source: 'USER',
    historicalContext,
  }];

  const changedCurrentProfileAnchors = {
    wakeAt: '2026-09-13T18:00:00.000Z',
    morningLightAt: '2026-09-13T18:00:00.000Z',
    sunsetAt: '2026-09-14T03:00:00.000Z',
    darknessAt: null,
    targetSleepAt: '2026-09-14T09:30:00.000Z',
  };

  const snapshot = buildCircadianFoodTimingSnapshot({ evidence, anchors: changedCurrentProfileAnchors });
  assert.equal(snapshot.lastMeal.minutesFromWake, 750);
  assert.equal(snapshot.lastMeal.minutesFromSunset, 90);
  assert.equal(snapshot.lastMeal.minutesBeforeTargetSleep, 180);
});

test('legacy evidence without stored context still uses fallback anchors', () => {
  const evidence = [{
    id: 'legacy-meal',
    action: 'MEAL_STARTED',
    at: '2026-09-14T02:30:00.000Z',
    source: 'USER',
  }];
  const anchors = {
    wakeAt: '2026-09-13T18:00:00.000Z',
    morningLightAt: '2026-09-13T18:00:00.000Z',
    sunsetAt: '2026-09-14T03:00:00.000Z',
    darknessAt: null,
    targetSleepAt: '2026-09-14T09:30:00.000Z',
  };
  const snapshot = buildCircadianFoodTimingSnapshot({ evidence, anchors });
  assert.equal(snapshot.lastMeal.minutesFromWake, 510);
  assert.equal(snapshot.lastMeal.minutesFromSunset, -30);
  assert.equal(snapshot.lastMeal.minutesBeforeTargetSleep, 420);
});
