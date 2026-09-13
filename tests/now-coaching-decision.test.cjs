const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-typescript.cjs');

const { assembleNowCoachingDecision, eventSupportsSignal } = load('lib/personalization/now-coaching.ts');
const { CoachingState, HierarchyLayer } = load('lib/personalization/types.ts');
const { EvidenceSeverity } = load('lib/personalization/severity.ts');

function makeDay1({
  signalId = 'morning_light_timing',
  coachingState = CoachingState.NEEDS_ATTENTION,
} = {}) {
  return {
    generatedAt: '2026-09-13T13:00:00.000Z',
    signalStates: {
      [signalId]: {
        id: signalId,
        classification: 'BEHAVIOR',
        coachingState,
        confidence: { score: 0.9, sources: ['assessment'] },
        evidence: [],
      },
    },
    derivedEnvironment: null,
    primaryCoachingTarget: {
      signalId,
      coachingState,
      hierarchy: HierarchyLayer.MORNING_LIGHT_CIRCADIAN_ANCHOR,
      severity: EvidenceSeverity.MODERATE,
      severityScore: 50,
      reason: 'test_target',
    },
    source: { answersPresent: true, legacyMappingsUsed: [] },
  };
}

function makeEvent({ id = 'morning_light', name = 'Morning Light' } = {}) {
  return {
    id,
    name,
    start: new Date('2026-09-13T13:00:00.000Z'),
    end: new Date('2026-09-13T14:00:00.000Z'),
    status: 'current',
    guidance: 'Get outside for useful light.',
    why: 'Timing matters.',
  };
}

test('event-to-signal mapping only aligns biologically related opportunities', () => {
  assert.equal(eventSupportsSignal('morning_light', 'morning_light_timing'), true);
  assert.equal(eventSupportsSignal('morning_light', 'evening_light_reduction'), false);
  assert.equal(eventSupportsSignal('sleep_window', 'sleep_schedule'), true);
});

test('NOW surfaces guidance when current opportunity matches active target', () => {
  const decision = assembleNowCoachingDecision({
    day1: makeDay1(),
    activeEvent: makeEvent(),
    now: new Date('2026-09-13T13:30:00.000Z'),
  });

  assert.equal(decision.activeEventSupportsTarget, true);
  assert.equal(decision.candidate.biologicallyRelevantNow, true);
  assert.equal(decision.candidate.finalLevel, 3);
  assert.equal(decision.shouldSurfacePersonalizedGuidance, true);
});

test('NOW stays quiet when a current circadian event does not match the coaching target', () => {
  const decision = assembleNowCoachingDecision({
    day1: makeDay1(),
    activeEvent: makeEvent({ id: 'digital_sunset', name: 'Digital Sunset' }),
    now: new Date('2026-09-13T13:30:00.000Z'),
  });

  assert.equal(decision.activeEventSupportsTarget, false);
  assert.equal(decision.candidate.biologicallyRelevantNow, false);
  assert.equal(decision.shouldSurfacePersonalizedGuidance, false);
});

test('NOW stays quiet when there is no current biological opportunity', () => {
  const decision = assembleNowCoachingDecision({
    day1: makeDay1(),
    activeEvent: null,
    now: new Date('2026-09-13T15:00:00.000Z'),
  });

  assert.equal(decision.activeEventSupportsTarget, false);
  assert.equal(decision.shouldSurfacePersonalizedGuidance, false);
});

test('DEVELOPING target can surface in-app guidance without becoming interruption eligible', () => {
  const decision = assembleNowCoachingDecision({
    day1: makeDay1({ coachingState: CoachingState.DEVELOPING }),
    activeEvent: makeEvent(),
    now: new Date('2026-09-13T13:30:00.000Z'),
  });

  assert.equal(decision.candidate.finalLevel, 2);
  assert.equal(decision.candidate.interruptionEligible, false);
  assert.equal(decision.shouldSurfacePersonalizedGuidance, true);
});
