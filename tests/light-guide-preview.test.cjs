const test=require('node:test'),assert=require('node:assert/strict'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const load=require('./load-typescript.cjs'),{LightGuidePreview}=load('components/light-guide-preview.tsx');
const profile={wakeTime:'06:00',targetBedtime:'22:00',timeZone:'America/Los_Angeles',locationPermissionGranted:true,latitude:34,longitude:-118};
test('light preview explains day, night, and unavailable location without measured-data claims',()=>{
 for(const [p,at,label] of [[profile,'2026-11-01T22:00:00Z','Afternoon light'],[profile,'2026-11-02T07:00:00Z','After daylight'],[null,'2026-11-01T22:00:00Z','Local light timing unavailable']]){
 const html=renderToStaticMarkup(React.createElement(LightGuidePreview,{profile:p,now:new Date(at)}));
 assert.ok(html.includes(label));assert.match(html,/What’s your light doing right now/);assert.match(html,/not measured/);assert.match(html,/<summary>Explore light, timing &amp; your body<\/summary>/);
 if(!p)assert.doesNotMatch(html,/Based on your saved location/);
 }
});
test('mobile feature previews existing light pathways without presenting swatches as measured spectrum',()=>{
 const html=renderToStaticMarkup(React.createElement(LightGuidePreview,{profile:null,now:new Date('2026-11-01T22:00:00Z')}));
 assert.match(html,/Light, timing &amp; your body/);
 assert.match(html,/not measured light or energy proportions/);
 assert.match(html,/Both are invisible/);
 assert.match(html,/Light → eyes → body clock/);
 assert.match(html,/role="img" aria-label="Illustrative visible spectrum, from violet through blue, green and yellow to red/);
 assert.match(html,/Local light timing unavailable/);
 assert.doesNotMatch(html,/<details open/);
});
