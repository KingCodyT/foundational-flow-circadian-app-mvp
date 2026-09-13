const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-typescript.cjs');
const { getSolarTimes, formatTimeLocal } = load('lib/solar.ts');
const { buildTodaysFlow } = load('lib/flow-engine.ts');
const { normalizeDailyProfile } = load('lib/audit-store.ts');
const { localDateKey } = load('lib/live-clock.ts');
const { buildDerivedEnvironment } = load('lib/personalization/derived-environment.ts');

function inTimezone(timezone, run) {
  const previous = process.env.TZ;
  process.env.TZ = timezone;
  try { run(); } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
}

// US Naval Observatory reference data, retrieved 2026-09-11.
// https://aa.usno.navy.mil/api/rstt/oneday?date=2026-06-21&coords=37.7749,-122.4194&tz=-7
// https://aa.usno.navy.mil/api/rstt/oneday?date=2026-12-21&coords=37.7749,-122.4194&tz=-8
// https://aa.usno.navy.mil/api/rstt/oneday?date=2026-12-21&coords=-33.8688,151.2093&tz=11
// https://aa.usno.navy.mil/api/rstt/oneday?date=2026-03-20&coords=51.5074,-0.1278&tz=0
const references = [
  { date: [2026, 5, 21], lat: 37.7749, lon: -122.4194, rise: '2026-06-21T12:48:00Z', noon: '2026-06-21T20:12:00Z', set: '2026-06-22T03:35:00Z' },
  { date: [2026, 11, 21], lat: 37.7749, lon: -122.4194, rise: '2026-12-21T15:21:00Z', noon: '2026-12-21T20:08:00Z', set: '2026-12-22T00:54:00Z' },
  { date: [2026, 11, 21], lat: -33.8688, lon: 151.2093, rise: '2026-12-20T18:41:00Z', noon: '2026-12-21T01:53:00Z', set: '2026-12-21T09:05:00Z' },
  { date: [2026, 2, 20], lat: 51.5074, lon: -0.1278, rise: '2026-03-20T06:03:00Z', noon: '2026-03-20T12:08:00Z', set: '2026-03-20T18:13:00Z' },
];

for (const timezone of ['UTC', 'America/Los_Angeles', 'Australia/Sydney']) {
  test(`solar instants match USNO within two minutes under ${timezone}`, () => inTimezone(timezone, () => {
    for (const ref of references) {
      const solar = getSolarTimes(new Date(...ref.date, 12), ref.lat, ref.lon);
      for (const [key, expected] of [['sunrise', ref.rise], ['solarNoon', ref.noon], ['sunset', ref.set]]) {
        assert.ok(Math.abs(solar[key].getTime() - Date.parse(expected)) < 120000, `${key}: ${solar[key].toISOString()} vs ${expected}`);
      }
      assert.equal(solar.dayLengthMinutes, (solar.sunset - solar.sunrise) / 60000);
    }
  }));
}

test('polar summer and winter have no fabricated sunrise or sunset', () => {
  // USNO Tromso 2026-06-21: continuously above horizon; 2026-12-21: below.
  for (const [month, expected] of [[5, 1440], [11, 0]]) {
    const date = new Date(2026, month, 21, 12);
    const profile = { latitude: 69.6492, longitude: 18.9553, locationPermissionGranted: true };
    const solar = getSolarTimes(date, profile.latitude, profile.longitude);
    assert.equal(solar.sunrise, null);
    assert.equal(solar.sunset, null);
    assert.equal(solar.dayLengthMinutes, expected);
    assert.ok(Number.isFinite(solar.solarNoon.getTime()));
    const flow = buildTodaysFlow({ date, profile });
    assert.equal(flow.locationAvailable, true);
    assert.ok(!flow.events.some(e => e.id === 'sunset'));
    assert.ok(flow.events.every(e => Number.isFinite(e.start.getTime())));
    assert.doesNotThrow(() => JSON.stringify(buildDerivedEnvironment({ date, profile })));
  }
});

