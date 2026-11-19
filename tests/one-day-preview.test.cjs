const test=require('node:test'),assert=require('node:assert/strict'),load=require('./load-typescript.cjs');
const {oneDayPreview}=load('lib/one-day-preview.ts'),{scheduleDateKey}=load('lib/schedule-time.ts');
const profile={wakeTime:'07:00',targetBedtime:'22:00',timeZone:'America/Los_Angeles',latitude:33.54,longitude:-117.78,locationPermissionGranted:true};
test('tomorrow early wake uses tonight wind-down, waits for actual sunrise, and never mutates usual profile',()=>{
 const before=JSON.stringify(profile),now=new Date('2026-11-19T02:00:00Z');
 const a=oneDayPreview(profile,now,'tomorrow','05:30','22:00');
 assert.equal(a.key,'2026-11-19');assert.equal(scheduleDateKey(a.evening.start,profile.timeZone),'2026-11-18');
 assert.equal(a.evening.start.toISOString(),'2026-11-19T04:00:00.000Z');assert.equal(+a.morning.start,+a.solar.sunrise);assert.equal(a.sleepHours,7.5);assert.equal(JSON.stringify(profile),before);
});
test('after-midnight bedtime stays on wake date; date rollover follows saved zone',()=>{
 const a=oneDayPreview(profile,new Date('2027-01-01T02:00:00Z'),'tomorrow','09:00','01:00');assert.equal(a.key,'2027-01-01');assert.equal(scheduleDateKey(a.bedAt,profile.timeZone),a.key);assert.equal(scheduleDateKey(a.evening.start,profile.timeZone),'2026-12-31');assert.equal(a.sleepHours,8);
});
test('DST elapsed sleep opportunity is real hours, missing location cannot invent daylight, invalid incomplete times rejected',()=>{
 const a=oneDayPreview(profile,new Date('2026-03-07T20:00:00Z'),'tomorrow','07:00','22:00');assert.equal(a.sleepHours,8);
 const b=oneDayPreview({...profile,locationPermissionGranted:false},new Date(),'today','07:00','22:00');assert.equal(b.morning,undefined);assert.equal(b.located,false);
 assert.equal(oneDayPreview(profile,new Date(),'today','','22:00'),null);assert.equal(oneDayPreview(profile,new Date(),'today','07:00','07:00'),null);
});
test('interactive edit/reset/close affects only component state',()=>{
 const React=require('react'),{create,act}=require('react-test-renderer'),{OneDayPreview}=load('components/one-day-preview.tsx');let tree;act(()=>tree=create(React.createElement(OneDayPreview,{profile,now:new Date('2026-11-19T02:00:00Z')})));
 act(()=>tree.root.findByType('button').props.onClick());let inputs=tree.root.findAllByType('input');act(()=>inputs[0].props.onChange({target:{value:'05:30'}}));assert.match(JSON.stringify(tree.toJSON()),/7.5/);
 act(()=>tree.root.findAllByType('button')[1].props.onClick());assert.equal(tree.root.findAllByType('input')[0].props.value,'07:00');act(()=>tree.root.findAllByType('button')[2].props.onClick());assert.equal(tree.root.findAllByType('input').length,0);assert.equal(profile.wakeTime,'07:00');act(()=>tree.unmount());
});
test('evening is anchored to explicitly dated bed, not a prior usual-wake rollover',()=>{
 const now=new Date('2026-11-18T20:00:00Z');
 for(const [usualWake,wake,bed] of [['04:00','06:00','05:00'],['18:00','06:00','15:00']]) {
 const a=oneDayPreview({...profile,wakeTime:usualWake},now,'tomorrow',wake,bed);assert.equal(+a.bedAt-+a.evening.start,120*60000);
 }
});
