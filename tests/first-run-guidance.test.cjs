const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-typescript.cjs');
const { selectFirstRunGuidance, firstRunNotification } = load('lib/personalization/first-run-guidance.ts');
const profile = { wakeTime: '07:00', targetBedtime: '21:30', lastMealTime: '18:30', timeZone: 'America/Los_Angeles', locationPermissionGranted: false };

test('first guidance selects the nearest remaining action and preserves entered anchors', () => {
  const before = JSON.stringify(profile);
  const step = selectFirstRunGuidance(profile, new Date('2026-09-19T02:46:00Z'));
  assert.equal(step.eventId, 'digital_sunset');
  assert.equal(step.start, '2026-09-19T03:30:00.000Z');
  assert.equal(step.reason, 'This supports your 9:30 PM bedtime.');
  assert.equal(JSON.stringify(profile), before);
  const notification = firstRunNotification(step);
  assert.equal(notification.scheduledFor, step.start);
  assert.equal(notification.validUntil, step.end);
  assert.equal(notification.title, step.action);
});
test('after all meaningful actions, first guidance belongs to tomorrow', () => {
  const step = selectFirstRunGuidance(profile, new Date('2026-09-19T06:30:00Z'));
  assert.equal(step.eventId, 'morning_light');
  assert.equal(step.dateKey, '2026-09-19');
  assert.equal(step.start, '2026-09-19T14:00:00.000Z');
});
test('completed evening responses are not turned into another evening action', () => {
  const step = selectFirstRunGuidance(profile, new Date('2026-09-19T02:46:00Z'), {
    '2026-09-18': { dim_house: { status: 'skipped', at: '2026-09-19T02:31:00Z' } },
  });
  assert.equal(step.eventId, 'sleep_window');
});
test('daylight and overnight schedules constrain the first step without changing anchors', () => {
  const london = { ...profile, timeZone: 'Europe/London', wakeTime: '05:00', latitude: 51.5, longitude: 0, locationPermissionGranted: true };
  const step = selectFirstRunGuidance(london, new Date('2026-12-18T23:30:00Z'));
  assert.equal(step.eventId, 'morning_light');
  assert.ok(Date.parse(step.start) > Date.parse('2026-12-19T05:00:00Z'));
  const night = selectFirstRunGuidance({ ...profile, wakeTime: '16:00', targetBedtime: '08:00', workStructure: 'overnight' }, new Date('2026-09-19T12:45:00Z'));
  assert.equal(night.eventId, 'dim_house');
  assert.match(night.action, /responsibilities allow/);
  assert.equal(night.start, '2026-09-19T13:00:00.000Z');
});
test('DST tomorrow guidance uses saved local time and incomplete schedules produce no invented step', () => {
  const step = selectFirstRunGuidance(profile, new Date('2026-11-01T06:30:00Z'));
  assert.equal(step.start, '2026-11-01T15:00:00.000Z');
  assert.equal(selectFirstRunGuidance({ ...profile, wakeTime: null }, new Date()), null);
});