test('missing or invalid coordinates and dates yield unavailable solar data', () => {
  for (const [lat, lon] of [[null, null], [NaN, 0], [0, Infinity], [91, 0], [0, -181]]) {
    const solar = getSolarTimes(new Date(), lat, lon);
    assert.deepEqual(solar, { sunrise: null, sunset: null, solarNoon: null, dayLengthMinutes: null });
    assert.equal(buildDerivedEnvironment({ profile: { latitude: lat, longitude: lon, locationPermissionGranted: true } }).locationAvailable, false);
  }
  assert.equal(getSolarTimes(new Date(NaN), 0, 0).sunrise, null);
  assert.equal(formatTimeLocal(new Date(NaN)), '--:--');
});

test('calendar day-of-year survives DST and leap day', () => inTimezone('America/Los_Angeles', () => {
  for (const [year, month, day, expected] of [[2026, 2, 9, 68], [2024, 1, 29, 60], [2026, 11, 31, 365]]) {
    assert.equal(buildDerivedEnvironment({ date: new Date(year, month, day) }).dayOfYear, expected);
  }
}));

test('default schedule stays at 07:00 regardless of current time and DST', () => inTimezone('America/Los_Angeles', () => {
  for (const [month, day] of [[2, 8], [10, 1], [8, 11]]) {
    const starts = [];
    for (const hour of [0, 8, 20, 23]) {
      const now = new Date(2026, month, day, hour, 37);
      const flow = buildTodaysFlow({ now });
      const morning = flow.events.find(e => e.id === 'morning_light');
      assert.equal(morning.start.getDate(), day);
      assert.equal(morning.start.getHours(), 7);
      assert.equal(morning.start.getMinutes(), 0);
      starts.push(flow.events.map(e => e.start.getTime()));
    }
    starts.forEach(s => assert.deepEqual(s, starts[0]));
  }
}));

test('valid profile times and terminal evidence remain authoritative', () => {
  for (const participationLevel of ['BASELINE', 'GUIDED_FLOW', 'FULL_FLOW']) {
    for (const status of ['completed', 'skipped', 'missed']) {
      const now = new Date(2026, 8, 11, 6, 45);
      const flow = buildTodaysFlow({ now, participationLevel, profile: { wakeTime: '06:30', targetBedtime: '21:30' }, eventStateForDate: { morning_light: { status, at: now.toISOString() } } });
      const morning = flow.events.find(e => e.id === 'morning_light');
      assert.equal(morning.start.getHours(), 6);
      assert.equal(morning.start.getMinutes(), 30);
      assert.equal(morning.status, status);
      assert.notEqual(flow.activeEvent?.id, morning.id);
      assert.notEqual(flow.next?.id, morning.id);
    }
  }
});

test('stored profile timezone is preserved and hydrated safely', () => {
  const profile = { wakeTime: '07:00', targetBedtime: '22:00', locationPermissionGranted: true, latitude: 37.7749, longitude: -122.4194 };
  const withSaved = normalizeDailyProfile(profile, 'America/Los_Angeles');
  assert.equal(withSaved.timeZone, 'America/Los_Angeles');
  assert.equal(withSaved.wakeTime, '07:00');

  const existing = normalizeDailyProfile({ ...profile, timeZone: 'Europe/London' }, 'America/Los_Angeles');
  assert.equal(existing.timeZone, 'Europe/London');
  assert.equal(existing.locationPermissionGranted, true);

  const dayKey = localDateKey(new Date('2026-09-12T00:30:00Z'), 'America/Los_Angeles');
  assert.equal(dayKey, '2026-09-11');
});

test('malformed wake times use a stable default', () => {
  for (const wakeTime of ['', 'oops', '25:99', '-1:00']) {
    const flow = buildTodaysFlow({ now: new Date(2026, 8, 11, 20), profile: { wakeTime } });
    assert.equal(flow.events.find(e => e.id === 'morning_light').start.getHours(), 7);
  }
});

