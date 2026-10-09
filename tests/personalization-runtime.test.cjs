const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-typescript.cjs');
const { advancePersonalization: advance, resolvePersonalizationReview: resolve } = load('lib/personalization/runtime.ts');
const { buildDerivedEnvironment } = load('lib/personalization/derived-environment.ts');
const { selectPrimaryCoachingTarget: target } = load('lib/personalization/primary-target.ts');

function input(overrides = {}) {
  return {
    answers: { morning_light_timing: 'within_15', sleep_schedule: 'low' },
    environment: buildDerivedEnvironment({ date: new Date('2026-09-01T12:00:00') }),
    context: { timeZone: 'America/Los_Angeles', latitude: 37, longitude: -122, wakeTime: '07:00', targetBedtime: '22:30', dayLengthMinutes: 720, capturedAt: '2026-09-01T12:00:00Z' },
    ...overrides,
  };
}
const reload = value => JSON.parse(JSON.stringify(value));
const signal = state => state.state.perSignal.morning_light_timing;

test('real rebuild holds Established, full evidence, confidence and target until conflict is explicitly resolved', () => {
  const original = input();
  const first = advance(null, original);
  const changed = { ...original, answers: { ...original.answers, morning_light_timing: 'rarely' } };
  const pending = advance(first, changed);
  assert.equal(signal(first).coachingState, 'ESTABLISHED');
  assert.equal(signal(pending).coachingState, 'ESTABLISHED');
  assert.deepEqual(signal(pending).confidence, signal(first).confidence);
  assert.deepEqual(signal(pending).evidence, signal(first).evidence);
  assert.equal(target(pending.state).signalId, target(first.state).signalId);
  assert.equal(signal(pending).reconsideration.status, 'pending');
  assert.deepEqual(new Set(signal(pending).reconsideration.evidence.map(e => e.answer)), new Set(['within_15', 'rarely']));
  const restored = advance(reload(pending), changed);
  assert.deepEqual(reload(restored), reload(pending));
  const resolved = resolve(restored, changed, 'morning_light_timing', '2026-09-02T12:00:00Z');
  assert.equal(signal(resolved).reconsideration, undefined);
  assert.equal(signal(resolved).coachingState, 'NEEDS_ATTENTION');
  assert.equal(target(resolved.state).signalId, 'morning_light_timing');
  assert.equal(resolved.resolutions[0].status, 'resolved');
  assert.deepEqual(resolved.resolutions[0].priorSignal.evidence, signal(first).evidence);
  assert.deepEqual(reload(advance(reload(resolved), changed)), reload(resolved));
  const changedAgain = { ...changed, answers: original.answers };
  assert.ok(signal(advance(resolved, changedAgain)).reconsideration, 'a previously seen answer can open a new review');
});

test('small context changes accumulate against a fixed baseline, including after reload', () => {
  const original = input();
  let runtime = advance(null, original);
  for (const minutes of [740, 760, 780, 800]) {
    runtime = advance(reload(runtime), { ...original, context: { ...original.context, dayLengthMinutes: minutes } });
    assert.equal(runtime.baselines.morning_light_timing.dayLengthMinutes, 720);
    assert.equal(Boolean(signal(runtime).reconsideration), minutes >= 780);
  }
  assert.deepEqual(signal(runtime).reconsideration.reasons, ['SEASONAL_CONTEXT_CHANGED']);
});

test('travel remains pending through tiny drift and returning home; resolving one signal does not clear others', () => {
  const original = input();
  const first = advance(null, original);
  const travel = { ...original, context: { ...original.context, timeZone: 'Europe/London' } };
  let runtime = advance(first, travel);
  const observedAt = signal(runtime).reconsideration.observedAt;
  runtime = advance(reload(runtime), { ...travel, context: { ...travel.context, dayLengthMinutes: 721 } });
  runtime = advance(runtime, original);
  assert.ok(signal(runtime).reconsideration.reasons.includes('TIMEZONE_CHANGED'));
  assert.equal(signal(runtime).reconsideration.observedAt, observedAt);
  runtime = resolve(runtime, original, 'morning_light_timing', '2026-09-03T12:00:00Z');
  assert.equal(signal(runtime).reconsideration, undefined);
  assert.ok(runtime.state.perSignal.sleep_schedule.reconsideration);
  assert.ok(signal(advance(runtime, travel)).reconsideration, 'new travel reopens the resolved signal');
});

