const test=require('node:test');
const assert=require('node:assert/strict');
const load=require('./load-typescript.cjs');
const {mealReminderPreview}=load('lib/personalization/meal-reminder-preview.ts');
const now=new Date('2026-10-30T15:00Z');
const profile={wakeTime:'07:00',targetBedtime:'23:00',lastMealTime:'19:15',timeZone:'America/Los_Angeles'};
test('reminder preview shows existing planner time in saved timezone regardless of enabled state',()=>{
 for(const mealRemindersEnabled of [true,false]) assert.match(mealReminderPreview({...profile,mealRemindersEnabled},now),/Oct 30, 6:45 PM PDT \(America\/Los_Angeles\)/);
 assert.match(mealReminderPreview({...profile,lastMealTime:'07:10'},new Date('2026-10-30T13:00Z')),/7:00 AM PDT/);
 assert.match(mealReminderPreview({...profile,timeZone:'America/New_York'},now),/6:45 PM EDT/);
});
test('missing, invalid and shift schedules never display a fabricated time',()=>{
 for(const p of [null,{}, {...profile,lastMealTime:null},{...profile,timeZone:'invalid'},{...profile,wakeTime:'25:00'},{...profile,lastMealTime:'23:30'}]){
  const result=mealReminderPreview(p,now);assert.match(result,/save valid wake, bedtime, last-meal and timezone/);assert.doesNotMatch(result,/Planned reminder:/);
 }
 for(const workStructure of ['shift','overnight'])assert.match(mealReminderPreview({...profile,workStructure},now),/in-app meal suggestions instead/);
});
