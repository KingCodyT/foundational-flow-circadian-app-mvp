const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const React = require('react');
const { create, act } = require('react-test-renderer');
const load = require('./load-typescript.cjs');

const draftKey = 'foundational-flow-onboarding-draft';
function mount(profile = {}, saved = new Map(), hasCompletedAudit = false) {
  let completed = false, persisted;
  const storage = { getItem: k => saved.get(k) ?? null, setItem: (k, v) => saved.set(k, v), removeItem: k => saved.delete(k) };
  const provider = { isHydrated: true, hasCompletedAudit, dailyProfile: profile, setAnswer() {}, setParticipationLevel() {},
    setDailyProfile: p => { persisted = p; }, completeAudit: () => { completed = true; } };
  const code = ts.transpileModule(fs.readFileSync('views/profile-setup-page.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const mod = { exports: {} };
  const req = id => {
    if (id === 'next/router') return { useRouter: () => ({ push() {} }) };
    if (id === '@/components/circadian-provider') return { useCircadian: () => provider };
    if (id === '@/components/journey-design') return {
      JourneyFrame: ({ children }) => React.createElement('main', null, children),
      JourneyCard: ({ children }) => React.createElement('section', null, children),
      JourneyNav: () => null, Segments: () => null,
    };
    return id.startsWith('@/') ? load(id.slice(2)) : require(id);
  };
  new Function('require', 'module', 'exports', 'window', 'localStorage', code)(req, mod, mod.exports, { scrollTo() {} }, storage);
  let tree;
  act(() => { tree = create(React.createElement(mod.exports.default)); });
  const text = node => typeof node === 'string' ? node : (node.children || []).map(text).join('');
  return {
    saved, get completed() { return completed; }, get persisted() { return persisted; },
    click(label) { act(() => tree.root.findAllByType('button').find(b => text(b).includes(label)).props.onClick()); },
    stage: () => tree.root.findAllByType('li').find(li => li.props['aria-current'] === 'step').children.map(text).join(''),
    headings: () => tree.root.findAllByType('h2').map(text),
    label(value) { act(() => tree.root.findAllByType('input').find(n => n.props.placeholder === 'City or region').props.onChange({target:{value}})); },
    alerts: () => tree.root.findAll(n => n.props.role === 'alert').length,
    meal(value) { act(() => tree.root.findByType(load('components/optional-meal-time-field.tsx').OptionalMealTimeField).props.onChange(value)); },
    close() { act(() => tree.unmount()); },
  };
}

for (const meal of [null, '18:30', '19:01']) test('setup navigation and completion preserve optional meal ' + meal, () => {
  const old = { wakeTime: '07:00', targetBedtime: '23:00', lastMealTime: meal,
    timeZone: 'UTC', firstCaffeineTime: '09:00', caffeineUse: 'yes' };
  let app = mount(old);
  app.click('Next:'); app.click('Next:');
  assert.match(app.stage(), /Environment/);
  app.click('Back');
  app.click('Save and Finish Later');
  const saved = app.saved;
  app.close();
  app = mount(old, saved);
  assert.match(app.stage(), /Schedule/);
  app.click('Next:'); app.click('Next:'); app.click('Next:');
  assert.equal(app.completed, true);
  assert.equal(app.persisted.lastMealTime, meal);
  assert.equal(app.persisted.caffeineUse, 'yes');
  assert.equal(app.persisted.firstCaffeineTime, '09:00');
  assert.equal(saved.has(draftKey), false);
  app.close();
});

for (const profile of [
  {}, { wakeTime: '07:00' }, { targetBedtime: '23:00' },
  { wakeTime: '07:00', targetBedtime: '07:00' },
  { wakeTime: 'invalid', targetBedtime: '23:00' },
]) test('invalid sleep schedule remains blocked: ' + JSON.stringify(profile), () => {
  const app = mount({ ...profile, lastMealTime: null });
  app.click('Next:'); app.click('Next:');
  assert.match(app.stage(), /Schedule/);
  assert.equal(app.alerts(), 1);
  assert.equal(app.completed, false);
  app.close();
});

test('an entered meal survives navigation and completion', () => {
  const app = mount({ wakeTime: '07:00', targetBedtime: '23:00', lastMealTime: null });
  app.click('Next:'); app.meal('18:45'); app.click('Next:'); app.click('Back');
  app.click('Next:'); app.click('Next:'); app.click('Next:');
  assert.equal(app.persisted.lastMealTime, '18:45');
  app.close();
});

test('clearing a saved meal remains optional through completion', () => {
  const app = mount({ wakeTime: '07:00', targetBedtime: '23:00', lastMealTime: '19:01' });
  app.click('Next:'); app.click('Clear meal time'); app.click('Next:');
  app.click('Back'); app.click('Save and Finish Later');
  assert.equal(JSON.parse(app.saved.get(draftKey)).profile.lastMealTime, null);
  app.click('Next:'); app.click('Next:'); app.click('Next:');
  assert.equal(app.persisted.lastMealTime, null);
  app.close();
});

for (const napPattern of [undefined, 'no', 'sometimes', 'regularly']) test('setup preserves existing nap data: ' + napPattern, () => {
  const profile = { wakeTime: '07:00', targetBedtime: '23:00', lastMealTime: null };
  if (napPattern !== undefined) profile.napPattern = napPattern;
  let app = mount(profile);
  app.click('Next:'); app.click('Next:'); app.click('Back'); app.click('Save and Finish Later');
  const saved = app.saved;
  assert.equal(JSON.parse(saved.get(draftKey)).profile.napPattern, napPattern);
  app.close(); app = mount(profile, saved);
  app.click('Next:'); app.click('Next:'); app.click('Next:');
  assert.equal(app.completed, true);
  assert.equal(app.persisted.napPattern, napPattern);
  if (napPattern === undefined) assert.equal(Object.hasOwn(app.persisted, 'napPattern'), false);
  app.close();
});

for (const location of [
 { latitude: 33.54, longitude: -117.78, locationPermissionGranted: true },
 { latitude: 33.54, longitude: -117.78, locationPermissionGranted: true, locationLabel: 'Saved area' },
]) test('saved location summary, cancel, navigation and resume preserve data: '+JSON.stringify(location),()=>{
 let app=mount({wakeTime:'07:00',targetBedtime:'23:00',...location});
 assert.ok(app.headings().includes('Using your saved location'));
 app.click('Change location');app.label('Replacement label');app.click('Cancel location changes');
 app.click('Next:');app.click('Next:');
 assert.ok(app.headings().includes('Using your saved location'));
 app.click('Change location');app.label('Updated label');app.click('Done editing location');
 app.click('Save and Finish Later');const saved=app.saved;
 assert.equal(JSON.parse(saved.get(draftKey)).profile.locationLabel,'Updated label');
 app.close();app=mount({},saved);
 assert.ok(app.headings().includes('Using your saved location'));
 app.click('Next:');app.click('Next:');
 assert.equal(app.persisted.latitude,location.latitude);
 assert.equal(app.persisted.longitude,location.longitude);
 assert.equal(app.persisted.locationLabel,'Updated label');app.close();
});
for(const location of [{},{latitude:91,longitude:10,locationPermissionGranted:true},{latitude:33,longitude:10,locationPermissionGranted:false}]){
 test('unusable location retains optional editor: '+JSON.stringify(location),()=>{
 const app=mount(location);assert.ok(app.headings().includes('Your location'));
 assert.equal(app.headings().includes('Using your saved location'),false);app.close();
 });
}

test('normal navigation autosaves every step without the save button',()=>{
 const profile={wakeTime:'07:00',targetBedtime:'23:00',displayName:'Synthetic'};
 let app=mount(profile);
 for(let i=0;i<4;i++){
  assert.equal(JSON.parse(app.saved.get(draftKey)).index,i);
  const saved=app.saved; app.close();app=mount({},saved);
  assert.equal(JSON.parse(saved.get(draftKey)).profile.displayName,'Synthetic');
  if(i<3)app.click('Next:');
 }
 app.click('Back');assert.equal(JSON.parse(app.saved.get(draftKey)).index,2);
 app.close();
});
test('completion clears autosave and completed reentry shows Finish despite stale draft',()=>{
 const p={wakeTime:'07:00',targetBedtime:'23:00'};
 const app=mount(p);app.click('Next:');app.click('Next:');app.click('Next:');app.click('Next:');
 assert.equal(app.saved.has(draftKey),false);app.close();
 const saved=new Map([[draftKey,JSON.stringify({profile:{wakeTime:'bad'},index:0})]]);
 const complete=mount(p,saved,true);
 assert.match(complete.stage(),/Finish/);
 complete.close();
});
for(const index of [-1,4,99,'2',1.5,null])test('invalid saved index safely starts Basics: '+index,()=>{
 const app=mount({},new Map([[draftKey,JSON.stringify({profile:{wakeTime:'07:00',targetBedtime:'23:00'},index})]]));
 assert.match(app.stage(),/Basics/);app.close();
});
test('later saved step with invalid sleep data returns Schedule before completion',()=>{
 const app=mount({},new Map([[draftKey,JSON.stringify({profile:{wakeTime:'07:00',targetBedtime:'07:00'},index:3})]]));
 assert.match(app.stage(),/Schedule/);app.click('Next:');assert.equal(app.completed,false);app.close();
});
