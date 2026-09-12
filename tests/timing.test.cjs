const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-typescript.cjs');
const { getSolarTimes, formatTimeLocal } = load('lib/solar.ts');
const { buildTodaysFlow } = load('lib/flow-engine.ts');
const { buildDerivedEnvironment } = load('lib/personalization/derived-environment.ts');

function inTimezone(timezone, run) {
  const previous = process.env.TZ;
  process.env.TZ = timezone;
  try { run(); } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
}

// US Naval Observatory reference data, retrieved 2026-09-11.
// https://aa.usno.navy.mil/api/rstt/oneday?date=2026-06-21&coords=37.7749,-122.4194&tz=-7
// https://aa.usno.navy.mil/api/rstt/oneday?date=2026-12-21&coords=37.7749,-122.4194&tz=-8
// https://aa.usno.navy.mil/api/rstt/oneday?date=2026-12-21&coords=-33.8688,151.2093&tz=11
// https://aa.usno.navy.mil/api/rstt/oneday?date=2026-03-20&coords=51.5074,-0.1278&tz=0
const references = [
  { date: [2026, 5, 21], lat: 37.7749, lon: -122.4194, rise: '2026-06-21T12:48:00Z', noon: '2026-06-21T20:12:00Z', set: '2026-06-22T03:35:00Z' },
  { date: [2026, 11, 21], lat: 37.7749, lon: -122.4194, rise: '2026-12-21T15:21:00Z', noon: '2026-12-21T20:08:00Z', set: '2026-12-22T00:54:00Z' },
  { date: [2026, 11, 21], lat: -33.8688, lon: 151.2093, rise: '2026-12-20T18:41:00Z', noon: '2026-12-21T01:53:00Z', set: '2026-12-21T09:05:00Z' },
  { date: [2026, 2, 20], lat: 51.5074, lon: -0.1278, rise: '2026-03-20T06:03:00Z', noon: '2026-03-20T12:08:00Z', set: '2026-03-20T18:13:00Z' },
];

for (const timezone of ['UTC', 'America/Los_Angeles', 'Australia/Sydney']) {
  test(`solar instants match USNO within two minutes under ${timezone}`, () => inTimezone(timezone, () => {
    for (const ref of references) {
      const solar = getSolarTimes(new Date(...ref.date, 12), ref.lat, ref.lon);
      for (const [key, expected] of [['sunrise', ref.rise], ['solarNoon', ref.noon], ['sunset', ref.set]]) {
        assert.ok(Math.abs(solar[key].getTime() - Date.parse(expected)) < 120000, `${key}: ${solar[key].toISOString()} vs ${expected}`);
      }
      assert.equal(solar.dayLengthMinutes, (solar.sunset - solar.sunrise) / 60000);
    }
  }));
}

test('polar summer and winter have no fabricated sunrise or sunset', () => {
  // USNO Tromso 2026-06-21: continuously above horizon; 2026-12-21: below.
  for (const [month, expected] of [[5, 1440], [11, 0]]) {
    const date = new Date(2026, month, 21, 12);
    const profile = { latitude: 69.6492, longitude: 18.9553, locationPermissionGranted: true };
    const solar = getSolarTimes(date, profile.latitude, profile.longitude);
    assert.equal(solar.sunrise, null);
    assert.equal(solar.sunset, null);
    assert.equal(solar.dayLengthMinutes, expected);
    assert.ok(Number.isFinite(solar.solarNoon.getTime()));
    const flow = buildTodaysFlow({ date, profile });
    assert.equal(flow.locationAvailable, true);
    assert.ok(!flow.events.some(e => e.id === 'sunset'));
    assert.ok(flow.events.every(e => Number.isFinite(e.start.getTime())));
    assert.doesNotThrow(() => JSON.stringify(buildDerivedEnvironment({ date, profile })));
  }
});

test('missing or invalid coordinates and dates yield unavailable solar data', () => {
  for (const [lat, lon] of [[null, null], [NaN, 0], [0, Infinity], [91, 0], [0, -181]]) {
    const solar = getSolarTimes(new Date(), lat, lon);
    assert.deepEqual(solar, { sunrise: null, sunset: null, solarNoon: null, dayLengthMinutes: null });
    assert.equal(buildDerivedEnvironment({ profile: { latitude: lat, longitude: lon, locationPermissionGranted: true } }).locationAvailable, false);
  }
  assert.equal(getSolarTimes(new Date(NaN), 0, 0).sunrise, null);
  assert.equal(formatTimeLocal(new Date(NaN)), '--:--');
});

test('calendar day-of-year survives DST and leap day', () => inTimezone('America/Los_Angeles', () => {
  for (const [year, month, day, expected] of [[2026, 2, 9, 68], [2024, 1, 29, 60], [2026, 11, 31, 365]]) {
    assert.equal(buildDerivedEnvironment({ date: new Date(year, month, day) }).dayOfYear, expected);
  }
}));

test('default schedule stays at 07:00 regardless of current time and DST', () => inTimezone('America/Los_Angeles', () => {
  for (const [month, day] of [[2, 8], [10, 1], [8, 11]]) {
    const starts = [];
    for (const hour of [0, 8, 20, 23]) {
      const now = new Date(2026, month, day, hour, 37);
      const flow = buildTodaysFlow({ now });
      const morning = flow.events.find(e => e.id === 'morning_light');
      assert.equal(morning.start.getDate(), day);
      assert.equal(morning.start.getHours(), 7);
      assert.equal(morning.start.getMinutes(), 0);
      starts.push(flow.events.map(e => e.start.getTime()));
    }
    starts.forEach(s => assert.deepEqual(s, starts[0]));
  }
}));

test('valid profile times and terminal evidence remain authoritative', () => {
  for (const participationLevel of ['BASELINE', 'GUIDED_FLOW', 'FULL_FLOW']) {
    for (const status of ['completed', 'skipped', 'missed']) {
      const now = new Date(2026, 8, 11, 6, 45);
      const flow = buildTodaysFlow({ now, participationLevel, profile: { wakeTime: '06:30', targetBedtime: '21:30' }, eventStateForDate: { morning_light: { status, at: now.toISOString() } } });
      const morning = flow.events.find(e => e.id === 'morning_light');
      assert.equal(morning.start.getHours(), 6);
      assert.equal(morning.start.getMinutes(), 30);
      assert.equal(morning.status, status);
      assert.notEqual(flow.activeEvent?.id, morning.id);
      assert.notEqual(flow.next?.id, morning.id);
    }
  }
});

test('malformed wake times use a stable default', () => {
  for (const wakeTime of ['', 'oops', '25:99', '-1:00']) {
    const flow = buildTodaysFlow({ now: new Date(2026, 8, 11, 20), profile: { wakeTime } });
    assert.equal(flow.events.find(e => e.id === 'morning_light').start.getHours(), 7);
  }
});
