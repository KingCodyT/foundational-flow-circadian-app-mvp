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
  assert.match(source, /Guidance begins on NOW/i);
});

test('profile carries the onboarding fields used by the finish screen', () => {
  for (const field of ['lastMealTime', 'workStructure', 'travelFrequency', 'exercisePattern', 'sleepEnvironment']) {
    assert.match(types, new RegExp(field));
  }
});
