const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-typescript.cjs');

const {
  buildFoodTimingAnchorsFromFlow,
  buildFoodJourneySnapshot,
  buildFoodJourneyPrompt,
  getFoodJourneySurfaceMode,
} = load('lib/personalization/circadian-food-journey.ts');

function event(id, start) {
  return {
    id,
    name: id,
    start: new Date(start),
    status: 'upcoming',
    guidance: '',
  };
}

const events = [
  event('morning_light', '2026-09-13T14:00:00.000Z'),
  event('first_meal', '2026-09-13T14:30:00.000Z'),
  event('sunset', '2026-09-14T01:00:00.000Z'),
  event('sleep_window', '2026-09-14T04:45:00.000Z'),
];

test('derives only known food timing anchors from the existing flow', () => {
  const anchors = buildFoodTimingAnchorsFromFlow(events);

  assert.equal(anchors.wakeAt, '2026-09-13T14:00:00.000Z');
  assert.equal(anchors.morningLightAt, '2026-09-13T14:00:00.000Z');
  assert.equal(anchors.sunsetAt, '2026-09-14T01:00:00.000Z');
  assert.equal(anchors.darknessAt, null);
  assert.equal(anchors.targetSleepAt, '2026-09-14T05:30:00.000Z');
});

test('journey snapshot preserves direct meal evidence and relationships', () => {
  const snapshot = buildFoodJourneySnapshot({
    events,
    evidence: [
      { id: 'meal-1', action: 'MEAL_STARTED', at: '2026-09-13T15:00:00.000Z', source: 'USER' },
      { id: 'intent-1', action: 'EATING_LATER', at: '2026-09-13T22:00:00.000Z', source: 'USER' },
      { id: 'meal-2', action: 'MEAL_STARTED', at: '2026-09-14T00:00:00.000Z', source: 'USER' },
    ],
  });

  assert.equal(snapshot.mealCount, 2);
  assert.equal(snapshot.firstMeal.minutesFromWake, 60);
  assert.equal(snapshot.lastMeal.minutesFromSunset, -60);
  assert.equal(snapshot.lastMeal.minutesBeforeTargetSleep, 330);
  assert.equal(snapshot.eatingSpanMinutes, 540);
  assert.equal(snapshot.intentSignals.length, 1);
});

test('prompt asks for minimal evidence without prescribing a meal time', () => {
  const empty = buildFoodJourneySnapshot({ events, evidence: [] });
  const firstPrompt = buildFoodJourneyPrompt(empty);
  assert.equal(firstPrompt.secondaryAction, 'NOT_YET');
  assert.match(firstPrompt.guidance, /No calories, macros, photos, or food score/);

  const started = buildFoodJourneySnapshot({
    events,
    evidence: [
      { id: 'meal-1', action: 'MEAL_STARTED', at: '2026-09-13T15:00:00.000Z', source: 'USER' },
    ],
  });
  const laterPrompt = buildFoodJourneyPrompt(started);
  assert.equal(laterPrompt.secondaryAction, 'EATING_LATER');
  assert.doesNotMatch(laterPrompt.guidance, /must|should|bad|good/i);
});

test('stronger biological moments hide Food from the foreground', () => {
  for (const activeEventId of ['morning_light', 'sunset', 'dim_house', 'digital_sunset', 'sleep_window']) {
    assert.equal(
      getFoodJourneySurfaceMode({ activeEventId, primarySignalId: 'last_meal_timing' }),
      'HIDDEN',
      activeEventId,
    );
  }
});

test('Food gets the full surface in meal moments or when Food owns the primary target', () => {
  assert.equal(getFoodJourneySurfaceMode({ activeEventId: 'first_meal', primarySignalId: null }), 'FULL');
  assert.equal(getFoodJourneySurfaceMode({ activeEventId: 'last_meal', primarySignalId: null }), 'FULL');
  assert.equal(getFoodJourneySurfaceMode({ activeEventId: 'movement', primarySignalId: 'last_meal_timing' }), 'FULL');
  assert.equal(getFoodJourneySurfaceMode({ activeEventId: null, primarySignalId: 'meal_timing_regularity' }), 'FULL');
});

test('neutral moments keep only compact capture instead of a permanent second coaching card', () => {
  assert.equal(getFoodJourneySurfaceMode({ activeEventId: 'movement', primarySignalId: 'morning_light_timing' }), 'CAPTURE_ONLY');
  assert.equal(getFoodJourneySurfaceMode({ activeEventId: null, primarySignalId: null }), 'CAPTURE_ONLY');
});
