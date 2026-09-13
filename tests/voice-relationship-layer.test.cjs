const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-typescript.cjs');

const { buildVoiceRelationshipOutput } = load('lib/voice/voice-relationship.ts');
const { CoachingState } = load('lib/personalization/types.ts');

function decision({
  surface = true,
  passive = false,
  state = CoachingState.NEEDS_ATTENTION,
  adaptedAction = null,
  decisionReason = 'needs_attention_relevant_now',
  reconsideration = null,
  eventId = 'morning_light',
  eventName = 'Morning Light',
} = {}) {
  return {
    shouldSurfacePersonalizedGuidance: surface,
    shouldSurfacePassiveContext: passive,
    activeEvent: {
      id: eventId,
      name: eventName,
      guidance: 'Get outside for morning light.',
      why: 'Morning light helps anchor circadian timing.',
      status: 'current',
    },
    candidate: {
      coachingState: state,
      adaptedAction,
      reconsideration,
      decision: { reason: decisionReason },
    },
  };
}

test('voice preserves upstream silence', () => {
  const output = buildVoiceRelationshipOutput(decision({ surface: false }));
  assert.equal(output.mode, 'SILENT');
  assert.equal(output.silent, true);
  assert.equal(output.headline, null);
  assert.equal(output.guidance, null);
  assert.equal(output.evidenceAction, null);
});

test('passive context is observational and cannot expose coaching controls', () => {
  const output = buildVoiceRelationshipOutput(decision({
    surface: false,
    passive: true,
    eventId: 'sunset',
    eventName: 'Sunset',
  }));
  assert.equal(output.mode, 'PASSIVE_CONTEXT');
  assert.equal(output.silent, false);
  assert.equal(output.headline, 'Sunset');
  assert.match(output.guidance, /lower-light phase/);
  assert.equal(output.why, null);
  assert.equal(output.evidenceAction, null);
  assert.equal(output.perspective, null);
  assert.doesNotMatch(output.guidance, /\b(do|should|must|need to)\b/i);
});

test('needs attention communicates the authoritative action without changing it', () => {
  const output = buildVoiceRelationshipOutput(decision());
  assert.equal(output.mode, 'COACHING');
  assert.equal(output.silent, false);
  assert.equal(output.headline, 'Morning Light');
  assert.equal(output.guidance, 'Get outside for morning light.');
  assert.equal(output.evidenceAction, 'I’m outside');
});

test('developing uses quieter continuity language', () => {
  const output = buildVoiceRelationshipOutput(decision({ state: CoachingState.DEVELOPING }));
  assert.equal(output.headline, 'Keep the morning light signal steady.');
  assert.equal(output.guidance, 'Get outside for morning light.');
});

test('ordinary preferred action does not trigger constraint fallback language', () => {
  const output = buildVoiceRelationshipOutput(decision({ adaptedAction: 'Get outside for morning light.' }));
  assert.equal(output.guidance, 'Get outside for morning light.');
  assert.doesNotMatch(output.guidance, /biological objective stays the same/);
});

test('actual constraint adaptation preserves approved fallback and explains the workable move', () => {
  const output = buildVoiceRelationshipOutput(decision({
    adaptedAction: 'Use the brightest available window.',
    decisionReason: 'adapted_feasible_action_due_to_constraint',
  }));
  assert.match(output.guidance, /^Use the brightest available window\./);
  assert.match(output.guidance, /biological objective stays the same/);
});

test('reconsideration changes perspective without claiming confidence collapsed', () => {
  const output = buildVoiceRelationshipOutput(decision({
    reconsideration: {
      signalId: 'morning_light_timing',
      shouldReconsider: true,
      reasons: ['TIMEZONE_CHANGED'],
      observedAt: '2026-09-13T12:00:00.000Z',
    },
  }));
  assert.match(output.perspective, /context changed/);
  assert.doesNotMatch(output.perspective, /confidence/i);
});
