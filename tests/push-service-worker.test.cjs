const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('public/ff-notification-sw.js', 'utf8');
function harness({ windows = [], cache = new Map(), remote = new Map(), offline = false } = {}) {
  const handlers = {}, displayed = [], messages = [], opened = [];
  const worker = {
    location: { origin: 'https://app.test' },
    addEventListener(type, fn) { handlers[type] = fn; }, skipWaiting() {},
    clients: { async claim() {}, async matchAll() { return windows.map(() => ({ postMessage: message => messages.push(message), async navigate(url) { opened.push(url); }, async focus() {} })); }, async openWindow(url) { opened.push(url); } },
    registration: { async showNotification(title, options) { displayed.push({ title, ...options }); } },
  };
  const context = vm.createContext({ self: worker, URL, Response, Notification: { maxActions: 2 }, Date,
    caches: { async open() { return { async match(key) { const value = cache.get(typeof key === 'string' ? key : key.url); return value ? new Response(value) : undefined; }, async put(key, response) { cache.set(key, await response.text()); }, async keys() { return [...cache.keys()]; } }; } },
    async fetch(url, options) {
      if (offline) throw new Error('Network offline');
      const { notificationId, action, remindAt } = JSON.parse(options.body);
      const record = remote.get(notificationId);
      if (!record) return new Response(JSON.stringify({ error: 'invalid_action_token' }), { status: 401 });
      if (action === 'delivered') { record.state = 'delivered'; record.deliveredAt = new Date().toISOString(); }
      if (action === 'done') record.state = 'completed';
      if (action === 'skip') { record.state = 'suppressed'; record.reason = 'Not tonight'; }
      if (action === 'later') { record.state = 'deferred'; record.scheduledFor = remindAt; }
      return new Response(JSON.stringify({ reminder: record }));
    },
  });
  vm.runInContext(source, context);
  async function emit(type, fields = {}) { const promises = []; handlers[type]({ ...fields, waitUntil(promise) { promises.push(promise); } }); await Promise.all(promises); }
  return { displayed, messages, opened, cache, remote, emit };
}
const reminder = id => ({ id, clientId: 'test-client', actionToken: 'test-token', title: 'Reduce bright screens', body: 'Supports bedtime', eventId: 'digital_sunset', channel: 'NOTIFICATION', state: 'sent', scheduledFor: new Date(Date.now() - 1000).toISOString(), validUntil: new Date(Date.now() + 3600000).toISOString() });
test('push shows and acknowledges with app open, backgrounded or no app windows; duplicates survive worker restart', async () => {
  for (const windows of [['foreground'], ['background'], []]) {
    const record = reminder('test-' + windows.length + (windows[0] || 'closed'));
    const remote = new Map([[record.id, record]]), worker = harness({ windows, remote });
    await worker.emit('push', { data: { json: () => ({ notification: record }) } });
    assert.equal(worker.displayed.length, 1); assert.equal(remote.get(record.id).state, 'delivered');
    assert.equal(worker.displayed[0].actions.length, 2); // platform button limit, all responses remain available after tap
    assert.equal(worker.messages.length, windows.length);
    const restarted = harness({ cache: worker.cache, remote });
    await restarted.emit('push', { data: { json: () => ({ notification: record }) } });
    assert.equal(restarted.displayed.length, 0);
    await restarted.emit('notificationclick', { action: '', notification: { close() {}, data: worker.displayed[0].data } });
    assert.equal(restarted.opened[0], '/today?reminder=' + encodeURIComponent(record.id));
  }
});
test('Done, 15 minutes later and Not tonight persist while no page is open', async () => {
  for (const [action, expected] of [['done','completed'], ['later','deferred'], ['skip','suppressed']]) {
    const record = reminder(action), remote = new Map([[record.id, record]]), worker = harness({ remote });
    await worker.emit('notificationclick', { action, notification: { close() {}, data: { reminder: record } } });
    assert.equal(remote.get(record.id).state, expected);
    assert.equal(worker.opened.length, 0);
    if (action === 'later') assert.ok(Math.abs(Date.parse(remote.get(record.id).scheduledFor) - Date.now() - 15 * 60000) < 1000);
    const restarted = harness({ cache: worker.cache, remote, windows: ['open'] });
    await restarted.emit('message', { data: { type: 'FF_GET_REMINDER_STATE' } });
    assert.equal(restarted.messages[0].record.state, expected);
  }
});
test('offline action is not fake success and retries after restart; expired/suppressed pushes stay silent', async () => {
  const record = reminder('offline'), remote = new Map([[record.id, record]]), worker = harness({ remote, offline: true });
  await worker.emit('notificationclick', { action: 'done', notification: { close() {}, data: { reminder: record } } });
  assert.equal(remote.get(record.id).state, 'sent');
  assert.equal(worker.opened[0], '/today?reminder=offline');
  const restarted = harness({ cache: worker.cache, remote });
  await restarted.emit('message', { data: { type: 'FF_GET_REMINDER_STATE' } });
  assert.equal(remote.get(record.id).state, 'completed');
  for (const record of [{ ...reminder('expired'), validUntil: new Date(Date.now()-1000).toISOString() }, { ...reminder('suppressed'), state: 'suppressed' }]) {
    const worker = harness({ remote: new Map([[record.id, record]]) });
    await worker.emit('push', { data: { json: () => ({ notification: record }) } });
    assert.equal(worker.displayed.length, 0);
  }
});
