const test = require('node:test'), assert = require('node:assert/strict');
const React = require('react'), {renderToStaticMarkup}=require('react-dom/server');
const load = require('./load-typescript.cjs');
const {selectFirstRunGuidance}=load('lib/personalization/first-run-guidance.ts');
const {firstStepExplanation}=load('lib/personalization/first-step-explanation.ts');
const {TodayCoach}=load('components/today-coach.tsx');
const profile={wakeTime:'06:00',targetBedtime:'22:00',timeZone:'America/Los_Angeles',locationPermissionGranted:false};
function context(p,now,signal) {const step=selectFirstRunGuidance(p,now);const next=selectFirstRunGuidance(p,now,null,signal);return {step,next,copy:firstStepExplanation(p,now,signal,step,next??undefined)};}
test('afternoon onboarding explains 8 PM support, 10 PM bedtime and next morning without changing focus',()=>{
 const now=new Date('2026-11-01T21:59:00Z'), before=JSON.stringify(profile);
 const {step,next,copy}=context(profile,now,'morning_light_timing');
 assert.equal(step.eventId,'dim_house');assert.equal(step.start,'2026-11-02T04:00:00.000Z');
 assert.match(step.reason,/10:00 PM bedtime/);assert.equal(copy.heading,'Start here tonight at 8:00 PM');assert.match(copy.why,/Your focus remains morning light/);assert.doesNotMatch(copy.why,/ended|missed|passed/);
 assert.equal(next.start,'2026-11-02T14:00:00.000Z');assert.equal(copy.next.label,'Tomorrow morning: your morning-light step');assert.equal(JSON.stringify(profile),before);
 const pending={...step,id:step.eventId,start:new Date(step.start),end:new Date(step.end)};
 const html=renderToStaticMarkup(React.createElement(TodayCoach,{profile,now,signalId:'morning_light_timing',clientId:'test',day:'2026-11-01',reminder:null,pending,count:0,established:false,respond:()=>false,saveProfile(){},updateWeekly(){},firstStepContext:copy}));
 assert.match(html,/8:00 PM/);assert.match(html,/10:00 PM bedtime/);assert.match(html,/Tomorrow morning: your morning-light step at 6:00 AM/);assert.doesNotMatch(html,/Your next opportunity|ended|missed/);assert.doesNotMatch(html,/<details/);
});
test('same-focus action is identified directly without describing it as supporting a different focus',()=>{
 const {copy}=context(profile,new Date('2026-11-01T14:05:00Z'),'morning_light_timing');
 assert.equal(copy.heading,'Start here now');assert.match(copy.why,/puts your morning light focus into practice/);assert.equal(copy.next,undefined);assert.doesNotMatch(copy.why,/ended|supporting/);
});
test('after-window first action is tomorrow morning, with no false evening or passed-window explanation',()=>{
 const {step,copy}=context(profile,new Date('2026-11-02T07:00:00Z'),'morning_light_timing');
 assert.equal(step.eventId,'morning_light');assert.equal(step.dateKey,'2026-11-02');assert.equal(copy.heading,'Start here tomorrow morning at 6:00 AM');assert.doesNotMatch(copy.why,/tonight|ended|supporting/);
});
test('overnight schedule does not claim that a future morning-light window already passed',()=>{
 const p={...profile,wakeTime:'18:00',targetBedtime:'09:00',workStructure:'overnight'};
 const {step,copy}=context(p,new Date('2026-11-01T22:00:00Z'),'evening_light_reduction');
 assert.equal(step.eventId,'morning_light');assert.equal(copy.heading,'Start here tonight at 6:00 PM');assert.match(copy.why,/first step supports/);assert.doesNotMatch(copy.why,/morning-light window has ended|tonight|tomorrow/);
 assert.equal(copy.next.start,'2026-11-02T15:00:00.000Z');
 const active=context(p,new Date('2026-11-02T15:05:00Z'),'morning_light_timing');
 assert.equal(active.step.eventId,'dim_house');assert.equal(active.copy.next.dateKey,'2026-11-02');assert.doesNotMatch(active.copy.why,/Today’s morning-light window has ended|tonight|tomorrow/);
});

test('future morning and overnight labels follow saved local clock, with no prior-action implication',()=>{
 const early=context(profile,new Date('2026-11-01T13:00:00Z'),'morning_light_timing');
 assert.equal(early.copy.heading,'Start here this morning at 6:00 AM');
 const p={...profile,wakeTime:'01:00',targetBedtime:'17:00'};
 const overnight=context(p,new Date('2026-11-02T07:00:00Z'),'morning_light_timing');
 assert.equal(overnight.copy.heading,'Start here tomorrow at 1:00 AM');
 assert.doesNotMatch(overnight.copy.why,/missed|ended|passed|last opportunity/);
});
