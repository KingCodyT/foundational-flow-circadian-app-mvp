const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), ts = require('typescript'), React = require('react');
const { create, act } = require('react-test-renderer');
const load = require('./load-typescript.cjs');
const { locationReturnPath, locationSetupHref } = load('lib/location/location-navigation.ts');
const { STORAGE_KEY } = load('lib/audit-store.ts');

test('location return retains the exact internal route, query and section, rejecting unsafe URLs', () => {
  for (const path of ['/today?view=overview#sunlight-now', '/food#food-region-settings', '/timeline?date=2026-11-10']) {
    assert.equal(locationReturnPath(path), path);
    assert.equal(new URL(locationSetupHref(path), 'https://test.local').searchParams.get('returnTo'), path);
  }
  assert.equal(new URL(locationSetupHref('/today?view=overview#old', 'sunlight-now'), 'https://test.local').searchParams.get('returnTo'), '/today?view=overview#sunlight-now');
  for (const value of [undefined, [], ['/today'], 'https://evil.example', '//evil.example', '/\\evil.example', '/profile?edit=location', '/setup', '/today\n', '/%2f%2fevil.example']) assert.equal(locationReturnPath(value), null, String(value));
});

function mount({ returnFlow = true, failStorage = false, asyncZip = false } = {}) {
  let profile = { wakeTime: '06:30', targetBedtime: '22:45', timeZone: 'UTC', lastMealTime: '18:15', displayName: 'Synthetic', foodRegion: 'ca', locationPermissionGranted: false };
  const initial = { ...profile }, answers = { morning_light_timing: 'rarely', bedroom_darkness: 'mostly_dark' };
  let persisted = { answers, dailyProfile: profile, hasCompletedAudit: true }, tree, returned = 0, writes = 0, geo, resolveZip;
  const provider = { get dailyProfile() { return profile; }, storageIssue: null, setDailyProfile(value) {
    profile = value; writes++;
    if (failStorage) provider.storageIssue = { code: 'quota' }; else persisted = { ...persisted, dailyProfile: value };
    tree.update(React.createElement(Component, props));
  } };
  const nav = { geolocation: { getCurrentPosition(ok, fail) { geo = { ok, fail }; } } };
  const fetch = async () => asyncZip ? new Promise(resolve => { resolveZip = resolve; }) : ({ok:true,json:async()=>({locations:[{label:'Test area',latitude:34,longitude:-118}]})});
  const routeListeners = new Set();
  const router = {events:{on:(event,fn)=>routeListeners.add(fn),off:(event,fn)=>routeListeners.delete(fn)}};
  const req = id => id === 'next/router' ? {useRouter:()=>router} : id === '@/components/circadian-provider' ? {useCircadian:()=>provider}
    : id === 'next/link' ? {default:({children,...props})=>React.createElement('a',props,children)}
    : id.startsWith('@/') ? load(id.slice(2)) : require(id);
  const mod = {exports:{}};
  const code = ts.transpileModule(fs.readFileSync('components/todays-flow/daily-profile-form.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  new Function('require','module','exports','navigator','window','fetch',code)(req,mod,mod.exports,nav,{setTimeout,clearTimeout,localStorage:{getItem:key=>key===STORAGE_KEY?JSON.stringify(persisted):null}},fetch);
  const Component=mod.exports.default, props={section:returnFlow?'location':'schedule',...(returnFlow?{onLocationSaved:()=>returned++}:{})};
  act(()=>{tree=create(React.createElement(Component,props));});
  const text=n=>typeof n==='string'?n:(n.children||[]).map(text).join('');
  return {initial, get profile(){return profile;}, get persisted(){return persisted;},get returned(){return returned;},get writes(){return writes;},get geo(){return geo;}, tree,
    click(label){act(()=>tree.root.findAllByType('button').find(b=>text(b)===label).props.onClick());},
    input(id,value){act(()=>tree.root.findAllByType('input').find(n=>n.props.id===id||n.props.placeholder===id).props.onChange({target:{value}}));},
    navigate(){for(const fn of routeListeners)fn();},
    updateProfile(changes){act(()=>{profile={...profile,...changes};tree.update(React.createElement(Component,props));});},
    resolveZip(data){resolveZip({ok:true,json:async()=>data});},
    close(){act(()=>tree.unmount());},
    flush:()=>act(async()=>{await new Promise(resolve=>setTimeout(resolve,10));}),
  };
}

for(const method of ['zip','coordinates','browser']) test(`focused ${method} location save preserves answers/schedule and returns exactly once after persistence`,async()=>{
 const app=mount();
 assert.equal(app.tree.root.findAllByType('h3').length,0);
 assert.equal(app.returned,0);
 if(method==='zip'){app.input('location-zip','90210');app.click('Save my ZIP location');}
 if(method==='coordinates'){app.input('Example: 33.54','34');app.input('Example: -117.78','-118');app.click('Save my coordinates');}
 if(method==='browser'){app.click('Use my location');act(()=>app.geo.ok({coords:{latitude:34,longitude:-118}}));}
 await app.flush();await app.flush();
 assert.equal(app.returned,1);assert.equal(app.writes,1);
 for(const key of Object.keys(app.initial).filter(k=>k!=='locationPermissionGranted'))assert.equal(app.profile[key],app.initial[key],key);
 assert.deepEqual(app.persisted.answers,{morning_light_timing:'rarely',bedroom_darkness:'mostly_dark'});
 assert.equal(app.persisted.hasCompletedAudit,true);assert.equal(app.persisted.dailyProfile.latitude,34);
 app.close();
});
test('blocked storage, invalid input and denied geolocation never return',async()=>{
 let app=mount({failStorage:true});app.input('location-zip','90210');app.click('Save my ZIP location');await app.flush();assert.equal(app.returned,0);app.close();
 app=mount();app.input('location-zip','bad');app.click('Save my ZIP location');app.input('Example: 33.54','100');app.input('Example: -117.78','-118');app.click('Save my coordinates');
 app.click('Use my location');act(()=>app.geo.fail({code:1}));await app.flush();assert.equal(app.writes,0);assert.equal(app.returned,0);app.close();
});
test('cancel/unmount ignores a late geolocation response',async()=>{
 const app=mount();app.click('Use my location');const geo=app.geo;app.close();act(()=>geo.ok({coords:{latitude:34,longitude:-118}}));await app.flush();assert.equal(app.writes,0);assert.equal(app.returned,0);
});
test('ZIP result cannot overwrite newer profile data, and stale ZIP requests cannot save',async()=>{
 let app=mount({asyncZip:true});app.input('location-zip','90210');app.click('Save my ZIP location');app.updateProfile({wakeTime:'08:45',foodRegion:'ny'});app.resolveZip({locations:[{label:'Test',latitude:34,longitude:-118}]});await app.flush();assert.equal(app.profile.wakeTime,'08:45');assert.equal(app.profile.foodRegion,'ny');assert.equal(app.returned,1);app.close();
 app=mount({asyncZip:true});app.input('location-zip','90210');app.click('Save my ZIP location');app.input('location-zip','10001');app.resolveZip({locations:[{label:'Old',latitude:34,longitude:-118}]});await app.flush();assert.equal(app.writes,0);assert.equal(app.returned,0);app.close();
});
test('direct Profile save stays on Profile with normal schedule controls',async()=>{
 const app=mount({returnFlow:false});assert.ok(app.tree.root.findAllByType('h3').length);app.input('location-zip','90210');app.click('Save my ZIP location');await app.flush();assert.equal(app.returned,0);assert.equal(app.profile.latitude,34);app.close();
});

test('newer navigation cancels pending requests and already scheduled returns before unmount',async()=>{
 let app=mount();app.click('Use my location');app.navigate();act(()=>app.geo.ok({coords:{latitude:34,longitude:-118}}));await app.flush();assert.equal(app.writes,0);assert.equal(app.returned,0);app.close();
 app=mount();app.input('Example: 33.54','34');app.input('Example: -117.78','-118');app.click('Save my coordinates');app.navigate();await app.flush();assert.equal(app.writes,1);assert.equal(app.returned,0);app.close();
});

test('return anchors reopen disclosure ancestors and focus the originating section once',()=>{
 class Details {constructor(parent){this.parentElement=parent;this.open=false;}}
 const outer=new Details(null), inner=new Details(outer);let scrolls=0,focused=0;
 const target={parentElement:inner,setAttribute(k,v){this[k]=v;},focus(){focused++;},scrollIntoView(){scrolls++;}};
 const router={asPath:'/food#food-region-settings'};
 const code=ts.transpileModule(fs.readFileSync('components/location-setup-link.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const mod={exports:{}};
 const req=id=>id==='next/router'?{useRouter:()=>router}:id.startsWith('@/')?load(id.slice(2)):require(id);
 new Function('require','module','exports','document','HTMLDetailsElement',code)(req,mod,mod.exports,{getElementById:id=>id==='food-region-settings'?target:null},Details);
 function Section(){mod.exports.useLocationReturnSection('food-region-settings');return null;}
 let tree;act(()=>{tree=create(React.createElement(Section));});
 assert.equal(outer.open,true);assert.equal(inner.open,true);assert.equal(target.tabindex,'-1');assert.equal(focused,1);assert.equal(scrolls,1);
 act(()=>tree.update(React.createElement(Section)));assert.equal(scrolls,1);
 router.asPath='/food';act(()=>tree.update(React.createElement(Section)));assert.equal(scrolls,1);
 router.asPath='/food#food-region-settings';act(()=>tree.update(React.createElement(Section)));assert.equal(scrolls,2);
 act(()=>tree.unmount());
});

test('focused page route uses its URL after refresh, returns safely, and exposes cancellation',()=>{
 const router={isReady:true,asPath:'/profile?edit=location&returnTo=%2Ffood%23food-region-settings',query:{edit:'location',returnTo:'/food#food-region-settings'},replace:path=>navigations.push(path)};
 const navigations=[];let formProps;
 const provider={isHydrated:true,hasCompletedAudit:true,dailyProfile:{timeZone:'UTC'},eventStateByDate:{},now:new Date('2026-11-11T12:00:00Z'),environment:{},answers:{}};
 const code=ts.transpileModule(fs.readFileSync('views/you-page.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const mod={exports:{}};
 const req=id=>id==='next/router'?{useRouter:()=>router}:id==='next/link'?{default:({children,...props})=>React.createElement('a',props,children)}
 :id==='@/components/circadian-provider'?{useCircadian:()=>provider}:id==='@/components/flow-shell'?{FlowShell:({children})=>React.createElement('main',null,children)}
 :id==='@/components/todays-flow/daily-profile-form'?{default:props=>{formProps=props;return null;}}:id.startsWith('@/')?load(id.slice(2)):require(id);
 new Function('require','module','exports',code)(req,mod,mod.exports);
 let tree;act(()=>{tree=create(React.createElement(mod.exports.default));});
 assert.equal(formProps.section,'location');assert.equal(tree.root.findByType('a').props.href,'/food#food-region-settings');assert.equal(tree.root.findByType('a').props.replace,true);
 formProps.onLocationSaved();assert.deepEqual(navigations,['/food#food-region-settings']);
 router.query.returnTo='https://evil.example';act(()=>tree.update(React.createElement(mod.exports.default)));formProps.onLocationSaved();assert.equal(navigations[1],'/profile');
 act(()=>tree.unmount());
});
