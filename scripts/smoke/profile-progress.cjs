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
        window.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : ['2026-09-18T23:00:00Z'])); } static now() { return Date.parse('2026-09-18T23:00:00Z'); } };
        if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ clientId: 'profile-progress-test', hasCompletedAudit: true, answers: { evening_light: 'bright' },
          dailyProfile: { wakeTime: '07:00', targetBedtime: '21:30', lastMealTime: '18:30', timeZone: 'UTC', locationPermissionGranted: false },
        }));
      }, { key });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(String(error)));
      await page.goto(`${base}/profile`);
      await page.getByRole('heading', { name: 'Connections', exact: true }).waitFor();
      for (const text of ['Current coaching focus', 'Progress across foundations', 'No active correction is demanding attention.', 'What still needs coaching — and what can stay quiet.']) assert.equal(await page.getByText(text, { exact: true }).count(), 0, text);
      assert.equal(await page.getByText(/Your foundation map will appear here/).count(), 0);
      assert.equal(await page.locator('#connections').evaluate(e => e.nextElementSibling === null), true);
      assert.equal(await page.getByLabel('Usual last meal', { exact: true }).inputValue(), '18:30');
      assert.equal(await page.getByLabel('Target bedtime', { exact: true }).inputValue(), '21:30');
      await page.getByRole('button', { name: 'Connect a wearable', exact: true }).click();
      await page.getByText('Wearable connections are coming soon', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Close', exact: true }).click();
      for (const days of [4, 5]) {
        await page.evaluate(({ key, days }) => {
          const state = JSON.parse(localStorage.getItem(key));
          state.eventStateByDate = Object.fromEntries(Array.from({ length: days }, (_, i) => {
            const day = `2026-09-${18-i}`;
            return [day, { dim_house: { status: 'completed', at: `${day}T20:00:00Z` }, digital_sunset: { status: 'completed', at: `${day}T21:00:00Z` } }];
          }));
          localStorage.setItem(key, JSON.stringify(state));
        }, { key, days });
        await page.reload();
        await page.getByRole('heading', { name: 'Connections', exact: true }).waitFor();
        if (days === 4) assert.equal(await page.getByRole('heading', { name: 'Progress across foundations' }).count(), 0);
        else {
          await page.getByRole('heading', { name: 'Progress across foundations' }).waitFor();
          await page.getByText('You reported reducing evening light on 5 of the past 7 days.', { exact: true }).waitFor();
          assert.equal(await page.getByText('Current coaching focus', { exact: true }).count(), 0);
          await page.locator('#profile-progress-heading').scrollIntoViewIfNeeded();
          await page.getByRole('region', { name: 'Progress across foundations' }).screenshot({ path: `/tmp/ff-profile-progress-${mobile ? 'mobile' : 'desktop'}.png` });
        }
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await context.close();
    }
    assert.deepEqual(errors, []);
    console.log('PASS: desktop/mobile no-evidence and insufficient-evidence profiles end after connections; sufficient evidence shows specific deduplicated observations; no coaching card; settings and wearable panel preserved; no overflow/page errors.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
