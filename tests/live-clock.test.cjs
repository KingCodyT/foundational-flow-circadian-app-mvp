const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-typescript.cjs');
const { subscribeToClock, localDateKey } = load('lib/live-clock.ts');
const { buildTodaysFlow } = load('lib/flow-engine.ts');

function environment() {
  const host = new EventTarget();
  const page = new EventTarget();
  page.visibilityState = 'visible';
  const timers = new Map();
  let counter = 0;
  host.setInterval = (callback, delay) => {
    assert.ok(delay <= 15000, 'clock must update within 15 seconds');
    timers.set(++counter, callback);
    return counter;
  };
  host.clearInterval = id => timers.delete(id);
  return { host, page, timers, tick: () => [...timers.values()].forEach(callback => callback()) };
}

test('ticks advance current guidance without navigation or reloading', () => {
  const env = environment();
  let now = new Date(2026, 8, 12, 6, 59, 59);
  let flow;
  const stop = subscribeToClock(() => { flow = buildTodaysFlow({ now }); }, env.host, env.page);
  assert.equal(flow.next.id, 'morning_light');
  now = new Date(2026, 8, 12, 7, 0, 1);
  env.tick();
  assert.equal(flow.activeEvent.id, 'morning_light');
  now = new Date(2026, 8, 12, 8, 30, 1);
  env.tick();
  assert.equal(flow.events.find(event => event.id === 'morning_light').status, 'missed');
  stop();
});

test('focus, pageshow and returning from a hidden tab refresh immediately', () => {
  const env = environment();
  let calls = 0;
  const stop = subscribeToClock(() => { calls++; }, env.host, env.page);
  assert.equal(calls, 1);
  env.page.visibilityState = 'hidden';
  env.page.dispatchEvent(new Event('visibilitychange'));
  assert.equal(calls, 1);
  env.page.visibilityState = 'visible';
  env.page.dispatchEvent(new Event('visibilitychange'));
  env.host.dispatchEvent(new Event('focus'));
  env.host.dispatchEvent(new Event('pageshow'));
  assert.equal(calls, 4);
  stop();
  env.tick();
  env.page.dispatchEvent(new Event('visibilitychange'));
  env.host.dispatchEvent(new Event('focus'));
  env.host.dispatchEvent(new Event('pageshow'));
  assert.equal(calls, 4, 'all listeners and timers removed after unmount');
  assert.equal(env.timers.size, 0);
});

test('midnight changes the date and selects fresh evidence, preserving yesterday', () => {
  const env = environment();
  let now = new Date(2026, 11, 31, 23, 59, 59);
  const history = { '2026-12-31': { morning_light: { status: 'completed', at: now.toISOString() } } };
  const before = JSON.stringify(history);
  let key, flow;
  const stop = subscribeToClock(() => {
    key = localDateKey(now);
    flow = buildTodaysFlow({ now, eventStateForDate: history[key] });
  }, env.host, env.page);
  assert.equal(flow.events.find(event => event.id === 'morning_light').status, 'completed');
  now = new Date(2027, 0, 1, 0, 0, 1);
  env.tick();
  assert.equal(key, '2027-01-01');
  assert.equal(flow.next.id, 'morning_light');
  assert.equal(flow.next.start.getDate(), 1);
  assert.equal(JSON.stringify(history), before);
  stop();
});
