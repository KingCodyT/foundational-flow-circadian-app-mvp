const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const base = process.env.FLOW_SMOKE_URL || 'http://localhost:3014';
const key = 'foundational-flow-circadian-app-state';
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const errors = [];
  try {
    // Actual Chromium service worker + Notifications API; CDP injects the incoming push.
    // This exercises app lifecycle without claiming a live provider or a physical phone delivery.
    const context = await browser.newContext({ permissions: ['notifications'] });
    const remote = new Map();
    await context.route('**/api/push/action', async route => {
      const { notificationId, action, remindAt } = route.request().postDataJSON();
      const record = remote.get(notificationId);
      if (!record) return route.fulfill({ status: 401, json: { error: 'invalid_action_token' } });
      if (action === 'delivered') { record.state = 'delivered'; record.deliveredAt = new Date().toISOString(); }
      if (action === 'done') record.state = 'completed';
      if (action === 'skip') { record.state = 'suppressed'; record.reason = 'Not tonight'; }
      if (action === 'later') { record.state = 'deferred'; record.scheduledFor = remindAt; }
      await route.fulfill({ json: { reminder: record } });
    });
    const control = await context.newPage();
    const cdp = await context.newCDPSession(control);
    let registrationId;
    cdp.on('ServiceWorker.workerRegistrationUpdated', ({ registrations }) => {
      registrationId = registrations.find(r => r.scopeURL === `${base}/`)?.registrationId || registrationId;
    });
    await cdp.send('ServiceWorker.enable');
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(`${base}/today`);
    await page.evaluate(async () => { await navigator.serviceWorker.register('/ff-notification-sw.js'); await navigator.serviceWorker.ready; });
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    for (const mode of ['open', 'background', 'closed']) {
      if (mode === 'background') await control.bringToFront();
      if (mode === 'closed') await page.close();
      const id = `browser-${mode}`;
      const record = { id, title: 'Test reminder', body: 'Explicit local test fixture', eventId: 'digital_sunset', channel: 'NOTIFICATION', clientId: 'local-test-client', actionToken: 'test-only', state: 'sent', scheduledFor: new Date(Date.now()-1000).toISOString(), validUntil: new Date(Date.now()+3600000).toISOString() };
      remote.set(id, record);
      await cdp.send('ServiceWorker.deliverPushMessage', { origin: base, registrationId, data: JSON.stringify({ notification: record }) });
      const worker = context.serviceWorkers().find(w => w.url().endsWith('/ff-notification-sw.js'));
      for (let i=0; i<50 && remote.get(id).state !== 'delivered'; i++) await new Promise(r => setTimeout(r, 100));
      assert.equal(remote.get(id).state, 'delivered', `${mode}: worker did not acknowledge display`);
      const visible = await worker.evaluate(async id => (await self.registration.getNotifications()).filter(n => n.tag === id).length, id);
      assert.equal(visible, 1);
      await cdp.send('ServiceWorker.deliverPushMessage', { origin: base, registrationId, data: JSON.stringify({ notification: record }) });
      // Simulate OS button callback against the real worker; provider response is a local fixture.
      const action = mode === 'open' ? 'done' : mode === 'background' ? 'later' : 'skip';
      await worker.evaluate(async ({ id, action }) => {
        const notification = (await self.registration.getNotifications()).find(n => n.tag === id);
        let pending;
        const event = new Event('notificationclick');
        Object.assign(event, { notification, action, waitUntil(promise) { pending = promise; } });
        self.dispatchEvent(event); await pending;
      }, { id, action });
      assert.equal(remote.get(id).state, action === 'done' ? 'completed' : action === 'later' ? 'deferred' : 'suppressed');
    }
    await context.close();
    for (const mobile of [false, true]) {
      const ctx = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1366, height: 900 } });
      await ctx.addInitScript(({ key }) => {
        if (localStorage.getItem(key)) return;
        localStorage.setItem(key, JSON.stringify({ clientId: 'local-missing-config-test', hasCompletedAudit: true, answers: {},
          dailyProfile: { wakeTime: '07:00', targetBedtime: '21:30', lastMealTime: '18:30', timeZone: 'America/Los_Angeles', locationPermissionGranted: false, remindersEnabled: true } }));
      }, { key });
      const view = await ctx.newPage(); view.on('pageerror', e => errors.push(String(e)));
      await view.goto(`${base}/profile#your-schedule`);
      await view.getByText('Reminder delivery status', { exact: true }).click();
      await view.getByText('Failed — Notification permission is not granted on this device', { exact: true }).waitFor();
      await ctx.grantPermissions(['notifications']);
      // Real missing-configuration request must remain failed, never "Scheduled".
      await view.getByText(/Failed — Missing configuration:/).waitFor({ timeout: 15000 });
      assert.equal(await view.getByLabel('Usual last meal', { exact: true }).inputValue(), '18:30');
      assert.equal(await view.getByLabel('Target bedtime', { exact: true }).inputValue(), '21:30');
      assert.equal(await view.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await view.locator('#reminder-delivery-status').screenshot({ path: `/tmp/ff-push-status-${mobile ? 'mobile' : 'desktop'}.png` });
      await view.reload();
      await view.getByText('Reminder delivery status', { exact: true }).click();
      await view.getByText(/Failed — Missing configuration:/).waitFor();
      await ctx.close();
    }
    assert.deepEqual(errors, []);
    console.log('PASS: real Chromium worker display with page open/backgrounded/closed using CDP-injected push; simulated notification actions; desktop/mobile permission denial, honest missing config, persisted failure, unchanged anchors. No live push provider or physical phone tested.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
