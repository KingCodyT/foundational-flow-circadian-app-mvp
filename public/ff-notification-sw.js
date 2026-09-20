/* Approved reminder transport only. No target selection or schedule-anchor changes here. */
const CACHE = 'ff-reminder-transport-v2';
let work = Promise.resolve();
const serial = task => (work = work.catch(() => {}).then(task));
const key = id => new URL('/__ff_reminder/' + encodeURIComponent(id), self.location.origin).href;
async function read(id) { const response = await (await caches.open(CACHE)).match(key(id)); return response ? response.json() : null; }
async function save(record) { await (await caches.open(CACHE)).put(key(record.id), new Response(JSON.stringify(record), { headers: { 'Content-Type': 'application/json' } })); }
async function broadcast(record) {
  for (const client of await self.clients.matchAll({ type: 'window', includeUncontrolled: true })) client.postMessage({ type: 'FF_REMINDER_STATE', record });
}
async function api(notification, action, remindAt) {
  const response = await fetch('/api/push/action', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId: notification.clientId, notificationId: notification.id, actionToken: notification.actionToken, action, remindAt }) });
  const body = await response.json();
  if (!response.ok) throw new Error(body.reason || body.error || `Reminder request failed (${response.status})`);
  return body.reminder;
}
async function act(notification, action, remindAt) {
  const existing = await read(notification.id);
  if (['completed', 'suppressed'].includes(existing?.state)) return existing;
  // Persist the intent before a network request. Retry after worker/app restart, never claim success offline.
  const pending = { ...notification, pendingAction: action, pendingRemindAt: remindAt, pendingAt: new Date().toISOString() };
  await save(pending);
  try {
    const reminder = await api(notification, action, remindAt);
    const next = { ...reminder, displayedFor: existing?.displayedFor };
    await save(next); await broadcast(next); return next;
  } catch (error) {
    const failed = { ...pending, state: 'failed', reason: String(error.message || error) };
    await save(failed); await broadcast(failed);
    try { await self.registration.sync?.register('ff-reminder-actions'); } catch { /* Replay on next app launch where Background Sync is unavailable. */ }
    return failed;
  }
}
async function replay(includeHistory = true) {
  const cache = await caches.open(CACHE);
  for (const request of await cache.keys()) {
    const record = await (await cache.match(request)).json();
    if (record.pendingAction) await act(record, record.pendingAction, record.pendingRemindAt);
    else if (includeHistory) await broadcast(record);
  }
}
async function show(notification) {
  if (!notification || typeof notification.id !== 'string' || typeof notification.title !== 'string' || !notification.actionToken) return;
  let current;
  try { current = await api(notification, 'inspect'); }
  catch (error) { const failed = { ...notification, state: 'failed', reason: String(error.message || error) }; await save(failed); await broadcast(failed); return; }
  const prior = await read(current.id);
  if (['completed', 'suppressed', 'failed'].includes(current.state) || prior?.pendingAction || prior?.displayedFor === current.scheduledFor) return;
  if (Date.parse(current.scheduledFor) > Date.now() || !current.validUntil || Date.parse(current.validUntil) < Date.now()) return;
  const allActions = [ { action: 'done', title: 'Done' }, { action: 'later', title: '15 minutes later' }, { action: 'skip', title: 'Not tonight' } ];
  const maxActions = typeof Notification !== 'undefined' && Number.isFinite(Notification.maxActions) ? Notification.maxActions : 3;
  if (self.registration.getNotifications) {
    for (const previous of await self.registration.getNotifications()) {
      if (previous.data?.reminder && previous.tag !== current.id) previous.close();
    }
  }
  await self.registration.showNotification(current.title, {
    body: current.body, tag: current.id, renotify: false,
    actions: allActions.filter(item => item.action !== 'later' || Date.now() + 15 * 60000 <= Date.parse(current.validUntil)).slice(0, maxActions),
    data: { reminder: current, url: '/today?reminder=' + encodeURIComponent(current.id) },
  });
  const displayed = { ...current, displayedFor: current.scheduledFor };
  await save(displayed);
  await act(displayed, 'delivered');
}
async function openToday(notification) {
  const url = '/today?reminder=' + encodeURIComponent(notification?.id || '');
  for (const client of await self.clients.matchAll({ type: 'window', includeUncontrolled: true })) {
    if ('navigate' in client) { await client.navigate(url); return client.focus(); }
  }
  return self.clients.openWindow?.(url);
}
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('push', event => {
  if (!event.data) return;
  let payload; try { payload = event.data.json(); } catch { return; }
  event.waitUntil(serial(() => show(payload.notification || payload)));
});
self.addEventListener('message', event => {
  if (event.data?.type === 'FF_SHOW_NOTIFICATION') event.waitUntil(serial(() => show(event.data.notification)));
  if (event.data?.type === 'FF_GET_REMINDER_STATE') event.waitUntil(serial(() => replay()));
  if (event.data?.type === 'FF_RETRY_REMINDER_ACTIONS') event.waitUntil(serial(() => replay(false)));
  if (event.data?.type === 'FF_REMINDER_ACTION') event.waitUntil(serial(() => act(event.data.notification, event.data.action, event.data.remindAt)));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const notification = event.notification.data?.reminder;
  event.waitUntil(serial(async () => {
    if (notification && ['done', 'later', 'skip'].includes(event.action)) {
      const result = await act(notification, event.action, event.action === 'later' ? new Date(Date.now() + 15 * 60000).toISOString() : undefined);
      if (result.state === 'failed') await openToday(notification);
    } else await openToday(notification);
  }));
});
self.addEventListener('sync', event => { if (event.tag === 'ff-reminder-actions') event.waitUntil(serial(replay)); });
