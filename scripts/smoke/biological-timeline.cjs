const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const base = process.env.FLOW_SMOKE_URL || 'http://localhost:3014';
const key = 'foundational-flow-circadian-app-state';
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  try {
    const context = await browser.newContext({ timezoneId: 'America/Los_Angeles' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    await page.goto(`${base}/audit`);
    await page.getByRole('button', { name: 'Next: Your Schedule' }).click();
    await page.getByLabel('Typical wake time').fill('05:05');
    await page.getByLabel('Target bedtime').fill('21:45');
    await page.getByLabel('When do you usually have your last meal?').fill('18:30');
    await page.getByRole('button', { name: 'Next: Your Environment' }).click();
    await page.getByRole('button', { name: 'Next: Your Reality' }).click();
    assert.equal(await page.getByLabel('When do you usually have your last meal?').count(), 0);
    await page.getByRole('button', { name: 'Next: Finish' }).click();
    await page.getByRole('heading', { name: 'Your profile at a glance' }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Explore the App' }).count(), 0);
    await page.getByRole('button', { name: 'See What Matters Now →' }).click();
    await page.waitForURL('**/today?view=overview');
    const state = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
    assert.equal(state.dailyProfile.lastMealTime, '18:30');
    assert.equal(state.dailyProfile.targetBedtime, '21:45');
    // Verify both pages with a different device timezone than the saved profile.
    const otherDevice = await browser.newContext({ timezoneId: 'UTC' });
    state.dailyProfile.latitude = 33.54;
    state.dailyProfile.longitude = -117.78;
    state.dailyProfile.locationPermissionGranted = true;
    await otherDevice.addInitScript(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), { key, state });
    const view = await otherDevice.newPage();
    view.on('pageerror', error => errors.push(String(error)));
    await view.goto(`${base}/today?view=overview`);
    await view.getByRole('heading', { name: 'Your current coaching focus' }).waitFor();
    assert.equal(await view.getByTestId('calculation-details').count(), 0);
    assert.equal(await view.locator('.journey-timeline').count(), 0);
    assert.equal(await view.getByText('Sunrise', { exact: true }).count(), 0);
    await view.goto(`${base}/profile#your-schedule`);
    await view.getByRole('heading', { name: 'Your schedule', exact: true }).waitFor();
    assert.equal(await view.getByLabel('Usual last meal').inputValue(), '18:30');
    assert.equal(await view.getByLabel('Target bedtime', { exact: true }).inputValue(), '21:45');
    await view.getByLabel('Typical wake time', { exact: true }).fill('05:15');
    await view.getByRole('button', { name: 'Save schedule', exact: true }).click();
    const saved = await view.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
    assert.equal(saved.dailyProfile.lastMealTime, '18:30');
    assert.equal(saved.dailyProfile.targetBedtime, '21:45');
    await view.goto(`${base}/timeline`);
    await view.getByRole('heading', { name: 'Your current coaching focus' }).waitFor();
    assert.equal(new URL(view.url()).pathname, '/today');
    assert.equal(await view.getByRole('heading', { name: 'FOOD TIMING', exact: true }).count(), 0);
    await view.screenshot({ path: '/tmp/ff-reminder-today.png', fullPage: true });
    // Exercise one timely Food action, constraint response, reload, and target stability.
    const coaching = await browser.newContext({ timezoneId: 'UTC', viewport: { width: 390, height: 844 } });
    await coaching.addInitScript(({ key }) => {
      const fixed = Date.parse('2026-12-18T17:45:00Z');
      const NativeDate = Date;
      class FixedDate extends NativeDate {
        constructor(...args) { super(...(args.length ? args : [fixed])); }
        static now() { return fixed; }
      }
      window.Date = FixedDate;
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, JSON.stringify({ clientId: 'walkthrough-test-client', hasCompletedAudit: true,
        answers: { late_meals_stimulants: 'within_1_hour' }, participationLevel: 'GUIDED_FLOW',
        dailyProfile: { wakeTime: '05:05', targetBedtime: '21:45', lastMealTime: '18:30', timeZone: 'UTC', locationPermissionGranted: true, latitude: 51.5, longitude: 0, workStructure: 'daytime', foodTimingGoal: 'earlier_last_meal' },
        eventStateByDate: {
          '2026-12-16': { last_meal: { status: 'completed', at: '2026-12-16T18:00:00Z' } },
          '2026-12-17': { last_meal: { status: 'completed', at: '2026-12-17T18:00:00Z' } }
        }
      }));
    }, { key });
    const focus = await coaching.newPage();
    focus.on('pageerror', error => errors.push(String(error)));
    await focus.goto(`${base}/today`);
    await focus.getByRole('button', { name: 'Done', exact: true }).waitFor();
    assert.equal(await focus.getByRole('group', { name: 'Reminder responses' }).count(), 1);
    assert.match(await focus.locator('.journey-focus').innerText(), /6:00 PM/);
    await focus.getByRole('button', { name: 'Adjust', exact: true }).click();
    await focus.getByRole('button', { name: 'Remind me in 15 minutes' }).click();
    await focus.getByText('You’re set for now.', { exact: true }).waitFor();
    await focus.reload();
    await focus.getByText('You’re set for now.', { exact: true }).waitFor();
    const deferred = await focus.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
    assert.equal(deferred.dailyProfile.lastMealTime, '18:30');
    assert.equal(deferred.dailyProfile.targetBedtime, '21:45');
    assert.equal(deferred.eventStateByDate['2026-12-18'].last_meal.remindAt, '2026-12-18T18:00:00.000Z');
    assert.equal(deferred.notificationState.scheduledNotification, null);
    assert.equal(await focus.getByText(/^Coming up:/).count(), 0);
    await focus.getByText('Your schedule is working in the background. We’ll bring you one useful step when the timing matters.', { exact: true }).waitFor();
    await focus.evaluate(key => {
      const state = JSON.parse(localStorage.getItem(key));
      state.dailyProfile.remindersEnabled = true;
      delete state.eventStateByDate['2026-12-16'];
      delete state.eventStateByDate['2026-12-17'];
      state.dailyProfile.timeZone = 'Europe/London';
      localStorage.setItem(key, JSON.stringify(state));
    }, key);
    await focus.reload();
    await focus.getByText('Coming up: Plan your last meal around 6:00 PM.', { exact: true }).waitFor();
    assert.equal(await focus.getByText(/^Coming up:/).count(), 1);
    assert.equal(await focus.getByRole('group', { name: 'Reminder responses' }).count(), 0);
    await focus.getByRole('heading', { name: 'Patterns over time' }).waitFor();
    await focus.screenshot({ path: '/tmp/ff-quiet-preview-mobile.png', fullPage: true });
    // Return to the same relevant window, then verify a terminal response stays quiet.
    await focus.evaluate(key => {
      const state = JSON.parse(localStorage.getItem(key));
      delete state.eventStateByDate['2026-12-18'].last_meal;
      localStorage.setItem(key, JSON.stringify(state));
    }, key);
    await focus.reload();
    await focus.getByRole('button', { name: 'Not today', exact: true }).click();
    await focus.reload();
    await focus.getByText('You’re set for now.', { exact: true }).waitFor();
    assert.equal(await focus.getByText(/^Coming up:/).count(), 0);
    assert.equal(await focus.getByRole('heading', { name: 'Last Meal Timing', exact: true }).count(), 1);
    assert.equal(await focus.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await focus.screenshot({ path: '/tmp/ff-reminder-mobile.png', fullPage: true });
    assert.deepEqual(errors, []);
    console.log('PASS: quiet copy, single eligible preview, opt-out/handled suppression, onboarding CTA, one reminder, Adjust persistence, Not today suppression, notification opt-out, schedule anchors under You, no calculation UI or page errors.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
