const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const load = require('./load-typescript.cjs');
const { decodeStorage, createStorageSession, mergeRetained, RECOVERY_KEY } = load('lib/personalization/storage-migration.ts');
const { STORAGE_KEY } = load('lib/audit-store.ts');
const fixture = name => JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/storage', `${name}.json`), 'utf8'));
const raw = name => JSON.stringify(fixture(name));
function memory(initial) {
  const data = new Map(initial === undefined ? [] : [[STORAGE_KEY, initial]]);
  const writes = [];
  let fail = null, failRead = false;
  return { data, writes, fail: key => { fail = key; }, failRead: v => { failRead = v; },
    getItem(key) { if (failRead) throw Error('read'); return data.get(key) ?? null; },
    setItem(key, value) { if (key === fail) throw Error('quota'); writes.push(key); data.set(key, value); } };
}
for (const name of ['food-v1', 'architecture-v1', 'combined-v2', 'pre-fix-pending-v1']) {
  test(`${name}: migration is deterministic, idempotent and does not mutate its source`, () => {
    const input = raw(name), result = decodeStorage(input);
    assert.equal(result.status, 'ready');
    assert.deepEqual(result, decodeStorage(input));
    const repeat = decodeStorage(JSON.stringify(result.state));
    assert.equal(repeat.migrated, false);
    assert.deepEqual(repeat.state, result.state);
    assert.equal(raw(name), input);
    assert.equal(result.state.schemaVersion, 2);
    for (const [key, value] of Object.entries(fixture(name))) {
      if (!['personalizationRuntime', 'schemaVersion'].includes(key)) assert.deepEqual(result.state[key], value, key);
    }
  });
}
test('migration keeps all meals, empty buckets, offsets, history and genuine recommendation records exactly', () => {
  const before = fixture('food-v1'), after = decodeStorage(JSON.stringify(before)).state;
  for (const key of ['foodTimingEvidenceByDate', 'notificationState', 'dailyProfile', 'eventStateByDate', 'recommendationArchive', 'wearableConnection']) assert.deepEqual(after[key], before[key]);
  assert.equal(after.foodTimingEvidenceByDate['2026-08-19'][1].recordedAt, undefined, 'do not invent receipt times');
});
test('accepted focus distinguishes unset, legacy choice and explicit no-target; never ranks candidates', () => {
  assert.equal(decodeStorage(raw('architecture-v1')).state.acceptedFocus.status, 'unset');
  const food = fixture('food-v1');
  assert.deepEqual(decodeStorage(JSON.stringify(food)).state.acceptedFocus, { version: 1, status: 'accepted', signalId: 'meal_timing', acceptedAt: null, source: 'legacy-profile' });
  food.dailyProfile.coachingTargetSignalId = null;
  assert.equal(decodeStorage(JSON.stringify(food)).state.acceptedFocus.status, 'accepted');
  assert.equal(decodeStorage(JSON.stringify(food)).state.acceptedFocus.signalId, null);
  const combined = fixture('combined-v2');
  combined.dailyProfile.timeZone = 'Asia/Tokyo';
  assert.deepEqual(decodeStorage(JSON.stringify(combined)).state.acceptedFocus, combined.acceptedFocus);
});
test('legacy runtime cache invalidation preserves Established interpretation, confidence, baseline, history and resolutions', () => {
  const before = fixture('architecture-v1').personalizationRuntime;
  const after = decodeStorage(raw('architecture-v1')).state.personalizationRuntime;
  assert.equal(after.inputKey, '');
  assert.deepEqual(after, { ...before, inputKey: '' });
});
test('defective pending placeholder invalidates only its stale evidence cache and retains review for Stage 2 rebuild', () => {
  const before = fixture('pre-fix-pending-v1').personalizationRuntime;
  const migrated = decodeStorage(raw('pre-fix-pending-v1')).state;
  assert.deepEqual(migrated.runtimeMigration.unassessedPendingSignalIds, ['morning_light_timing']);
  assert.equal(migrated.personalizationRuntime.evidenceKeys.morning_light_timing, undefined);
  assert.equal(migrated.personalizationRuntime.evidenceKeys.unrelated, 'unchanged');
  assert.deepEqual(migrated.personalizationRuntime.state, before.state);
  assert.deepEqual(migrated.personalizationRuntime.history, before.history);
  assert.deepEqual(migrated.personalizationRuntime.acceptedAnswers, before.acceptedAnswers);
});
for (const [label, input] of [
  ['bad JSON', '{'], ['empty string', ''], ['null', 'null'], ['array', '[]'],
  ['answers array', '{"answers":[]}'], ['answer nonstring', '{"answers":{"x":3}}'],
  ['bad profile', '{"dailyProfile":[]}'], ['bad timezone', '{"dailyProfile":{"timeZone":"Invalid/Zone"}}'],
  ['food wrong shape', '{"foodTimingEvidenceByDate":{"2026-01-01":{}}}'],
  ['food invalid time', JSON.stringify({ foodTimingEvidenceByDate: { day: [{ id: 'm', action: 'MEAL_STARTED', source: 'USER', at: 'invalid' }] } })],
  ['bad runtime', '{"personalizationRuntime":{"version":1}}'], ['bad notification array', '{"notificationState":{"deliveredNotifications":{}}}'],
]) test(`blocks ${label} without writing or substituting defaults`, () => {
  assert.deepEqual(decodeStorage(input), { status: 'blocked', issue: 'malformed' });
  const port = memory(input), session = createStorageSession(() => port);
  assert.equal(session.hydrate().status, 'blocked');
  assert.equal(session.save(fixture('food-v1')).issue, 'not-hydrated');
  assert.deepEqual(port.writes, []);
  assert.equal(port.data.get(STORAGE_KEY), input);
});
for (const input of ['{"schemaVersion":99}', '{"personalizationRuntime":{"version":2}}', '{"acceptedFocus":{"version":99}}']) test(`unsupported future version is read-only: ${input}`, () => {
  assert.equal(decodeStorage(input).issue, 'unsupported-version');
});
test('save is blocked before hydration and storage access failure can be retried', () => {
  const port = memory(raw('food-v1')); port.failRead(true);
  const session = createStorageSession(() => port);
  assert.equal(session.save(fixture('food-v1')).issue, 'not-hydrated');
  assert.equal(session.hydrate().issue, 'read-failed');
  assert.deepEqual(port.writes, []);
  port.failRead(false); assert.equal(session.hydrate().status, 'ready');
});
test('backup failure blocks primary write; retry creates verified original before migration', () => {
  const source = raw('food-v1'), port = memory(source), session = createStorageSession(() => port);
  const state = session.hydrate().state;
  port.fail(RECOVERY_KEY);
  assert.equal(session.save(state).issue, 'backup-failed');
  assert.equal(port.data.get(STORAGE_KEY), source);
  port.fail(null);
  assert.equal(session.save(state).status, 'saved');
  assert.deepEqual(port.writes, [RECOVERY_KEY, STORAGE_KEY]);
  assert.deepEqual(JSON.parse(port.data.get(RECOVERY_KEY)).originals, [source]);
});
test('primary quota failure retains original and retry saves latest unsaved edits without duplicate backup', () => {
  const source = raw('food-v1'), port = memory(source), session = createStorageSession(() => port);
  const state = session.hydrate().state;
  port.fail(STORAGE_KEY);
  assert.equal(session.save(state).issue, 'write-failed');
  assert.equal(port.data.get(STORAGE_KEY), source);
  const next = { ...state, answers: { ...state.answers, new_answer: 'new' } };
  port.fail(null);
  assert.equal(session.save(next).status, 'saved');
  assert.equal(JSON.parse(port.data.get(STORAGE_KEY)).answers.new_answer, 'new');
  assert.equal(port.writes.filter(k => k === RECOVERY_KEY).length, 1);
});
test('reload after failed migration safely resumes using original and existing recovery copy', () => {
  const source = raw('food-v1'), port = memory(source);
  let session = createStorageSession(() => port);
  const state = session.hydrate().state; port.fail(STORAGE_KEY); session.save(state);
  port.fail(null); session = createStorageSession(() => port);
  assert.equal(session.save(session.hydrate().state).status, 'saved');
  assert.deepEqual(JSON.parse(port.data.get(RECOVERY_KEY)).originals, [source]);
});
test('malformed recovery record cannot be replaced or permit source overwrite', () => {
  const source = raw('food-v1'), port = memory(source); port.data.set(RECOVERY_KEY, 'bad');
  const session = createStorageSession(() => port);
  assert.equal(session.save(session.hydrate().state).issue, 'backup-failed');
  assert.equal(port.data.get(STORAGE_KEY), source); assert.equal(port.data.get(RECOVERY_KEY), 'bad');
});
test('concurrent source change is never overwritten', () => {
  const port = memory(raw('food-v1')), session = createStorageSession(() => port);
  const state = session.hydrate().state; port.data.set(STORAGE_KEY, '{"schemaVersion":99}');
  assert.equal(session.save(state).issue, 'concurrent-change');
  assert.deepEqual(port.writes, []);
});
test('normalization cannot erase hidden records/unknown fields, but explicit visible deletions still work', () => {
  const original = { profile: { name: 'A', unknown: 7 }, records: [{ id: 'hidden', future: 9 }, { id: 'visible', at: 'old', future: 8 }] };
  const before = { profile: { name: 'A' }, records: [{ id: 'visible', at: 'old' }] };
  const after = { profile: { name: 'B' }, records: [{ id: 'visible', at: 'new' }, { id: 'added', at: 'new' }] };
  const merged = mergeRetained(original, before, after);
  assert.deepEqual(merged.profile, { name: 'B', unknown: 7 });
  assert.deepEqual(merged.records, [{ id: 'hidden', future: 9 }, { id: 'visible', at: 'new', future: 8 }, { id: 'added', at: 'new' }]);
  assert.deepEqual(mergeRetained(original, before, { ...before, records: [] }).records, [{ id: 'hidden', future: 9 }]);
});
test('fresh account gets one client identity and subsequent reload is idempotent', () => {
  const port = memory(), session = createStorageSession(() => port);
  const state = session.hydrate().state;
  assert.equal(session.save({ ...state, clientId: 'synthetic-new' }).status, 'saved');
  const saved = port.data.get(STORAGE_KEY);
  assert.equal(JSON.parse(saved).clientId, 'synthetic-new');
  const reload = createStorageSession(() => port); reload.save(reload.hydrate().state);
  assert.equal(port.data.get(STORAGE_KEY), saved); assert.deepEqual(port.writes, [STORAGE_KEY]);
});
test('explicit reset remains recoverable and does not carry old accepted runtime/focus into a new account', () => {
  const source = raw('combined-v2'), port = memory(source), session = createStorageSession(() => port);
  session.save(session.hydrate().state); session.requestReset();
  assert.equal(session.save({ clientId: 'synthetic-reset', answers: {}, hasCompletedAudit: false, lastSavedAt: null }).status, 'saved');
  const saved = JSON.parse(port.data.get(STORAGE_KEY));
  assert.equal(saved.personalizationRuntime, undefined); assert.equal(saved.acceptedFocus.status, 'unset');
  assert.deepEqual(JSON.parse(port.data.get(RECOVERY_KEY)).originals, [source]);
});
for (const [label, value] of [
  ['notification title object', { notificationState: { lastNotification: { title: {} } } }],
  ['handoff guidance object missing timestamps', { firstRunHandoff: { guidance: { start: {} } } }],
  ['wearable boolean wrong type', { wearableConnection: { enabled: 'yes' } }],
  ['invalid calendar bucket', { foodTimingEvidenceByDate: { '2026-02-31': [] } }],
  ['invalid focus', { acceptedFocus: { version: 1, status: 'accepted', signalId: 'x', acceptedAt: null, source: 'uninitialized' } }],
]) test(`nested malformed storage is blocked: ${label}`, () => assert.equal(decodeStorage(JSON.stringify(value)).issue, 'malformed'));
test('combined checkpoint without a migration marker receives one-time legacy cache invalidation', () => {
  const state = fixture('pre-fix-pending-v1'); state.schemaVersion = 2;
  const decoded = decodeStorage(JSON.stringify(state));
  assert.equal(decoded.state.personalizationRuntime.inputKey, '');
  assert.deepEqual(decoded.state.runtimeMigration.unassessedPendingSignalIds, ['morning_light_timing']);
  assert.equal(decodeStorage(JSON.stringify(decoded.state)).migrated, false);
});
test('Established and Disrupted accepted states survive without interpretation repair', () => {
  const state = fixture('architecture-v1');
  state.personalizationRuntime.state.perSignal.morning_light_timing.coachingState = 'DISRUPTED';
  const decoded = decodeStorage(JSON.stringify(state));
  assert.equal(decoded.status, 'ready');
  assert.deepEqual(decoded.state.personalizationRuntime.state, state.personalizationRuntime.state);
  assert.deepEqual(decoded.state.runtimeMigration.unassessedPendingSignalIds, []);
});
test('backup verification failure never writes primary storage', () => {
  const source = raw('food-v1'), port = memory(source);
  const session = createStorageSession(() => ({ getItem: port.getItem, setItem(k, v) { if (k !== RECOVERY_KEY) port.setItem(k, v); } }));
  assert.equal(session.save(session.hydrate().state).issue, 'backup-failed');
  assert.equal(port.data.get(STORAGE_KEY), source);
});
test('a recovery backup is deduplicated and never replaces an older original', () => {
  const source = raw('food-v1'), port = memory(source);
  port.data.set(RECOVERY_KEY, JSON.stringify({ version: 1, originals: ['older-source'], futureMetadata: 7 }));
  const session = createStorageSession(() => port); session.save(session.hydrate().state);
  assert.deepEqual(JSON.parse(port.data.get(RECOVERY_KEY)), { version: 1, originals: ['older-source', source], futureMetadata: 7 });
});
