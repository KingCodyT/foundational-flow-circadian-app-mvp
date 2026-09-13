const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-typescript.cjs');

const {
  pruneNotificationPersistenceState,
  setMaterialChangeKey,
  upsertDeliveredNotification,
} = load('lib/personalization/notification-persistence.ts');

const now = new Date('2026-09-13T16:00:00.000Z');

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

function delivered(deliveredAt, overrides = {}) {
  return {
    id: 'notification:morning_light_timing:morning_light',
    targetSignalId: 'morning_light_timing',
    eventId: 'morning_light',
    channel: 'NOTIFICATION',
    deliveredAt,
    ...overrides,
  };
}

test('hydration preserves current notification runtime state', () => {
  const state = pruneNotificationPersistenceState(
    {
      scheduledNotification: scheduled(),
      deliveredNotifications: [
        delivered('2026-09-13T15:30:00.000Z'),
      ],
      materialChangeKeys: {
        'NOTIFICATION::morning_light_timing::morning_light': 'window-1',
      },
    },
    now,
  );

  assert.equal(state.scheduledNotification.id, scheduled().id);
  assert.equal(state.deliveredNotifications.length, 1);
  assert.equal(
    state.materialChangeKeys['NOTIFICATION::morning_light_timing::morning_light'],
    'window-1',
  );
});

test('stale scheduled runtime artifacts are pruned without touching biological state', () => {
  const state = pruneNotificationPersistenceState(
    {
      scheduledNotification: scheduled({
        scheduledFor: '2026-09-12T15:59:59.000Z',
      }),
    },
    now,
  );

  assert.equal(state.scheduledNotification, null);
});

test('delivery history older than retention is removed', () => {
  const state = pruneNotificationPersistenceState(
    {
      deliveredNotifications: [
        delivered('2026-08-01T12:00:00.000Z'),
        delivered('2026-09-13T15:00:00.000Z', { id: 'recent' }),
      ],
    },
    now,
  );

  assert.deepEqual(state.deliveredNotifications.map((record) => record.id), ['recent']);
});

test('delivery upsert replaces the same notification identity instead of duplicating it', () => {
  const current = [delivered('2026-09-13T15:00:00.000Z')];
  const replacement = delivered('2026-09-13T15:05:00.000Z');

  const next = upsertDeliveredNotification(current, replacement, now);

  assert.equal(next.length, 1);
  assert.equal(next[0].deliveredAt, replacement.deliveredAt);
});

test('material change keys can be stored and cleared independently', () => {
  const identity = 'NOTIFICATION::morning_light_timing::morning_light';
  const withKey = setMaterialChangeKey({}, identity, 'window-2');
  assert.equal(withKey[identity], 'window-2');

  const cleared = setMaterialChangeKey(withKey, identity, null);
  assert.equal(cleared[identity], undefined);
});
