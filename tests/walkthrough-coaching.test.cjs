const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-typescript.cjs');
const { buildTodaysFlow } = load('lib/flow-engine.ts');
const { buildFoodTimingPlan } = load('lib/personalization/food-timing-plan.ts');
const { selectContextualReminder, foodStepHandled } = load('lib/personalization/contextual-reminders.ts');
const { resolveCoachingFocus } = load('lib/personalization/primary-target.ts');
const { assembleNowCoachingDecision } = load('lib/personalization/now-coaching.ts');
const { assembleDay1Personalization } = load('lib/personalization/day1.ts');
const profile = { wakeTime: '05:05', targetBedtime: '21:45', lastMealTime: '18:30', timeZone: 'UTC', locationPermissionGranted: false, foodTimingGoal: 'earlier_last_meal' };
const now = new Date('2026-09-18T17:45:00Z');
const base = buildTodaysFlow({ now, profile });
const events = [...base.events, { id: 'sunset', name: 'Sunset', start: new Date('2026-09-18T15:02:00Z'), status: 'missed', guidance: '' }];
function day1(id, state = 'NEEDS_ATTENTION') {
  return { generatedAt: now.toISOString(), signalStates: { [id]: { id, classification: 'BEHAVIOR', coachingState: state, confidence: { score: 0.9 }, evidence: [{ answer: 'sometimes', source: ['QUESTIONNAIRE'] }] } }, primaryCoachingTarget: { signalId: id, coachingState: state, severity: 'MODERATE', reason: 'assessed' }, source: { answersPresent: true, legacyMappingsUsed: [] } };
}
const reminder = overrides => selectContextualReminder({ events, day1: day1('last_meal_timing'), records: {}, foodEvidence: [], foodPlan: buildFoodTimingPlan(profile, events, now), now, ...overrides });

test('reported pattern, internal endpoint, and a bounded practical step stay separate', () => {
  const plan = buildFoodTimingPlan(profile, events, now);
  assert.equal(plan.currentPattern.lastMealAt.toISOString(), '2026-09-18T18:30:00.000Z');
  assert.equal(plan.biologicalDirection.lastMealAt.toISOString(), '2026-09-18T15:02:00.000Z');
  assert.equal(plan.today.at.toISOString(), '2026-09-18T18:00:00.000Z');
  assert.equal(plan.today.kind, 'SMALL_STEP');
  assert.equal(profile.lastMealTime, '18:30');
  assert.ok(!plan.today.explanation.includes('3:02'));
});

test('unknown goals, morning habits and constraints produce observation, not automatic breakfast', () => {
  for (const overrides of [{ foodTimingGoal: undefined }, { workStructure: 'shift' }, { realityNotes: 'family dinner' }, { upcomingTravel: true }, { lastMealTime: null }]) {
    const plan = buildFoodTimingPlan({ ...profile, ...overrides }, events, now);
    assert.equal(plan.today.kind, 'OBSERVE');
    assert.equal(plan.today.at, null);
  }
  const result = reminder({ day1: day1('meal_timing_regularity'), now: new Date('2026-09-18T05:35:00Z') });
  assert.equal(result.current, null);
});

test('practical steps never jump more than 30 minutes and use quarter-hour times', () => {
  for (const lastMealTime of ['17:07', '18:30', '19:53', '20:00']) {
    const plan = buildFoodTimingPlan({ ...profile, lastMealTime }, events, now);
    assert.equal(plan.today.kind, 'SMALL_STEP');
    assert.equal(plan.today.at.getUTCMinutes() % 15, 0);
    assert.ok(plan.currentPattern.lastMealAt - plan.today.at <= 30 * 60000);
    assert.ok(plan.currentPattern.lastMealAt > plan.today.at);
  }
});

test('one timely Food action is suppressed by a response or credible meal evidence', () => {
  assert.equal(reminder({}).current.id, 'last_meal');
  assert.equal(foodStepHandled({ last_meal: { status: 'skipped' } }, [], buildFoodTimingPlan(profile, events, now)), true);
  for (const status of ['completed', 'skipped']) assert.equal(reminder({ records: { last_meal: { status, at: now.toISOString() } } }).current, null);
  for (const action of ['MEAL_STARTED', 'EATING_LATER', 'NOT_YET']) assert.equal(reminder({ foodEvidence: [{ id: 'response', action, at: now.toISOString(), source: 'USER' }] }).current, null);
  assert.equal(reminder({ day1: day1('morning_light_timing') }).current, null);
  assert.equal(reminder({ day1: day1('last_meal_timing', 'ESTABLISHED') }).current, null);
});

