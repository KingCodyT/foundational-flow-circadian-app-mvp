const test=require('node:test'),assert=require('node:assert/strict');
const load=require('./load-typescript.cjs');
const {recipeWindow}=load('lib/personalization/recipe-window.ts');
const {FOOD_RECIPES}=load('lib/personalization/food-recipes.ts');
const p={wakeTime:'07:00',targetBedtime:'23:00',lastMealTime:'18:00',timeZone:'UTC'};
test('recipe slots follow saved schedule and existing last-meal cue without mutation',()=>{
 const before=JSON.stringify(p);
 for(const [hour,slot] of [['08','first'],['13','middle'],['18','last'],['21','last'],['02',null]]) assert.equal(recipeWindow(p,new Date(`2026-11-02T${hour}:00Z`)).slot,slot);
 assert.equal(JSON.stringify(p),before);
});
test('overnight first meal is at night; middle and last can cross midnight',()=>{
 const p={wakeTime:'17:00',targetBedtime:'09:00',lastMealTime:'05:00',timeZone:'UTC',workStructure:'overnight'};
 for(const [hour,slot] of [['18','first'],['01','middle'],['05','last'],['07','last'],['12',null]]) assert.equal(recipeWindow(p,new Date(`2026-11-02T${hour}:00Z`)).slot,slot);
});
test('unknown and invalid schedules never imply a missed meal or biological phase',()=>{
 for(const p of [null,{}, {wakeTime:'25:00',targetBedtime:'23:00',timeZone:'UTC'},{wakeTime:'07:00',targetBedtime:'23:00',timeZone:'bad'}]) assert.equal(recipeWindow(p,new Date()).slot,null);
});
test('saved timezone controls slots through daylight saving transition',()=>{
 const local={...p,timeZone:'America/Los_Angeles'};
 assert.equal(recipeWindow(local,new Date('2026-11-01T16:00Z')).slot,'first');
 assert.equal(recipeWindow(local,new Date('2026-10-31T15:00Z')).slot,'first');
});
test('six sourced recipes have two per slot, ounce quantities and no excluded ingredients',()=>{
 for(const slot of ['first','middle','last']) assert.equal(FOOD_RECIPES.filter(r=>r.slot===slot).length,2);
 for(const r of FOOD_RECIPES){assert.match(r.source,/^https:\/\/codyoakland.com\/recipe\//);assert.ok(r.steps.length>=3);assert.ok(r.allergens);assert.match(r.ingredients.join(' '),/oz/);assert.doesNotMatch(r.ingredients.join(' '),/\b(?:tofu|oats)\b/i);assert.doesNotMatch(r.steps.join(' '),/85–3/);}
});
const React=require('react'),R=require('react-test-renderer');
const {FoodRecipes}=load('components/food-recipes.tsx');
const text=n=>n.children.map(c=>typeof c==='string'?c:text(c)).join('');
test('browsing slots never writes profile or completion; reset returns current schedule',()=>{
 let writes=0,r;R.act(()=>r=R.create(React.createElement(FoodRecipes,{profile:p,now:new Date('2026-11-02T08:00Z'),onPreferencesChange:()=>writes++})));
 assert.match(text(r.root),/Potato, spinach and egg skillet/);
 R.act(()=>r.root.findAllByType('button').find(b=>b.children.includes('Last meal')).props.onClick());
 assert.match(text(r.root),/Salmon and lentil/);assert.equal(writes,0);
 R.act(()=>r.root.findAllByType('button').find(b=>b.children.includes('Use my schedule')).props.onClick());
 assert.match(text(r.root),/Potato, spinach and egg skillet/);assert.equal(writes,0);R.act(()=>r.unmount());
});
test('saved plant and quick preferences are not silently overridden',()=>{
 for(const extra of [{foodPreference:'plant'},{foodQuick:true}]) {
 let r;R.act(()=>r=R.create(React.createElement(FoodRecipes,{profile:{...p,...extra},now:new Date('2026-11-02T08:00Z'),onPreferencesChange:()=>{}})));
 assert.equal(r.root.findAllByType('article').length,0);assert.match(text(r.root),/preference|filters/);R.act(()=>r.unmount());
 }
});
