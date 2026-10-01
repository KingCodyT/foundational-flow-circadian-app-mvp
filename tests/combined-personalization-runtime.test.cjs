const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-typescript.cjs');
const { advancePersonalization: advance, resolvePersonalizationReview: resolve, initializeAcceptedFocus: initialize, runtimeSelectors: selectors, UNSET_FOCUS } = load('lib/personalization/runtime.ts');
const { buildDerivedEnvironment } = load('lib/personalization/derived-environment.ts');
const { decodeStorage, createStorageSession } = load('lib/personalization/storage-migration.ts');
const { assembleNowCoachingDecision } = load('lib/personalization/now-coaching.ts');
const profile = { timeZone: 'UTC', wakeTime: '07:00', targetBedtime: '22:00', locationPermissionGranted: false };
const at = '2026-09-10T12:00:00Z';
function input(overrides = {}) {
  return { answers: { morning_light_timing: 'within_15', late_meals_stimulants: 'within_1_hour', sleep_schedule: 'low' }, profile,
    now: new Date(at), environment: buildDerivedEnvironment({ profile, date: new Date(at), now: new Date(at) }),
    context: { timeZone: 'UTC', wakeTime: '07:00', targetBedtime: '22:00', dayLengthMinutes: 720, capturedAt: at }, ...overrides };
}
function meals(n, time = '18:00') {
  return Object.fromEntries(Array.from({ length: n }, (_, i) => {
    const date = `2026-09-${String(i + 1).padStart(2, '0')}`;
    return [date, [{ id: `meal-${i}`, action: 'MEAL_STARTED', source: 'USER', at: `${date}T${time}:00Z`, historicalContext: {
      capturedAt: `${date}T${time}:00Z`, timeZone: 'UTC', latitude: null, longitude: null,
      wakeAt: `${date}T07:00:00Z`, targetSleepAt: `${date}T22:00:00Z`, sunriseAt: null, sunsetAt: `${date}T19:00:00Z`, morningLightAt: null,
    } }]];
  }));
}
const food = r => r.state.perSignal.last_meal_timing;
const clone = v => JSON.parse(JSON.stringify(v));
test('food progression is applied once: seven aligned days do not jump two stages in one rebuild', () => {
  const source = input({ foodTimingEvidenceByDate: meals(7) });
  let r = advance(null, source);
  assert.equal(food(r).coachingState, 'DEVELOPING');
  assert.equal(advance(r, source), r);
  const contextOnly = { ...source, context: { ...source.context, capturedAt: '2026-09-11T00:00:00Z', dayLengthMinutes: 730 } };
  r = advance(r, contextOnly); assert.equal(food(r).coachingState, 'DEVELOPING');
  r = advance(r, { ...contextOnly, foodTimingEvidenceByDate: meals(8) }); assert.equal(food(r).coachingState, 'ESTABLISHED');
});
test('food progression does not undo daily-earned Established', () => {
  const source = input(), first = advance(null, source);
  const eventStateByDate = Object.fromEntries(Array.from({ length: 6 }, (_, i) => [`2026-09-0${i + 1}`, { last_meal: { status: 'completed', at: `2026-09-0${i + 1}T18:00:00Z` } }]));
  const next = advance(first, { ...source, eventStateByDate });
  assert.equal(food(next).coachingState, 'ESTABLISHED');
});
test('historical context corrections are review metadata, not new meal evidence or progression', () => {
  const source = input({ foodTimingEvidenceByDate: meals(3) });
  const first = advance(null, source), prior = clone(food(first));
  const changed = clone(source.foodTimingEvidenceByDate);
  changed['2026-09-01'][0].historicalContext.targetSleepAt = '2026-09-01T19:00:00Z';
  const corrected = { ...source, foodTimingEvidenceByDate: changed };
  const pending = advance(first, corrected);
  assert.deepEqual(food(pending).evidence, prior.evidence); assert.deepEqual(food(pending).confidence, prior.confidence);
  assert.equal(food(pending).coachingState, prior.coachingState);
  assert.deepEqual(food(pending).reconsideration.reasons, ['HISTORICAL_FOOD_CONTEXT_CHANGED']);
  assert.equal(pending.evidenceKeys.last_meal_timing, first.evidenceKeys.last_meal_timing);
  for (const id of Object.keys(first.state.perSignal).filter(id => id !== 'last_meal_timing')) assert.equal(pending.state.perSignal[id], first.state.perSignal[id], id);
  const resolved = resolve(pending, corrected, 'last_meal_timing', at);
  assert.equal(food(resolved).reconsideration, undefined); assert.deepEqual(food(resolved), food(first));
});
test('food Established, evidence and confidence stay accepted while pending; observed edits remain available for resolution', () => {
  const source = input({ answers: { late_meals_stimulants: '2_to_3_hours' }, foodTimingEvidenceByDate: meals(7) });
  const first = advance(null, source); assert.equal(food(first).coachingState, 'ESTABLISHED');
  const context = { ...source.context, targetBedtime: '20:00' };
  const changed = { ...source, context, foodTimingEvidenceByDate: meals(7, '21:00') };
  const pending = advance(first, changed);
  assert.equal(food(pending).coachingState, 'ESTABLISHED'); assert.deepEqual(food(pending).evidence, food(first).evidence);
  assert.deepEqual(food(pending).confidence, food(first).confidence);
  const resolved = resolve(pending, changed, 'last_meal_timing', at);
  assert.equal(food(resolved).reconsideration, undefined); assert.equal(food(resolved).coachingState, 'DEVELOPING');
  assert.equal(resolved.resolutions.length, 1);
  assert.equal(resolve(resolved, changed, 'last_meal_timing', at), resolved);
});
test('intents and receipt metadata never manufacture a meal, confidence gain or progression', () => {
  const source = input(), first = advance(null, source);
  const next = advance(first, { ...source, foodTimingEvidenceByDate: { '2026-09-01': [{ id: 'intent', action: 'NOT_YET', source: 'USER', at }] } });
  assert.equal(food(next), food(first)); assert.equal(next.evidenceKeys.last_meal_timing, first.evidenceKeys.last_meal_timing);
  const actual = { ...source, foodTimingEvidenceByDate: meals(3) }, observed = advance(null, actual);
  const altered = clone(actual.foodTimingEvidenceByDate); altered['2026-09-01'][0].updatedAt = at;
  const result = advance(observed, { ...actual, foodTimingEvidenceByDate: altered });
  assert.equal(food(result), food(observed));
});
test('legacy food without historical context cannot become adverse behavior solely through a changed profile', () => {
  const legacy = meals(3); for (const day of Object.values(legacy)) delete day[0].historicalContext;
  const source = input({ foodTimingEvidenceByDate: legacy }), first = advance(null, source);
  const changed = { ...source, profile: { ...profile, targetBedtime: '19:00' }, context: { ...source.context, targetBedtime: '19:00' } };
  const next = advance(first, changed);
  assert.equal(food(next).coachingState, food(first).coachingState); assert.deepEqual(food(next).confidence, food(first).confidence);
  assert.ok(food(next).reconsideration.reasons.includes('SCHEDULE_CHANGED'));
});
test('canonical reorder and clock-only capture changes are identity-stable no-ops', () => {
  const source = input({ foodTimingEvidenceByDate: meals(3) }), first = advance(null, source);
  const next = { ...source, answers: Object.fromEntries(Object.entries(source.answers).reverse()),
    foodTimingEvidenceByDate: Object.fromEntries(Object.entries(source.foodTimingEvidenceByDate).reverse()),
    context: { ...source.context, capturedAt: '2026-09-10T13:00:00Z' }, now: new Date('2026-09-10T13:00:00Z') };
  assert.equal(advance(first, next), first);
});
test('location/timezone/schedule/seasonal reasons remain separate and resolution is per signal', () => {
  const source = input({ context: { ...input().context, latitude: 37, longitude: -122 } });
  const first = advance(null, source);
  const changed = { ...source, context: { ...source.context, timeZone: 'Europe/London', latitude: 51, longitude: 0, wakeTime: '09:00', dayLengthMinutes: 900 } };
  const pending = advance(first, changed);
  assert.deepEqual(new Set(pending.state.perSignal.morning_light_timing.reconsideration.reasons), new Set(['TIMEZONE_CHANGED', 'LOCATION_CHANGED', 'SCHEDULE_CHANGED', 'SEASONAL_CONTEXT_CHANGED']));
  const untouched = pending.state.perSignal.sleep_schedule;
  const resolved = resolve(pending, changed, 'morning_light_timing', at);
  assert.equal(resolved.state.perSignal.sleep_schedule, untouched);
  assert.equal(resolved.baselines.sleep_schedule, pending.baselines.sleep_schedule);
});
test('candidate, system initialization, explicit reviewed focus and explicit no-target remain distinct', () => {
  const source = input(), first = advance(null, source);
  const focus = initialize(UNSET_FOCUS, first, at);
  assert.equal(focus.source, 'system-initialization'); assert.equal(focus.acceptedAt, at);
  const changed = advance(first, { ...source, answers: { ...source.answers, morning_light_timing: 'rarely' } });
  const resolved = resolve(changed, { ...source, answers: { ...source.answers, morning_light_timing: 'rarely' } }, 'morning_light_timing', at);
  assert.equal(initialize(focus, resolved, at), focus);
  assert.notEqual(selectors(resolved, focus).candidateTarget.signalId, focus.signalId);
  for (const explicit of [{ ...focus, source: 'explicit' }, { ...focus, source: 'explicit', signalId: null }]) {
    assert.equal(initialize(explicit, resolved, at), explicit);
    assert.equal(selectors(resolved, explicit).day1.primaryCoachingTarget.signalId, explicit.signalId);
  }
});
test('accepted Established focus remains selected and quiet rather than promoting a candidate', () => {
  const source = input({ answers: { morning_light_timing: 'within_15', sleep_schedule: 'low' } }), runtime = advance(null, source);
  const accepted = { version: 1, status: 'accepted', signalId: 'morning_light_timing', acceptedAt: at, source: 'explicit' };
  const selected = selectors(runtime, accepted);
  assert.equal(selected.day1.primaryCoachingTarget.signalId, 'morning_light_timing');
  assert.equal(selected.candidateTarget.signalId, 'sleep_schedule');
  const decision = assembleNowCoachingDecision({ day1: selected.day1, now: new Date(at) });
  assert.equal(decision.shouldSurfacePersonalizedGuidance, false); assert.equal(decision.candidate.disposition, 'SILENT');
});
test('combined runtime revision and system initialization survive the Stage 1 storage decoder', () => {
  const runtime = advance(null, input()), focus = initialize(UNSET_FOCUS, runtime, at);
  const envelope = { schemaVersion: 2, clientId: 'synthetic', answers: input().answers, hasCompletedAudit: true, lastSavedAt: null, personalizationRuntime: runtime, acceptedFocus: focus };
  const decoded = decodeStorage(JSON.stringify(envelope));
  assert.equal(decoded.status, 'ready'); assert.equal(decoded.migrated, false);
  assert.deepEqual(decoded.state.acceptedFocus, focus);
  envelope.personalizationRuntime = { ...runtime, combinedRevision: 2 };
  assert.equal(decodeStorage(JSON.stringify(envelope)).issue, 'unsupported-version');
});
test('legacy pending checkpoint does not acknowledge newer daily evidence until explicit resolution', () => {
  const source = input({ answers: { morning_light_timing: 'rarely' } });
  const legacy = clone(advance(null, source)); delete legacy.combinedRevision;
  legacy.evidenceKeys.morning_light_timing = JSON.stringify(['rarely', null]); legacy.inputKey = '';
  legacy.state.perSignal.morning_light_timing.reconsideration = { status: 'pending', signalId: 'morning_light_timing', shouldReconsider: true, reasons: ['TIMEZONE_CHANGED'], observedAt: at, evidence: [] };
  const eventStateByDate = Object.fromEntries(Array.from({ length: 6 }, (_, i) => [`2026-09-0${i + 1}`, { morning_light: { status: 'completed', at: `2026-09-0${i + 1}T14:00:00Z` } }]));
  const newer = { ...source, eventStateByDate };
  const migrated = advance(legacy, newer);
  assert.equal(migrated.state.perSignal.morning_light_timing.coachingState, 'NEEDS_ATTENTION');
  const resolved = resolve(migrated, newer, 'morning_light_timing', at);
  assert.equal(resolved.state.perSignal.morning_light_timing.coachingState, 'ESTABLISHED');
  assert.equal(resolved.state.perSignal.morning_light_timing.evidence.length, 7);
});
test('food historical date fallback uses saved-profile calendar dates across device timezones', () => {
  const originalTZ = process.env.TZ;
  try {
    for (const device of ['UTC', 'America/Los_Angeles', 'Australia/Sydney']) {
      process.env.TZ = device;
      const observations = meals(3, '21:30');
      for (const entries of Object.values(observations)) {
        entries[0].at = entries[0].at.replace('Z', '+09:00'); delete entries[0].historicalContext;
      }
      const source = input({ profile: { ...profile, timeZone: 'Asia/Tokyo' }, answers: { late_meals_stimulants: '3_plus_hours' }, foodTimingEvidenceByDate: observations });
      assert.equal(food(advance(null, source)).coachingState, 'DEVELOPING', device);
    }
  } finally { if (originalTZ === undefined) delete process.env.TZ; else process.env.TZ = originalTZ; }
});
test('pending food review retains accepted raw meal and historical context provenance separately from incoming edits', () => {
  const source = input({ answers: { late_meals_stimulants: '2_to_3_hours' }, foodTimingEvidenceByDate: meals(7) });
  const first = advance(null, source);
  const changed = { ...source, context: { ...source.context, wakeTime: '09:00' }, foodTimingEvidenceByDate: meals(7, '21:30') };
  const pending = advance(first, changed);
  assert.deepEqual(pending.acceptedFoodEvidence, source.foodTimingEvidenceByDate);
  assert.notDeepEqual(pending.acceptedFoodEvidence, changed.foodTimingEvidenceByDate);
  const resolved = resolve(pending, changed, 'last_meal_timing', at);
  assert.deepEqual(resolved.acceptedFoodEvidence, changed.foodTimingEvidenceByDate);
  assert.deepEqual(resolved.resolutions[0].priorFoodEvidence, source.foodTimingEvidenceByDate);
});
test('legacy history fragments without an answer remain history, not undefined behavioral answers', () => {
  const legacyHistory = { morning_light_timing: [{ source: ['SYSTEM_CONTEXT'], status: 'unknown' }] };
  const runtime = advance(null, input({ answers: {}, legacyHistory }));
  assert.deepEqual(runtime.history, legacyHistory);
  assert.equal(Object.hasOwn(runtime.acceptedAnswers, 'morning_light_timing'), false);
  assert.equal(runtime.state.perSignal.morning_light_timing.coachingState, undefined);
  const decoded = decodeStorage(JSON.stringify({ schemaVersion: 2, personalizationRuntime: runtime, acceptedFocus: UNSET_FOCUS }));
  assert.equal(decoded.status, 'ready');
});
