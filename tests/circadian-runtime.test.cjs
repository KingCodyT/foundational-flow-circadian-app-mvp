const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

// Exercise the real provider, effects and persistence without installing a DOM renderer.
// Only React's hook scheduler, the clock and JSX host are substituted.
function mount(storage, route = '/now') {
  const slots = [];
  let cursor, effects, dirty, value;
  let now = new Date('2026-09-01T12:00:00Z');
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const react = {
    createContext: () => ({ Provider: 'Provider' }),
    useState(initial) {
      const i = cursor++;
      if (!slots[i]) slots[i] = { value: typeof initial === 'function' ? initial() : initial };
      return [slots[i].value, next => {
        const updated = typeof next === 'function' ? next(slots[i].value) : next;
        if (!Object.is(updated, slots[i].value)) { slots[i].value = updated; dirty = true; }
      }];
    },
    useMemo(fn, deps) {
      const i = cursor++;
      if (!slots[i] || !same(slots[i].deps, deps)) slots[i] = { value: fn(), deps };
      return slots[i].value;
    },
    useEffect(fn, deps) {
      const i = cursor++;
      if (!slots[i] || !same(slots[i].deps, deps)) { slots[i] = { deps }; effects.push(fn); }
    },
    useContext: () => value,
  };
  const cache = new Map();
  function load(filename) {
    if (!path.extname(filename)) filename += fs.existsSync(filename + '.ts') ? '.ts' : '.tsx';
    if (cache.has(filename)) return cache.get(filename).exports;
    const mod = { exports: {} }; cache.set(filename, mod);
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    const localRequire = id => {
      if (id === 'react') return react;
      if (id === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
      if (id === '@/hooks/use-live-clock') return { useLiveClock: () => now };
      if (id.endsWith('.css')) return {};
      if (id.startsWith('@/')) return load(path.join(root, id.slice(2)));
      if (id.startsWith('.')) return load(path.resolve(path.dirname(filename), id));
      return require(id);
    };
    new Function('require', 'module', 'exports', 'window', code)(localRequire, mod, mod.exports, { localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, data) => storage.set(key, data),
      removeItem: key => storage.delete(key),
    } });
    return mod.exports;
  }
  const { CircadianProvider } = load(path.join(root, 'components/circadian-provider.tsx'));
  const App = load(path.join(root, 'pages/_app.tsx')).default;
  assert.equal(App({ Component: () => null, pageProps: {} }).type, CircadianProvider, 'all routes share this provider');
  function render() {
    let renders = 0;
    do {
      assert.ok(++renders < 20, 'provider effects must settle');
      dirty = false; cursor = 0; effects = [];
      value = CircadianProvider({ children: route }).props.value;
      effects.forEach(fn => fn());
    } while (dirty);
    return value;
  }
  return { render, navigate: next => { route = next; return render(); }, tick: next => { now = new Date(next); return render(); } };
}

const key = 'foundational-flow-circadian-app-state';
function storage() {
  return new Map([[key, JSON.stringify({ clientId: 'test', answers: { morning_light_timing: 'within_15', sleep_schedule: 'low' }, dailyProfile: { timeZone: 'America/Los_Angeles', wakeTime: '07:00', targetBedtime: '22:30', locationPermissionGranted: true, latitude: 37, longitude: -122 } })]]);
}
const morning = value => value.personalization.perSignal.morning_light_timing;

test('provider records and persists reconsideration without mounting You; navigation and reload keep it pending', () => {
  const saved = storage();
  let host = mount(saved);
  let state = host.render();
  const original = JSON.parse(JSON.stringify(morning(state)));
  state.setDailyProfile({ ...state.dailyProfile, timeZone: 'Europe/London' });
  state = host.render();
  assert.ok(morning(state).reconsideration.reasons.includes('TIMEZONE_CHANGED'));
  assert.deepEqual(morning(state).confidence, original.confidence);
  assert.deepEqual(morning(state).evidence, original.evidence);
  const pending = JSON.parse(JSON.stringify(morning(state)));
  assert.deepEqual(JSON.parse(JSON.stringify(morning(host.navigate('/rhythm')))), pending);
  host = mount(saved, '/now');
  state = host.render();
  assert.deepEqual(morning(state), pending);
  state = host.tick('2026-09-02T12:00:00Z');
  assert.equal(state.environment.localDate, '2026-09-02');
  assert.deepEqual(morning(state).confidence, original.confidence);
  assert.ok(morning(state).reconsideration.reasons.includes('TIMEZONE_CHANGED'));
  state.resolveReconsideration('morning_light_timing');
  state = host.render();
  assert.equal(morning(state).reconsideration, undefined);
  assert.equal(morning(state).coachingState, 'ESTABLISHED');
  assert.ok(state.personalization.perSignal.sleep_schedule.reconsideration);
  state = mount(saved, '/rhythm').render();
  assert.equal(morning(state).reconsideration, undefined);
  assert.equal(JSON.parse(saved.get(key)).personalizationRuntime.resolutions.length, 1);
});

