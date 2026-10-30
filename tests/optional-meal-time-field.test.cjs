const test = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { create, act } = require('react-test-renderer');
const load = require('./load-typescript.cjs');
const { OptionalMealTimeField } = load('components/optional-meal-time-field.tsx');
const { parseClockTime } = load('lib/sleep-timing.ts');
function mount(initial) {
  let tree, current = initial, writes = [];
  function render() { tree.update(React.createElement(OptionalMealTimeField, { value: current, onChange })); }
  function onChange(value) { current = value; writes.push(value); render(); }
  act(() => { tree = create(React.createElement(OptionalMealTimeField, { value: current, onChange })); });
  return {
    get value() { return current; }, writes,
    choose(label, value) { act(() => tree.root.findByProps({ 'aria-label': label }).props.onChange({ target: { value } })); },
    clear() { act(() => tree.root.findByType('button').props.onClick()); },
    options(label) { return tree.root.findByProps({ 'aria-label': label }).findAllByType('option').map(o => ({ value: o.props.value, disabled: o.props.disabled })); },
    close() { act(() => tree.unmount()); },
  };
}
test('blank stays optional; starting any part produces a valid complete time, and clear returns null', () => {
  for (const [label,value] of [['Last meal hour','7'],['Last meal minute','15'],['Last meal AM or PM','PM']]) {
    const app = mount(null);
    assert.deepEqual(app.writes, []);
    app.choose(label, value);
    assert.notEqual(parseClockTime(app.value), null);
    app.clear(); assert.equal(app.value, null);
    app.close();
  }
});
test('minute choices are exactly quarter hours and hour choices cover 1–12', () => {
  const app = mount(null);
  assert.deepEqual(app.options('Last meal minute').filter(o=>!o.disabled).map(o=>o.value), [0,15,30,45]);
  assert.deepEqual(app.options('Last meal hour').filter(o=>!o.disabled).map(o=>o.value), Array.from({length:12},(_,i)=>i+1));
  for (const m of ['0','15','30','45']) {
    app.choose('Last meal hour','7'); app.choose('Last meal minute',m); app.choose('Last meal AM or PM','PM');
    assert.equal(app.value, '19:' + m.padStart(2,'0'));
  }
  app.close();
});
test('noon and midnight convert correctly', () => {
  const app = mount(null);
  app.choose('Last meal hour','12'); app.choose('Last meal minute','0'); app.choose('Last meal AM or PM','PM');
  assert.equal(app.value,'12:00');
  app.choose('Last meal AM or PM','AM'); assert.equal(app.value,'00:00');
  app.close();
});
test('legacy minute is preserved without writes until explicitly changed', () => {
  const app = mount('19:01');
  assert.deepEqual(app.writes, []);
  assert.deepEqual(app.options('Last meal minute').find(o=>o.value===1),{value:1,disabled:true});
  app.choose('Last meal hour','8'); assert.equal(app.value,'20:01');
  app.choose('Last meal minute','15'); assert.equal(app.value,'20:15');
  assert.equal(app.options('Last meal minute').some(o=>o.value===1),false);
  app.close();
});
