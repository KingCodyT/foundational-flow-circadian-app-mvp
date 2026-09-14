const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-typescript.cjs');

const { assembleInterventionCandidate } = load('lib/personalization/intervention-candidate.ts');
const { CoachingState, HierarchyLayer } = load('lib/personalization/types.ts');
const { EvidenceSeverity } = load('lib/personalization/severity.ts');

function makeDay1({
  signalId = 'morning_light_timing',
  coachingState = CoachingState.NEEDS_ATTENTION,
  confidenceScore = 0.9,
  severity = EvidenceSeverity.MODERATE,
  severityScore = 50,
} = {}) {
  return {
    generatedAt: '2026-09-12T12:00:00.000Z',
    signalStates: {
      [signalId]: {
        id: signalId,
        classification: 'BEHAVIOR',
        coachingState,
        confidence: { score: confidenceScore, sources: ['assessment'] },
        evidence: [{ source: ['QUESTIONNAIRE'], questionId: signalId, answer: 'example', answerScore: severityScore }],
      },
    },
    derivedEnvironment: null,
    primaryCoachingTarget: {
      signalId,
      coachingState,
      hierarchy: HierarchyLayer.MORNING_LIGHT_CIRCADIAN_ANCHOR,
      severity,
      severityScore,
      reason: 'test_target',
    },
    source: { answersPresent: true, legacyMappingsUsed: [] },
  };
}

function timedInput(day1, now) {
  return {
    day1,
    now,
    phase3aInput: {
      primary: day1.primaryCoachingTarget,
      eventWindow: {
        start: '2026-09-12T12:00:00.000Z',
        end: '2026-09-12T13:00:00.000Z',
      },
      preferredAction: 'Get outside for morning light',
    },
  };
}

test('confidence is handed off from selected signal state', () => {
  for (const score of [0.9, 0.6, 0.15]) {
    const day1 = makeDay1({ confidenceScore: score, severityScore: 12 });
    const candidate = assembleInterventionCandidate(timedInput(day1, new Date('2026-09-12T12:30:00.000Z')));
    assert.equal(candidate.confidence.score, score);
    assert.equal(candidate.severityScore, 12);
  }
});

test('one authoritative now drives decision and eligibility', () => {
  const day1 = makeDay1();
  const inside = assembleInterventionCandidate(timedInput(day1, new Date('2026-09-12T12:30:00.000Z')));
  assert.equal(inside.biologicallyRelevantNow, true);
  assert.equal(inside.originalDecision.biologicallyRelevantNow, true);
  assert.equal(inside.finalLevel, 3);

  const outside = assembleInterventionCandidate(timedInput(day1, new Date('2026-09-12T14:00:00.000Z')));
  assert.equal(outside.originalDecision.biologicallyRelevantNow, false);
  assert.equal(outside.biologicallyRelevantNow, false);
  assert.notEqual(outside.finalLevel, 3);
});

test('reconsideration is exposed as metadata without mutating the coaching decision', () => {
  const day1 = makeDay1({ confidenceScore: 0.6, severity: EvidenceSeverity.SEVERE, severityScore: 20 });
  const baseInput = timedInput(day1, new Date('2026-09-12T12:30:00.000Z'));
  const without = assembleInterventionCandidate(baseInput);
  const withReconsideration = assembleInterventionCandidate({
    ...baseInput,
    reconsideration: {
      morning_light_timing: {
        signalId: 'morning_light_timing',
        shouldReconsider: true,
        reasons: ['TIMEZONE_CHANGED'],
        observedAt: '2026-09-12T12:25:00.000Z',
      },
    },
  });

  assert.equal(without.reconsideration, null);
  assert.equal(withReconsideration.reconsideration.shouldReconsider, true);
  assert.deepEqual(withReconsideration.reconsideration.reasons, ['TIMEZONE_CHANGED']);
  assert.equal(withReconsideration.targetSignalId, without.targetSignalId);
  assert.equal(withReconsideration.coachingState, without.coachingState);
  assert.deepEqual(withReconsideration.confidence, without.confidence);
  assert.equal(withReconsideration.severity, without.severity);
  assert.equal(withReconsideration.severityScore, without.severityScore);
  assert.equal(withReconsideration.finalLevel, without.finalLevel);
});

test('constraint adaptation remains Level 2 and no fallback remains silent', () => {
  const day1 = makeDay1();
  const now = new Date('2026-09-12T12:30:00.000Z');
  const eventWindow = { start: '2026-09-12T12:00:00.000Z', end: '2026-09-12T13:00:00.000Z' };

  const adapted = assembleInterventionCandidate({
    day1,
    now,
    contextEvidence: { infeasible: true },
    phase3aInput: {
      primary: day1.primaryCoachingTarget,
      eventWindow,
      contextEvidence: { infeasible: true },
      preferredAction: 'Go outside',
      fallbackAction: 'Use the brightest available window',
    },
  });
  assert.equal(adapted.finalLevel, 2);
  assert.equal(adapted.adaptedAction, 'Use the brightest available window');
  assert.equal(adapted.interruptionEligible, false);

  const silent = assembleInterventionCandidate({
    day1,
    now,
    contextEvidence: { infeasible: true },
    phase3aInput: {
      primary: day1.primaryCoachingTarget,
      eventWindow,
      contextEvidence: { infeasible: true },
      preferredAction: 'Go outside',
    },
  });
  assert.equal(silent.finalLevel, 0);
  assert.equal(silent.disposition, 'SILENT');
});

test('developing remains quieter than needs attention', () => {
  const now = new Date('2026-09-12T12:30:00.000Z');
  const needs = makeDay1({ coachingState: CoachingState.NEEDS_ATTENTION });
  const developing = makeDay1({ coachingState: CoachingState.DEVELOPING });

  assert.equal(assembleInterventionCandidate(timedInput(needs, now)).finalLevel, 3);
  assert.equal(assembleInterventionCandidate(timedInput(developing, now)).finalLevel, 2);
});