test('overlapping evening cues combine and one response quiets the evening group', () => {
  const eveningEvents = ['sunset', 'dim_house', 'digital_sunset'].map(id => ({ id, name: id, start: new Date(+now - 60000), end: new Date(+now + 60000), status: 'current', guidance: 'old' }));
  const input = { events: eveningEvents, day1: day1('evening_light_reduction') };
  assert.equal(reminder(input).current.name, 'Evening wind-down');
  assert.equal(reminder({ ...input, records: { dim_house: { status: 'completed', at: now.toISOString() } } }).current, null);
});

test('movement and midday light need related target evidence, not just a clock event', () => {
  for (const [eventId, signalId] of [['movement', 'morning_movement'], ['midday_light', 'day_brightness']]) {
    const event = { id: eventId, name: eventId, start: now, end: new Date(+now + 60000), status: 'current', guidance: '' };
    const target = day1(signalId);
    target.signalStates[signalId].evidence = [];
    assert.equal(reminder({ events: [event], day1: target }).current, null);
    target.signalStates[signalId].evidence = [{ answer: 'rarely', source: ['QUESTIONNAIRE'] }];
    assert.equal(reminder({ events: [event], day1: target }).current.id, eventId);
  }
});

test('new events and evidence update state without replacing the assessed or reviewed target', () => {
  const a = day1('morning_light_timing', 'ESTABLISHED').signalStates;
  const b = day1('last_meal_timing').signalStates;
  const state = { generatedAt: now.toISOString(), perSignal: { ...a, ...b } };
  const assessed = { signalId: 'morning_light_timing', reason: 'original assessment' };
  assert.equal(resolveCoachingFocus(state, assessed).signalId, 'morning_light_timing');
  assert.equal(resolveCoachingFocus(state, assessed).coachingState, 'ESTABLISHED');
  assert.equal(resolveCoachingFocus(state, assessed, 'last_meal_timing').signalId, 'last_meal_timing');
  assert.equal(resolveCoachingFocus(state, assessed, null).signalId, null);
});

test('completed, skipped and unrelated events cannot generate coaching', () => {
  for (const status of ['completed', 'skipped', 'missed']) {
    const decision = assembleNowCoachingDecision({ day1: day1('last_meal_timing'), activeEvent: { ...events.find(e => e.id === 'last_meal'), status }, now });
    assert.equal(decision.shouldSurfacePersonalizedGuidance, false);
    assert.equal(decision.shouldSurfacePassiveContext, false);
  }
});

test('reminders carry action, reason, responses and a biologically relevant scheduled time', () => {
  const selected = reminder({}).current;
  assert.ok(selected.action.length > 0);
  assert.ok(selected.reason.length > 0);
  assert.deepEqual(selected.responses, ['Done', 'Not today', 'Adjust']);
  assert.equal(selected.scheduledFor, selected.start.toISOString());
  assert.equal(reminder({}).next, null);
});

test('highest-value actionable cue wins, and Adjust defers the entire evening group', () => {
  const cues = ['sunset', 'dim_house'].map(id => ({ id, name: id, start: new Date(+now - 60000), end: new Date(+now + 3600000), status: 'current', guidance: '' }));
  const input = { events: cues, day1: day1('evening_light_reduction') };
  assert.equal(reminder(input).current.id, 'dim_house');
  const remindAt = new Date(+now + 15 * 60000).toISOString();
  const deferred = reminder({ ...input, records: { dim_house: { status: 'upcoming', remindAt, at: now.toISOString() } } });
  assert.equal(deferred.current, null);
  assert.equal(deferred.next.id, 'dim_house');
  assert.equal(deferred.next.scheduledFor, remindAt);
  const resumed = reminder({ ...input, records: { dim_house: { status: 'upcoming', remindAt, at: now.toISOString() } }, now: new Date(remindAt) });
  assert.equal(resumed.current.id, 'dim_house');
});

test('notification opt-out never schedules an external reminder', () => {
  const { planFutureNotification } = load('lib/personalization/future-notification-planner.ts');
  const plan = planFutureNotification({ notificationsEnabled: false, day1: day1('last_meal_timing'), futureEvent: { ...reminder({}).current, start: new Date(+now + 60000), status: 'upcoming' }, now });
  assert.equal(plan.notification, null);
  assert.equal(plan.reason, 'notifications_disabled');
});
