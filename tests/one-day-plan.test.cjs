const test=require('node:test'),assert=require('node:assert/strict'),load=require('./load-typescript.cjs');
const {createOneDayPlan,resolveOneDayPlan,ONE_DAY_KEY}=load('lib/one-day-plan.ts');
const p={wakeTime:'07:00',targetBedtime:'22:00',timeZone:'America/Los_Angeles',latitude:33.54,longitude:-117.78,locationPermissionGranted:true,workStructure:'daytime'};
const now=new Date('2026-11-19T02:00Z');
test('persisted dated plan spans tonight and tomorrow morning, then resumes usual untouched',()=>{
 const before=JSON.stringify(p),plan=createOneDayPlan(p,now,'tomorrow','05:30','22:00');assert.ok(plan);
 let r=resolveOneDayPlan(JSON.parse(JSON.stringify(plan)),p,now);assert.equal(r.bedAt.toISOString(),'2026-11-19T06:00:00.000Z');assert.equal(r.step.start.toISOString(),'2026-11-19T04:00:00.000Z');
 r=resolveOneDayPlan(plan,p,new Date('2026-11-19T13:30Z'));assert.equal(+r.step.start,+r.solar.sunrise);assert.ok(r.step.start>=r.wakeAt);
 assert.equal(resolveOneDayPlan(plan,p,r.expires),null);assert.equal(JSON.stringify(p),before);assert.equal(resolveOneDayPlan(plan,{...p,wakeTime:'06:00'},now),null);assert.equal(resolveOneDayPlan(plan,{...p,timeZone:'UTC'},now),null);
});
test('reject invalid zone, DST gaps/folds, non-daytime and malformed saved plans',()=>{
 assert.equal(createOneDayPlan({...p,timeZone:'bad'},now,'tomorrow','05:30','22:00'),null);
 assert.equal(createOneDayPlan({...p,workStructure:'shift'},now,'tomorrow','05:30','22:00'),null);
 assert.equal(createOneDayPlan(p,new Date('2026-03-07T20:00Z'),'tomorrow','07:00','02:30'),null);
 assert.equal(createOneDayPlan(p,new Date('2026-10-31T20:00Z'),'tomorrow','07:00','01:30'),null);
 assert.equal(resolveOneDayPlan({version:1,date:'garbage'},p,now),null);
 assert.equal(createOneDayPlan({...p,timeZone:'Australia/Lord_Howe'},new Date('2026-04-04T03:00Z'),'tomorrow','07:00','01:45'),null);
});
test('after-midnight bed and DST elapsed hours use exact dates; no location invents morning',()=>{
 const plan=createOneDayPlan(p,now,'tomorrow','09:00','01:00');const r=resolveOneDayPlan(plan,p,now);assert.equal(r.bedAt.toISOString(),'2026-11-19T09:00:00.000Z');
 const spring=createOneDayPlan(p,new Date('2026-03-07T20:00Z'),'tomorrow','07:00','22:00');assert.equal(resolveOneDayPlan(spring,p,new Date('2026-03-07T20:00Z')).sleepHours,8);
 const no={...p,locationPermissionGranted:false},n=createOneDayPlan(no,now,'tomorrow','05:30','22:00');assert.equal(resolveOneDayPlan(n,no,now).morning,undefined);
});
test('hook apply/reload/undo uses only dedicated storage and invalidates base change',()=>{
 const React=require('react'),R=require('react-test-renderer'),{useOneDayPlan}=load('components/use-one-day-plan.tsx');let api,tree;const memory=new Map(),keys=[];
 global.localStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>{keys.push(k);memory.set(k,v)},removeItem:k=>{keys.push(k);memory.delete(k)}};global.window={addEventListener(){},removeEventListener(){}};
 function H({profile=p}){api=useOneDayPlan(profile,now,false);return null;}
 R.act(()=>tree=R.create(React.createElement(H)));R.act(()=>api.apply('tomorrow','05:30','22:00'));assert.ok(api.active);R.act(()=>tree.unmount());R.act(()=>tree=R.create(React.createElement(H)));assert.ok(api.active);
 R.act(()=>api.undo());assert.equal(api.active,null);assert.equal(memory.size,0);
 R.act(()=>api.apply('tomorrow','05:30','22:00'));R.act(()=>tree.update(React.createElement(H,{profile:{...p,wakeTime:'06:00'}})));assert.equal(api.active,null);assert.equal(memory.size,0);assert.ok(keys.every(k=>k===ONE_DAY_KEY));R.act(()=>tree.unmount());delete global.window;delete global.localStorage;
});