const { EvidenceSeverity, classifyEvidenceSeverity, deriveSignalSeverity } = load('lib/personalization/severity.ts');
const { selectPrimaryCoachingTarget } = load('lib/personalization/primary-target.ts');
const { SignalClassification, HierarchyLayer, CoachingState } = load('lib/personalization/types.ts');
const { decideIntervention } = load('lib/personalization/intervention.ts');
const { ActionFeasibility, evaluateActionFeasibility } = load('lib/personalization/feasibility.ts');
const { assignInitialConfidence } = load('lib/personalization/initial-confidence.ts');
const { applyDailyEvidence } = load('lib/personalization/daily-evidence.ts');

function makeBehaviorSignal(id, state, hierarchy, evidenceScores) {
  return {
    id,
    classification: SignalClassification.BEHAVIOR,
    coachingState: state,
    hierarchy,
    evidence: evidenceScores.map((score) => ({ source: ['QUESTIONNAIRE'], answerScore: score, questionId: `q_${id}` })),
  };
}

test('severity mapping is bounded and semantic, not raw-ranking', () => {
  assert.equal(classifyEvidenceSeverity(100), EvidenceSeverity.MILD);
  assert.equal(classifyEvidenceSeverity(75), EvidenceSeverity.MILD);
  assert.equal(classifyEvidenceSeverity(55), EvidenceSeverity.MODERATE);
  assert.equal(classifyEvidenceSeverity(40), EvidenceSeverity.MODERATE);
  assert.equal(classifyEvidenceSeverity(35), EvidenceSeverity.SEVERE);
  assert.equal(classifyEvidenceSeverity(10), EvidenceSeverity.SEVERE);
  assert.equal(deriveSignalSeverity(makeBehaviorSignal('x', CoachingState.NEEDS_ATTENTION, HierarchyLayer.MORNING_LIGHT_CIRCADIAN_ANCHOR, [80, 40])).band, EvidenceSeverity.MODERATE);
});

test('same-severity or same-layer candidates keep hierarchy authority', () => {
  const state = {
    generatedAt: new Date().toISOString(),
    perSignal: {
      morning_light_timing: makeBehaviorSignal('morning_light_timing', CoachingState.NEEDS_ATTENTION, HierarchyLayer.MORNING_LIGHT_CIRCADIAN_ANCHOR, [70]),
      evening_light_reduction: makeBehaviorSignal('evening_light_reduction', CoachingState.NEEDS_ATTENTION, HierarchyLayer.EVENING_LIGHT_DARKNESS, [65]),
    },
  };

  const result = selectPrimaryCoachingTarget(state);
  assert.equal(result.signalId, 'morning_light_timing');
});

test('downstream severe may leapfrog mild upstream target in v1', () => {
  const state = {
    generatedAt: new Date().toISOString(),
    perSignal: {
      morning_light_timing: makeBehaviorSignal('morning_light_timing', CoachingState.NEEDS_ATTENTION, HierarchyLayer.MORNING_LIGHT_CIRCADIAN_ANCHOR, [72]),
      sleep_schedule: makeBehaviorSignal('sleep_schedule', CoachingState.NEEDS_ATTENTION, HierarchyLayer.SLEEP_OPPORTUNITY_TIMING, [15]),
    },
  };

  const result = selectPrimaryCoachingTarget(state);
  assert.equal(result.signalId, 'sleep_schedule');
});

test('upstream moderate remains authoritative over downstream severe', () => {
  const state = {
    generatedAt: new Date().toISOString(),
    perSignal: {
      morning_light_timing: makeBehaviorSignal('morning_light_timing', CoachingState.NEEDS_ATTENTION, HierarchyLayer.MORNING_LIGHT_CIRCADIAN_ANCHOR, [55]),
      sleep_schedule: makeBehaviorSignal('sleep_schedule', CoachingState.NEEDS_ATTENTION, HierarchyLayer.SLEEP_OPPORTUNITY_TIMING, [15]),
    },
  };

  const result = selectPrimaryCoachingTarget(state);
  assert.equal(result.signalId, 'morning_light_timing');
});