test('context and local-day rollover do not refresh behavioral confidence or manufacture completion', () => {
  const original = input();
  const first = advance(null, original);
  const next = advance(first, { ...original, environment: { ...original.environment, localDate: '2026-09-02' }, context: { ...original.context, capturedAt: '2026-09-02T12:00:00Z', dayLengthMinutes: 722 } });
  assert.deepEqual(signal(next), signal(first));
  assert.equal(target(next.state).signalId, target(first.state).signalId);
  const travelled = advance(next, { ...original, context: { ...original.context, timeZone: 'Europe/London' } });
  assert.deepEqual(signal(travelled).confidence, signal(first).confidence);
  assert.deepEqual(signal(travelled).evidence, signal(first).evidence);
});

test('daily-evidence Established survives conflict rebuilding and reload; new daily evidence remains available for resolution', () => {
  const events = Object.fromEntries(Array.from({ length: 6 }, (_, i) => [`2026-09-0${i + 1}`, { morning_light: { status: 'completed', at: `2026-09-0${i + 1}T12:00:00Z` } }]));
  const original = input({ answers: { morning_light_timing: 'rarely' }, eventStateByDate: events });
  const first = advance(null, original);
  assert.equal(signal(first).coachingState, 'ESTABLISHED');
  const changed = { ...original, answers: { morning_light_timing: 'within_60' } };
  let runtime = advance(first, changed);
  assert.equal(signal(runtime).coachingState, 'ESTABLISHED');
  assert.deepEqual(signal(runtime).evidence, signal(first).evidence);
  const newer = { ...changed, eventStateByDate: { ...events, '2026-09-07': { morning_light: { status: 'completed', at: '2026-09-07T12:00:00Z' } } } };
  runtime = advance(reload(runtime), newer);
  assert.deepEqual(signal(runtime).confidence, signal(first).confidence);
  const resolved = resolve(runtime, newer, 'morning_light_timing', '2026-09-07T13:00:00Z');
  assert.equal(signal(resolved).coachingState, 'ESTABLISHED');
  assert.equal(signal(resolved).evidence.length, 8);
});

test('legacy answer history and context migrate conservatively without losing either answer', () => {
  const original = input({ answers: { morning_light_timing: 'rarely' }, legacyHistory: { morning_light_timing: [
    { questionId: 'morning_light_timing', answer: 'within_15', source: ['QUESTIONNAIRE'] },
    { questionId: 'morning_light_timing', answer: 'rarely', source: ['QUESTIONNAIRE'] },
  ] } });
  original.legacyBaseline = { ...original.context, timeZone: 'Europe/London' };
  const runtime = advance(null, original);
  assert.equal(signal(runtime).coachingState, 'ESTABLISHED');
  assert.deepEqual(new Set(signal(runtime).reconsideration.reasons), new Set(['TIMEZONE_CHANGED', 'EVIDENCE_CONFLICT']));
  assert.equal(runtime.history.morning_light_timing.length, 2);
});


test('context-only resolution preserves full interpretation and unchanged inputs are idempotent', () => {
  const original = input();
  const first = advance(null, original);
  const changed = { ...original, context: { ...original.context, timeZone: 'Europe/London' } };
  const pending = advance(first, changed);
  assert.equal(advance(pending, changed), pending);
  const resolved = resolve(pending, changed, 'morning_light_timing', '2026-09-02T12:00:00Z');
  assert.deepEqual(signal(resolved), signal(first));
  assert.equal(target(resolved.state).signalId, target(first.state).signalId);
  assert.equal(resolved.baselines.morning_light_timing.timeZone, 'Europe/London');
  assert.equal(advance(resolved, changed), resolved);
  const unknown = resolve(resolved, changed, 'not-a-signal', '2026-09-02T12:00:00Z');
  assert.equal(unknown, resolved);
});

test('unknown context seeds without false triggers and skipped or missed records do not change behavioral confidence', () => {
  const original = input();
  const first = advance(null, { ...original, context: { ...original.context, latitude: null, longitude: null, dayLengthMinutes: null } });
  const known = advance(first, original);
  assert.equal(signal(known).reconsideration, undefined);
  const next = advance(known, { ...original, eventStateByDate: {
    '2026-09-01': { morning_light: { status: 'missed', at: '2026-09-01T12:00:00Z' } },
    '2026-09-02': { morning_light: { status: 'skipped', at: '2026-09-02T12:00:00Z' } },
  } });
  assert.deepEqual(signal(next), signal(known));
  assert.equal(target(next.state).signalId, target(known.state).signalId);
});
