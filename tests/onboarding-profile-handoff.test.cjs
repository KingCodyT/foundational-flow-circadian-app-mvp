const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'views/audit-page.tsx'), 'utf8');
const types = fs.readFileSync(path.join(root, 'types/circadian.ts'), 'utf8');

test('onboarding uses the approved five-stage structure', () => {
  assert.match(source, /\["Basics", "Schedule", "Environment", "Your Reality", "Finish"\]/);
  assert.doesNotMatch(source, /Morning Light.*Daytime Environment.*Evening Light/s);
});

test('finish persists the profile before completing onboarding', () => {
  const save = source.indexOf('setDailyProfile(draft)');
  const complete = source.indexOf('completeAudit()');
  assert.ok(save >= 0);
  assert.ok(complete > save);
  assert.match(source, /Your profile at a glance/i);
  assert.match(source, /See What Matters Now →/i);
});

test('step transitions and browser location data are guarded', () => {
  assert.match(source, /Let’s personalize/);
  assert.match(source, /Next:/);
  assert.match(source, /const safeIndex = Math\.min\(Math\.max\(index, 0\), stages\.length - 1\)/);
  assert.match(source, /Number\.isFinite\(latitude\)/);
  assert.match(source, /setIndex\(Math\.min\(safeIndex \+ 1, stages\.length - 1\)\)/);
});

test('profile carries the onboarding fields used by the finish screen', () => {
  for (const field of ['lastMealTime', 'workStructure', 'travelFrequency', 'exercisePattern', 'sleepEnvironment']) {
    assert.match(types, new RegExp(field));
  }
});

test('last meal is asked once on Schedule, with caffeine use distinct from timing', () => {
  assert.equal(source.split('input("lastMealTime"').length - 1, 1);
  const reality = source.slice(source.indexOf('{safeIndex === 3 &&'), source.indexOf('{safeIndex === 4 &&'));
  assert.doesNotMatch(reality, /lastMealTime/);
  assert.match(reality, /caffeineUse/);
  assert.match(source, /firstCaffeineTime/);
});