test('provider answer edits preserve Established and target through the real rebuild and reset clears lifecycle', () => {
  const saved = storage();
  let host = mount(saved, '/audit');
  let state = host.render();
  const target = state.primaryTarget.signalId;
  state.setAnswer('morning_light_timing', 'rarely');
  state = host.render();
  assert.equal(morning(state).coachingState, 'ESTABLISHED');
  assert.equal(state.primaryTarget.signalId, target);
  assert.ok(morning(state).reconsideration.reasons.includes('EVIDENCE_CONFLICT'));
  host = mount(saved, '/now'); state = host.render();
  assert.equal(morning(state).coachingState, 'ESTABLISHED');
  assert.equal(JSON.parse(saved.get(key)).personalizationRuntime.history.morning_light_timing.length, 2);
  state.resetAudit(); state = host.render();
  assert.equal(morning(state).reconsideration, undefined);
  const runtime = JSON.parse(saved.get(key)).personalizationRuntime;
  assert.deepEqual(runtime.history, {});
  assert.deepEqual(runtime.resolutions, []);
  assert.deepEqual(state.answers, {});
});


test('first assessment evidence initializes an empty signal during pending context review through provider and reload', () => {
  const saved = storage();
  const initial = JSON.parse(saved.get(key));
  initial.answers = { morning_movement: 'ideal', sleep_schedule: 'low' };
  saved.set(key, JSON.stringify(initial));
  let host = mount(saved, '/audit');
  let state = host.render();
  const initialTarget = state.primaryTarget.signalId;
  const unrelated = JSON.parse(JSON.stringify(state.personalization.perSignal.morning_movement));
  assert.equal(morning(state).coachingState, undefined);
  state.setDailyProfile({ ...state.dailyProfile, timeZone: 'Europe/London' });
  state = host.render();
  assert.equal(state.primaryTarget.signalId, initialTarget, 'context alone cannot switch target');
  assert.equal(morning(state).coachingState, undefined, 'context cannot invent behavior');
  assert.equal(morning(state).evidence[0].answer, null);
  assert.deepEqual(morning(state).reconsideration.reasons, ['TIMEZONE_CHANGED']);
  const observedAt = morning(state).reconsideration.observedAt;
  const sleep = JSON.parse(JSON.stringify(state.personalization.perSignal.sleep_schedule));
  host = mount(saved, '/now'); state = host.render();
  state.setAnswer('morning_light_timing', 'rarely');
  state = host.render();
  assert.equal(morning(state).coachingState, 'NEEDS_ATTENTION', 'first answer must initialize behavior despite pending context');
  assert.equal(morning(state).evidence[0].answer, 'rarely');
  assert.equal(morning(state).confidence.score, 0.9);
  assert.equal(state.primaryTarget.signalId, 'morning_light_timing', 'new behavioral evidence may select a target');
  assert.deepEqual(morning(state).reconsideration.reasons, ['TIMEZONE_CHANGED'], 'first evidence must not fabricate a conflict');
  assert.equal(morning(state).reconsideration.observedAt, observedAt);
  assert.deepEqual(state.personalization.perSignal.morning_movement, unrelated);
  assert.deepEqual(state.personalization.perSignal.sleep_schedule, sleep);
  const initialized = JSON.parse(JSON.stringify(morning(state)));
  const persisted = JSON.parse(saved.get(key)).personalizationRuntime;
  assert.equal(persisted.history.morning_light_timing, undefined);
  assert.equal(JSON.parse(persisted.evidenceKeys.morning_light_timing)[0], 'rarely');
  host = mount(saved, '/rhythm'); state = host.render();
  assert.deepEqual(morning(state), initialized);
  state.setAnswer('morning_light_timing', 'within_15');
  state = host.render();
  assert.equal(morning(state).coachingState, initialized.coachingState);
  assert.deepEqual(morning(state).evidence, initialized.evidence);
  assert.deepEqual(morning(state).confidence, initialized.confidence);
  assert.ok(morning(state).reconsideration.reasons.includes('EVIDENCE_CONFLICT'));
  state.resolveReconsideration('morning_light_timing');
  state = host.render();
  assert.equal(morning(state).coachingState, 'ESTABLISHED');
  assert.equal(morning(state).reconsideration, undefined);
  assert.deepEqual(state.personalization.perSignal.sleep_schedule, sleep, 'resolution is per signal');
  const established = JSON.parse(JSON.stringify(morning(state)));
  state.setDailyProfile({ ...state.dailyProfile, timeZone: 'America/Los_Angeles' });
  state = host.render();
  state.setAnswer('morning_light_timing', 'rarely');
  state = host.render();
  assert.equal(morning(state).coachingState, 'ESTABLISHED');
  assert.deepEqual(morning(state).evidence, established.evidence);
  assert.deepEqual(morning(state).confidence, established.confidence);
});
