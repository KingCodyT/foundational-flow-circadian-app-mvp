const test=require('node:test'),assert=require('node:assert/strict'),load=require('./load-typescript.cjs');
const {deferredTime,reportedDays,responseAllowed,eveningHeadline,smallerAction}=load('lib/today-coaching.ts');
const event={id:'dim_house',start:new Date('2026-11-01T20:00Z'),end:new Date('2026-11-01T20:30Z')};
test('deferral stays strictly inside window; action expiration and date are revalidated',()=>{
 assert.equal(deferredTime(event,new Date('2026-11-01T20:05Z')).toISOString(),'2026-11-01T20:20:00.000Z');
 for(const time of ['19:59','20:15','20:30'])assert.equal(deferredTime(event,new Date(`2026-11-01T${time}Z`)),null);
 assert.equal(responseAllowed(event,undefined,new Date('2026-11-01T20:05Z'),'2026-11-01','UTC'),true);
 for(const status of ['completed','skipped'])assert.equal(responseAllowed(event,{status},new Date('2026-11-01T20:05Z'),'2026-11-01','UTC'),false);
 assert.equal(responseAllowed(event,undefined,new Date('2026-11-01T20:30Z'),'2026-11-01','UTC'),false);
 assert.equal(responseAllowed(event,undefined,new Date('2026-11-01T20:05Z'),'2026-10-31','UTC'),false);
});
test('reported progress deduplicates dates, rejects future/misdated/invalid and respects profile zone',()=>{
 const r={'2026-10-31':{dim_house:{status:'completed',at:'2026-11-01T04:00Z'},sunset:{status:'completed',at:'2026-11-01T03:00Z'}},'2026-11-01':{dim_house:{status:'skipped',at:'2026-11-01T20:00Z'}}};
 assert.equal(reportedDays(r,'evening_light_reduction',new Date('2026-11-01T20:05Z'),'America/Los_Angeles'),1);
 assert.equal(reportedDays(r,'evening_light_reduction',new Date('2026-11-01T20:05Z'),'UTC'),0);
 r['2026-11-01'].dim_house={status:'completed',at:'invalid'};assert.equal(reportedDays(r,'evening_light_reduction',new Date('2026-11-01T20:05Z'),'UTC'),0);
 r['2026-11-01'].dim_house={status:'completed',at:'2026-11-01T21:00Z'};assert.equal(reportedDays(r,'evening_light_reduction',new Date('2026-11-01T20:05Z'),'UTC'),0);
});
test('headline uses local context and excludes morning/shift schedules; alternatives match behavior',()=>{
 assert.equal(eveningHeadline({timeZone:'UTC'},event,new Date('2026-11-01T20:05Z')),true);
 assert.equal(eveningHeadline({timeZone:'Asia/Tokyo'},event,new Date('2026-11-01T20:05Z')),false);
 assert.equal(eveningHeadline({timeZone:'UTC',workStructure:'overnight'},event,new Date('2026-11-01T20:05Z')),false);
 assert.match(smallerAction('digital_sunset'),/screen/);assert.equal(smallerAction('last_meal'),null);
});

test('saved wall-clock display uses AM/PM without timezone conversion',()=>{
 const {savedClockTime,savedZoneLabel}=load('lib/today-coaching.ts');
 for(const [input,expected] of [['00:00','12:00 AM'],['12:00','12:00 PM'],['21:56','9:56 PM'],['01:05','1:05 AM'],['23:59','11:59 PM']])assert.equal(savedClockTime(input),expected);
 for(const invalid of [null,'','24:00','8:00','12:99'])assert.equal(savedClockTime(invalid),'not set');
 for(const zone of ['UTC','America/Los_Angeles','Asia/Tokyo'])assert.equal(savedZoneLabel({timeZone:zone}),`saved timezone: ${zone}`);
 assert.equal(savedZoneLabel(null),'device timezone (no timezone saved)');
});
