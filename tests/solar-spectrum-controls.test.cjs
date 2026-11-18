const test=require('node:test'),assert=require('node:assert/strict'),React=require('react'),{create,act}=require('react-test-renderer'),load=require('./load-typescript.cjs');
const {SolarSpectrum}=load('components/solar-spectrum.tsx'),{getSolarTimes}=load('lib/solar.ts'),{solarDayRange,solarMixGradient}=load('lib/solar-day-display.ts');
const profile={locationPermissionGranted:true,latitude:33.54,longitude:-117.78,timeZone:'America/Los_Angeles',wakeTime:'06:00',targetBedtime:'22:00'};
const now=new Date('2026-11-18T18:52:00Z');
test('actual sunrise/sunset range, one accessible slider; earlier/later reset resume clock',()=>{
 let tree;act(()=>tree=create(React.createElement(SolarSpectrum,{profile,now})));
 const slider=()=>tree.root.findByType('input'),buttons=()=>tree.root.findAllByType('button');
 const solar=getSolarTimes(now,profile.latitude,profile.longitude,profile.timeZone);
 const gradient=()=>tree.root.findAllByProps({className:'solar-glowing-mix'})[0]?.props.style.backgroundImage;
 const originalGradient=gradient();
 act(()=>slider().props.onChange({target:{value:String(+solar.solarNoon)}}));
 assert.notEqual(gradient(),originalGradient);assert.match(JSON.stringify(tree.toJSON()),/Light mix at/);
 act(()=>buttons()[0].props.onClick());assert.equal(gradient(),originalGradient);
 assert.equal(slider().props.min,+solar.sunrise);assert.equal(slider().props.max,+solar.sunset);assert.equal(slider().props.value,+now);assert.equal(slider().props['aria-describedby'],'solar-rail-help');assert.equal(buttons().length,0);
 for(const at of [+solar.sunrise,+solar.solarNoon,+solar.sunset]){
  act(()=>slider().props.onChange({target:{value:String(at)}}));assert.equal(slider().props.value,at);assert.equal(buttons()[0].children.join(''),'Back to now');
  act(()=>buttons()[0].props.onClick());assert.equal(slider().props.value,+now);assert.equal(buttons().length,0);
 }
 act(()=>tree.update(React.createElement(SolarSpectrum,{profile,now:new Date(+now+10*60000)})));assert.equal(slider().props.value,+now+10*60000);
 act(()=>tree.unmount());
});
test('outside daylight retains actual now mix and explains handle edge; polar events never invented',()=>{
 for(const at of ['2026-11-18T12:00:00Z','2026-11-19T04:00:00Z']){
  let tree;act(()=>tree=create(React.createElement(SolarSpectrum,{profile,now:new Date(at)})));const json=JSON.stringify(tree.toJSON());assert.match(json,/Outside the daylight rail/);assert.match(json,/light mix still shows now/);assert.equal(tree.root.findAllByProps({className:'solar-glowing-mix'}).length,0);act(()=>tree.unmount());
 }
 for(const at of ['2026-06-21T12:00:00Z','2026-12-21T12:00:00Z']){
  let tree;act(()=>tree=create(React.createElement(SolarSpectrum,{profile:{...profile,latitude:80,longitude:0,timeZone:'UTC'},now:new Date(at)})));assert.match(JSON.stringify(tree.toJSON()),/No sunrise or sunset crossing today/);act(()=>tree.unmount());
 }
});
test('gradient centers follow actual energy shares, not fixed mockup widths',()=>{
 const a=solarMixGradient([{id:'uva',percent:10},{id:'blue',percent:90}]);assert.match(a,/5.000%.*55.000%/);assert.notEqual(a,solarMixGradient([{id:'uva',percent:30},{id:'blue',percent:70}]));
 const range=solarDayRange(getSolarTimes(now,profile.latitude,profile.longitude,profile.timeZone));assert.equal(range.position(new Date(range.start)),0);assert.equal(range.position(new Date(range.end)),100);
});
