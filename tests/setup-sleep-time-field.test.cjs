const test = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { create, act } = require('react-test-renderer');
const load = require('./load-typescript.cjs');
const { SetupSleepTimeField } = load('components/setup-sleep-time-field.tsx');
const { assessSleepInterval } = load('lib/sleep-timing.ts');
function mount(value, period) {
 let tree, current = value, writes = [];
 const change = v => {current=v;writes.push(v);tree.update(React.createElement(SetupSleepTimeField,{label:'Time',value:current,period,onChange:change}));};
 act(()=>{tree=create(React.createElement(SetupSleepTimeField,{label:'Time',value,period,onChange:change}));});
 return {writes,get value(){return current;},choose(part,v){act(()=>tree.root.findByProps({'aria-label':'Time '+part}).props.onChange({target:{value:v}}));},tree,close(){act(()=>tree.unmount());}};
}
test('fixed periods convert all hours and minute edits without period selectors',()=>{
 for(const period of ['AM','PM']) for(let hour=1;hour<=12;hour++){
  const app=mount(null,period);app.choose('hour',String(hour));app.choose('minute','35');
  assert.equal(app.value,String(hour%12+(period==='PM'?12:0)).padStart(2,'0')+':35');
  assert.equal(app.tree.root.findAllByType('select').length,2);app.close();
 }
});
test('10 PM to 6 AM produces eight hours; 12 retains midnight/noon semantics',()=>{
 const wake=mount(null,'AM'),bed=mount(null,'PM');
 wake.choose('hour','6');bed.choose('hour','10');
 assert.equal(wake.value,'06:00');assert.equal(bed.value,'22:00');
 assert.equal(assessSleepInterval(bed.value,wake.value).durationMinutes,480);
 wake.choose('hour','12');bed.choose('hour','12');
 assert.equal(wake.value,'00:00');assert.equal(bed.value,'12:00');
 wake.close();bed.close();
});
test('conflicting and malformed saved times remain untouched until an explicit edit',()=>{
 for(const [value,period] of [['10:00','PM'],['18:15','AM'],['bad','AM']]){
  const app=mount(value,period);
  assert.deepEqual(app.writes,[]);
  assert.equal(app.tree.root.findAllByType('select')[0].props.value,'');
  app.choose('hour','6');assert.equal(app.value,period==='AM'?'06:00':'18:00');app.close();
 }
});
