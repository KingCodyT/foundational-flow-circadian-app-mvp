const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const key = 'foundational-flow-circadian-app-state';
const recoveryKey = `${key}:recovery:v2`;
const fixture = name => JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/storage', `${name}.json`), 'utf8'));
// Execute the actual provider/effects and storage adapter. Only React scheduling/JSX
// is substituted; no routes, delivery bridges, browser, personal data or network.
function mount(initial) {
  const saved = new Map(initial === undefined ? [] : [[key, typeof initial === 'string' ? initial : JSON.stringify(initial)]]);
  const slots = [], writes = [];
  let cursor, effects, dirty, value, failWrite, failRead = false;
  const equal = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
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
    useRef(initial) { const i = cursor++; return slots[i] ?? (slots[i] = { current: initial }); },
    useCallback(fn, deps) {
      const i = cursor++;
      if (!slots[i] || !equal(slots[i].deps, deps)) slots[i] = { value: fn, deps };
      return slots[i].value;
    },
    useEffect(fn, deps) {
      const i = cursor++;
      if (!slots[i] || !equal(slots[i].deps, deps)) { slots[i] = { deps }; effects.push(fn); }
    },
    useContext: () => value,
  };
  const storage = {
    getItem(k) { if (failRead) throw Error('storage unavailable'); return saved.get(k) ?? null; },
    setItem(k, v) { if (k === failWrite) throw Error('quota'); writes.push(k); saved.set(k, v); },
    removeItem() { assert.fail('provider must not delete storage during recovery/reset'); },
  };
  const cache = new Map();
  function load(filename) {
    if (!path.extname(filename)) filename += fs.existsSync(filename + '.ts') ? '.ts' : '.tsx';
    if (cache.has(filename)) return cache.get(filename).exports;
    const mod = { exports: {} }; cache.set(filename, mod);
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017, jsx: ts.JsxEmit.ReactJSX,
    } }).outputText;
    const localRequire = id => {
      if (id === 'react') return react;
      if (id === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }) };
      if (id.startsWith('@/')) return load(path.join(root, id.slice(2)));
      if (id.startsWith('.')) return load(path.resolve(path.dirname(filename), id));
      return require(id);
    };
    new Function('require', 'module', 'exports', 'window', code)(localRequire, mod, mod.exports, { localStorage: storage });
    return mod.exports;
  }
  const Provider = load(path.join(root, 'components/circadian-provider.tsx')).CircadianProvider;
  function render(runEffects = true) {
    let count = 0;
    do {
      assert.ok(++count < 20, 'effects must settle'); dirty = false; cursor = 0; effects = [];
      value = Provider({ children: null }).props.value;
      if (runEffects) effects.forEach(fn => fn());
    } while (dirty);
    return value;
  }
  return { render, saved, writes, failRead: v => { failRead = v; }, failWrite: k => { failWrite = k; } };
}
for (const name of ['food-v1', 'architecture-v1', 'combined-v2', 'pre-fix-pending-v1']) test(`provider hydrates and roundtrips ${name} without losing opaque state`, () => {
  const original = fixture(name), host = mount(original);
  let value = host.render();
  assert.equal(value.isHydrated, true); assert.equal(value.storageIssue, null);
  value.setAnswer('synthetic_answer', 'new'); value = host.render();
  const stored = JSON.parse(host.saved.get(key));
  assert.equal(stored.answers.synthetic_answer, 'new');
  for (const field of ['foodTimingEvidenceByDate', 'notificationState', 'dailyProfile', 'wearableConnection', 'recommendationArchive', 'assessmentEvidenceHistory', 'futureRoot']) assert.deepEqual(stored[field], original[field], field);
  if (original.personalizationRuntime) assert.deepEqual(stored.personalizationRuntime.state, original.personalizationRuntime.state);
  const reloaded = mount(host.saved.get(key)); reloaded.render();
  assert.equal(reloaded.saved.get(key), host.saved.get(key)); assert.equal(reloaded.writes.length, 0);
});
for (const input of ['{', '{"schemaVersion":99}', '{"answers":[]}']) test(`provider blocks unsafe hydration and reset: ${input}`, () => {
  const host = mount(input); let value = host.render();
  assert.equal(value.isHydrated, false); assert.ok(value.storageIssue);
  value.setAnswer('early', 'cannot-save'); value.completeAudit(); value.resetAudit(); value = host.render();
  assert.equal(value.isHydrated, false); assert.equal(host.saved.get(key), input); assert.deepEqual(host.writes, []);
});
test('provider first render does not persist defaults before hydration effects', () => {
  const host = mount(fixture('food-v1')), value = host.render(false);
  assert.equal(value.isHydrated, false); assert.deepEqual(host.writes, []);
});
test('provider can retry unavailable storage without fabricating a new user', () => {
  const host = mount(fixture('food-v1')); host.failRead(true);
  let value = host.render(); assert.equal(value.storageIssue, 'read-failed'); assert.equal(value.isHydrated, false);
  host.failRead(false); value.retryStorage(); value = host.render();
  assert.equal(value.storageIssue, null); assert.equal(value.clientId, 'synthetic-food-only');
});
for (const target of [key, recoveryKey]) test(`provider retries failed ${target === key ? 'primary' : 'backup'} save with latest changes`, () => {
  const original = fixture('food-v1'), host = mount(original); host.failWrite(target);
  let value = host.render(); assert.equal(value.isHydrated, true); assert.ok(value.storageIssue);
  assert.deepEqual(JSON.parse(host.saved.get(key)), original);
  value.setAnswer('synthetic_answer', 'new'); value = host.render();
  assert.deepEqual(JSON.parse(host.saved.get(key)), original);
  host.failWrite(null); value.retryStorage(); value = host.render();
  assert.equal(value.storageIssue, null); assert.equal(JSON.parse(host.saved.get(key)).answers.synthetic_answer, 'new');
  assert.deepEqual(JSON.parse(host.saved.get(recoveryKey)).originals, [JSON.stringify(original)]);
});
test('provider meal edit/delete preserves historical records not targeted by the action', () => {
  const original = fixture('food-v1'), host = mount(original); let value = host.render();
  value.updateFoodTimingAction('synthetic-meal-1', '2026-08-18T18:00:00-07:00'); value = host.render();
  let stored = JSON.parse(host.saved.get(key));
  assert.equal(stored.foodTimingEvidenceByDate['2026-08-18'][0].id, 'synthetic-meal-1');
  assert.deepEqual(stored.foodTimingEvidenceByDate['2026-08-18'][0].futureMeal, { keep: true });
  assert.equal(stored.foodTimingEvidenceByDate['2026-08-18'][0].historicalContext.futureAnchor, 'retain');
  assert.deepEqual(stored.foodTimingEvidenceByDate['2026-08-19'], [original.foodTimingEvidenceByDate['2026-08-19'][1]]);
  value.deleteFoodTimingAction('synthetic-meal-1'); value = host.render();
  stored = JSON.parse(host.saved.get(key));
  assert.equal(stored.foodTimingEvidenceByDate['2026-08-18'], undefined);
  assert.deepEqual(stored.notificationState, original.notificationState);
});
test('provider context/profile edit does not replace accepted target or runtime and preserves unknown nested data', () => {
  const original = fixture('combined-v2'), host = mount(original); let value = host.render();
  const { futureProfile, ...knownProfile } = value.dailyProfile;
  value.setDailyProfile({ ...knownProfile, timeZone: 'Asia/Tokyo' }); host.render();
  const stored = JSON.parse(host.saved.get(key));
  assert.deepEqual(stored.acceptedFocus, original.acceptedFocus);
  assert.deepEqual(stored.personalizationRuntime, original.personalizationRuntime);
  assert.deepEqual(stored.foodTimingEvidenceByDate, original.foodTimingEvidenceByDate);
  assert.deepEqual(stored.dailyProfile.futureProfile, original.dailyProfile.futureProfile);
});
test('explicit provider reset has a recovery copy before account replacement', () => {
  const host = mount(fixture('combined-v2')); let value = host.render();
  const original = host.saved.get(key); value.resetAudit(); value = host.render();
  const stored = JSON.parse(host.saved.get(key));
  assert.deepEqual(stored.answers, {}); assert.equal(stored.personalizationRuntime, undefined);
  assert.equal(stored.acceptedFocus.status, 'unset');
  assert.deepEqual(JSON.parse(host.saved.get(recoveryKey)).originals, [original]);
});
test('clearing an event really removes it without dropping unrelated date records', () => {
  const original = fixture('food-v1');
  original.eventStateByDate['2026-08-19'].sleep_window = { status: 'skipped', at: '2026-08-19T22:00:00-07:00', futureRecord: 42 };
  const host = mount(original); let value = host.render();
  value.clearEventRecords('morning_light'); host.render();
  assert.deepEqual(JSON.parse(host.saved.get(key)).eventStateByDate, { '2026-08-19': { sleep_window: original.eventStateByDate['2026-08-19'].sleep_window } });
});
test('notification display pruning is not deletion of persisted history when new delivery status arrives', () => {
  const original = fixture('food-v1'), host = mount(original); const value = host.render();
  assert.deepEqual(value.notificationState.deliveredNotifications, []);
  value.recordDeliveryStatus({ id: 'synthetic-status', status: 'Deferred', at: '2026-08-20T01:00:00Z' }); host.render();
  const saved = JSON.parse(host.saved.get(key));
  assert.deepEqual(saved.notificationState.deliveredNotifications, original.notificationState.deliveredNotifications);
  assert.deepEqual(saved.notificationState.futureNotification, original.notificationState.futureNotification);
});
