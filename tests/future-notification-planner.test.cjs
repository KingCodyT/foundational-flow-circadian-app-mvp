const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-typescript.cjs');

const { planFutureNotification } = load('lib/personalization/future-notification-planner.ts');
const { CoachingState, HierarchyLayer } = load('lib/personalization/types.ts');
const { EvidenceSeverity } = load('lib/personalization/severity.ts');

function makeDay1({
  signalId = 'morning_light_timing',
  coachingState = CoachingState.NEEDS_ATTENTION,
} = {}) {
  return {
    generatedAt: '2026-09-13T12:00:00.000Z',
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

function makeFutureEvent({
  id = 'morning_light',
  start = '2026-09-13T14:00:00.000Z',
  end = '2026-09-13T15:00:00.000Z',
} = {}) {
  return {
    id,
    name: 'Future event',
    start: new Date(start),
    end: new Date(end),
    status: 'upcoming',
    guidance: 'Get outside for useful light.',
    why: 'Timing matters.',
  };
}

test('plans the next known interrupt-eligible biological opportunity', () => {
  const result = planFutureNotification({
    day1: makeDay1(),
    futureEvent: makeFutureEvent(),
    now: new Date('2026-09-13T12:00:00.000Z'),
  });

  assert.equal(result.reason, 'planned');
  assert.ok(result.notification);
  assert.equal(result.notification.eventId, 'morning_light');
  assert.equal(result.notification.targetSignalId, 'morning_light_timing');
  assert.equal(result.notification.scheduledFor, '2026-09-13T14:00:00.000Z');
  assert.match(result.notification.id, /^future:morning_light_timing:morning_light:/);
});

test('does not turn an unrelated future circadian event into coaching', () => {
  const result = planFutureNotification({
    day1: makeDay1(),
    futureEvent: makeFutureEvent({ id: 'digital_sunset' }),
    now: new Date('2026-09-13T12:00:00.000Z'),
  });

  assert.equal(result.notification, null);
  assert.equal(result.reason, 'future_opportunity_not_interrupt_eligible');
});

test('DEVELOPING future guidance stays non-interrupting', () => {
  const result = planFutureNotification({
    day1: makeDay1({ coachingState: CoachingState.DEVELOPING }),
    futureEvent: makeFutureEvent(),
    now: new Date('2026-09-13T12:00:00.000Z'),
  });

  assert.equal(result.notification, null);
  assert.equal(result.reason, 'future_opportunity_not_interrupt_eligible');
});

test('does not schedule beyond the planning horizon', () => {
  const result = planFutureNotification({
    day1: makeDay1(),
    futureEvent: makeFutureEvent({
      start: '2026-09-14T12:30:00.000Z',
      end: '2026-09-14T13:30:00.000Z',
    }),
    now: new Date('2026-09-13T12:00:00.000Z'),
  });

  assert.equal(result.notification, null);
  assert.equal(result.reason, 'event_beyond_planning_horizon');
});

test('delivery cooldown can suppress a projected repeat', () => {
  const result = planFutureNotification({
    day1: makeDay1(),
    futureEvent: makeFutureEvent(),
    delivered: [
      {
        channel: 'NOTIFICATION',
        targetSignalId: 'morning_light_timing',
        eventId: 'morning_light',
        deliveredAt: '2026-09-13T13:30:00.000Z',
      },
    ],
    now: new Date('2026-09-13T12:00:00.000Z'),
  });

  assert.equal(result.notification, null);
  assert.equal(result.reason, 'cooldown_active');
});