test('upstream mild remains authoritative over downstream moderate', () => {
  const state = {
    generatedAt: new Date().toISOString(),
    perSignal: {
      morning_light_timing: makeBehaviorSignal('morning_light_timing', CoachingState.NEEDS_ATTENTION, HierarchyLayer.MORNING_LIGHT_CIRCADIAN_ANCHOR, [70]),
      sleep_schedule: makeBehaviorSignal('sleep_schedule', CoachingState.NEEDS_ATTENTION, HierarchyLayer.SLEEP_OPPORTUNITY_TIMING, [45]),
    },
  };

  const result = selectPrimaryCoachingTarget(state);
  assert.equal(result.signalId, 'morning_light_timing');
});

test('upstream severe remains authoritative over downstream severe', () => {
  const state = {
    generatedAt: new Date().toISOString(),
    perSignal: {
      morning_light_timing: makeBehaviorSignal('morning_light_timing', CoachingState.NEEDS_ATTENTION, HierarchyLayer.MORNING_LIGHT_CIRCADIAN_ANCHOR, [25]),
      sleep_schedule: makeBehaviorSignal('sleep_schedule', CoachingState.NEEDS_ATTENTION, HierarchyLayer.SLEEP_OPPORTUNITY_TIMING, [15]),
    },
  };

  const result = selectPrimaryCoachingTarget(state);
  assert.equal(result.signalId, 'morning_light_timing');
});

test('established signals stay excluded from coaching selection', () => {
  const state = {
    generatedAt: new Date().toISOString(),
    perSignal: {
      morning_light_timing: makeBehaviorSignal('morning_light_timing', CoachingState.ESTABLISHED, HierarchyLayer.MORNING_LIGHT_CIRCADIAN_ANCHOR, [100]),
      sleep_schedule: makeBehaviorSignal('sleep_schedule', CoachingState.NEEDS_ATTENTION, HierarchyLayer.SLEEP_OPPORTUNITY_TIMING, [15]),
    },
  };

  const result = selectPrimaryCoachingTarget(state);
  assert.equal(result.signalId, 'sleep_schedule');
});

test('outcome and context evidence cannot manufacture a severe behavioral target', () => {
  const state = {
    generatedAt: new Date().toISOString(),
    perSignal: {
      sleep_duration: { id: 'sleep_duration', classification: SignalClassification.OUTCOME, coachingState: CoachingState.NEEDS_ATTENTION, evidence: [{ source: ['QUESTIONNAIRE'], answerScore: 15, questionId: 'sleep_duration' }] },
      bedroom_darkness: { id: 'bedroom_darkness', classification: SignalClassification.CONTEXT_CONSTRAINT, coachingState: undefined, evidence: [{ source: ['QUESTIONNAIRE'], answerScore: 10, questionId: 'bedroom_darkness' }] },
      morning_light_timing: makeBehaviorSignal('morning_light_timing', CoachingState.NEEDS_ATTENTION, HierarchyLayer.MORNING_LIGHT_CIRCADIAN_ANCHOR, [70]),
    },
  };

  const result = selectPrimaryCoachingTarget(state);
  assert.equal(result.signalId, 'morning_light_timing');
});

test('NEEDS_ATTENTION + feasible preferred action retains normal Level 3 behavior', () => {
  const primary = { signalId: 'morning_light_timing', coachingState: CoachingState.NEEDS_ATTENTION, hierarchy: HierarchyLayer.MORNING_LIGHT_CIRCADIAN_ANCHOR, severity: EvidenceSeverity.MILD, reason: 'target' };
  const decision = decideIntervention({
    primary,
    eventWindow: { start: new Date(Date.now() - 60000).toISOString(), end: new Date(Date.now() + 60000).toISOString() },
    contextEvidence: { infeasible: false, reason: 'schedule_ok' },
    preferredAction: 'go outside for 20 minutes',
    fallbackAction: 'use a bright indoor light break',
  });

  assert.equal(decision.level, 3);
  assert.equal(decision.actionableNow, true);
  assert.equal(decision.interruptionEligible, true);
  assert.equal(decision.targetSignalId, 'morning_light_timing');
});

