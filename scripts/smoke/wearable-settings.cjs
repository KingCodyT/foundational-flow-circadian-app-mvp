const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const base = process.env.FLOW_SMOKE_URL || 'http://localhost:3014';
const key = 'foundational-flow-circadian-app-state';
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const errors = [];
  try {
    for (const mobile of [false, true]) {
      const context = await browser.newContext({ timezoneId: 'UTC', viewport: mobile ? { width: 390, height: 844 } : { width: 1366, height: 900 } });
      await context.addInitScript(({ key }) => {
        const NativeDate = Date;
        window.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : ['2026-09-18T19:46:00Z'])); } static now() { return Date.parse('2026-09-18T19:46:00Z'); } };
        if (localStorage.getItem(key)) return;
        localStorage.setItem(key, JSON.stringify({ clientId: 'wearable-browser-test', hasCompletedAudit: true, answers: {}, firstRunHandoff: null,
          dailyProfile: { wakeTime: '07:00', targetBedtime: '21:30', lastMealTime: '18:30', timeZone: 'UTC', locationPermissionGranted: false, remindersEnabled: false, realityNotes: 'Family schedule' },
          eventStateByDate: { '2026-09-17': { last_meal: { status: 'completed', at: '2026-09-17T18:30:00Z' } } },
        }));
      }, { key });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(String(error)));
      await page.goto(`${base}/today`);
      await page.getByText('You’re set for now.', { exact: true }).waitFor();
      const beforeToday = await page.locator('.journey-focus').innerText();
      const initial = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
      await page.goto(`${base}/profile#wearables`);
      const section = page.getByRole('region', { name: 'Wearables', exact: true });
      async function disconnectedControls() {
        await section.getByText('NO WEARABLE CONNECTED', { exact: true }).waitFor();
        for (const text of ['Manage connection', 'Choose shared data', 'Disconnect wearable', 'Delete imported wearable data', 'Enable wearable connection']) assert.equal(await section.getByText(text, { exact: true }).count(), 0, text);
        assert.equal(await section.getByText(/^Last synced/).count(), 0);
        assert.equal(await section.getByRole('checkbox').count(), 0);
      }
      await disconnectedControls();
      await section.getByText('Connect a supported wearable to share optional sleep, activity, and timing information.', { exact: true }).waitFor();
      await section.getByText('Foundational Flow works fully without a wearable.', { exact: true }).waitFor();
      const beforeConnect = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).wearableConnection, key);
      await section.getByRole('button', { name: 'Connect a wearable', exact: true }).click();
      await section.getByRole('region', { name: 'Wearable providers' }).getByText('Wearable connections are coming soon', { exact: true }).waitFor();
      assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).wearableConnection, key), beforeConnect);
      assert.equal(await section.getByRole('button', { name: /^Connect (Apple|Fitbit|Oura|Garmin)/ }).count(), 0);
      await section.getByRole('button', { name: 'Close', exact: true }).click();
      await disconnectedControls();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await section.screenshot({ path: `/tmp/ff-wearables-clean-${mobile ? 'mobile' : 'desktop'}.png` });
      // A legacy checked preference and a persisted success claim cannot establish a live session.
      await page.evaluate(key => {
        const s = JSON.parse(localStorage.getItem(key));
        Object.assign(s.wearableConnection, { enabled: true, providerId: 'test-only-retired-provider', status: 'connected', sessionVerified: true, lastSyncedAt: '2026-09-18T08:00:00Z' });
        localStorage.setItem(key, JSON.stringify(s));
      }, key);
      await page.reload();
      await disconnectedControls();
      // Test fixture only: retained imports must not reveal connected-only controls.
      await page.evaluate(key => {
        const s = JSON.parse(localStorage.getItem(key));
        s.wearableConnection.observations = [{ id: 'test-fixture', providerId: 'test-only-retired-provider', category: 'activity', observedAt: '2026-09-18T07:00:00Z', importedAt: '2026-09-18T08:00:00Z', source: 'wearable_inference', quality: 'usable', metric: 'steps', value: 10, unit: 'count', independentSourceId: 'test-sensor' }];
        localStorage.setItem(key, JSON.stringify(s));
      }, key);
      await page.reload();
      await section.getByText('Previously imported wearable data is retained in this app. No wearable is connected and no new data is being imported.', { exact: true }).waitFor();
      await disconnectedControls();
      const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
      assert.deepEqual(saved.dailyProfile, initial.dailyProfile);
      assert.deepEqual(saved.eventStateByDate, initial.eventStateByDate);
      assert.deepEqual(saved.notificationState, initial.notificationState);
      await page.goto(`${base}/today`);
      await page.getByText('You’re set for now.', { exact: true }).waitFor();
      assert.equal(await page.locator('.journey-focus').innerText(), beforeToday);
      await context.close();
    }
    assert.deepEqual(errors, []);
    console.log('PASS: desktop/mobile disconnected UI, coming-soon panel without state mutation, legacy checked/success migration, retained-import notice with no connected controls, unchanged Today/schedule/history/notifications, no overflow or page errors.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
