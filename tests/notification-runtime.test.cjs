const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-typescript.cjs');

const {
  planNotificationRuntime,
  recordDeliveredNotification,
} = load('lib/personalization/notification-runtime.ts');

const now = new Date('2026-09-13T15:00:00.000Z');

function orchestration(overrides = {}) {
  return {
    shouldDeliver: true,
    channel: 'NOTIFICATION',
    reason: 'current_notification_ready',
    evaluatedAt: now.toISOString(),
    payload: {
      title: 'Morning Light',
      body: 'Get outside for morning light.',
      channel: 'NOTIFICATION',
      level: 3,
      targetSignalId: 'morning_light_timing',
      eventId: 'morning_light',
    },
    ...overrides,
  };
}

function scheduled(overrides = {}) {
  return {
    id: 'notification:morning_light_timing:morning_light',
    targetSignalId: 'morning_light_timing',
    eventId: 'morning_light',
    channel: 'NOTIFICATION',
    title: 'Morning Light',
    body: 'Get outside for morning light.',
    scheduledFor: now.toISOString(),
    ...overrides,
  };
}

test('approved orchestration with permission produces one schedule command', () => {
  const result = planNotificationRuntime({
    orchestration: orchestration(),
    permission: 'GRANTED',
    now,
  });

  assert.equal(result.command.type, 'SCHEDULE');
  assert.equal(result.command.reason, 'approved_notification_ready');
  assert.equal(result.command.notification.targetSignalId, 'morning_light_timing');
  assert.equal(result.command.notification.eventId, 'morning_light');
});

test('runtime does not schedule when permission is not granted', () => {
  const result = planNotificationRuntime({
    orchestration: orchestration(),
    permission: 'PROMPT',
    now,
  });

  assert.deepEqual(result.command, {
    type: 'NOOP',
    reason: 'permission_not_granted',
  });
});

test('same approved notification is not scheduled twice', () => {
  const result = planNotificationRuntime({
    orchestration: orchestration(),
    permission: 'GRANTED',
    scheduled: scheduled(),
    now,
  });

  assert.deepEqual(result.command, {
    type: 'NOOP',
    reason: 'already_scheduled',
  });
});

test('a stale scheduled notification is cancelled before replacement', () => {
  const result = planNotificationRuntime({
    orchestration: orchestration(),
    permission: 'GRANTED',
    scheduled: scheduled({ eventId: 'sunset' }),
    now,
  });

  assert.equal(result.command.type, 'CANCEL');
  assert.equal(result.command.reason, 'scheduled_notification_is_stale');
});

test('withdrawn orchestration cancels an outstanding scheduled notification', () => {
  const result = planNotificationRuntime({
    orchestration: orchestration({
      shouldDeliver: false,
      payload: null,
      reason: 'biological_window_has_closed',
    }),
    permission: 'GRANTED',
    scheduled: scheduled(),
    now,
  });

  assert.equal(result.command.type, 'CANCEL');
  assert.equal(result.command.reason, 'orchestration_no_longer_deliverable');
});

test('already delivered signal-event pair does not interrupt twice', () => {
  const delivered = recordDeliveredNotification(scheduled(), now);
  const result = planNotificationRuntime({
    orchestration: orchestration(),
    permission: 'GRANTED',
    delivered: [delivered],
    now,
  });

  assert.deepEqual(result.command, {
    type: 'NOOP',
    reason: 'already_delivered',
  });
});

test('delivery record captures actual delivery time rather than schedule time', () => {
  const deliveredAt = new Date('2026-09-13T15:03:00.000Z');
  const record = recordDeliveredNotification(scheduled(), deliveredAt);

  assert.equal(record.deliveredAt, deliveredAt.toISOString());
  assert.equal(record.eventId, 'morning_light');
  assert.equal(record.targetSignalId, 'morning_light_timing');
});
