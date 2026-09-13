const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-typescript.cjs');

const { buildVoiceRelationshipOutput } = load('lib/voice/voice-relationship.ts');
const { CoachingState } = load('lib/personalization/types.ts');

function decision({
  surface = true,
  state = CoachingState.NEEDS_ATTENTION,
  adaptedAction = null,
  reconsideration = null,
} = {}) {
  return {
    shouldSurfacePersonalizedGuidance: surface,
    activeEvent: {
      id: 'morning_light',
      name: 'Morning Light',
      guidance: 'Get outside for morning light.',
      why: 'Morning light helps anchor circadian timing.',
      status: 'current',
    },
    candidate: {
      coachingState: state,
      adaptedAction,
      reconsideration,
    },
  };
}

test('voice preserves upstream silence', () => {
  const output = buildVoiceRelationshipOutput(decision({ surface: false }));
  assert.equal(output.silent, true);
  assert.equal(output.headline, null);
  assert.equal(output.guidance, null);
  assert.equal(output.evidenceAction, null);
});

test('needs attention communicates the authoritative action without changing it', () => {
  const output = buildVoiceRelationshipOutput(decision());
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

test('constraint adaptation preserves approved fallback and avoids noncompliance framing', () => {
  const output = buildVoiceRelationshipOutput(decision({ adaptedAction: 'Use the brightest available window.' }));
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
