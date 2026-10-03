const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const base = process.env.FLOW_SMOKE_URL || 'http://localhost:3014';
const key = 'foundational-flow-circadian-app-state';
const profile = { wakeTime: '07:00', targetBedtime: '21:30', lastMealTime: '18:30', timeZone: 'America/Los_Angeles', locationPermissionGranted: false };
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const errors = [];
  try {
    async function open({ at, mobile = false, onboarding = false, returning = false, permission = 'default', backend = true }) {
      const context = await browser.newContext({ timezoneId: onboarding ? 'America/Los_Angeles' : 'UTC', viewport: mobile ? { width: 390, height: 844 } : { width: 1366, height: 900 } });
      const schedules = [];
      let remoteReminder = null;
      await context.route('**/api/push/**', async route => {
        const request = route.request();
        if (request.url().endsWith('/schedule') && request.method() === 'POST') {
          schedules.push(request.postDataJSON().notification);
          remoteReminder = { ...request.postDataJSON().notification, state: 'scheduled', actionToken: 'test-only-token' };
        }
        if (request.url().endsWith('/schedule') && request.method() === 'DELETE' && remoteReminder) remoteReminder.state = 'suppressed';
        if (request.url().endsWith('/action') && remoteReminder) {
          const { action, remindAt } = request.postDataJSON();
          if (action === 'done') remoteReminder.state = 'completed';
          if (action === 'skip') { remoteReminder.state = 'suppressed'; remoteReminder.reason = 'Not tonight'; }
          if (action === 'later') { remoteReminder.state = 'deferred'; remoteReminder.scheduledFor = remindAt; schedules.push({ ...remoteReminder }); }
        }
        await route.fulfill({ status: backend ? 200 : 503, contentType: 'application/json', body: JSON.stringify(request.url().includes('/public-key') ? { publicKey: 'test-key' } : { deliveries: [], reminder: remoteReminder }) });
      });
      await context.addInitScript(({ at, onboarding, returning, permission, profile, key }) => {
        const NativeDate = Date;
        const fixed = Date.parse(sessionStorage.getItem('test-time') || at);
        window.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : [fixed])); } static now() { return fixed; } };
        Object.defineProperty(Notification, 'permission', { configurable: true, get: () => sessionStorage.getItem('test-permission') || permission });
        Notification.requestPermission = async () => { sessionStorage.setItem('test-permission', 'granted'); return 'granted'; };
        const registration = { pushManager: { getSubscription: async () => ({ toJSON: () => ({ endpoint: 'https://example.invalid/test-only' }) }) }, active: { postMessage() {} } };
        navigator.serviceWorker.register = async () => registration;
        Object.defineProperty(navigator.serviceWorker, 'ready', { configurable: true, get: () => Promise.resolve(registration) });
        if (!onboarding && !localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ clientId: 'first-run-browser-test', hasCompletedAudit: true, answers: {}, dailyProfile: profile, firstRunHandoff: returning ? null : { guidance: null } }));
      }, { at, onboarding, returning, permission, profile, key });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(String(error)));
      await page.goto(`${base}/${onboarding ? 'audit' : 'today'}`);
      return { context, page, schedules };
    }
    // Real onboarding, not a seeded handoff: profile alone must generate useful guidance.
    const first = await open({ at: '2026-09-19T02:46:00Z', onboarding: true });
    const page = first.page;
    await page.getByRole('button', { name: 'Next: Your Schedule' }).click();
    await page.getByLabel('Typical wake time').fill('07:00');
    await page.getByLabel('Target bedtime').fill('21:30');
    await page.getByLabel('When do you usually have your last meal?').fill('18:30');
    await page.getByRole('button', { name: 'Next: Your Environment' }).click();
    await page.getByRole('button', { name: 'Next: Your Reality' }).click();
    await page.getByRole('button', { name: 'Next: Finish' }).click();
    await page.getByRole('button', { name: 'See What Matters Now →' }).click();
    await page.getByRole('heading', { name: 'Your next step', exact: true }).waitFor();
    await page.getByText('At 8:30 PM, begin reducing bright light and unnecessary screen exposure.', { exact: true }).waitFor();
    await page.getByText('This supports your 9:30 PM bedtime.', { exact: true }).waitFor();
    assert.equal(await page.getByText('Learning your rhythm', { exact: true }).count(), 0);
    assert.equal(await page.getByText('You’re set for now.', { exact: true }).count(), 0);
    await page.getByText('Turn on reminders so we can remind you at 8:30 PM.', { exact: true }).waitFor();
    assert.equal(first.schedules.length, 0);
    await page.getByRole('button', { name: 'Enable reminders' }).click();
    await page.getByText('We’ll remind you at 8:30 PM. You do not need to keep checking the app.', { exact: true }).waitFor();
    assert.equal(first.schedules.at(-1).scheduledFor, '2026-09-19T03:30:00.000Z');
    assert.equal(first.schedules.at(-1).title, 'Begin reducing bright light and unnecessary screen exposure');
    await page.screenshot({ path: '/tmp/ff-first-run-desktop.png', fullPage: true });
    await page.reload();
    await page.getByText('At 8:30 PM, begin reducing bright light and unnecessary screen exposure.', { exact: true }).waitFor();
    await page.evaluate(() => sessionStorage.setItem('test-time', '2026-09-19T03:30:00Z'));
    await page.reload();
    await page.getByRole('button', { name: 'Adjust', exact: true }).click();
    await page.getByRole('button', { name: 'Remind me in 15 minutes' }).click();
    await page.getByText('At 8:45 PM, begin reducing bright light and unnecessary screen exposure.', { exact: true }).waitFor();
    await page.getByText('We’ll remind you at 8:45 PM. You do not need to keep checking the app.', { exact: true }).waitFor();
    assert.equal(first.schedules.at(-1).scheduledFor, '2026-09-19T03:45:00.000Z');
    await page.reload();
    await page.getByText('At 8:45 PM, begin reducing bright light and unnecessary screen exposure.', { exact: true }).waitFor();
    await page.evaluate(() => sessionStorage.setItem('test-time', '2026-09-19T03:45:00Z'));
    await page.reload();
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    await page.getByText('You’re set for now.', { exact: true }).waitFor();
    const state = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
    assert.equal(state.firstRunHandoff, null);
    assert.equal(state.dailyProfile.targetBedtime, '21:30');
    assert.equal(state.dailyProfile.lastMealTime, '18:30');
    assert.equal(state.eventStateByDate['2026-09-18'].digital_sunset.status, 'completed');
    await first.context.close();

    const tomorrow = await open({ at: '2026-09-19T06:30:00Z', mobile: true });
    await tomorrow.page.getByRole('heading', { name: 'You’re ready for tomorrow' }).waitFor();
    await tomorrow.page.getByText('At 7:00 AM tomorrow, get some daylight after waking, when it’s available.', { exact: true }).waitFor();
    await tomorrow.page.getByRole('button', { name: 'Enable reminders' }).click();
    await tomorrow.page.getByText('We’ll remind you at 7:00 AM tomorrow. You do not need to keep checking the app.', { exact: true }).waitFor();
    assert.equal(tomorrow.schedules.at(-1).scheduledFor, '2026-09-19T14:00:00.000Z');
    assert.equal(await tomorrow.page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.equal(await tomorrow.page.locator('.journey-focus').count(), 1);
    assert.equal(await tomorrow.page.locator('.journey-timeline').count(), 0);
    await tomorrow.page.screenshot({ path: '/tmp/ff-first-run-tomorrow-mobile.png', fullPage: true });
    await tomorrow.context.close();

    const denied = await open({ at: '2026-09-19T02:46:00Z', mobile: true, permission: 'denied' });
    await denied.page.getByRole('heading', { name: 'Your next step', exact: true }).waitFor();
    await denied.page.evaluate(key => { const s = JSON.parse(localStorage.getItem(key)); s.dailyProfile.remindersEnabled = true; localStorage.setItem(key, JSON.stringify(s)); }, key);
    await denied.page.reload();
    await denied.page.getByText('Notifications are blocked. Allow them in your browser settings to receive this reminder.', { exact: true }).waitFor();
    assert.equal(denied.schedules.length, 0);
    assert.equal(await denied.page.getByText(/We’ll remind you at/).count(), 0);
    await denied.page.evaluate(() => sessionStorage.setItem('test-time', '2026-09-19T03:30:00Z'));
    await denied.page.reload();
    await denied.page.getByRole('button', { name: 'Not today', exact: true }).click();
    await denied.page.reload();
    await denied.page.getByText('You’re set for now.', { exact: true }).waitFor();
    await denied.context.close();

    const unavailable = await open({ at: '2026-09-19T02:46:00Z', backend: false });
    await unavailable.page.getByRole('button', { name: 'Enable reminders' }).click();
    await unavailable.page.getByText('Background reminders aren’t connected yet. Your guidance is available here; delivery is not confirmed.', { exact: true }).waitFor();
    assert.equal(await unavailable.page.getByText(/We’ll remind you at/).count(), 0);
    await unavailable.context.close();
    const returning = await open({ at: '2026-09-19T02:46:00Z', returning: true });
    await returning.page.getByText('You’re set for now.', { exact: true }).waitFor();
    assert.equal(await returning.page.getByRole('heading', { name: 'Your next step', exact: true }).count(), 0);
    await returning.context.close();
    assert.deepEqual(errors, []);
    console.log('PASS: real onboarding, today/tomorrow guidance, desktop/mobile, returning quiet, permission denial/setup failure, scheduled/displayed times, reload, Done/Not today/15-minute deferral, saved anchors, no page errors. Push transport mocked; no external delivery.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
