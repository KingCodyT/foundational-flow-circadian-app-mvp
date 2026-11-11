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
