const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-typescript.cjs');
const { defaultWearableConnection: fresh, updateWearableConnection: update, normalizeWearableConnection: normalize, wearableSupportingEvidence: evidence, wearableStatusLabel: label, WEARABLE_PROVIDERS } = load('lib/wearables/connection.ts');
// Explicit test fixtures, never registered by application code.
const providers = [{ id: 'test-only' }];
const observation = (overrides = {}) => ({ id: 'fixture-1', providerId: 'test-only', category: 'sleep_timing', observedAt: '2026-09-18T07:00:00Z', importedAt: '2026-09-18T08:00:00Z', source: 'wearable_inference', quality: 'usable', metric: 'sleep_start_epoch', value: 123, unit: 'seconds', independentSourceId: 'sensor-a', ...overrides });
function connected() {
  let state = update(fresh(), { type: 'enable', enabled: true });
  state = update(state, { type: 'share', category: 'sleep_timing', enabled: true });
  return update(state, { type: 'verified', revision: state.revision, providerId: 'test-only', session: { connected: true, supportedCategories: ['sleep_timing', 'activity'], grantedCategories: ['sleep_timing'] } }, providers);
}
const sync = (state, observations) => update(state, { type: 'synced', providerId: 'test-only', revision: state.revision, at: '2026-09-18T08:00:00Z', observations }, providers);
test('default off, no configured providers and no fabricated data or successful connection', () => {
  assert.deepEqual(WEARABLE_PROVIDERS, []);
  const state = update(fresh(), { type: 'enable', enabled: true });
  assert.equal(fresh().enabled, false);
  assert.equal(state.status, 'not_connected');
  assert.equal(state.lastSyncedAt, null);
  assert.deepEqual(state.observations, []);
  assert.equal(update(state, { type: 'verified', revision: state.revision, providerId: 'test-only', session: { connected: true, supportedCategories: ['sleep_timing'], grantedCategories: ['sleep_timing'] } }).status, 'needs_attention');
});
test('sharing preferences are independent and imported categories require consent, support and grant', () => {
  let state = connected();
  assert.equal(state.sharedData.activity, false);
  state = update(state, { type: 'share', category: 'temperature', enabled: true });
  assert.equal(state.sharedData.temperature, false);
  state = update(state, { type: 'share', category: 'activity', enabled: true });
  state = sync(state, [observation(), observation({ id: 'not-granted', category: 'activity' }), observation({ id: 'unsupported', category: 'temperature' }), observation({ id: 'wrong-provider', providerId: 'other' }), observation({ id: 'invalid', value: NaN }), observation({ id: 'wrong-date', observedAt: 'invalid' })]);
  assert.equal(state.observations.length, 1);
  assert.equal(state.observations[0].source, 'wearable_inference');
  assert.equal(state.lastSyncedAt, '2026-09-18T08:00:00Z');
  assert.equal(evidence(state).length, 1);
});
test('missing and low-quality data cannot become adverse coaching evidence', () => {
  let state = sync(connected(), [observation({ quality: 'low' }), observation({ id: 'unknown', quality: 'unknown' })]);
  assert.deepEqual(evidence(state), []);
  assert.deepEqual(evidence(sync(connected(), [])), []);
  assert.equal(state.status, 'connected');
  assert.equal('dailyProfile' in state, false);
  assert.equal('primaryCoachingTarget' in state, false);
  assert.equal('score' in state, false);
});
test('sync state and failed connection are distinct; reload never trusts a persisted connection', () => {
  let state = connected();
  assert.equal(label(state.status), 'Connected');
  state = update(state, { type: 'syncing', revision: state.revision }, providers);
  assert.equal(label(state.status), 'Syncing');
  state = update(state, { type: 'attention', revision: state.revision }, providers);
  assert.equal(label(state.status), 'Connection needs attention');
  assert.equal(normalize(connected()).status, 'needs_attention');
  assert.deepEqual(normalize(connected()).grantedCategories, []);
  assert.deepEqual(normalize(null), fresh());
});
test('off, disconnect, deletion and consent removal reject late syncs without restoring data', () => {
  const original = sync(connected(), [observation()]);
  for (const action of [{ type: 'enable', enabled: false }, { type: 'disconnect' }, { type: 'delete_data' }, { type: 'share', category: 'sleep_timing', enabled: false }]) {
    const state = update(original, action);
    const late = update(state, { type: 'synced', providerId: 'test-only', revision: original.revision, at: '2026-09-18T09:00:00Z', observations: [observation({ id: 'late' })] }, providers);
    assert.deepEqual(late, state);
    assert.deepEqual(evidence(state), []);
  }
  const disconnected = update(original, { type: 'disconnect' });
  assert.equal(disconnected.observations.length, 1);
  const deleted = update(disconnected, { type: 'delete_data' });
  assert.deepEqual(deleted.observations, []);
  assert.equal(deleted.lastSyncedAt, null);
});
test('duplicates do not multiply observations and normalization rejects malformed imports', () => {
  const state = sync(sync(connected(), [observation()]), [observation()]);
  assert.equal(state.observations.length, 1);
  const normalized = normalize({ ...state, observations: [null, observation(), observation({ source: 'user_entered' })], lastSyncedAt: 'invalid' });
  assert.equal(normalized.observations.length, 1);
  assert.equal(normalized.lastSyncedAt, null);
});
test('consumer light readings cannot enter the evidence model or create a score', () => {
  const light = observation({ id: 'light', category: 'light_exposure', metric: 'ambient_lux', unit: 'lux' });
  const normalized = normalize({ ...connected(), observations: [light] });
  assert.deepEqual(normalized.observations, []);
  assert.deepEqual(evidence(normalized), []);
  assert.equal('circadianDose' in normalized, false);
  assert.equal('score' in normalized, false);
});
