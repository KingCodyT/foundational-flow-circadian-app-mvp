const test=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'), ts=require('typescript'), React=require('react');
const {create,act}=require('react-test-renderer');
const load=require('./load-typescript.cjs');
test('first-run uses accepted focus, explicit controls, safe cancellation boundary and duplicate protection',()=>{
 const now=new Date(), start=new Date(+now-60000).toISOString(), end=new Date(+now+3600000).toISOString();
 const profile={wakeTime:'07:00',targetBedtime:'22:30',timeZone:'UTC',remindersEnabled:false};
 const guidance={eventId:'dim_house',dateKey:now.toISOString().slice(0,10),start,end,action:'Reduce unnecessary light',reason:'Bedtime',focus:'Schedule',profileKey:load('lib/personalization/first-run-guidance.ts').guidanceProfileKey(profile)};
 const writes=[]; let coach,journey,cleared=false;
 const provider={dailyProfile:profile,firstRunHandoff:{guidance},eventStateByDate:{},setFirstRunHandoff(value){if(value===null)cleared=true;},setEventRecord:(...x)=>writes.push(x),setDailyProfile(){},notificationState:{deliveredNotifications:[],scheduledNotification:null},setScheduledNotification(){},answers:{morning_light_timing:'rarely'},clientId:'test',updateWeeklyCheckin(){},currentPersonalization:{primaryCoachingTarget:{signalId:'morning_light_timing',coachingState:'NEEDS_ATTENTION'}}};
 const mod={exports:{}};
 const req=id=>id==='next/link'?{default:({children})=>React.createElement('a',null,children)}:id==='./circadian-provider'?{useCircadian:()=>provider}:id==='./today-coach'?{TodayCoach:p=>{coach=p;return null}}:id==='./journey-now'?{JourneyNow:p=>{journey=p;return React.createElement('main',null,p.coaching)}}:id==='@/lib/personalization/background-notification-transport'?{getBrowserNotificationPermissionState:()=> 'PROMPT',requestBrowserNotificationPermission:()=>{throw Error('Must not request')}}:id.startsWith('@/')?load(id.slice(2)):id.startsWith('./')?load('components/'+id.slice(2)):require(id);
 const code=ts.transpileModule(fs.readFileSync('components/first-run-today.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 new Function('require','module','exports','window',code)(req,mod,mod.exports,{addEventListener(){},removeEventListener(){}});
 let tree;act(()=>{tree=create(React.createElement(mod.exports.FirstRunToday,{now,voice:{}}))});
 assert.equal(journey.primarySignalId,'morning_light_timing'); assert.equal(coach.reminder.id,'dim_house'); assert.equal(writes.length,0);
 assert.equal(coach.respond('adjust',end),false);assert.equal(writes.length,0);
 assert.equal(coach.respond('completed'),true);assert.equal(coach.respond('completed'),false);assert.equal(coach.respond('skipped'),false);assert.equal(writes.length,1);
 assert.equal(writes[0][1],'dim_house');assert.equal(writes[0][2].status,'completed');act(()=>tree.update(React.createElement(mod.exports.FirstRunToday,{now:new Date(Date.parse(end)+1),voice:{}})));assert.equal(cleared,true);act(()=>tree.unmount());
});
