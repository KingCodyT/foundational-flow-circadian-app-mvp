const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-typescript.cjs');
const { mealNudge } = load('lib/personalization/meal-nudge.ts');
const profile = {wakeTime:'07:00',targetBedtime:'23:00',lastMealTime:'19:00',timeZone:'UTC'};
test('meal cue follows saved meal time and stays inside the waking day',()=>{
  for(const at of ['2026-10-02T18:29Z','2026-10-02T20:00Z','2026-10-02T03:00Z']) assert.equal(mealNudge(profile,new Date(at)),null);
  assert.equal(mealNudge(profile,new Date('2026-10-02T18:30Z')).time,'7:00 PM');
  assert.equal(mealNudge({...profile,lastMealTime:'23:30'},new Date('2026-10-02T23:05Z')),null);
  assert.equal(mealNudge({...profile,lastMealTime:'07:10'},new Date('2026-10-02T06:50Z')),null);
});
test('cross-midnight schedules retain one identity and invalid or shift schedules do not invent a meal',()=>{
  const late={...profile,wakeTime:'10:00',targetBedtime:'02:00',lastMealTime:'00:15'};
  assert.equal(mealNudge(late,new Date('2026-10-02T23:50Z')).id,mealNudge(late,new Date('2026-10-03T00:20Z')).id);
  for(const p of [null,{}, {...profile,timeZone:'invalid'}, {...profile,lastMealTime:null}, {...profile,workStructure:'shift'}]) assert.equal(mealNudge(p,new Date('2026-10-02T18:45Z')),null);
  assert.equal(mealNudge({...profile,timeZone:'America/Los_Angeles'},new Date('2026-10-03T01:45Z')).time,'7:00 PM');
});
test('snooze expires, dismissal survives remount, and responses do not record meals',()=>{
  const React=require('react'), R=require('react-test-renderer');
  const {MealNudge}=load('components/meal-nudge.tsx');
  const previous=global.window, previousSelf=global.self;const data=new Map();
  global.self={setTimeout,clearTimeout};
  global.window={localStorage:{getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)},addEventListener(){},removeEventListener(){}};
  let r; const render=at=>React.createElement(MealNudge,{profile,now:new Date(at)},React.createElement('p',null,'Meal ideas'));
  try{
    R.act(()=>{r=R.create(render('2026-10-02T18:35Z'));});
    const buttons=()=>r.root.findAllByType('button');
    R.act(()=>buttons().find(b=>b.children.join('').includes('15 minutes')).props.onClick());
    assert.equal(buttons().length,0);
    R.act(()=>r.update(render('2026-10-02T18:50Z')));assert.equal(buttons().length,2);
    R.act(()=>buttons().find(b=>b.children.join('')==='Dismiss').props.onClick());
    R.act(()=>r.unmount());R.act(()=>{r=R.create(render('2026-10-02T19:00Z'));});assert.equal(buttons().length,0);
    assert.deepEqual([...data.keys()],['foundational-flow-meal-nudge-response']);
    R.act(()=>r.update(render('2026-10-03T18:35Z')));assert.equal(buttons().length,2);
  }finally{R.act(()=>r?.unmount());global.window=previous;global.self=previousSelf;}
});
test('background meal plans keep the active window and preserve local timing across DST',()=>{
 const {planMealNotifications}=load('lib/personalization/meal-notifications.ts');
 const p={...profile,timeZone:'America/Los_Angeles'};
 const plans=planMealNotifications(p,new Date('2026-10-31T01:45Z'));
 assert.equal(plans.length,7);
 assert.equal(plans[0].scheduledFor,'2026-10-31T01:30:00.000Z');
 assert.equal(plans[2].scheduledFor,'2026-11-02T02:30:00.000Z');
 assert.equal(new Set(plans.map(p=>p.id)).size,7);
 assert.deepEqual(planMealNotifications({...p,lastMealTime:null},new Date()),[]);
});
