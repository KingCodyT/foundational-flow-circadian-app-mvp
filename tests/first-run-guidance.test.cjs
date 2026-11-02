const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-typescript.cjs');
const { selectFirstRunGuidance, firstRunNotification } = load('lib/personalization/first-run-guidance.ts');
const profile = { wakeTime: '07:00', targetBedtime: '21:30', lastMealTime: '18:30', timeZone: 'America/Los_Angeles', locationPermissionGranted: false };

test('first guidance selects the nearest remaining action and preserves entered anchors', () => {
  const before = JSON.stringify(profile);
  const step = selectFirstRunGuidance(profile, new Date('2026-09-19T02:46:00Z'));
  assert.equal(step.eventId, 'dim_house');
  assert.equal(step.start, '2026-09-19T02:30:00.000Z');
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

test('first-run includes an open window but excludes its ended boundary', () => {
  const active = selectFirstRunGuidance(profile, new Date('2026-11-01T15:05:00Z'));
  assert.equal(active.eventId, 'morning_light');
  assert.equal(active.start, '2026-11-01T15:00:00.000Z');
  const ended = selectFirstRunGuidance(profile, new Date(active.end));
  assert.notEqual(ended.start, active.start);
  assert.ok(Date.parse(ended.end) > Date.parse(active.end));
});
test('answered active window is not offered again and anchors stay unchanged', () => {
  for (const status of ['completed', 'skipped']) {
    const records = {'2026-11-01': {morning_light: {status, at:'2026-11-01T15:05:00Z'}}};
    const next = selectFirstRunGuidance(profile, new Date('2026-11-01T15:06:00Z'), records);
    assert.notEqual(next.eventId, 'morning_light');
    assert.equal(profile.wakeTime, '07:00');
  }
});

test('post-action opportunity follows the accepted focus rather than another schedule event', () => {
 const records={'2026-11-01':{dim_house:{status:'completed',at:'2026-11-01T21:40:00Z'}}};
 const next=selectFirstRunGuidance({...profile,targetBedtime:'15:30'},new Date('2026-11-01T21:41:00Z'),records,'morning_light_timing');
 assert.equal(next.eventId,'morning_light');assert.equal(next.dateKey,'2026-11-02');
});
