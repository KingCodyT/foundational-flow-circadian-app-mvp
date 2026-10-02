const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-typescript.cjs');
const { buildTimeline, timelineDate, validTimelineDate, timelineFood } = load('lib/timeline.ts');
const base = { date: '2026-09-10', today: '2026-09-10', timeZone: 'America/Los_Angeles' };
const meal = (id, at, extra={}) => ({ id, at, action:'MEAL_STARTED', source:'USER', ...extra });
const notice = { id:'n', eventId:'morning_light', targetSignalId:null, channel:'NOTIFICATION', title:'Saved guidance', body:'Saved text', scheduledFor:'2026-09-10T08:00:00-07:00' };
test('all four categories use genuine saved records and actual versus planned timestamps', () => {
 const context = { capturedAt:'2026-09-10T17:00:00Z',timeZone:'America/Los_Angeles',latitude:37,longitude:-122,wakeAt:'2026-09-10T07:00:00-07:00',sunriseAt:'2026-09-10T06:30:00-07:00',sunsetAt:null,targetSleepAt:null,morningLightAt:null };
 const entries = buildTimeline({...base,food:{old:[meal('m','2026-09-10T12:00:00-07:00',{historicalContext:context})]},events:{'2026-09-10':{light:{status:'completed',at:'2026-09-10T09:13:00-07:00',remindAt:'2026-09-10T08:00:00-07:00'},evening:{status:'active',at:'2026-09-10T09:00:00-07:00',remindAt:'2026-09-10T18:00:00-07:00'}}},notifications:{scheduledNotification:null,lastNotification:notice,deliveredNotifications:[{...notice,deliveredAt:'2026-09-10T08:02:00-07:00'}]}});
 assert.deepEqual(new Set(entries.map(e=>e.kind)),new Set(['RECORDED','CONTEXT','PLANNED','RECOMMENDED']));
 assert.equal(entries.find(e=>e.id.startsWith('event:light')).at,'2026-09-10T09:13:00-07:00');
 assert.equal(entries.filter(e=>e.id.startsWith('plan:light')).length,0);
 assert.equal(entries.find(e=>e.kind==='RECOMMENDED').at,'2026-09-10T08:02:00-07:00');
 assert.equal(entries.find(e=>e.title==='Sunrise').at,context.sunriseAt);
 assert.equal(entries.find(e=>e.id==='food:m').at,'2026-09-10T12:00:00-07:00');
});
test('skipped and unknown occurrence time stay distinct; intent never becomes a meal', () => {
 const entries=buildTimeline({...base,events:{'2026-09-10':{a:{status:'skipped',at:'invalid',remindAt:'2026-09-10T08:00:00-07:00'},b:{status:'completed',at:''}}},food:{x:[meal('i','2026-09-10T12:00:00-07:00',{action:'EATING_LATER'}),meal('n','2026-09-10T11:00:00-07:00',{action:'NOT_YET'})]}});
 assert.equal(entries.find(e=>e.id.startsWith('event:a')).status,'skipped');
 assert.equal(entries.find(e=>e.id.startsWith('event:b')).at,null);
 assert.ok(entries.filter(e=>e.id.startsWith('food:')).every(e=>e.status==='status'));
 assert.equal(entries.filter(e=>e.kind==='PLANNED'||e.kind==='CONTEXT').length,0);
});
test('missing historical context and guidance remain unavailable without current-profile reconstruction', () => {
 const entries=buildTimeline({...base,food:{x:[meal('m','2026-09-10T12:00:00-07:00')]}});
 assert.equal(entries.find(e=>e.kind==='CONTEXT').status,'unavailable');
 assert.equal(entries.filter(e=>e.kind==='RECOMMENDED').length,0);
 const delivered=buildTimeline({...base,notifications:{deliveredNotifications:[{...notice,deliveredAt:'2026-09-10T15:00:00Z'}]}}).find(e=>e.kind==='RECOMMENDED');
 assert.match(delivered.details,/not retained/);
});
test('query dates reject impossible, repeated and injected values', () => {
 for(const value of ['2026-02-30','2026-9-10','<script>', ['2026-09-10'],undefined,'2026-09-10T00:00:00Z']) assert.equal(timelineDate(value,base.today),base.today);
 assert.equal(timelineDate('2024-02-29',base.today),'2024-02-29');assert.equal(validTimelineDate('2025-02-29'),false);
});
test('travel, midnight and duplicate buckets use actual instants without rewriting records', () => {
 const record=meal('m','2026-09-11T00:30:00+09:00',{historicalContext:{timeZone:'Asia/Tokyo'}});
 const food={'2026-09-11':[record],'2026-09-10':[record]};const before=JSON.stringify(food);
 assert.equal(timelineFood(food,'2026-09-10','America/Los_Angeles').length,1);
 assert.equal(timelineFood(food,'2026-09-11','Asia/Tokyo').length,1);
 assert.equal(buildTimeline({...base,food}).find(e=>e.id==='food:m').timeZone,'Asia/Tokyo');
 assert.equal(JSON.stringify(food),before);
});
test('DST repeated hours remain two distinct instants with deterministic order', () => {
 const food={x:[meal('b','2026-11-01T01:30:00-08:00'),meal('a','2026-11-01T01:30:00-07:00'),meal('c','2026-11-01T01:30:00-08:00')]};
 const input={...base,date:'2026-11-01',today:'2026-11-01',food};
 assert.deepEqual(buildTimeline(input).filter(e=>e.kind==='RECORDED').map(e=>e.id),['food:a','food:b','food:c']);
 assert.deepEqual(buildTimeline(input),buildTimeline({...input,food:{x:[...food.x].reverse()}}));
 const spring={x:[meal('s','2026-03-08T01:59:00-08:00'),meal('t','2026-03-08T03:01:00-07:00')]};
 assert.equal(timelineFood(spring,'2026-03-08',base.timeZone).length,2);
});
test('cross-date edits select latest stable ID once and future dates contain only genuine plans', () => {
 const old=meal('m','2026-09-09T23:00:00-07:00',{updatedAt:'2026-09-10T10:00:00Z'}),updated={...old,at:'2026-09-10T01:00:00-07:00',updatedAt:'2026-09-10T12:00:00Z'};
 assert.equal(timelineFood({old:[old],new:[updated]},'2026-09-09',base.timeZone).length,0);
 assert.equal(timelineFood({old:[old],new:[updated]},base.date,base.timeZone).length,1);
 const entries=buildTimeline({...base,today:'2026-09-09',food:{x:[updated]},events:{x:{done:{status:'completed',at:updated.at}}},notifications:{scheduledNotification:notice,deliveredNotifications:[]}});
 assert.equal(entries.length,1);assert.equal(entries[0].kind,'PLANNED');
 assert.deepEqual(buildTimeline({...base,today:'2026-09-09'}),[]);
});

