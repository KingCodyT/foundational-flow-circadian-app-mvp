const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const React = require('react');
const Renderer = require('react-test-renderer');
const load = require('./load-typescript.cjs');
const { CircadianProvider, useCircadian } = load('components/circadian-provider.tsx');
const key = 'foundational-flow-circadian-app-state';
const fixture = name => JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/storage', `${name}.json`), 'utf8'));
const clone = value => JSON.parse(JSON.stringify(value));
const base = overrides => ({ clientId: 'synthetic-provider', answers: { morning_light_timing: 'within_15', sleep_schedule: 'low' },
  hasCompletedAudit: true, lastSavedAt: null, dailyProfile: { timeZone: 'America/Los_Angeles', wakeTime: '07:00', targetBedtime: '22:30', locationPermissionGranted: true, latitude: 37, longitude: -122 }, ...overrides });
// Real React hooks/effects via the in-memory renderer, actual provider/clock/storage
// modules, deterministic Date and timer host only. No browser or delivery bridge.
function host(t, initial = base(), instant = '2026-09-10T12:00:00Z') {
  const RealDate = Date, oldWindow = global.window, oldDocument = global.document;
  let at = instant, renderer, value, route = '/today', writeFailure = false;
  const timers = new Set(), writes = [];
  const storage = new Map([[key, typeof initial === 'string' ? initial : JSON.stringify(initial)]]);
  global.Date = class extends RealDate { constructor(...args) { super(...(args.length ? args : [at])); } static now() { return new RealDate(at).getTime(); } };
  global.window = {
    localStorage: { getItem: k => storage.get(k) ?? null, setItem(k, data) { if (writeFailure && k === key) throw Error('quota'); writes.push(k); storage.set(k, data); } },
    setInterval: fn => { timers.add(fn); return fn; }, clearInterval: fn => timers.delete(fn),
    addEventListener() {}, removeEventListener() {},
  };
  global.document = { visibilityState: 'visible', addEventListener() {}, removeEventListener() {} };
  function Probe({ name }) { value = useCircadian(); return React.createElement('route', { name }); }
  const tree = () => React.createElement(CircadianProvider, null, React.createElement(Probe, { key: route, name: route }));
  const mount = () => Renderer.act(() => { renderer = Renderer.create(tree()); });
  t.after(() => {
    if (renderer) Renderer.act(() => renderer.unmount());
    global.Date = RealDate; global.window = oldWindow; global.document = oldDocument;
  });
  mount();
  return {
    get value() { return value; }, storage, writes,
    action(fn) { Renderer.act(() => fn(value)); return value; },
    navigate(next) { route = next; Renderer.act(() => renderer.update(tree())); return value; },
    tick(next) { at = next; Renderer.act(() => [...timers].forEach(fn => fn())); return value; },
    reload() { Renderer.act(() => renderer.unmount()); mount(); return value; },
    failWrites(v) { writeFailure = v; },
    persisted: () => JSON.parse(storage.get(key)),
  };
}
const signal = (h, id = 'morning_light_timing') => h.value.runtime.state.perSignal[id];