test('NEEDS_ATTENTION + infeasible preferred action + fallback uses adapted Level 2 guidance', () => {
  const primary = { signalId: 'morning_light_timing', coachingState: CoachingState.NEEDS_ATTENTION, hierarchy: HierarchyLayer.MORNING_LIGHT_CIRCADIAN_ANCHOR, severity: EvidenceSeverity.MILD, reason: 'target' };
  const decision = decideIntervention({
    primary,
    eventWindow: { start: new Date(Date.now() - 60000).toISOString(), end: new Date(Date.now() + 60000).toISOString() },
    contextEvidence: { infeasible: true, reason: 'schedule_constraint', fallbackAction: 'use a bright indoor light break' },
    preferredAction: 'go outside for 20 minutes',
    fallbackAction: 'use a bright indoor light break',
  });

  assert.equal(decision.targetSignalId, 'morning_light_timing');
  assert.equal(decision.noInterventionReason, undefined);
  assert.equal(decision.level, 2);
  assert.equal(decision.actionableNow, true);
  assert.equal(decision.interruptionEligible, false);
  assert.equal(decision.adaptedAction, 'use a bright indoor light break');
  assert.equal(decision.reason, 'adapted_feasible_action_due_to_constraint');
});

test('DEVELOPING + infeasible preferred action + fallback stays adapted and not more intense than Level 2', () => {
  const primary = { signalId: 'morning_light_timing', coachingState: CoachingState.DEVELOPING, hierarchy: HierarchyLayer.MORNING_LIGHT_CIRCADIAN_ANCHOR, severity: EvidenceSeverity.MILD, reason: 'target' };
  const decision = decideIntervention({
    primary,
    eventWindow: { start: new Date(Date.now() - 60000).toISOString(), end: new Date(Date.now() + 60000).toISOString() },
    contextEvidence: { infeasible: true, reason: 'schedule_constraint', fallbackAction: 'use a bright indoor light break' },
    preferredAction: 'go outside for 20 minutes',
    fallbackAction: 'use a bright indoor light break',
  });

  assert.equal(decision.level, 2);
  assert.equal(decision.interruptionEligible, false);
  assert.equal(decision.actionableNow, true);
  assert.equal(decision.adaptedAction, 'use a bright indoor light break');
});

test('constraint adaptation preserves biological truth and severity when infeasible with no fallback', () => {
  const primary = { signalId: 'morning_light_timing', coachingState: CoachingState.NEEDS_ATTENTION, hierarchy: HierarchyLayer.MORNING_LIGHT_CIRCADIAN_ANCHOR, severity: EvidenceSeverity.MILD, reason: 'target' };
  const decision = decideIntervention({
    primary,
    eventWindow: { start: new Date(Date.now() - 60000).toISOString(), end: new Date(Date.now() + 60000).toISOString() },
    contextEvidence: { infeasible: true, reason: 'schedule_constraint' },
    preferredAction: 'go outside for 20 minutes',
  });

  assert.equal(decision.targetSignalId, 'morning_light_timing');
  assert.equal(decision.level, 0);
  assert.equal(decision.noInterventionReason, 'infeasible_action_no_fallback');
  assert.equal(decision.actionableNow, false);
  assert.equal(decision.interruptionEligible, false);
  assert.equal(decision.adaptedAction, null);
  assert.equal(primary.severity, EvidenceSeverity.MILD);
  assert.equal(primary.coachingState, CoachingState.NEEDS_ATTENTION);
});

test('constraint adaptation does not change targetSignalId or coaching state when adapting the action', () => {
  const primary = { signalId: 'morning_light_timing', coachingState: CoachingState.NEEDS_ATTENTION, hierarchy: HierarchyLayer.MORNING_LIGHT_CIRCADIAN_ANCHOR, severity: EvidenceSeverity.MODERATE, reason: 'target' };
  const decision = decideIntervention({
    primary,
    eventWindow: { start: new Date(Date.now() - 60000).toISOString(), end: new Date(Date.now() + 60000).toISOString() },
    contextEvidence: { infeasible: true, reason: 'schedule_constraint', fallbackAction: 'use a bright indoor light break' },
    preferredAction: 'go outside for 20 minutes',
    fallbackAction: 'use a bright indoor light break',
  });

  assert.equal(decision.targetSignalId, primary.signalId);
  assert.equal(primary.coachingState, CoachingState.NEEDS_ATTENTION);
  assert.equal(primary.severity, EvidenceSeverity.MODERATE);
});

