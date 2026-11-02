const test=require('node:test'),assert=require('node:assert/strict'),load=require('./load-typescript.cjs');
const {normalizeWeeklyCheckins,weeklyDueDate,weeklyIsDue,applyWeeklyAction}=load('lib/weekly-checkin.ts');
const {normalizeDailyProfile}=load('lib/audit-store.ts');
const id='evening_light_reduction',profile={timeZone:'America/Los_Angeles',wakeTime:'07:00',targetBedtime:'22:00',lastMealTime:'18:30',locationPermissionGranted:false,remindersEnabled:false};
test('old/malformed profiles migrate without enrolling or altering anchors',()=>{
 assert.deepEqual(normalizeDailyProfile(profile),profile);
 assert.deepEqual(normalizeWeeklyCheckins({[id]:{version:1,mode:'weekly',anchorAt:'bad'},unknown:{version:1,mode:'off'}}),{});
 assert.deepEqual(normalizeWeeklyCheckins({[id]:{version:1,mode:'off'}}),{[id]:{version:1,mode:'off'}});
 assert.equal(applyWeeklyAction(profile,id,{type:'weekly'},new Date('2026-11-01T20:00Z'),false),profile);
});
test('weekly uses local calendar days across DST, midnight and timezone changes',()=>{
 const entry={version:1,mode:'weekly',anchorAt:'2026-03-01T08:30:00Z'};
 assert.equal(weeklyDueDate(entry,'America/Los_Angeles'),'2026-03-08');
 assert.equal(weeklyIsDue(entry,new Date('2026-03-08T07:59:59Z'),'America/Los_Angeles'),false);
 assert.equal(weeklyIsDue(entry,new Date('2026-03-08T08:00:00Z'),'America/Los_Angeles'),true);
 const fall={...entry,anchorAt:'2026-10-26T00:30:00Z'};
 assert.equal(weeklyDueDate(fall,'America/Los_Angeles'),'2026-11-01');
 assert.equal(weeklyDueDate(fall,'Asia/Tokyo'),'2026-11-02');
 assert.equal(weeklyIsDue(fall,new Date('2026-11-01T07:00Z'),'America/Los_Angeles'),true);
});
test('opt-in, duplicate/stale responses, absence, disabling and re-enabling are bounded per focus',()=>{
 let p=applyWeeklyAction(profile,id,{type:'weekly'},new Date('2026-10-01T20:00Z'),true);
 const anchor=p.weeklyCheckins[id].anchorAt;
 assert.equal(applyWeeklyAction(p,id,{type:'weekly'},new Date('2026-10-02T20:00Z'),true),p);
 assert.equal(applyWeeklyAction(p,id,{type:'answer',expectedAnchor:anchor,response:'on_track'},new Date('2026-10-02T20:00Z'),true),p);
 const action={type:'answer',expectedAnchor:anchor,response:'on_track'},at=new Date('2026-11-01T20:00Z');
 p=applyWeeklyAction(p,id,action,at,true);
 assert.equal(weeklyDueDate(p.weeklyCheckins[id],p.timeZone),'2026-11-08');
 assert.equal(applyWeeklyAction(p,id,action,at,true),p);
 assert.equal(p.lastMealTime,profile.lastMealTime);assert.equal(p.targetBedtime,profile.targetBedtime);assert.equal(p.remindersEnabled,false);
 p=applyWeeklyAction(p,'morning_light_timing',{type:'off'},at,true);assert.equal(p.weeklyCheckins[id].mode,'weekly');
 p=applyWeeklyAction(p,id,{type:'off'},at,true);assert.equal(weeklyDueDate(p.weeklyCheckins[id],p.timeZone),null);
 p=applyWeeklyAction(p,id,{type:'weekly'},new Date('2026-11-03T20:00Z'),true);assert.equal(weeklyDueDate(p.weeklyCheckins[id],p.timeZone),'2026-11-10');
});
