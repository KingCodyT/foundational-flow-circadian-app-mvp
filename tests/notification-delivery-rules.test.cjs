const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-typescript.cjs');

const { decideNotificationDelivery } = load('lib/personalization/notification-delivery.ts');

function candidate(overrides = {}) {
  return {
    finalLevel: 0,
    disposition: 'SILENT',
    targetSignalId: 'morning_light_timing',
    interruptionEligible: false,
    biologicallyRelevantNow: false,
    actionableNow: false,
    eligibility: { redundant: false },
    originalDecision: { reason: 'test' },
    ...overrides,
  };
}

test('level 0 is silent and never interrupts', () => {
  const output = decideNotificationDelivery(candidate());
  assert.equal(output.channel, 'SILENT');
  assert.equal(output.shouldInterrupt, false);
});

test('level 1 passive context remains in-app only', () => {
  const output = decideNotificationDelivery(candidate({
    finalLevel: 1,
    disposition: 'PASSIVE_CONTEXT',
  }));
  assert.equal(output.channel, 'IN_APP_ONLY');
  assert.equal(output.shouldInterrupt, false);
  assert.equal(output.reason, 'passive_context_never_interrupts');
});

test('level 2 guidance remains in-app only', () => {
  const output = decideNotificationDelivery(candidate({
    finalLevel: 2,
    disposition: 'IN_APP_GUIDANCE',
    biologicallyRelevantNow: true,
    actionableNow: true,
  }));
  assert.equal(output.channel, 'IN_APP_ONLY');
  assert.equal(output.shouldInterrupt, false);
});

test('level 3 notification requires timing actionability and nonredundancy', () => {
  const output = decideNotificationDelivery(candidate({
    finalLevel: 3,
    disposition: 'NOTIFICATION_ELIGIBLE',
    interruptionEligible: true,
    biologicallyRelevantNow: true,
    actionableNow: true,
    eligibility: { redundant: false },
  }));
  assert.equal(output.channel, 'NOTIFICATION');
  assert.equal(output.shouldInterrupt, true);
});

test('level 3 does not interrupt when redundancy guardrail fails', () => {
  const output = decideNotificationDelivery(candidate({
    finalLevel: 3,
    disposition: 'NOTIFICATION_ELIGIBLE',
    interruptionEligible: true,
    biologicallyRelevantNow: true,
    actionableNow: true,
    eligibility: { redundant: true },
  }));
  assert.equal(output.channel, 'IN_APP_ONLY');
  assert.equal(output.shouldInterrupt, false);
});

test('level 3 does not interrupt when biological relevance is false', () => {
  const output = decideNotificationDelivery(candidate({
    finalLevel: 3,
    disposition: 'NOTIFICATION_ELIGIBLE',
    interruptionEligible: true,
    biologicallyRelevantNow: false,
    actionableNow: true,
  }));
  assert.equal(output.channel, 'IN_APP_ONLY');
  assert.equal(output.shouldInterrupt, false);
});

test('level 4 material disruption can earn contextual alert delivery', () => {
  const output = decideNotificationDelivery(candidate({
    finalLevel: 4,
    disposition: 'CONTEXTUAL_ALERT_ELIGIBLE',
    interruptionEligible: true,
    originalDecision: { reason: 'material_contextual_disruption' },
  }));
  assert.equal(output.channel, 'CONTEXTUAL_ALERT');
  assert.equal(output.shouldInterrupt, true);
});

test('delivery layer cannot invent a contextual alert from level 4 alone', () => {
  const output = decideNotificationDelivery(candidate({
    finalLevel: 4,
    disposition: 'CONTEXTUAL_ALERT_ELIGIBLE',
    interruptionEligible: true,
    originalDecision: { reason: 'something_else' },
  }));
  assert.equal(output.channel, 'IN_APP_ONLY');
  assert.equal(output.shouldInterrupt, false);
});