test('single direct behavioral observation remains high confidence', () => {
  const state = {
    generatedAt: new Date().toISOString(),
    perSignal: {
      morning_light_timing: {
        id: 'morning_light_timing',
        classification: SignalClassification.BEHAVIOR,
        coachingState: CoachingState.NEEDS_ATTENTION,
        evidence: [{ source: ['QUESTIONNAIRE'], questionId: 'morning_light_timing', answer: 'within_15', answerScore: 100, optionLabel: 'Within 15 min' }],
      },
    },
  };

  const next = assignInitialConfidence(state);
  assert.equal(next.perSignal.morning_light_timing.confidence.score, 0.9);
});

test('lack of corroboration does not reduce a clear direct behavioral signal', () => {
  const state = {
    generatedAt: new Date().toISOString(),
    perSignal: {
      morning_light_timing: {
        id: 'morning_light_timing',
        classification: SignalClassification.BEHAVIOR,
        coachingState: CoachingState.NEEDS_ATTENTION,
        evidence: [{ source: ['QUESTIONNAIRE'], questionId: 'morning_light_timing', answer: 'within_15', answerScore: 100, optionLabel: 'Within 15 min' }],
      },
    },
  };

  const next = assignInitialConfidence(state);
  assert.ok(next.perSignal.morning_light_timing.confidence.score >= 0.8);
  assert.notEqual(next.perSignal.morning_light_timing.confidence.score, 0.15);
});

test('duplicate evidence from the same identity does not increase confidence', () => {
  const state = {
    generatedAt: new Date().toISOString(),
    perSignal: {
      morning_light_timing: {
        id: 'morning_light_timing',
        classification: SignalClassification.BEHAVIOR,
        coachingState: CoachingState.NEEDS_ATTENTION,
        evidence: [
          { source: ['QUESTIONNAIRE'], questionId: 'morning_light_timing', answer: 'within_15', answerScore: 100, optionLabel: 'Within 15 min' },
          { source: ['QUESTIONNAIRE'], questionId: 'morning_light_timing', answer: 'within_15', answerScore: 75, optionLabel: 'Within 15 min' },
        ],
      },
    },
  };

  const next = assignInitialConfidence(state);
  assert.equal(next.perSignal.morning_light_timing.confidence.score, 0.9);
});

test('two distinguishable supporting observations may reinforce confidence without score-band logic', () => {
  const state = {
    generatedAt: new Date().toISOString(),
    perSignal: {
      morning_light_timing: {
        id: 'morning_light_timing',
        classification: SignalClassification.BEHAVIOR,
        coachingState: CoachingState.NEEDS_ATTENTION,
        evidence: [
          { source: ['QUESTIONNAIRE'], questionId: 'morning_light_timing', answer: 'within_15', answerScore: 100, optionLabel: 'Within 15 min' },
          { source: ['USER_FEEDBACK'], questionId: 'morning_light_timing', answer: 'within_15', answerScore: 75, optionLabel: 'Within 15 min' },
        ],
      },
    },
  };

  const next = assignInitialConfidence(state);
  assert.equal(next.perSignal.morning_light_timing.confidence.score, 0.9);
});

test('different raw answerScore values alone do not automatically create confidence conflict', () => {
  const state = {
    generatedAt: new Date().toISOString(),
    perSignal: {
      morning_light_timing: {
        id: 'morning_light_timing',
        classification: SignalClassification.BEHAVIOR,
        coachingState: CoachingState.NEEDS_ATTENTION,
        evidence: [
          { source: ['QUESTIONNAIRE'], questionId: 'morning_light_timing', answer: 'within_15', answerScore: 100, optionLabel: 'Within 15 min' },
          { source: ['QUESTIONNAIRE'], questionId: 'morning_light_timing', answer: 'within_15', answerScore: 45, optionLabel: 'Within 15 min' },
        ],
      },
    },
  };

  const next = assignInitialConfidence(state);
  assert.equal(next.perSignal.morning_light_timing.confidence.score, 0.9);
});

