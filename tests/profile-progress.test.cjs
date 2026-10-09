const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-typescript.cjs');
const { profileProgress } = load('lib/profile-progress.ts');
const now = new Date('2026-09-18T23:00:00Z');
function records(count, status = 'completed') {
  return Object.fromEntries(Array.from({ length: count }, (_, i) => {
    const day = `2026-09-${18 - i}`;
    return [day, { dim_house: { status, at: `${day}T20:00:00Z` }, digital_sunset: { status, at: `${day}T21:00:00Z` } }];
  }));
}
test('no empty placeholders or progress before five distinct recent days', () => {
  for (const data of [null, {}, records(1), records(4), records(7, 'skipped'), records(7, 'upcoming'), records(7, 'missed')]) assert.deepEqual(profileProgress(data, now, 'UTC'), []);
});
test('overlapping evening responses count once per day and use precise reported observations', () => {
  assert.deepEqual(profileProgress(records(5), now, 'UTC'), ['You reported reducing evening light on 5 of the past 7 days.']);
  assert.deepEqual(profileProgress(records(8), now, 'UTC'), ['You reported reducing evening light on 7 of the past 7 days.']);
});
test('stale, future, malformed and misdated responses cannot qualify as progress', () => {
  const data = records(5);
  data['2026-09-18'].dim_house.at = 'invalid';
  data['2026-09-18'].digital_sunset.at = '2026-09-19T01:00:00Z';
  assert.deepEqual(profileProgress(data, now, 'UTC'), []);
  assert.deepEqual(profileProgress(records(7), new Date('2026-10-18T23:00:00Z'), 'UTC'), []);
  data['2026-09-18'].digital_sunset.at = '2026-09-17T21:00:00Z';
  assert.deepEqual(profileProgress(data, now, 'UTC'), []);
});
test('profile timezone governs days and routine responses never imply measured sleep', () => {
  const data = Object.fromEntries(Array.from({ length: 5 }, (_, i) => [`2026-09-${18-i}`, { sleep_window: { status: 'completed', at: `2026-09-${19-i}T04:00:00Z` } }]));
  assert.deepEqual(profileProgress(data, new Date('2026-09-19T05:00:00Z'), 'America/Los_Angeles'), ['You reported starting your bedtime routine on 5 of the past 7 days.']);
  assert.deepEqual(profileProgress(data, new Date('2026-09-19T05:00:00Z'), 'UTC'), []);
});