test('saved future first-run plan is shown once and disappears when a linked completion exists', () => {
 const guidance={eventId:'morning_light',dateKey:base.date,start:notice.scheduledFor,end:'2026-09-10T09:00:00-07:00',action:'Saved orientation',reason:'Saved reason',focus:'Light',profileKey:'saved'};
 assert.equal(buildTimeline({...base,today:'2026-09-09',firstRunHandoff:{guidance}})[0].kind,'PLANNED');
 const input={...base,firstRunHandoff:{guidance},notifications:{scheduledNotification:notice,deliveredNotifications:[]}};
 assert.equal(buildTimeline(input).length,1);
 const completed={...input,events:{[base.date]:{morning_light:{status:'completed',at:'2026-09-10T08:15:00-07:00'}}}};
 assert.equal(buildTimeline(completed).filter(e=>e.kind==='PLANNED').length,0);
});

test('a requested reminder and its saved scheduled notification are one plan', () => {
 const entries=buildTimeline({...base,events:{[base.date]:{morning_light:{status:'active',at:'2026-09-10T07:00:00-07:00',remindAt:'2026-09-10T15:00:00Z'}}},notifications:{scheduledNotification:notice,deliveredNotifications:[]}});
 assert.equal(entries.filter(e=>e.kind==='PLANNED').length,1);
});

test('retained original context is provenance, not authoritative anchors for an edited occurrence', () => {
 const original='2026-09-09T12:00:00-07:00';
 const record=meal('edited','2026-09-10T12:00:00-07:00',{historicalContextOccurrenceAt:original,historicalContext:{capturedAt:original,timeZone:'America/Los_Angeles',wakeAt:'2026-09-09T07:00:00-07:00',sunsetAt:'2026-09-09T19:00:00-07:00',targetSleepAt:'2026-09-09T22:00:00-07:00'}});
 const {buildCircadianFoodTimingSnapshot}=load('lib/personalization/circadian-food-timing.ts');
 const snapshot=buildCircadianFoodTimingSnapshot({evidence:[record],anchors:{wakeAt:'2026-09-10T10:00:00-07:00',targetSleepAt:'2026-09-10T13:00:00-07:00'}});
 assert.equal(snapshot.meals[0].minutesBeforeTargetSleep,null);assert.equal(snapshot.meals[0].minutesFromWake,null);
 const entries=buildTimeline({...base,food:{x:[record]}});
 assert.equal(entries.find(e=>e.kind==='CONTEXT').status,'unavailable');
 assert.match(entries.find(e=>e.kind==='CONTEXT').details,/Retained prior snapshot/);
 const missing=buildCircadianFoodTimingSnapshot({evidence:[{...record,historicalContext:undefined}],anchors:{wakeAt:'2026-09-10T10:00:00-07:00',targetSleepAt:'2026-09-10T13:00:00-07:00'}});
 assert.equal(missing.meals[0].minutesBeforeTargetSleep,null);
});
