const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-typescript.cjs');

const { applyCircadianFoodCoachingEvidence } = load('lib/personalization/circadian-food-signal-integration.ts');
const { CoachingState, SignalClassification, SignalSourceType } = load('lib/personalization/types.ts');

const profile = {
  wakeTime: '07:00',
  targetBedtime: '22:00',
  timeZone: null,
  latitude: null,
  longitude: null,
};

function state(coachingState) {
  return {
    generatedAt: '2026-09-13T12:00:00.000Z',
    perSignal: {
      last_meal_timing: {
        id: 'last_meal_timing',
        classification: SignalClassification.BEHAVIOR,
        coachingState,
        evidence: [],
        notes: [],
      },
      meal_timing_regularity: {
        id: 'meal_timing_regularity',
        classification: SignalClassification.BEHAVIOR,
        coachingState: CoachingState.ESTABLISHED,
        evidence: [],
        notes: [],
      },
    },
  };
}

function meal(date, time) {
  return {
    id: `${date}-${time}`,
    action: 'MEAL_STARTED',
    at: `${date}T${time}:00`,
    source: 'USER',
  };
}

function evidenceByDate(entries) {
  return Object.fromEntries(entries.map(([date, time]) => [date, [meal(date, time)]]));
}

test('repeated aligned last-meal evidence can advance Needs Attention to Developing', () => {
  const result = applyCircadianFoodCoachingEvidence(state(CoachingState.NEEDS_ATTENTION), {
    profile,
    evidenceByDate: evidenceByDate([
      ['2026-09-01', '18:00'],
      ['2026-09-02', '18:15'],
      ['2026-09-03', '18:30'],
    ]),
  });
  assert.equal(result.perSignal.last_meal_timing.coachingState, CoachingState.DEVELOPING);
  assert.equal(result.perSignal.last_meal_timing.evidence.length, 0);
});

test('one unusual late dinner does not reopen Established', () => {
  const result = applyCircadianFoodCoachingEvidence(state(CoachingState.ESTABLISHED), {
    profile,
    evidenceByDate: evidenceByDate([
      ['2026-09-01', '18:00'],
      ['2026-09-02', '18:15'],
      ['2026-09-03', '21:15'],
    ]),
  });
  assert.equal(result.perSignal.last_meal_timing.coachingState, CoachingState.ESTABLISHED);
});

test('repeated late dinners reopen Established and contribute direct user evidence', () => {
  const result = applyCircadianFoodCoachingEvidence(state(CoachingState.ESTABLISHED), {
    profile,
    evidenceByDate: evidenceByDate([
      ['2026-09-01', '18:00'],
      ['2026-09-02', '21:15'],
      ['2026-09-03', '21:30'],
    ]),
  });
  const signal = result.perSignal.last_meal_timing;
  assert.equal(signal.coachingState, CoachingState.DEVELOPING);
  assert.equal(signal.evidence.length, 2);
  assert.deepEqual(signal.evidence[0].source, [SignalSourceType.USER_FEEDBACK]);
});

test('delayed first meals do not alter meal regularity in Food Engine v1', () => {
  const result = applyCircadianFoodCoachingEvidence(state(CoachingState.ESTABLISHED), {
    profile,
    evidenceByDate: evidenceByDate([
      ['2026-09-01', '14:00'],
      ['2026-09-02', '14:00'],
      ['2026-09-03', '14:00'],
    ]),
  });
  assert.equal(result.perSignal.meal_timing_regularity.coachingState, CoachingState.ESTABLISHED);
  assert.equal(result.perSignal.meal_timing_regularity.evidence.length, 0);
});
