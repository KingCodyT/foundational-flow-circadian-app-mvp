const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const React = require('react');
const Renderer = require('react-test-renderer');
const load = require('./load-typescript.cjs');
const { CircadianProvider, useCircadian } = load('components/circadian-provider.tsx');
const { RouterContext } = require('next/dist/shared/lib/router-context.shared-runtime');
const key = 'foundational-flow-circadian-app-state';
const fixture = name => JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/storage', `${name}.json`), 'utf8'));
const clone = value => JSON.parse(JSON.stringify(value));
const base = overrides => ({ clientId: 'synthetic-provider', answers: { morning_light_timing: 'within_15', sleep_schedule: 'low' },
  hasCompletedAudit: true, lastSavedAt: null, dailyProfile: { timeZone: 'America/Los_Angeles', wakeTime: '07:00', targetBedtime: '22:30', locationPermissionGranted: true, latitude: 37, longitude: -122 }, ...overrides });
// Real React hooks/effects via the in-memory renderer, actual provider/clock/storage
// modules, deterministic Date and timer host only. No browser or delivery bridge.
function host(t, initial = base(), instant = '2026-09-10T12:00:00Z', renderPages = false, initialRoute = '/today') {
  const RealDate = Date, oldWindow = global.window, oldDocument = global.document, oldStorage = global.localStorage, oldSelf = global.self;
  let at = instant, renderer, value, route = initialRoute, writeFailure = false;
  const timers = new Set(), writes = [];
  const storage = new Map([[key, typeof initial === 'string' ? initial : JSON.stringify(initial)]]);
  global.Date = class extends RealDate { constructor(...args) { super(...(args.length ? args : [at])); } static now() { return new RealDate(at).getTime(); } };
  global.window = {
    localStorage: { getItem: k => storage.get(k) ?? null, setItem(k, data) { if (writeFailure && k === key) throw Error('quota'); writes.push(k); storage.set(k, data); } },
    setInterval: fn => { timers.add(fn); return fn; }, clearInterval: fn => timers.delete(fn),
    addEventListener() {}, removeEventListener() {}, scrollTo() {}, setTimeout: () => 0, clearTimeout() {},
  };
  global.self = { setTimeout: () => 0, clearTimeout() {} }; // No viewport/prefetch work in the in-memory renderer.
  global.localStorage = global.window.localStorage;
  global.window.localStorage.removeItem = k => storage.delete(k);
  global.document = { visibilityState: 'visible', addEventListener() {}, removeEventListener() {} };
  function Probe({ name }) { value = useCircadian(); return React.createElement('route', { name }); }
  function navigate(next) { route = typeof next === "string" ? next : `${next.pathname}?${new URLSearchParams(next.query)}`; renderer.update(tree()); }
  const tree = () => {
    if (!renderPages) return React.createElement(CircadianProvider, null, React.createElement(Probe, { key: route, name: route }));
    const url = new URL(route, 'https://synthetic.invalid');
    const router = { pathname: url.pathname, route: url.pathname, asPath: route, query: Object.fromEntries(url.searchParams), isReady: true,
      push: next => { navigate(next); return Promise.resolve(true); }, prefetch: () => Promise.resolve() };
    const Page = load(`pages/${url.pathname.slice(1)}.tsx`).default;
    return React.createElement(RouterContext.Provider, { value: router }, React.createElement(CircadianProvider, null,
      React.createElement(Probe, { name: route }), React.createElement(Page)));
  };
  const mount = () => Renderer.act(() => { renderer = Renderer.create(tree()); });
  t.after(() => {
    if (renderer) Renderer.act(() => renderer.unmount());
    global.Date = RealDate; global.window = oldWindow; global.document = oldDocument; global.localStorage = oldStorage; global.self = oldSelf;
  });
  mount();
  return {
    get value() { return value; }, get rendered() { return renderer.root; }, storage, writes,
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
test('provider same-instant meal edit after profile change preserves historical context without manufactured review', t => {
  const h = host(t, base({ answers: { late_meals_stimulants: 'within_1_hour' } })); let id;
  h.action(v => { id = v.recordFoodTimingAction('2026-09-01', 'MEAL_STARTED', '2026-09-01T18:00:00-07:00'); });
  const original = clone(signal(h, 'last_meal_timing')), keyBefore = h.value.runtime.evidenceKeys.last_meal_timing;
  h.action(v => v.setDailyProfile({ ...v.dailyProfile, targetBedtime: '20:30' }));
  h.action(v => v.updateFoodTimingAction(id, '2026-09-01T18:00:00-07:00'));
  assert.ok(!signal(h, 'last_meal_timing').reconsideration?.reasons.includes('HISTORICAL_FOOD_CONTEXT_CHANGED'));
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

// Stage 3: mount real canonical page components under the same provider and
// Next router context. Navigation is simulated in memory; no browser is run.
test('canonical pages and back/forward-style navigation preserve the complete accepted runtime', t => {
  const h = host(t, base(), undefined, true);
  h.action(v => v.setDailyProfile({ ...v.dailyProfile, timeZone: 'Europe/London' }));
  assert.equal(signal(h).coachingState, 'ESTABLISHED');
  assert.ok(signal(h).reconsideration);
  const runtime = h.value.runtime, focus = h.value.acceptedFocus, saved = h.storage.get(key), writes = h.writes.length;
  for (const route of ['/food', '/timeline', '/profile', '/food', '/today', '/profile', '/today?view=overview']) {
    h.navigate(route);
    const nav = h.rendered.findByProps({ 'aria-label': 'Primary navigation' });
    const links = nav.findAllByType('a');
    assert.deepEqual(links.map(a => a.props.href), ['/today', '/food', '/timeline', '/profile']);
    assert.deepEqual(links.map(a => a.findByType('span').children.join('')), ['Today', 'Food', 'Timeline', 'Profile']);
    assert.deepEqual(links.filter(a => a.props['aria-current'] === 'page').map(a => a.props.href), [route.split('?')[0]]);
    assert.equal(h.value.runtime, runtime);
    assert.equal(h.value.acceptedFocus, focus);
    assert.equal(h.storage.get(key), saved);
    assert.equal(h.writes.length, writes);
  }
});

test('real onboarding recovers a draft, preserves five stages and hands off to Today without a second runtime transition', t => {
  const h = host(t, base({ hasCompletedAudit: false }), undefined, true);
  const draft = { ...h.value.dailyProfile, displayName: 'Synthetic', lastMealTime: '18:00', locationPermissionGranted: false, latitude: undefined, longitude: undefined };
  h.storage.set('foundational-flow-onboarding-draft', JSON.stringify({ profile: draft, index: 0 }));
  h.navigate('/audit');
  const text = node => node.children.map(c => typeof c === 'string' ? c : text(c)).join('');
  const button = label => h.rendered.findAllByType('button').find(b => text(b).startsWith(label));
  const stages = ['Basics', 'Schedule', 'Environment', 'Your Reality', 'Finish'];
  for (let i = 0; i < 5; i++) {
    const steps = h.rendered.findByProps({ 'aria-label': 'Setup progress' }).findAllByType('li');
    assert.deepEqual(steps.map(n => n.findByType('small').children.join('')), stages);
    assert.equal(steps[i].props['aria-current'], 'step');
    assert.equal(h.rendered.findByProps({ className: 'journey  journey-onboarding' }).props.style['--journey-image'], `url('/approved-journey/landscape-${i+1}.png')`);
    if (i === 1) {
      Renderer.act(() => button('Save and Finish Later').props.onClick());
      assert.equal(JSON.parse(h.storage.get('foundational-flow-onboarding-draft')).index, 1);
      h.navigate('/profile'); h.navigate('/audit');
      assert.equal(h.rendered.findByProps({ 'aria-label': 'Setup progress' }).findAllByType('li')[1].props['aria-current'], 'step');
    }
    if (i < 4) Renderer.act(() => button('Next:').props.onClick());
  }
  assert.equal(h.value.dailyProfile.displayName, 'Synthetic');
  assert.equal(h.value.dailyProfile.timeZone, draft.timeZone);
  assert.equal(h.value.dailyProfile.lastMealTime, '18:00');
  assert.equal(h.value.dailyProfile.locationPermissionGranted, false);
  assert.equal(h.value.hasCompletedAudit, true);
  assert.equal(h.storage.has('foundational-flow-onboarding-draft'), false);
  const runtime = h.value.runtime, focus = h.value.acceptedFocus;
  const accepted = clone(h.persisted().personalizationRuntime);
  Renderer.act(() => button('Continue to Today').props.onClick());
  assert.equal(h.rendered.findByType('route').props.name, '/today?view=overview');
  assert.equal(h.value.runtime, runtime); assert.equal(h.value.acceptedFocus, focus);
  // Existing first-run guidance may be cached on first entry; it must not
  // change accepted personalization, focus or evidence.
  assert.deepEqual(h.persisted().personalizationRuntime, accepted);
  assert.deepEqual(h.persisted().acceptedFocus, focus);
  const writes = h.writes.length;
  h.navigate('/profile'); h.navigate('/today');
  assert.equal(h.value.runtime, runtime); assert.equal(h.value.acceptedFocus, focus);
  assert.equal(h.writes.length, writes);
});

for (const route of ['/today', '/food', '/timeline', '/profile']) test(`direct ${route} hydration and reload preserve accepted state`, t => {
  const h = host(t, base(), undefined, true, route);
  h.action(v => v.setDailyProfile({ ...v.dailyProfile, timeZone: 'Europe/London' }));
  const runtime = clone(h.value.runtime), focus = clone(h.value.acceptedFocus);
  h.reload();
  assert.deepEqual(h.value.runtime, runtime);
  assert.deepEqual(h.value.acceptedFocus, focus);
  const links = h.rendered.findByProps({ 'aria-label': 'Primary navigation' }).findAllByType('a');
  assert.deepEqual(links.filter(a => a.props['aria-current'] === 'page').map(a => a.props.href), [route]);
});

test('Timeline date controls and reload are read-only across historical and future dates', t => {
 const h=host(t,base(),undefined,true,'/timeline?date=2026-09-01');
 h.action(v=>v.setDailyProfile({...v.dailyProfile,timeZone:'Europe/London'}));
 const runtime=h.value.runtime,focus=h.value.acceptedFocus,candidate=clone(h.value.candidateTarget),saved=h.storage.get(key),writes=h.writes.length;
 const text=n=>n.children.map(c=>typeof c==='string'?c:text(c)).join('');
 const button=label=>h.rendered.findAllByType('button').find(b=>text(b)===label);
 const dateInput=()=>h.rendered.findByProps({'aria-label':'Timeline date'}).findByType('input');
 assert.equal(dateInput().props.value,'2026-09-01');
 Renderer.act(()=>button('Previous day').props.onClick());assert.equal(dateInput().props.value,'2026-08-31');
 Renderer.act(()=>button('Next day').props.onClick());assert.equal(dateInput().props.value,'2026-09-01');
 Renderer.act(()=>dateInput().props.onChange({target:{value:'2030-01-01'}}));assert.equal(dateInput().props.value,'2030-01-01');
 Renderer.act(()=>button('Return to Today').props.onClick());assert.equal(dateInput().props.value,h.value.environment.localDate);
 assert.equal(h.value.runtime,runtime);assert.equal(h.value.acceptedFocus,focus);assert.deepEqual(clone(h.value.candidateTarget),candidate);
 assert.equal(h.storage.get(key),saved);assert.equal(h.writes.length,writes);
 h.navigate('/timeline?date=2026-09-01');h.reload();assert.equal(dateInput().props.value,'2026-09-01');
 assert.deepEqual(clone(h.value.runtime),clone(runtime));assert.deepEqual(h.value.acceptedFocus,focus);
});

test('Timeline compact meal controls save, edit, reload, and remove without duplicate cards', t => {
 const h=host(t,base(),undefined,true,'/timeline?date=2026-09-10');
 const text=n=>n.children.map(c=>typeof c==='string'?c:text(c)).join('');
 const button=label=>h.rendered.findAllByType('button').find(b=>text(b)===label);
 assert.match(text(h.rendered.findByProps({'aria-label':'Day recap'})),/Your recorded activities will appear here/);
 assert.equal(button("I'm eating now"),undefined);
 Renderer.act(()=>button('Add a meal').props.onClick({currentTarget:null}));
 Renderer.act(()=>h.rendered.findByProps({role:'dialog'}).findByType('form').props.onSubmit({preventDefault(){}}));
 const list=()=>h.rendered.findByProps({'aria-label':'Timeline entries'});
 assert.equal(list().findAllByType('li').length,1);
 assert.match(text(list()),/Meal time saved/);
 assert.doesNotMatch(text(list()),/Recorded meal|Completed|Record details/);
 assert.equal(h.rendered.findAllByProps({'aria-label':'Food timing next step'}).length,0);
 h.reload();
 assert.equal(list().findAllByType('li').length,1);
 Renderer.act(()=>button('Edit').props.onClick({currentTarget:null}));
 Renderer.act(()=>h.rendered.findByProps({id:'food-time-hour'}).props.onChange({target:{value:'4'}}));
 Renderer.act(()=>h.rendered.findByProps({role:'dialog'}).findByType('form').props.onSubmit({preventDefault(){}}));
 assert.equal(Object.values(h.value.foodTimingEvidenceByDate).flat().length,1);
 assert.match(text(list()),/Meal time saved/);
 Renderer.act(()=>button('Edit').props.onClick({currentTarget:null}));
 Renderer.act(()=>button('Remove time').props.onClick());
 Renderer.act(()=>button('Remove').props.onClick());
 assert.equal(h.rendered.findAllByProps({'aria-label':'Timeline entries'}).length,0);
 assert.match(text(h.rendered),/Meal time removed/);
 h.navigate('/timeline?date=2026-09-09');
 Renderer.act(()=>button('Add a meal').props.onClick({currentTarget:null}));
 Renderer.act(()=>h.rendered.findByProps({role:'dialog'}).findByType('form').props.onSubmit({preventDefault(){}}));
 assert.equal(list().findAllByType('li').length,1);
});

test('Timeline existing meal editor moves historical evidence with its ID and receipt provenance', t => {
 const food={id:'historical-meal',action:'MEAL_STARTED',source:'USER',at:'2026-09-01T18:00:00-07:00',recordedAt:'2026-09-02T12:00:00Z',updatedAt:'2026-09-02T12:00:00Z'};
 const h=host(t,base({foodTimingEvidenceByDate:{'2026-09-01':[food]}}),undefined,true,'/timeline?date=2026-09-01');
 const focus=clone(h.value.acceptedFocus),unrelated=signal(h);
 const text=n=>n.children.map(c=>typeof c==='string'?c:text(c)).join('');
 const change=h.rendered.findAllByType('button').find(b=>text(b)==='Edit');
 Renderer.act(()=>change.props.onClick({currentTarget:null}));
 const dialog=h.rendered.findByProps({role:'dialog'});
 Renderer.act(()=>dialog.findByProps({type:'date'}).props.onChange({target:{value:'2026-08-31'}}));
 Renderer.act(()=>dialog.findByType('form').props.onSubmit({preventDefault(){}}));
 const moved=h.value.foodTimingEvidenceByDate['2026-08-31'][0];
 assert.equal(moved.id,food.id);assert.equal(moved.recordedAt,food.recordedAt);
 assert.equal(moved.at,'2026-09-01T01:00:00.000Z');assert.equal(moved.updatedAt,'2026-09-10T12:00:00.000Z');
 assert.equal(moved.historicalContext,undefined);assert.equal(moved.historicalContextOccurrenceAt, food.at);assert.equal(signal(h),unrelated);assert.deepEqual(h.value.acceptedFocus,focus);
 const read=()=>h.rendered.findAllByProps({'aria-label':'Timeline entries'}).flatMap(list=>list.findAllByType('li')).filter(n=>text(n).includes('Meal'));
 assert.equal(read().length,0);h.navigate('/timeline?date=2026-08-31');assert.equal(read().length,1);
 h.reload();assert.equal(read().length,1);assert.equal(h.value.foodTimingEvidenceByDate['2026-08-31'][0].id,food.id);
});

test('saving an unchanged historical meal preserves the later repeated DST instant and seconds', t => {
 const food={id:'dst-meal',action:'MEAL_STARTED',source:'USER',at:'2026-11-01T01:30:25-08:00',recordedAt:'2026-11-01T12:00:00Z'};
 const h=host(t,base({foodTimingEvidenceByDate:{'2026-11-01':[food]}}),'2026-11-02T12:00:00Z',true,'/timeline?date=2026-11-01');
 const stored=h.storage.get(key),runtime=h.value.runtime;
 const text=n=>n.children.map(c=>typeof c==='string'?c:text(c)).join('');
 Renderer.act(()=>h.rendered.findAllByType('button').find(b=>text(b)==='Edit').props.onClick({currentTarget:null}));
 Renderer.act(()=>h.rendered.findByProps({role:'dialog'}).findByType('form').props.onSubmit({preventDefault(){}}));
 assert.equal(h.storage.get(key),stored);assert.equal(h.value.runtime,runtime);
});

test('historical Timeline edit must preserve a genuine snapshot instead of recapturing the current profile', t => {
 const context={capturedAt:'2026-09-01T18:00:00-07:00',timeZone:'America/Los_Angeles',latitude:37,longitude:-122,wakeAt:'2026-09-01T07:00:00-07:00',morningLightAt:null,sunriseAt:'2026-09-01T06:30:00-07:00',sunsetAt:'2026-09-01T19:30:00-07:00',targetSleepAt:'2026-09-01T22:30:00-07:00',retainedExtension:'keep'};
 const food={id:'historical-context',action:'MEAL_STARTED',source:'USER',at:'2026-09-01T18:00:00-07:00',historicalContext:context};
 const initial=base({dailyProfile:{timeZone:'Asia/Tokyo',wakeTime:'10:00',targetBedtime:'02:00',locationPermissionGranted:true,latitude:35.7,longitude:139.7},foodTimingEvidenceByDate:{'2026-09-01':[food]}});
 const h=host(t,initial,undefined,true,'/timeline?date=2026-09-02');
 const text=n=>n.children.map(c=>typeof c==='string'?c:text(c)).join('');
 Renderer.act(()=>h.rendered.findAllByType('button').find(b=>text(b)==='Edit').props.onClick({currentTarget:null}));
 const dialog=h.rendered.findByProps({role:'dialog'});
 Renderer.act(()=>dialog.findByProps({type:'date'}).props.onChange({target:{value:'2026-09-03'}}));
 Renderer.act(()=>dialog.findByType('form').props.onSubmit({preventDefault(){}}));
 const edited=Object.values(h.value.foodTimingEvidenceByDate).flat().find(e=>e.id===food.id);
 assert.deepEqual(edited.historicalContext,context);
});

for (const scenario of [
 {name:'unchanged historical occurrence',date:null,hour:null,zone:'America/Los_Angeles',snapshot:true},
 {name:'historical time change',date:null,hour:'7',zone:'America/Los_Angeles',snapshot:true},
 {name:'cross-date historical move',date:'2026-08-31',hour:null,zone:'America/Los_Angeles',snapshot:true},
 {name:'travel timezone edit',date:'2026-09-03',hour:null,zone:'Asia/Tokyo',snapshot:true},
 {name:'legacy missing-context edit',date:'2026-08-31',hour:null,zone:'America/Los_Angeles',snapshot:false},
]) test(`real historical editor: ${scenario.name} preserves provenance without current-context fabrication`, t => {
 const context={capturedAt:'2026-09-01T18:00:00-07:00',timeZone:'America/Los_Angeles',latitude:37,longitude:-122,wakeAt:'2026-09-01T07:00:00-07:00',morningLightAt:null,sunriseAt:null,sunsetAt:'2026-09-01T19:30:00-07:00',targetSleepAt:'2026-09-01T22:30:00-07:00',extension:{keep:'original'}};
 const food={id:'preserve-context',action:'MEAL_STARTED',source:'USER',at:'2026-09-01T18:00:00-07:00',recordedAt:'2026-09-02T12:00:00Z',...(scenario.snapshot?{historicalContext:context}:{})};
 const profile={timeZone:scenario.zone,wakeTime:'10:00',targetBedtime:'02:00',latitude:35.7,longitude:139.7,locationPermissionGranted:true};
 const date=scenario.zone==='Asia/Tokyo'?'2026-09-02':'2026-09-01';
 const h=host(t,base({dailyProfile:profile,foodTimingEvidenceByDate:{'2026-09-01':[food]}}),undefined,true,`/timeline?date=${date}`);
 const text=n=>n.children.map(c=>typeof c==='string'?c:text(c)).join('');
 const get=()=>Object.values(h.value.foodTimingEvidenceByDate).flat().find(e=>e.id===food.id);
 const original=clone(get()),key=h.value.runtime.inputKey,foodKey=h.value.runtime.evidenceKeys.last_meal_timing,focus=clone(h.value.acceptedFocus),unrelated=signal(h),writes=h.writes.length;
 Renderer.act(()=>h.rendered.findAllByType('button').find(b=>text(b)==='Edit').props.onClick({currentTarget:null}));
 const dialog=h.rendered.findByProps({role:'dialog'});
 if(scenario.date) Renderer.act(()=>dialog.findByProps({type:'date'}).props.onChange({target:{value:scenario.date}}));
 if(scenario.hour) Renderer.act(()=>dialog.findByProps({id:'food-time-hour'}).props.onChange({target:{value:scenario.hour}}));
 Renderer.act(()=>dialog.findByType('form').props.onSubmit({preventDefault(){}}));
 const changed=Boolean(scenario.date||scenario.hour);
 assert.deepEqual(get().historicalContext,original.historicalContext);
 assert.equal(get().recordedAt,original.recordedAt);assert.equal(get().id,original.id);
 assert.equal(signal(h),unrelated);assert.deepEqual(h.value.acceptedFocus,focus);
 if(changed) {
   assert.notEqual(get().at,original.at);assert.notEqual(h.value.runtime.inputKey,key);assert.notEqual(h.value.runtime.evidenceKeys.last_meal_timing,foodKey);
   assert.equal(get().historicalContextOccurrenceAt,original.at);
   const {buildTimeline}=load('lib/timeline.ts');
   const {localDateKey}=load('lib/live-clock.ts');
   const selected=localDateKey(new Date(get().at),scenario.zone);
   const entries=buildTimeline({date:selected,today:'2026-09-10',timeZone:scenario.zone,food:h.value.foodTimingEvidenceByDate});
   assert.equal(entries.filter(e=>e.kind==='CONTEXT'&&e.status==='saved').length,0);
   assert.match(entries.find(e=>e.kind==='CONTEXT').details,/edited occurrence is unavailable/);
   const before=h.storage.get('foundational-flow-circadian-app-state');
   h.navigate(`/timeline?date=${selected}`);assert.equal(h.storage.get('foundational-flow-circadian-app-state'),before);
 } else {assert.deepEqual(get(),original);assert.equal(h.writes.length,writes);}
 h.reload();assert.deepEqual(get().historicalContext,original.historicalContext);assert.deepEqual(h.value.acceptedFocus,focus);
 if(changed) assert.equal(get().historicalContextOccurrenceAt,original.at);
});

for (const scenario of [
 {zone:'Europe/London',wake:'07:00',bed:'22:00',at:'2026-10-01T12:00:00Z'},
 {zone:'America/New_York',wake:'02:30',bed:'01:30',at:'2026-03-08T12:00:00Z'},
 {zone:'Asia/Tokyo',wake:'00:00',bed:'12:00',at:'2026-11-01T12:00:00Z'},
 {zone:'Europe/London',wake:null,bed:null,at:'2026-10-01T12:00:00Z'},
]) test(`Profile wall-clock summary preserves saved times: ${scenario.zone} ${scenario.wake}`, t => {
 const oldTZ=process.env.TZ;process.env.TZ='America/Los_Angeles';
 t.after(()=>{if(oldTZ===undefined)delete process.env.TZ;else process.env.TZ=oldTZ;});
 const h=host(t,base({dailyProfile:{timeZone:scenario.zone,wakeTime:scenario.wake,targetBedtime:scenario.bed,locationPermissionGranted:false}}),scenario.at,true,'/profile');
 const expected=value=>value?new Intl.DateTimeFormat(undefined,{timeZone:'UTC',hour:'numeric',minute:'2-digit'}).format(new Date(`2000-01-01T${value}:00Z`)):'Not set';
 const fact=label=>h.rendered.findAll(n=>n.type?.name==='ProfileFact'&&n.props.label===label)[0].props.value;
 assert.equal(fact('Wake'),expected(scenario.wake));assert.equal(fact('Bedtime'),expected(scenario.bed));
 const saved=h.storage.get(key);h.navigate('/timeline');h.navigate('/profile');
 assert.equal(h.storage.get(key),saved);assert.equal(fact('Wake'),expected(scenario.wake));
});

test('Profile assessment presentation exposes no mutation handlers and keeps real provider state intact', t => {
 const h=host(t,fixture('architecture-v1'),undefined,true,'/profile');
 const runtime=h.value.runtime,focus=h.value.acceptedFocus,saved=h.storage.get(key),writes=h.writes.length;
 const disclosure=h.rendered.findByProps({className:'profile-disclosure assessment-disclosure'});
 assert.equal(disclosure.type,'details');assert.equal(disclosure.props.onToggle,undefined);
 assert.equal(disclosure.findAllByType('input').length,0);assert.equal(disclosure.findAllByType('form').length,0);
 assert.equal(disclosure.findAll(n=>Object.keys(n.props).some(k=>/^on[A-Z]/.test(k)&&typeof n.props[k]==='function')).length,0);
 h.navigate('/timeline');h.navigate('/profile');
 assert.equal(h.value.runtime,runtime);assert.equal(h.value.acceptedFocus,focus);assert.equal(h.storage.get(key),saved);assert.equal(h.writes.length,writes);
});