test('semantic contradiction lowers confidence when the model can express it conservatively', () => {
  const state = {
    generatedAt: new Date().toISOString(),
    perSignal: {
      morning_light_timing: {
        id: 'morning_light_timing',
        classification: SignalClassification.BEHAVIOR,
        coachingState: CoachingState.NEEDS_ATTENTION,
        evidence: [
          { source: ['QUESTIONNAIRE'], questionId: 'morning_light_timing', answer: 'within_15', answerScore: 100, optionLabel: 'Within 15 min' },
          { source: ['QUESTIONNAIRE'], questionId: 'morning_light_timing', answer: 'rarely', answerScore: 10, optionLabel: 'Rarely' },
        ],
      },
    },
  };

  const next = assignInitialConfidence(state);
  assert.equal(next.perSignal.morning_light_timing.confidence.score, 0.4);
});

test('missing evidence remains low confidence uncertainty', () => {
  const state = {
    generatedAt: new Date().toISOString(),
    perSignal: {
      morning_light_timing: {
        id: 'morning_light_timing',
        classification: SignalClassification.BEHAVIOR,
        coachingState: CoachingState.NEEDS_ATTENTION,
        evidence: [{ source: ['QUESTIONNAIRE'], questionId: 'morning_light_timing' }],
      },
    },
  };

  const next = assignInitialConfidence(state);
  assert.equal(next.perSignal.morning_light_timing.confidence.score, 0.15);
});

test('legacy-mapped behavior remains conservative', () => {
  const state = {
    generatedAt: new Date().toISOString(),
    perSignal: {
      meal_timing_regularity: {
        id: 'meal_timing_regularity',
        classification: SignalClassification.BEHAVIOR,
        coachingState: CoachingState.DEVELOPING,
        evidence: [{ source: ['QUESTIONNAIRE'], questionId: 'day_meal_regular', answer: 'good', answerScore: 75, optionLabel: 'Often', legacyMapping: true }],
      },
    },
  };

  const next = assignInitialConfidence(state);
  assert.equal(next.perSignal.meal_timing_regularity.confidence.score, 0.6);
});

test('confidence does not depend on severity bands or score-band agreement', () => {
  const state = {
    generatedAt: new Date().toISOString(),
    perSignal: {
      morning_light_timing: {
        id: 'morning_light_timing',
        classification: SignalClassification.BEHAVIOR,
        coachingState: CoachingState.NEEDS_ATTENTION,
        evidence: [
          { source: ['QUESTIONNAIRE'], questionId: 'morning_light_timing', answer: 'within_15', answerScore: 100, optionLabel: 'Within 15 min' },
          { source: ['USER_FEEDBACK'], questionId: 'morning_light_timing', answer: 'within_15', answerScore: 75, optionLabel: 'Within 15 min' },
        ],
      },
    },
  };

  const next = assignInitialConfidence(state);
  assert.equal(next.perSignal.morning_light_timing.confidence.score, 0.9);
});

test('initial MODERATE confidence remains moderate after one supporting completion and may rise only with repeated distinct-day support', () => {
  const base = {
    generatedAt: new Date().toISOString(),
    perSignal: {
      morning_light_timing: {
        id: 'morning_light_timing',
        classification: SignalClassification.BEHAVIOR,
        coachingState: CoachingState.NEEDS_ATTENTION,
        confidence: { score: 0.6, lastEvidenceAt: '2026-09-09T08:00:00Z' },
        evidence: [{ source: ['QUESTIONNAIRE'], questionId: 'morning_light_timing', answer: 'within_15', answerScore: 100, optionLabel: 'Within 15 min' }],
      },
    },
  };

  const withOneSupport = applyDailyEvidence(base, {
    '2026-09-10': { morning_light: { status: 'completed', at: '2026-09-10T08:00:00Z' } },
  });
  assert.equal(withOneSupport.perSignal.morning_light_timing.confidence.score, 0.6);

  const withRepeatedSupport = applyDailyEvidence(base, {
    '2026-09-10': { morning_light: { status: 'completed', at: '2026-09-10T08:00:00Z' } },
    '2026-09-11': { morning_light: { status: 'completed', at: '2026-09-11T08:00:00Z' } },
  });
  assert.equal(withRepeatedSupport.perSignal.morning_light_timing.confidence.score, 0.9);
});