test('real provider: hydration -> context review -> persistence -> route remount -> reload -> per-signal resolution', t => {
  const h = host(t), original = clone(signal(h)), focus = clone(h.value.acceptedFocus);
  assert.equal(focus.source, 'system-initialization');
  h.action(v => v.setDailyProfile({ ...v.dailyProfile, timeZone: 'Europe/London' }));
  const pending = clone(signal(h));
  assert.ok(pending.reconsideration.reasons.includes('TIMEZONE_CHANGED'));
  assert.deepEqual(pending.evidence, original.evidence); assert.deepEqual(pending.confidence, original.confidence);
  for (const route of ['/profile', '/audit', '/timeline?date=2024-01-01', '/today']) {
    h.navigate(route); assert.deepEqual(clone(signal(h)), pending); assert.deepEqual(h.value.acceptedFocus, focus);
  }
  h.reload(); assert.deepEqual(clone(signal(h)), pending);
  const sleep = signal(h, 'sleep_schedule');
  h.action(v => v.resolveReconsideration('morning_light_timing'));
  assert.equal(signal(h).reconsideration, undefined); assert.equal(signal(h).coachingState, 'ESTABLISHED');
  assert.equal(signal(h, 'sleep_schedule'), sleep);
  assert.equal(h.persisted().runtimeMigration, undefined);
  assert.equal(h.persisted().personalizationRuntime.resolutions.length, 1);
  h.reload(); assert.equal(signal(h).reconsideration, undefined); assert.deepEqual(h.value.acceptedFocus, focus);
});
test('first answer initializes during pending context review without replacing already initialized focus', t => {
  const h = host(t, base({ answers: { morning_movement: 'ideal', sleep_schedule: 'low' } }));
  const focus = clone(h.value.acceptedFocus);
  h.action(v => v.setDailyProfile({ ...v.dailyProfile, timeZone: 'Europe/London' }));
  assert.equal(signal(h).coachingState, undefined);
  const observedAt = signal(h).reconsideration.observedAt, unrelated = signal(h, 'morning_movement');
  h.action(v => v.setAnswer('morning_light_timing', 'rarely'));
  assert.equal(signal(h).coachingState, 'NEEDS_ATTENTION'); assert.equal(signal(h).confidence.score, 0.9);
  assert.deepEqual(signal(h).reconsideration.reasons, ['TIMEZONE_CHANGED']);
  assert.equal(signal(h).reconsideration.observedAt, observedAt); assert.equal(signal(h, 'morning_movement'), unrelated);
  assert.equal(h.value.candidateTarget.signalId, 'morning_light_timing'); assert.deepEqual(h.value.acceptedFocus, focus);
  h.reload(); assert.equal(signal(h).coachingState, 'NEEDS_ATTENTION'); assert.deepEqual(h.value.acceptedFocus, focus);
  h.action(v => v.setAnswer('morning_light_timing', 'within_15'));
  assert.ok(signal(h).reconsideration.reasons.includes('EVIDENCE_CONFLICT'));
  h.action(v => v.resolveReconsideration('morning_light_timing'));
  assert.equal(signal(h).coachingState, 'ESTABLISHED'); assert.deepEqual(h.value.acceptedFocus, focus);
});
test('daily-earned Established survives the real combined rebuild and pending answer conflict', t => {
  const events = Object.fromEntries(Array.from({ length: 6 }, (_, i) => [`2026-09-0${i+1}`, { morning_light: { status: 'completed', at: `2026-09-0${i+1}T14:00:00Z` } }]));
  const h = host(t, base({ answers: { morning_light_timing: 'rarely' }, eventStateByDate: events }));
  assert.equal(signal(h).coachingState, 'ESTABLISHED'); const original = clone(signal(h));
  h.action(v => v.setAnswer('morning_light_timing', 'within_60'));
  h.action(v => v.recordFoodTimingAction('2026-09-01', 'MEAL_STARTED', '2026-09-01T18:00:00-07:00'));
  h.reload();
  assert.equal(signal(h).coachingState, 'ESTABLISHED'); assert.deepEqual(signal(h).evidence, original.evidence); assert.deepEqual(signal(h).confidence, original.confidence);
  h.action(v => v.resolveReconsideration('morning_light_timing')); assert.equal(signal(h).coachingState, 'ESTABLISHED');
});
test('real provider detects meal add/edit/cross-date/delete and leaves unrelated signals/focus untouched', t => {
  const h = host(t), unrelated = signal(h), focus = clone(h.value.acceptedFocus);
  const initialKey = h.value.runtime.evidenceKeys.last_meal_timing;
  let id;
  h.action(v => { id = v.recordFoodTimingAction('2026-09-01', 'MEAL_STARTED', '2026-09-01T18:00:00-07:00'); });
  let last = h.value.runtime.evidenceKeys.last_meal_timing;
  assert.notEqual(last, initialKey); assert.equal(signal(h), unrelated);
  h.action(v => v.updateFoodTimingAction(id, '2026-09-01T19:00:00-07:00'));
  assert.notEqual(h.value.runtime.evidenceKeys.last_meal_timing, last); last = h.value.runtime.evidenceKeys.last_meal_timing;
  h.action(v => v.updateFoodTimingAction(id, '2026-08-31T23:00:00-07:00'));
  assert.notEqual(h.value.runtime.evidenceKeys.last_meal_timing, last);
  assert.equal(h.value.foodTimingEvidenceByDate['2026-08-31'][0].id, id);
  h.action(v => v.deleteFoodTimingAction(id)); assert.equal(h.value.runtime.evidenceKeys.last_meal_timing, initialKey);
  assert.equal(signal(h), unrelated); assert.deepEqual(h.value.acceptedFocus, focus);
  h.reload(); assert.deepEqual(h.value.acceptedFocus, focus);
});
for (const fixtureName of ['pre-fix-pending-v1', 'architecture-v1']) test(`Stage 1 checkpoint ${fixtureName} is rebuilt once and acknowledged without losing accepted state`, t => {
  const original = fixture(fixtureName), h = host(t, original);
  assert.equal(h.value.storageIssue, null); assert.equal(h.persisted().runtimeMigration.rebuildRequired, false);
  assert.equal(signal(h).coachingState, 'ESTABLISHED');
  if (fixtureName === 'architecture-v1') {
    assert.deepEqual(signal(h).evidence, original.personalizationRuntime.state.perSignal.morning_light_timing.evidence);
    assert.deepEqual(signal(h).confidence, original.personalizationRuntime.state.perSignal.morning_light_timing.confidence);
  } else {
    assert.equal(signal(h).evidence[0].answer, 'within_15');
    assert.ok(!signal(h).reconsideration.reasons.includes('EVIDENCE_CONFLICT'));
    assert.deepEqual(h.value.runtime.history, original.personalizationRuntime.history);
  }
  const checkpoint = h.persisted().personalizationRuntime;
  h.reload(); assert.deepEqual(h.persisted().personalizationRuntime, checkpoint);
});
test('explicit accepted no-target is authoritative through evidence, context, time and reload', t => {
  const initial = fixture('combined-v2'); const h = host(t, initial), focus = clone(h.value.acceptedFocus);
  h.action(v => v.setAnswer('sleep_schedule', 'low'));
  h.action(v => v.setDailyProfile({ ...v.dailyProfile, timeZone: 'Asia/Tokyo' }));
  h.tick('2026-09-12T00:00:00Z'); h.reload();
  assert.deepEqual(h.value.acceptedFocus, focus); assert.equal(h.value.currentPersonalization.primaryCoachingTarget.signalId, null);
  assert.equal(h.value.acceptedFocus.source, 'explicit');
});
test('unset waits for eligible evidence, initializes once and does not confuse no eligible candidate with explicit no-target', t => {
  const h = host(t, base({ answers: {} }));
  assert.equal(h.value.acceptedFocus.status, 'unset');
  h.action(v => v.setAnswer('sleep_schedule', 'low'));
  const focus = clone(h.value.acceptedFocus);
  assert.equal(focus.source, 'system-initialization'); assert.equal(focus.signalId, 'sleep_schedule');
  h.action(v => v.setAnswer('morning_light_timing', 'rarely'));
  assert.equal(h.value.candidateTarget.signalId, 'morning_light_timing'); assert.deepEqual(h.value.acceptedFocus, focus);
  h.reload(); assert.deepEqual(h.value.acceptedFocus, focus);
});
test('actual clock: midnight and DST refresh runtime date without behavior or target changes', t => {
  const h = host(t, base(), '2026-03-08T07:59:00Z'), before = clone(signal(h)), focus = clone(h.value.acceptedFocus);
  assert.equal(h.value.environment.localDate, '2026-03-07');
  h.tick('2026-03-08T08:01:00Z'); assert.equal(h.value.environment.localDate, '2026-03-08');
  h.tick('2026-03-08T09:59:00Z'); const runtime = h.value.runtime, count = h.writes.length;
  h.tick('2026-03-08T10:01:00Z');
  assert.equal(h.value.runtime, runtime); assert.equal(h.writes.length, count);
  assert.deepEqual(clone(signal(h)), before); assert.deepEqual(h.value.acceptedFocus, focus);
  h.navigate('/timeline?date=2030-01-01'); assert.equal(h.value.environment.localDate, '2026-03-08');
});
test('real provider no-op rerenders and same-value answer updates do not rewrite storage', t => {
  const h = host(t), runtime = h.value.runtime, writes = h.writes.length;
  h.action(v => v.setAnswer('morning_light_timing', 'within_15'));
  h.navigate('/profile'); h.tick('2026-09-10T12:01:00Z');
  assert.equal(h.value.runtime, runtime); assert.equal(h.writes.length, writes);
});
test('migration/rebuild write failure retains recovery and retries current runtime/focus together', t => {
  const h = host(t); h.failWrites(true);
  h.action(v => v.setAnswer('morning_light_timing', 'rarely'));
  assert.equal(h.value.storageIssue, 'write-failed'); const pending = clone(h.value.runtime), focus = clone(h.value.acceptedFocus);
  h.failWrites(false); h.action(v => v.retryStorage());
  assert.equal(h.value.storageIssue, null); assert.deepEqual(h.persisted().personalizationRuntime, pending); assert.deepEqual(h.persisted().acceptedFocus, focus);
  h.reload(); assert.deepEqual(clone(h.value.runtime), pending);
});
test('all current routes are under the root provider and views contain no personalization transitions', () => {
  const root = path.resolve(__dirname, '..');
  const app = fs.readFileSync(path.join(root, 'pages/_app.tsx'), 'utf8');
  assert.match(app, /<CircadianProvider>/);
  for (const file of fs.readdirSync(path.join(root, 'views')).filter(f => f.endsWith('.tsx'))) {
    const code = fs.readFileSync(path.join(root, 'views', file), 'utf8');
    assert.doesNotMatch(code, /assembleDay1Personalization|applyDailyEvidence|applyCircadianFoodCoachingEvidence|advancePersonalization|resolvePersonalizationReview|assessReconsideration/, file);
  }
});
test('provider location, schedule and seasonal changes stay contextual with stable accepted focus', t => {
  const h = host(t), original = clone(signal(h)), focus = clone(h.value.acceptedFocus);
  h.action(v => v.setDailyProfile({ ...v.dailyProfile, latitude: 51.5, longitude: -0.1 }));
  assert.ok(signal(h).reconsideration.reasons.includes('LOCATION_CHANGED'));
  h.action(v => v.setDailyProfile({ ...v.dailyProfile, wakeTime: '09:00' }));
  assert.ok(signal(h).reconsideration.reasons.includes('SCHEDULE_CHANGED'));
  h.tick('2026-12-21T12:00:00Z');
  assert.ok(signal(h).reconsideration.reasons.includes('SEASONAL_CONTEXT_CHANGED'));
  assert.deepEqual(signal(h).evidence, original.evidence); assert.deepEqual(signal(h).confidence, original.confidence);
  assert.deepEqual(h.value.acceptedFocus, focus); h.reload(); assert.deepEqual(h.value.acceptedFocus, focus);
});
test('provider same-instant meal edit after profile change records historical context review, not new behavior', t => {
  const h = host(t, base({ answers: { late_meals_stimulants: 'within_1_hour' } })); let id;
  h.action(v => { id = v.recordFoodTimingAction('2026-09-01', 'MEAL_STARTED', '2026-09-01T18:00:00-07:00'); });
  const original = clone(signal(h, 'last_meal_timing')), keyBefore = h.value.runtime.evidenceKeys.last_meal_timing;
  h.action(v => v.setDailyProfile({ ...v.dailyProfile, targetBedtime: '20:30' }));
  h.action(v => v.updateFoodTimingAction(id, '2026-09-01T18:00:00-07:00'));
  assert.ok(signal(h, 'last_meal_timing').reconsideration.reasons.includes('HISTORICAL_FOOD_CONTEXT_CHANGED'));
  assert.equal(h.value.runtime.evidenceKeys.last_meal_timing, keyBefore);
  assert.deepEqual(signal(h, 'last_meal_timing').confidence, original.confidence);
  assert.deepEqual(signal(h, 'last_meal_timing').evidence, original.evidence);
  h.reload(); assert.equal(h.value.runtime.evidenceKeys.last_meal_timing, keyBefore);
});
test('two explicit per-signal resolutions in one React batch both persist without accepting others', t => {
  const h = host(t);
  h.action(v => v.setDailyProfile({ ...v.dailyProfile, timeZone: 'Europe/London' }));
  const third = clone(signal(h, 'evening_light_reduction'));
  h.action(v => { v.resolveReconsideration('morning_light_timing'); v.resolveReconsideration('sleep_schedule'); });
  assert.equal(signal(h).reconsideration, undefined); assert.equal(signal(h, 'sleep_schedule').reconsideration, undefined);
  assert.equal(h.value.runtime.resolutions.length, 2);
  assert.deepEqual(clone(signal(h, 'evening_light_reduction')), third);
  h.reload(); assert.equal(signal(h).reconsideration, undefined); assert.equal(signal(h, 'sleep_schedule').reconsideration, undefined);
});
test('persisted food snapshots do not resurrect a deleted date or stale fallback context after reload', t => {
  const h = host(t); let firstId;
  h.action(v => { firstId = v.recordFoodTimingAction('2026-09-01', 'MEAL_STARTED', '2026-09-01T18:00:00-07:00'); });
  h.action(v => v.recordFoodTimingAction('2026-09-02', 'MEAL_STARTED', '2026-09-02T18:00:00-07:00'));
  h.action(v => v.deleteFoodTimingAction(firstId));
  assert.equal(h.persisted().personalizationRuntime.acceptedFoodEvidence['2026-09-01'], undefined);
  assert.equal(h.persisted().personalizationRuntime.foodContexts[firstId], undefined);
  const checkpoint = clone(h.value.runtime);
  h.reload(); assert.deepEqual(clone(h.value.runtime), checkpoint);
});
