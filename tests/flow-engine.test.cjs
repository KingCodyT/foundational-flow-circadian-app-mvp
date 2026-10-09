const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-typescript.cjs');
const { buildTodaysFlow } = load('lib/flow-engine.ts');
const { scheduleTime } = load('lib/schedule-time.ts');
const { buildDerivedEnvironment } = load('lib/personalization/derived-environment.ts');
const { buildFoodTimingAnchorsFromFlow } = load('lib/personalization/circadian-food-journey.ts');
const profile = { wakeTime: '05:05', targetBedtime: '21:45', lastMealTime: '18:30', timeZone: 'America/Los_Angeles', latitude: 33.54, longitude: -117.78, locationPermissionGranted: true };
const byId = (flow, id) => flow.events.find(event => event.id === id);
function ordered(flow) {
  for (let i = 0; i < flow.events.length; i++) {
    const event = flow.events[i];
    assert.ok(Number.isFinite(event.start.getTime()), event.id);
    if (event.end) assert.ok(event.end > event.start, event.id);
    if (i) assert.ok(event.start >= flow.events[i - 1].start, event.id);
  }
}

test('entered 18:30 meal and 21:45 bedtime survive device/profile timezone differences', () => {
  const now = new Date('2026-09-18T19:00:00Z');
  const flow = buildTodaysFlow({ now, profile });
  assert.equal(byId(flow, 'last_meal').start.toISOString(), '2026-09-19T01:30:00.000Z');
  assert.equal(byId(flow, 'last_meal').source, 'schedule');
  assert.equal(byId(flow, 'sleep_window').start.toISOString(), '2026-09-19T04:00:00.000Z');
  assert.equal(byId(flow, 'sleep_window').end.toISOString(), '2026-09-19T05:30:00.000Z');
  const anchors = buildFoodTimingAnchorsFromFlow(flow.events);
  assert.equal(anchors.wakeAt, '2026-09-18T12:05:00.000Z');
  assert.equal(anchors.targetSleepAt, '2026-09-19T04:45:00.000Z');
  assert.equal(flow.warnings.length, 0);
  ordered(flow);
});

test('location changes daylight, never the entered meal or bedtime', () => {
  const now = new Date('2026-09-18T19:00:00Z');
  const home = buildTodaysFlow({ now, profile });
  const away = buildTodaysFlow({ now, profile: { ...profile, latitude: 47.6, longitude: -122.3 } });
  assert.notEqual(home.solar.sunset.getTime(), away.solar.sunset.getTime());
  for (const id of ['last_meal', 'sleep_window']) assert.equal(byId(home, id).start.getTime(), byId(away, id).start.getTime());
  for (const flow of [home, away]) {
    for (const id of ['morning_light', 'midday_light']) {
      const event = byId(flow, id);
      assert.ok(event.start >= flow.solar.sunrise);
      assert.ok(event.end <= flow.solar.sunset);
      assert.ok(event.end <= byId(flow, 'dim_house').start);
    }
    ordered(flow);
  }
});

test('solar environment and timeline agree near UTC midnight and across the date line', () => {
  for (const location of [profile, { ...profile, timeZone: 'Pacific/Auckland', latitude: -36.85, longitude: 174.76 }, { ...profile, timeZone: 'Asia/Kolkata', latitude: 28.61, longitude: 77.21 }]) {
    const now = new Date('2026-09-19T02:00:00Z');
    const flow = buildTodaysFlow({ now, profile: location });
    const env = buildDerivedEnvironment({ date: now, now, profile: location });
    assert.equal(flow.solar.sunrise.toISOString(), env.sunrise);
    assert.equal(flow.solar.sunset.toISOString(), env.sunset);
    ordered(flow);
  }
});

test('after-midnight meals and bedtimes roll to the next calendar day', () => {
  const flow = buildTodaysFlow({ now: new Date('2026-09-18T19:00:00Z'), profile: { ...profile, wakeTime: '10:00', lastMealTime: '00:30', targetBedtime: '02:00' } });
  assert.equal(byId(flow, 'last_meal').start.toISOString(), '2026-09-19T07:30:00.000Z');
  assert.equal(byId(flow, 'sleep_window').start.toISOString(), '2026-09-19T08:15:00.000Z');
  ordered(flow);
});

test('DST conversion preserves ordinary wall times and handles gaps and repeats explicitly', () => {
  assert.equal(scheduleTime('2026-03-08', '18:30', profile.timeZone).toISOString(), '2026-03-09T01:30:00.000Z');
  assert.equal(scheduleTime('2026-11-01', '18:30', profile.timeZone).toISOString(), '2026-11-02T02:30:00.000Z');
  assert.equal(scheduleTime('2026-03-08', '02:30', profile.timeZone).toISOString(), '2026-03-08T10:30:00.000Z');
  assert.equal(scheduleTime('2026-11-01', '01:30', profile.timeZone).toISOString(), '2026-11-01T08:30:00.000Z');
});

test('night workers and polar nights receive no outdoor light window in darkness', () => {
  for (const p of [{ ...profile, wakeTime: '20:00', targetBedtime: '06:00', lastMealTime: '03:00' }, { ...profile, timeZone: 'Arctic/Longyearbyen', latitude: 78.22, longitude: 15.65 }]) {
    const flow = buildTodaysFlow({ now: new Date('2026-12-18T12:00:00Z'), profile: p });
    assert.ok(!byId(flow, 'morning_light'));
    assert.ok(!byId(flow, 'midday_light'));
    ordered(flow);
  }
});

test('missing meal timing uses an explained fallback and conflicting input is preserved with a warning', () => {
  const now = new Date('2026-09-18T19:00:00Z');
  const fallback = buildTodaysFlow({ now, profile: { ...profile, lastMealTime: null, latitude: null, longitude: null } });
  assert.equal(byId(fallback, 'last_meal').source, 'suggestion');
  assert.match(byId(fallback, 'last_meal').guidance, /No last-meal time is saved/);
  const conflict = buildTodaysFlow({ now, profile: { ...profile, lastMealTime: '23:30' } });
  assert.equal(byId(conflict, 'last_meal').start.toISOString(), '2026-09-19T06:30:00.000Z');
  assert.match(conflict.warnings.join(' '), /outside your waking window/);
  ordered(fallback);
  ordered(conflict);
});

test('persisted completion and chronological next-event selection survive rebuilding', () => {
  const now = new Date('2026-09-19T01:00:00Z');
  const flow = buildTodaysFlow({ now, profile, eventStateForDate: { movement: { status: 'completed', at: now.toISOString() } } });
  assert.equal(byId(flow, 'movement').status, 'completed');
  assert.equal(flow.next.id, 'last_meal');
  assert.ok(flow.next.start > now);
});
