const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-typescript.cjs');

const { orchestrateNotificationDelivery } = load('lib/personalization/notification-orchestration.ts');

const now = new Date('2026-09-13T15:00:00.000Z');

function candidate({
  level = 3,
  disposition = 'NOTIFICATION_ELIGIBLE',
  targetSignalId = 'morning_light_timing',
  relevant = true,
  actionable = true,
  interrupt = true,
  redundant = false,
  reason = 'needs_attention_biologically_relevant_actionable',
  start = '2026-09-13T14:45:00.000Z',
  end = '2026-09-13T15:15:00.000Z',
} = {}) {
  return {
    finalLevel: level,
    disposition,
    targetSignalId,
    interruptionEligible: interrupt,
    biologicallyRelevantNow: relevant,
    actionableNow: actionable,
    eligibility: { redundant },
    originalDecision: { reason },
    eventWindow: { start, end },
  };
}

function event({ id = 'morning_light', status = 'current' } = {}) {
  return {
    id,
    name: 'Morning Light',
    start: new Date('2026-09-13T14:45:00.000Z'),
    end: new Date('2026-09-13T15:15:00.000Z'),
    status,
    guidance: 'Get outside for morning light.',
  };
}

function voice() {
  return {
    mode: 'COACHING',
    silent: false,
    headline: 'Morning Light',
    guidance: 'Get outside for morning light.',
    why: null,
    evidenceAction: null,
    perspective: null,
  };
}

test('delivers current Level 3 coaching notification with voice copy', () => {
  const result = orchestrateNotificationDelivery({
    candidate: candidate(),
    activeEvent: event(),
    voice: voice(),
    scheduled: {
      targetSignalId: 'morning_light_timing',
      eventId: 'morning_light',
    },
    now,
  });

  assert.equal(result.shouldDeliver, true);
  assert.equal(result.channel, 'NOTIFICATION');
  assert.equal(result.reason, 'current_notification_ready');
  assert.equal(result.payload.title, 'Morning Light');
  assert.equal(result.payload.body, 'Get outside for morning light.');
});

test('kills a zombie notification when its biological window has closed', () => {
  const result = orchestrateNotificationDelivery({
    candidate: candidate({ end: '2026-09-13T14:59:00.000Z' }),
    activeEvent: event(),
    voice: voice(),
    now,
  });

  assert.equal(result.shouldDeliver, false);
  assert.equal(result.reason, 'biological_window_has_closed');
  assert.equal(result.payload, null);
});

test('kills a scheduled notification when the target changed', () => {
  const result = orchestrateNotificationDelivery({
    candidate: candidate(),
    activeEvent: event(),
    voice: voice(),
    scheduled: { targetSignalId: 'evening_light_reduction' },
    now,
  });

  assert.equal(result.shouldDeliver, false);
  assert.equal(result.reason, 'scheduled_target_is_stale');
});

test('kills a scheduled notification when the active event changed', () => {
  const result = orchestrateNotificationDelivery({
    candidate: candidate(),
    activeEvent: event(),
    voice: voice(),
    scheduled: { eventId: 'midday_light' },
    now,
  });

  assert.equal(result.shouldDeliver, false);
  assert.equal(result.reason, 'scheduled_event_is_stale');
});

test('does not interrupt when delivery rules keep guidance in-app', () => {
  const result = orchestrateNotificationDelivery({
    candidate: candidate({ level: 2, disposition: 'IN_APP_GUIDANCE', interrupt: false }),
    activeEvent: event(),
    voice: voice(),
    now,
  });

  assert.equal(result.shouldDeliver, false);
  assert.equal(result.reason, 'delivery_decision_does_not_interrupt');
});

test('requires valid coaching voice copy for Level 3 delivery', () => {
  const result = orchestrateNotificationDelivery({
    candidate: candidate(),
    activeEvent: event(),
    voice: { ...voice(), mode: 'SILENT', silent: true, headline: null, guidance: null },
    now,
  });

  assert.equal(result.shouldDeliver, false);
  assert.equal(result.reason, 'no_valid_coaching_copy');
});

test('Level 4 contextual alert requires explicit upstream copy', () => {
  const disruption = candidate({
    level: 4,
    disposition: 'CONTEXTUAL_ALERT_ELIGIBLE',
    targetSignalId: 'sleep_schedule',
    relevant: false,
    actionable: false,
    reason: 'material_contextual_disruption',
  });

  const withoutCopy = orchestrateNotificationDelivery({ candidate: disruption, now });
  assert.equal(withoutCopy.shouldDeliver, false);
  assert.equal(withoutCopy.reason, 'no_contextual_alert_copy');

  const withCopy = orchestrateNotificationDelivery({
    candidate: disruption,
    contextualAlertCopy: {
      title: 'Travel changed your biological day',
      body: 'Your timing context shifted enough to deserve attention.',
    },
    now,
  });

  assert.equal(withCopy.shouldDeliver, true);
  assert.equal(withCopy.channel, 'CONTEXTUAL_ALERT');
  assert.equal(withCopy.payload.level, 4);
});
