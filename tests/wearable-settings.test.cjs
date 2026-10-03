const test = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const load = require('./load-typescript.cjs');
const { WearableSettingsPanel } = load('components/wearable-settings.tsx');
const { defaultWearableConnection: fresh, updateWearableConnection: update, wearablePresentation: presentation, normalizeWearableConnection: normalize } = load('lib/wearables/connection.ts');
const providers = [{ id: 'test-only', name: 'Test provider' }];
const data = [{ id: 'test-observation' }];
function connected() {
  const pending = update(fresh(), { type: 'connecting', providerId: 'test-only' }, providers);
  return update(pending, { type: 'verified', providerId: 'test-only', revision: pending.revision, session: { connected: true, supportedCategories: ['sleep_timing'], grantedCategories: ['sleep_timing'] } }, providers);
}
const render = (connection, configured = providers) => renderToStaticMarkup(React.createElement(WearableSettingsPanel, { connection, providers: configured, update() {}, timeZone: 'UTC' }));
const controls = ['Manage connection', 'Choose shared data', 'Disconnect wearable', 'Delete imported wearable data', 'Last synced'];
function noControls(html) { controls.forEach(text => assert.ok(!html.includes(text), text)); }
test('disconnected and legacy checked preferences cannot impersonate a connection', () => {
  for (const state of [fresh(), { ...fresh(), enabled: true }, { ...connected(), lastSyncedAt: '2026-09-18T08:00:00Z' }]) {
    const html = render(state, []);
    assert.match(html, /NO WEARABLE CONNECTED/);
    assert.match(html, /Connect a wearable/);
    assert.doesNotMatch(html, /Enable wearable connection|type="checkbox"/);
    noControls(html);
  }
});
test('connecting is only possible for a configured adapter and exposes no connected controls', () => {
  assert.deepEqual(update(fresh(), { type: 'connecting', providerId: 'test-only' }), fresh());
  const state = update(fresh(), { type: 'connecting', providerId: 'test-only' }, providers);
  assert.equal(presentation(state, providers).status, 'connecting');
  const html = render(state);
  assert.match(html, /Connecting/);
  assert.match(html, /disabled=""/);
  noControls(html);
});
test('verified connections expose controls but no deletion without actual imports', () => {
  const html = render({ ...connected(), lastSyncedAt: '2026-09-18T08:00:00Z' });
  for (const text of ['Connected', 'Manage connection', 'Choose shared data', 'Disconnect wearable', 'Last synced']) assert.ok(html.includes(text));
  assert.doesNotMatch(html, /Delete imported wearable data/);
  assert.match(render({ ...connected(), observations: data }), /Delete imported wearable data/);
});
test('syncing and attention after verified connection preserve appropriate management', () => {
  const state = connected();
  for (const [type, label] of [['syncing', 'Syncing'], ['attention', 'Connection needs attention']]) {
    const html = render(update(state, { type, revision: state.revision }, providers));
    assert.ok(html.includes(label));
    assert.match(html, /Manage connection/);
    assert.doesNotMatch(html, /Delete imported wearable data/);
  }
});
test('failed authorization and restored unverified sessions hide connected-only controls', () => {
  const pending = update(fresh(), { type: 'connecting', providerId: 'test-only' }, providers);
  const failed = update(pending, { type: 'attention', revision: pending.revision }, providers);
  for (const state of [failed, normalize(connected())]) {
    const html = render(state);
    assert.match(html, /Connection needs attention/);
    assert.match(html, /Connect a wearable/);
    noControls(html);
  }
});
test('disconnected retained-data state is explicit but has no connected-only controls', () => {
  const state = update({ ...connected(), observations: data, lastSyncedAt: '2026-09-18T08:00:00Z' }, { type: 'disconnect' });
  assert.equal(presentation(state, providers).status, 'disconnected_with_data');
  const html = render(state);
  assert.match(html, /Previously imported wearable data is retained/);
  noControls(html);
  assert.doesNotMatch(render(fresh()), /Previously imported/);
});
