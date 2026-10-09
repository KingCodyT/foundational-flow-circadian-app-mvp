const test = require('node:test'), assert = require('node:assert/strict'), load = require('./load-typescript.cjs');
const {getLightCheckIn} = load('lib/light-check-in.ts');
const {getSolarTimes} = load('lib/solar.ts');
const profile = {latitude:37.77,longitude:-122.42,timeZone:'America/Los_Angeles',locationPermissionGranted:true};
test('light check-in follows local solar events and advances at its next boundary', () => {
 const date=new Date('2026-10-03T19:00:00Z'), solar=getSolarTimes(date,profile.latitude,profile.longitude,profile.timeZone);
 const rise=+solar.sunrise,set=+solar.sunset,length=set-rise;
 for(const [time,id] of [[rise-3600000,'night'],[rise,'dawn'],[rise+length*.2,'morning'],[rise+length*.5,'midday'],[rise+length*.8,'afternoon'],[set,'sunset'],[set+3600000,'night']]) {
  const result=getLightCheckIn(profile,new Date(time));assert.equal(result.phase.id,id);
  if(result.next){assert.ok(+result.next.at>time);assert.equal(getLightCheckIn(profile,result.next.at).phase.label,result.next.label);}
 }
});
test('light check-in handles absent location, invalid dates and polar seasons',()=>{
 assert.equal(getLightCheckIn(null,new Date()),null);
 assert.equal(getLightCheckIn({...profile,locationPermissionGranted:false},new Date()),null);
 assert.equal(getLightCheckIn({...profile,latitude:NaN},new Date()),null);
 assert.equal(getLightCheckIn(profile,new Date('invalid')),null);
 const polar={...profile,latitude:80,longitude:0,timeZone:'UTC'};
 assert.equal(getLightCheckIn(polar,new Date('2026-06-21T12:00:00Z')).polar,'day');
 assert.equal(getLightCheckIn(polar,new Date('2026-12-21T12:00:00Z')).polar,'night');
});
