const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-typescript.cjs');

const {
  DEFAULT_DELIVERY_COOLDOWN_MINUTES,
  evaluateNotificationDeliveryMemory,
  recordNotificationDeliveryMemory,
} = load('lib/personalization/notification-memory.ts');

function payload(overrides = {}) {
  return {
    title: 'Morning Light',
    body: 'Get outside for morning light.',
    channel: 'NOTIFICATION',
    level: 3,
    targetSignalId: 'morning_light_timing',
    eventId: 'morning_light',
    ...overrides,
  };
}

const now = new Date('2026-09-13T15:00:00.000Z');

test('first delivery is allowed when no matching history exists', () => {
  const result = evaluateNotificationDeliveryMemory({ payload: payload(), now });
  assert.equal(result.allowDelivery, true);
  assert.equal(result.reason, 'no_prior_delivery');
  assert.equal(result.cooldownMinutes, DEFAULT_DELIVERY_COOLDOWN_MINUTES);
});

test('matching delivery inside cooldown is suppressed', () => {
  const history = [recordNotificationDeliveryMemory(
    payload(),
    new Date('2026-09-13T14:30:00.000Z'),
  )];

  const result = evaluateNotificationDeliveryMemory({ payload: payload(), history, now });
  assert.equal(result.allowDelivery, false);
  assert.equal(result.reason, 'cooldown_active');
  assert.equal(result.remainingCooldownMinutes, 60);
});

test('cooldown expiry allows the same slot again', () => {
  const history = [recordNotificationDeliveryMemory(
    payload(),
    new Date('2026-09-13T13:00:00.000Z'),
  )];

  const result = evaluateNotificationDeliveryMemory({ payload: payload(), history, now });
  assert.equal(result.allowDelivery, true);
  assert.equal(result.reason, 'cooldown_elapsed');
});

test('different signal-event slot is not suppressed by unrelated history', () => {
  const history = [recordNotificationDeliveryMemory(
    payload({ targetSignalId: 'evening_light_reduction', eventId: 'sunset' }),
    new Date('2026-09-13T14:50:00.000Z'),
  )];

  const result = evaluateNotificationDeliveryMemory({ payload: payload(), history, now });
  assert.equal(result.allowDelivery, true);
  assert.equal(result.reason, 'no_prior_delivery');
});

test('material change may bypass cooldown for the same slot', () => {
  const history = [recordNotificationDeliveryMemory(
    payload(),
    new Date('2026-09-13T14:50:00.000Z'),
    'timezone:America/Los_Angeles',
  )];

  const result = evaluateNotificationDeliveryMemory({
    payload: payload(),
    history,
    now,
    materialChangeKey: 'timezone:America/New_York',
  });

  assert.equal(result.allowDelivery, true);
  assert.equal(result.reason, 'material_change_bypasses_cooldown');
});

test('missing material change keys do not manufacture a bypass', () => {
  const history = [recordNotificationDeliveryMemory(
    payload(),
    new Date('2026-09-13T14:50:00.000Z'),
  )];

  const result = evaluateNotificationDeliveryMemory({
    payload: payload(),
    history,
    now,
    materialChangeKey: 'timezone:America/New_York',
  });

  assert.equal(result.allowDelivery, false);
  assert.equal(result.reason, 'cooldown_active');
});
