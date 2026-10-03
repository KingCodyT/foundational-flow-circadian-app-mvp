const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');

const { chromium } = require('playwright-core');

const ROOT = path.resolve(__dirname, '..');
const PORT = 3012;
const BASE_URL = process.env.FLOW_BROWSER_BASE_URL || `http://localhost:${PORT}`;
const STORAGE_KEY = 'foundational-flow-circadian-app-state';
const CHROME_PATH =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

function seedStateScript() {
  return { key: STORAGE_KEY };
}

async function waitForServerReady(timeoutMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(`${BASE_URL}/today`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error('dev server did not become ready in time');
}

let devServer;

test.before(async () => {
  if (process.env.FLOW_BROWSER_BASE_URL) return;
  devServer = spawn('npm', ['run', 'dev', '--', '--port', String(PORT)], {
    cwd: ROOT,
    stdio: 'pipe',
    env: {
      ...process.env,
      NEXT_DISABLE_WEBPACK_CACHE: '1',
    },
  });
  await waitForServerReady(60_000);
});

test.after(async () => {
  if (!devServer) return;
  devServer.kill('SIGINT');
});

test('Food Timing uses a simplified meal logger with modal time selection', async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: CHROME_PATH,
  });

  try {
    const desktop = await browser.newContext({ viewport: { width: 1366, height: 900 }, timezoneId: 'UTC' });
    await desktop.addInitScript(({ key }) => {
      const fixedNowMs = new Date('2026-09-14T19:00:00.000Z').getTime();
      const NativeDate = Date;
      class MockDate extends NativeDate {
        constructor(...args) {
          if (args.length === 0) {
            super(fixedNowMs);
            return;
          }
          super(...args);
        }
        static now() {
          return fixedNowMs;
        }
      }
      // Freeze client clock so event selection and surface mode are deterministic.
      window.Date = MockDate;

      const now = new Date(fixedNowMs);
      const wake = new Date(fixedNowMs);
      wake.setHours(10, 20, 0, 0);
      const bedtime = new Date(fixedNowMs);
      bedtime.setHours(22, 0, 0, 0);
      const hhmm = (date) =>
        `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
      const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const completedAt = new Date(fixedNowMs).toISOString();
      const state = {
        clientId: 'browser-regression-client-12345',
        answers: { late_meals_stimulants: 'within_1_hour' },
        hasCompletedAudit: true,
        lastSavedAt: new Date(fixedNowMs).toISOString(),
        participationLevel: 'GUIDED_FLOW',
        dailyProfile: {
          wakeTime: hhmm(wake),
          targetBedtime: hhmm(bedtime),
          timeZone: 'UTC',
          locationPermissionGranted: false,
          lastMealTime: '19:00',
          workStructure: 'daytime',
          travelFrequency: 'rarely',
          exercisePattern: 'midday',
          sleepEnvironment: 'mostly_dark',
        },
        eventStateByDate: {
          [dateKey]: {
            morning_light: { status: 'completed', at: completedAt },
            first_meal: { status: 'completed', at: completedAt },
            last_meal: { status: 'completed', at: completedAt },
            sunset: { status: 'completed', at: completedAt },
            dim_house: { status: 'completed', at: completedAt },
            digital_sunset: { status: 'completed', at: completedAt },
            sleep_window: { status: 'completed', at: completedAt },
          },
        },
        foodTimingEvidenceByDate: null,
        previousContextSnapshot: null,
        currentContextSnapshot: null,
        notificationState: {
          scheduledNotification: null,
          deliveredNotifications: [],
          materialChangeKeys: {},
        },
      };
      if (!window.localStorage.getItem(key)) window.localStorage.setItem(key, JSON.stringify(state));
    }, seedStateScript());

    const page = await desktop.newPage();
    await page.goto(`${BASE_URL}/profile`, { waitUntil: 'domcontentloaded' });
    await page.getByText('More history options', { exact: true }).click();
    await page.getByText('Record or edit a meal time', { exact: true }).click();
    await page.getByRole('button', { name: /I'm eating now/i }).waitFor({ timeout: 30_000 });

    const logMeal = page.getByRole('button', { name: /I'm eating now/i });
    await logMeal.first().waitFor({ timeout: 30_000 });
    await logMeal.first().click({ force: true });
    await page.getByRole('status').getByText(/Meal time saved:/i).waitFor({ timeout: 5_000 });
    await page.getByText('Meal times ·', { exact: false }).waitFor({ timeout: 5_000 });
    const mealTimesSection = page
      .getByText('Meal times ·', { exact: false })
      .locator('..');
    await mealTimesSection.getByRole('button', { name: /^Change time$/ }).first().waitFor({ timeout: 5_000 });
    assert.equal(await page.getByRole('button', { name: /Eating later/i }).count(), 0);

    const evidenceAfterClick = await page.evaluate((key) => {
      const state = JSON.parse(window.localStorage.getItem(key) || '{}');
      const byDate = state.foodTimingEvidenceByDate || {};
      const entries = Object.values(byDate).flat();
      return entries.filter((entry) => entry.action === 'MEAL_STARTED').length;
    }, STORAGE_KEY);
    assert.equal(evidenceAfterClick, 1);

    const earlierParts = await page.evaluate(() => {
      const date = new Date(Date.now() - 45 * 60 * 1000);
      const hours = date.getHours();
      const hour12 = String(hours % 12 || 12);
      const minute = String(date.getMinutes()).padStart(2, '0');
      const meridiem = hours >= 12 ? 'PM' : 'AM';
      return { hour12, minute, meridiem };
    });

    const addEarlier = page.getByRole('button', { name: /Add a meal time/i });
    await addEarlier.click();
    await page.getByRole('heading', { name: 'Add a meal time' }).waitFor({ timeout: 5_000 });
    await page.keyboard.press('Escape');
    await page.getByRole('heading', { name: 'Add a meal time' }).waitFor({ state: 'hidden', timeout: 5_000 });
    await assert.equal(await addEarlier.evaluate((element) => document.activeElement === element), true);

    await addEarlier.click();
    await page.getByRole('heading', { name: 'Add a meal time' }).waitFor({ timeout: 5_000 });
    await page.getByLabel('Hour').selectOption(earlierParts.hour12);
    await page.getByLabel('Minute').selectOption(earlierParts.minute);
    await page.getByLabel('AM / PM').selectOption(earlierParts.meridiem);
    await page.getByRole('button', { name: /^Save$/ }).click();
    await page.getByRole('status').getByText(/Meal time saved:/i).waitFor({ timeout: 5_000 });
    assert.equal(await page.getByText('No meal times saved today.').count(), 0);

    assert.equal(await page.getByRole('button', { name: /^Remove$/ }).count(), 0);
    await mealTimesSection.getByRole('button', { name: /^Change time$/ }).first().click();
    await page.getByRole('heading', { name: 'Change time' }).waitFor({ timeout: 5_000 });
    await page.getByRole('dialog').getByRole('button', { name: /Remove time/i }).waitFor({ timeout: 5_000 });
    await page.keyboard.press('Escape');

    const evidenceAfterEarlierMeal = await page.evaluate((key) => {
      const state = JSON.parse(window.localStorage.getItem(key) || '{}');
      const byDate = state.foodTimingEvidenceByDate || {};
      const entries = Object.values(byDate).flat();
      return entries.filter((entry) => entry.action === 'MEAL_STARTED').length;
    }, STORAGE_KEY);
    assert.equal(evidenceAfterEarlierMeal, 2);

    await page.goto(`${BASE_URL}/timeline`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'Timeline', exact: true }).waitFor();
    assert.equal(new URL(page.url()).pathname, '/timeline');
    const entries = page.getByRole('list', { name: 'Timeline entries', exact: true });
    await entries.getByRole('button', { name: 'Edit', exact: true }).first().waitFor();
    assert.equal(await entries.getByRole('button', { name: 'Edit', exact: true }).count(), 2);
    const details = page.locator('details').filter({ has: page.locator('summary', { hasText: 'Day details' }) });
    assert.equal(await details.getAttribute('open'), null);
    await details.locator('summary').click();
    await page.getByRole('list', { name: 'Saved record details' }).getByText(/Original timestamp:/).first().waitFor();
    await entries.getByRole('button', { name: 'Edit', exact: true }).first().click();
    await page.getByLabel('Minute', { exact: true }).selectOption('10');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.getByRole('status').getByText('Meal time saved.', { exact: true }).waitFor();
    await page.reload();
    await entries.getByRole('button', { name: 'Edit', exact: true }).first().waitFor();
    assert.equal(await entries.getByRole('button', { name: 'Edit', exact: true }).count(), 2);
    assert.match(await entries.innerText(), /6:10 PM/);
  } finally {
    await browser.close();
  }
});
