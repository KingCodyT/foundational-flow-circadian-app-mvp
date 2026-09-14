const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-typescript.cjs');

const {
  isNotificationDue,
  normalizeDeliveredTransportMessage,
} = load('lib/personalization/background-notification-transport.ts');

const scheduled = {
  id: 'notification:morning_light_timing:morning_light',
  targetSignalId: 'morning_light_timing',
  eventId: 'morning_light',
  channel: 'NOTIFICATION',
  title: 'Morning Light',
  body: 'Get outside for morning light.',
  scheduledFor: '2026-09-13T15:00:00.000Z',
};

test('notification is due only at or after its approved schedule time', () => {
  assert.equal(
    isNotificationDue(scheduled, new Date('2026-09-13T14:59:59.000Z')),
    false,
  );
  assert.equal(
    isNotificationDue(scheduled, new Date('2026-09-13T15:00:00.000Z')),
    true,
  );
});

test('invalid scheduled time is never treated as due', () => {
  assert.equal(
    isNotificationDue({ scheduledFor: 'not-a-date' }, new Date('2026-09-13T15:00:00.000Z')),
    false,
  );
});

test('service worker delivery message becomes a canonical delivered record', () => {
  const result = normalizeDeliveredTransportMessage({
    type: 'FF_NOTIFICATION_DELIVERED',
    record: {
      id: scheduled.id,
      targetSignalId: scheduled.targetSignalId,
      eventId: scheduled.eventId,
      channel: scheduled.channel,
      deliveredAt: '2026-09-13T15:01:00.000Z',
    },
  });

  assert.deepEqual(result, {
    id: scheduled.id,
    targetSignalId: scheduled.targetSignalId,
    eventId: scheduled.eventId,
    channel: scheduled.channel,
    deliveredAt: '2026-09-13T15:01:00.000Z',
  });
});

test('malformed service worker messages are rejected', () => {
  assert.equal(normalizeDeliveredTransportMessage(null), null);
  assert.equal(normalizeDeliveredTransportMessage({ type: 'OTHER' }), null);
  assert.equal(
    normalizeDeliveredTransportMessage({
      type: 'FF_NOTIFICATION_DELIVERED',
      record: {
        id: scheduled.id,
        targetSignalId: null,
        eventId: null,
        channel: 'BAD_CHANNEL',
        deliveredAt: '2026-09-13T15:01:00.000Z',
      },
    }),
    null,
  );
});
