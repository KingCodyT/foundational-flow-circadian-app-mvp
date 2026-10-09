const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-typescript.cjs');
const { assessSleepInterval, formatClockTime, parseClockTime, toClockTime } = load('lib/sleep-timing.ts');

test('12-hour input converts to stable stored clock values', () => {
  assert.equal(toClockTime(12, 0, 'AM'), '00:00');
  assert.equal(toClockTime(12, 0, 'PM'), '12:00');
  assert.equal(toClockTime(10, 35, 'PM'), '22:35');
  assert.equal(formatClockTime('06:05'), '6:05 AM');
  assert.equal(parseClockTime('24:00'), null);
});

test('overnight interval is interpreted before save', () => {
  const result = assessSleepInterval('22:30', '06:30');
  assert.equal(result.durationMinutes, 480);
  assert.equal(result.interpretation, '10:30 PM → 6:30 AM · 8 hr');
  assert.equal(result.error, null);
  assert.equal(result.source, 'user_entered');
});

test('same time is blocked and unusual durations prompt verification without rejecting reality', () => {
  assert.match(assessSleepInterval('22:00', '22:00').error, /same/);
  const unusual = assessSleepInterval('10:00', '12:00');
  assert.match(unusual.warning, /unusual/);
  assert.equal(unusual.error, null);
});