test('initial LOW confidence does not become HIGH from one completion, but repeated distinct-day support can raise it to MODERATE', () => {
  const base = {
    generatedAt: new Date().toISOString(),
    perSignal: {
      morning_light_timing: {
        id: 'morning_light_timing',
        classification: SignalClassification.BEHAVIOR,
        coachingState: CoachingState.NEEDS_ATTENTION,
        confidence: { score: 0.15, lastEvidenceAt: '2026-09-09T08:00:00Z' },
        evidence: [{ source: ['QUESTIONNAIRE'], questionId: 'morning_light_timing', answer: 'rarely', answerScore: 10, optionLabel: 'Rarely' }],
      },
    },
  };

  const withOneSupport = applyDailyEvidence(base, {
    '2026-09-10': { morning_light: { status: 'completed', at: '2026-09-10T08:00:00Z' } },
  });
  assert.equal(withOneSupport.perSignal.morning_light_timing.confidence.score, 0.15);

  const withDistinctSupport = applyDailyEvidence(base, {
    '2026-09-10': { morning_light: { status: 'completed', at: '2026-09-10T08:00:00Z' } },
    '2026-09-11': { morning_light: { status: 'completed', at: '2026-09-11T08:00:00Z' } },
  });
  assert.equal(withDistinctSupport.perSignal.morning_light_timing.confidence.score, 0.6);
});

test('duplicate same-day records do not inflate confidence, and skipped or missed states do not become fake negative evidence', () => {
  const base = {
    generatedAt: new Date().toISOString(),
    perSignal: {
      morning_light_timing: {
        id: 'morning_light_timing',
        classification: SignalClassification.BEHAVIOR,
        coachingState: CoachingState.NEEDS_ATTENTION,
        confidence: { score: 0.6, lastEvidenceAt: '2026-09-09T08:00:00Z' },
        evidence: [{ source: ['QUESTIONNAIRE'], questionId: 'morning_light_timing', answer: 'within_15', answerScore: 100, optionLabel: 'Within 15 min' }],
      },
    },
  };

  const duplicates = applyDailyEvidence(base, {
    '2026-09-10': {
      morning_light: { status: 'completed', at: '2026-09-10T08:00:00Z' },
      morning_light_backup: { status: 'completed', at: '2026-09-10T08:45:00Z' },
    },
  });
  assert.equal(duplicates.perSignal.morning_light_timing.confidence.score, 0.6);

  const skippedDoesNotReduce = applyDailyEvidence(base, {
    '2026-09-10': { morning_light: { status: 'skipped', at: '2026-09-10T08:00:00Z' } },
  });
  assert.equal(skippedDoesNotReduce.perSignal.morning_light_timing.confidence.score, 0.6);

  const missedDoesNotReduce = applyDailyEvidence(base, {
    '2026-09-10': { morning_light: { status: 'missed', at: '2026-09-10T08:00:00Z' } },
  });
  assert.equal(missedDoesNotReduce.perSignal.morning_light_timing.confidence.score, 0.6);
});

test('feasibility model distinguishes feasible and infeasible actions without altering severity', () => {
  assert.equal(evaluateActionFeasibility({ infeasible: false }, 'go outside').status, ActionFeasibility.FEASIBLE);
  assert.equal(evaluateActionFeasibility({ infeasible: true, reason: 'schedule_constraint' }, 'go outside').status, ActionFeasibility.INFEASIBLE);
  assert.equal(evaluateActionFeasibility({ infeasible: true, reason: 'schedule_constraint' }, 'go outside').reason, 'schedule_constraint');
});
