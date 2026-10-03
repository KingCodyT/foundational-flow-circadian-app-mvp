const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-typescript.cjs');

const { applyReconsideration, recordAssessmentAnswerChange } = load('lib/personalization/reconsideration-application.ts');
const { selectPrimaryCoachingTarget } = load('lib/personalization/primary-target.ts');
const { CoachingState, HierarchyLayer, SignalClassification } = load('lib/personalization/types.ts');

function context(overrides = {}) {
  return {
    timeZone: 'America/Los_Angeles',
    latitude: 37.7749,
    longitude: -122.4194,
    wakeTime: '07:00',
    targetBedtime: '22:30',
    dayLengthMinutes: 720,
    capturedAt: '2026-09-01T10:00:00Z',
    ...overrides,
  };
}

function signal(id, coachingState = CoachingState.NEEDS_ATTENTION, score = 55) {
  const hierarchy = {
    morning_light_timing: HierarchyLayer.MORNING_LIGHT_CIRCADIAN_ANCHOR,
    morning_movement: HierarchyLayer.OPTIMIZATION,
    day_brightness: HierarchyLayer.DAYTIME_LIGHT_ENVIRONMENT,
    sleep_schedule: HierarchyLayer.SLEEP_OPPORTUNITY_TIMING,
  }[id];
  return {
    id,
    classification: SignalClassification.BEHAVIOR,
    coachingState,
    confidence: { score: 0.6, lastEvidenceAt: '2026-08-31T10:00:00Z', sources: [id] },
    evidence: [{ questionId: id, answer: 'sometimes', answerScore: score, source: ['QUESTIONNAIRE'] }],
    hierarchy,
  };
}

function stateWith(...signals) {
  return {
    generatedAt: '2026-09-01T10:00:00Z',
    perSignal: Object.fromEntries(signals.map((item) => [item.id, item])),
  };
}

function triggered(result) {
  return Object.entries(result.reconsiderations)
    .filter(([, value]) => value.shouldReconsider)
    .map(([signalId]) => signalId)
    .sort();
}

test('timezone, location, schedule, and seasonal changes reconsider only relevant signals', () => {
  const state = stateWith(
    signal('morning_light_timing'),
    signal('morning_movement'),
    signal('day_brightness'),
    signal('sleep_schedule'),
  );

  const timezone = applyReconsideration({
    state,
    priorContext: context(),
    currentContext: context({ timeZone: 'Europe/London', capturedAt: '2026-09-02T10:00:00Z' }),
  });
  assert.deepEqual(triggered(timezone), ['day_brightness', 'morning_light_timing', 'sleep_schedule']);
  assert.ok(timezone.reconsiderations.sleep_schedule.reasons.includes('TIMEZONE_CHANGED'));

  const location = applyReconsideration({
    state,
    priorContext: context(),
    currentContext: context({ latitude: 51.5074, longitude: -0.1278, capturedAt: '2026-09-02T10:00:00Z' }),
  });
  assert.deepEqual(triggered(location), ['day_brightness', 'morning_light_timing']);
  assert.ok(location.reconsiderations.morning_light_timing.reasons.includes('LOCATION_CHANGED'));

  const schedule = applyReconsideration({
    state,
    priorContext: context(),
    currentContext: context({ wakeTime: '05:00', targetBedtime: '21:00', capturedAt: '2026-09-02T10:00:00Z' }),
  });
  assert.deepEqual(triggered(schedule), ['day_brightness', 'morning_light_timing', 'morning_movement', 'sleep_schedule']);
  assert.ok(schedule.reconsiderations.morning_movement.reasons.includes('SCHEDULE_CHANGED'));

  const seasonal = applyReconsideration({
    state,
    priorContext: context(),
    currentContext: context({ dayLengthMinutes: 800, capturedAt: '2026-09-02T10:00:00Z' }),
  });
  assert.deepEqual(triggered(seasonal), ['day_brightness', 'morning_light_timing']);
  assert.ok(seasonal.reconsiderations.day_brightness.reasons.includes('SEASONAL_CONTEXT_CHANGED'));
});

