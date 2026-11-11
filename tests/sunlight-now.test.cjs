const test=require('node:test'),assert=require('node:assert/strict'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const load=require('./load-typescript.cjs'),{SunlightNow}=load('components/sunlight-now.tsx');
const profile={wakeTime:'06:00',targetBedtime:'22:00',timeZone:'America/Los_Angeles',locationPermissionGranted:true,latitude:34,longitude:-118};
const render=(p,at)=>renderToStaticMarkup(React.createElement(SunlightNow,{profile:p,now:new Date(at)}));
test('sunlight is visible with explicit modeled quantities and biological limits',()=>{
 const html=render(profile,'2026-11-01T20:00:00Z');
 assert.match(html,/Sunlight now/);assert.match(html,/Live calculation/);assert.match(html,/not a sensor reading/);
 for(const band of ['UVB','UVA','Visible light','Infrared']) assert.ok(html.includes(band));
 assert.match(html,/energy share/);assert.match(html,/UVB below 300 nm/);assert.match(html,/not biological effect/);
 assert.equal((html.match(/id="spectrum-time"/g)||[]).length,1);
 assert.doesNotMatch(html,/<details[^>]* open/);
});
test('no invented spectrum at night, twilight, or without valid permitted location',()=>{
 const night=render(profile,'2026-11-02T07:00:00Z');assert.match(night,/Nighttime/);assert.doesNotMatch(night,/energy share<\/small>/);
 const dawn=render(profile,'2026-11-01T14:15:00Z');assert.match(dawn,/pauses below 5°/);assert.doesNotMatch(dawn,/energy share<\/small>/);
 for(const p of [null,{...profile,locationPermissionGranted:false},{...profile,latitude:100}]){
  const html=render(p,'2026-11-01T20:00:00Z');assert.match(html,/Location needed/);assert.match(html,/profile#profile-location/);assert.doesNotMatch(html,/solar elevation/);
 }
});
test('current readings update with the shared clock, retaining polar support',()=>{
 assert.notEqual(render(profile,'2026-11-01T18:00:00Z'),render(profile,'2026-11-01T21:00:00Z'));
 const polar={...profile,latitude:80,longitude:0,timeZone:'UTC'};
 assert.match(render(polar,'2026-12-21T12:00:00Z'),/Nighttime/);
 assert.match(render(polar,'2026-06-21T12:00:00Z'),/energy share/);
});
const {DayDashboard}=load('components/day-dashboard.tsx');
const dashboard=(p,at)=>renderToStaticMarkup(React.createElement(DayDashboard,{profile:p,now:new Date(at)}));
test('dashboard exposes current timing, saved plans and options without disclosures',()=>{
 const html=dashboard(profile,'2026-11-01T20:00:00Z');
 for(const label of ['Your day at a glance','Sunrise','Sunset','Usual wake','Planned bed','Light for this moment','Food &amp; movement','not measured sleep']) assert.ok(html.includes(label),label);
 assert.doesNotMatch(html,/<details/);assert.match(html,/6:00 AM/);assert.match(html,/10:00 PM/);
 assert.match(html,/daylight break/);assert.match(dashboard(profile,'2026-11-02T05:00:00Z'),/bedtime is approaching/);
});
test('dashboard avoids ordinary morning advice for shift schedules, missing data and polar nights',()=>{
 const shift=dashboard({...profile,workStructure:'overnight'},'2026-11-01T20:00:00Z');assert.match(shift,/planned waking and sleeping hours/);assert.doesNotMatch(shift,/take a daylight break/);
 const empty=dashboard(null,'2026-11-01T20:00:00Z');assert.match(empty,/Location needed/);assert.match(empty,/Not set/);
 const polar=dashboard({...profile,latitude:80,longitude:0,timeZone:'UTC'},'2026-12-21T12:00:00Z');assert.match(polar,/Extended darkness/);assert.match(polar,/No crossing today/);
});
test('dashboard precedes coaching and exploration; completed returning users open Today',()=>{
 const fs=require('node:fs');const journey=fs.readFileSync('components/journey-now.tsx','utf8');
 assert.ok(journey.indexOf('<DayDashboard')<journey.indexOf('{coaching}'));
 assert.ok(journey.indexOf('<SunlightNow')<journey.indexOf('{coaching}'));
 const home=fs.readFileSync('views/welcome-page.tsx','utf8');
 assert.match(home,/hasCompletedAudit && Boolean\(dailyProfile\?\.wakeTime && dailyProfile\?\.targetBedtime\)/);
 assert.match(home,/router.replace\('\/today'\)/);
});
