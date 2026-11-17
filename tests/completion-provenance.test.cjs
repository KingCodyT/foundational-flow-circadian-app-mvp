const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-typescript.cjs');
const {completionSignals, EVENT_SIGNAL_MAP} = load('lib/personalization/completion-evidence.ts');
const {summarizeDailyEvidence} = load('lib/personalization/daily-evidence.ts');
const {reportedDays} = load('lib/today-coaching.ts');
const at = '2026-11-17T12:00:00Z';
const done = coachingSignalId => ({status:'completed', at, coachingSignalId});

test('each selectable focus can record practice without crediting sibling signals', () => {
  for (const [event, signals] of Object.entries(EVENT_SIGNAL_MAP)) {
    for (const signal of signals) {
      const record = done(signal);
      assert.deepEqual(completionSignals(event, record), [signal]);
      const history = {'2026-11-17': {[event]:record}};
      const summaries = summarizeDailyEvidence(history);
      assert.deepEqual(Object.keys(summaries), [signal]);
      assert.equal(summaries[signal].completedDays, 1);
      assert.equal(reportedDays(history, signal, new Date('2026-11-17T13:00Z'), 'UTC'),1);
      for (const other of signals.filter(s => s !== signal)) {
        assert.equal(reportedDays(history, other, new Date('2026-11-17T13:00Z'), 'UTC'),0);
      }
    }
  }
});
test('supporting, incompatible and non-completed records never add practice', () => {
  assert.deepEqual(completionSignals('morning_light',done(null)),[]);
  assert.deepEqual(completionSignals('morning_light',done('sleep_schedule')),[]);
  for (const status of ['skipped','upcoming','missed']) {
    assert.deepEqual(completionSignals('movement',{...done('morning_movement'),status}),[]);
  }
});
test('old generic completion does not retroactively establish duration or brightness', () => {
  assert.deepEqual(completionSignals('morning_light',done(undefined)),['morning_light_timing']);
  assert.deepEqual(completionSignals('midday_light',done(undefined)),['day_breaks_outside']);
  assert.deepEqual(completionSignals('sleep_window',done(undefined)),[]);
  assert.deepEqual(completionSignals('first_meal',done(undefined)),[]);
});
test('multiple attributed meal opportunities count one reported practice date', () => {
  const history = {'2026-11-17': {first_meal:done('meal_timing_regularity'),last_meal:done('meal_timing_regularity')}};
  assert.equal(summarizeDailyEvidence(history).meal_timing_regularity.completedDays,1);
  assert.equal(reportedDays(history,'meal_timing_regularity',new Date('2026-11-17T13:00Z'),'UTC'),1);
});

test('attributed practice advances every supported focus independently', () => {
  const {applyDailyEvidence} = load('lib/personalization/daily-evidence.ts');
  for (const [event, signals] of Object.entries(EVENT_SIGNAL_MAP)) for (const signal of signals) {
    const base = {generatedAt:at, perSignal:Object.fromEntries(signals.map(id => [id,{
      id, classification:'BEHAVIOR', coachingState:'NEEDS_ATTENTION', evidence:[],
    }]))};
    const history = {};
    for(let d=1;d<=6;d++) history[`2026-11-${String(d).padStart(2,'0')}`] = {[event]:done(signal)};
    const next=applyDailyEvidence(base,history);
    assert.equal(next.perSignal[signal].coachingState,'ESTABLISHED',signal);
    for(const sibling of signals.filter(s=>s!==signal)) assert.equal(next.perSignal[sibling].coachingState,'NEEDS_ATTENTION');
  }
});