test('reconsideration preserves established progress, confidence, evidence, and unrelated signal identity', () => {
  const established = signal('morning_light_timing', CoachingState.ESTABLISHED, 100);
  const unrelated = signal('morning_movement', CoachingState.DEVELOPING, 55);
  const state = stateWith(established, unrelated);
  const beforeEvidence = structuredClone(established.evidence);
  const beforeConfidence = structuredClone(established.confidence);

  const result = applyReconsideration({
    state,
    priorContext: context(),
    currentContext: context({ timeZone: 'Europe/London', capturedAt: '2026-09-02T10:00:00Z' }),
  });

  assert.equal(result.state.perSignal.morning_light_timing.coachingState, CoachingState.ESTABLISHED);
  assert.deepEqual(result.state.perSignal.morning_light_timing.confidence, beforeConfidence);
  assert.deepEqual(result.state.perSignal.morning_light_timing.evidence, beforeEvidence);
  assert.equal(result.state.perSignal.morning_movement, unrelated);
  assert.equal(result.state.perSignal.morning_light_timing.reconsideration.shouldReconsider, true);
});

test('context changes do not fabricate behavior or alter primary target selection', () => {
  const state = stateWith(
    signal('morning_light_timing', CoachingState.NEEDS_ATTENTION, 75),
    signal('sleep_schedule', CoachingState.NEEDS_ATTENTION, 15),
  );
  const targetBefore = selectPrimaryCoachingTarget(state).signalId;
  const result = applyReconsideration({
    state,
    priorContext: context(),
    currentContext: context({ timeZone: 'Europe/London', capturedAt: '2026-09-02T10:00:00Z' }),
  });

  assert.equal(selectPrimaryCoachingTarget(result.state).signalId, targetBefore);
  for (const id of Object.keys(state.perSignal)) {
    assert.deepEqual(result.state.perSignal[id].evidence, state.perSignal[id].evidence);
    assert.equal(result.state.perSignal[id].coachingState, state.perSignal[id].coachingState);
  }
});

test('semantic answer conflicts retain both values and do not reset confidence or coaching state', () => {
  const history = recordAssessmentAnswerChange({}, 'morning_light_timing', 'morning_light_timing', 'rarely', 'often');
  const current = signal('morning_light_timing', CoachingState.ESTABLISHED, 100);
  const state = stateWith(current);
  const confidenceBefore = structuredClone(current.confidence);

  const result = applyReconsideration({ state, evidenceHistory: history });
  const reconsideration = result.state.perSignal.morning_light_timing.reconsideration;

  assert.ok(reconsideration.reasons.includes('EVIDENCE_CONFLICT'));
  assert.deepEqual(new Set(reconsideration.evidence.map((item) => item.answer)), new Set(['rarely', 'often', 'sometimes']));
  assert.equal(result.state.perSignal.morning_light_timing.coachingState, CoachingState.ESTABLISHED);
  assert.deepEqual(result.state.perSignal.morning_light_timing.confidence, confidenceBefore);
  assert.deepEqual(result.state.perSignal.morning_light_timing.evidence, current.evidence);
});

test('first answers and duplicate answer values do not create false evidence conflicts', () => {
  assert.deepEqual(recordAssessmentAnswerChange({}, 'morning_light_timing', 'morning_light_timing', null, 'often'), {});
  const history = recordAssessmentAnswerChange({}, 'morning_light_timing', 'morning_light_timing', 'rarely', 'often');
  const repeated = recordAssessmentAnswerChange(history, 'morning_light_timing', 'morning_light_timing', 'rarely', 'often');
  assert.equal(repeated.morning_light_timing.length, 2);

  const result = applyReconsideration({
    state: stateWith(signal('morning_light_timing')),
    evidenceHistory: repeated,
  });
  assert.ok(result.reconsiderations.morning_light_timing.reasons.includes('EVIDENCE_CONFLICT'));
});

test('midnight-crossing schedule comparison remains circular and threshold-aware', () => {
  const state = stateWith(signal('sleep_schedule'));
  const smallCrossing = applyReconsideration({
    state,
    priorContext: context({ wakeTime: '23:30', targetBedtime: '23:30' }),
    currentContext: context({ wakeTime: '00:15', targetBedtime: '00:15' }),
  });
  const thresholdCrossing = applyReconsideration({
    state,
    priorContext: context({ wakeTime: '23:00', targetBedtime: '23:00' }),
    currentContext: context({ wakeTime: '00:30', targetBedtime: '00:30' }),
  });

  assert.equal(smallCrossing.reconsiderations.sleep_schedule.shouldReconsider, false);
  assert.equal(thresholdCrossing.reconsiderations.sleep_schedule.shouldReconsider, true);
});