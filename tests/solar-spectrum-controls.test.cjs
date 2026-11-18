const test=require('node:test'),assert=require('node:assert/strict'),React=require('react'),{create,act}=require('react-test-renderer'),load=require('./load-typescript.cjs');
const {SolarSpectrum}=load('components/solar-spectrum.tsx');
const profile={locationPermissionGranted:true,latitude:33.54,longitude:-117.78,timeZone:'America/Los_Angeles',wakeTime:'06:00',bedTime:'22:00'};
const now=new Date('2026-11-18T18:52:00Z');
test('current light shows plain Now status, scrub and return resume the live clock',()=>{
 let tree;act(()=>tree=create(React.createElement(SolarSpectrum,{profile,now})));
 const slider=()=>tree.root.findByType('input'),button=()=>tree.root.findByType('button');
 const initial=slider().props.value;
 assert.equal(tree.root.findAllByType('button').length,0);assert.equal(tree.root.findByProps({role:'status'}).children.join(''),'Now');
 assert.doesNotMatch(JSON.stringify(tree.toJSON()),/Showing current light/);
 for(const value of [-240,240]) {
  act(()=>slider().props.onChange({target:{value:String(value)}}));assert.equal(slider().props.value,value);assert.equal(button().children.join(''),'Back to now');
  assert.match(JSON.stringify(tree.toJSON()),/Exploring today/);
  act(()=>button().props.onClick());assert.equal(slider().props.value,initial);assert.equal(tree.root.findAllByType('button').length,0);assert.match(JSON.stringify(tree.toJSON()),/Now/);
 }
 act(()=>tree.update(React.createElement(SolarSpectrum,{profile,now:new Date(+now+10*60000)})));assert.equal(slider().props.value,initial+10);
 act(()=>tree.unmount());
});
