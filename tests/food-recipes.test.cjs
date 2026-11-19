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
const {FoodPreview}=load('components/food-guidance.tsx');
const {recipesForSlot}=load('lib/personalization/food-recipes.ts');
test('Today and Food share recipes and filters for day, overnight and unknown schedules',(t)=>{
 const priorWindow=global.window,priorSelf=global.self; global.self=global; global.window={localStorage:{getItem:()=>null},addEventListener(){},removeEventListener(){}};t.after(()=>{global.window=priorWindow;global.self=priorSelf;});
 const profiles=[p,{...p,wakeTime:'17:00',targetBedtime:'09:00',lastMealTime:'05:00',workStructure:'overnight'},null,{...p,foodDairyFree:true},{...p,foodPreference:'plant'},{...p,foodQuick:true}];
 for(const profile of profiles){
 const now=new Date('2026-11-02T18:00Z');let preview,food;
 R.act(()=>{preview=R.create(React.createElement(FoodPreview,{profile,now,suppressNudge:true}));food=R.create(React.createElement(FoodRecipes,{profile,now,onPreferencesChange:()=>{}}));});
 const expected=recipesForSlot(recipeWindow(profile,now).slot??'first',profile)[0];
 if(expected){assert.ok(text(preview.root).includes(expected.title));assert.ok(text(food.root).includes(expected.title));}
 else assert.match(text(preview.root),/No recipes/);
 assert.equal(preview.root.findAllByType('a').find(a=>a.props.href==='/food').props.href,'/food');
 assert.doesNotMatch(text(preview.root),/tofu|oats/i);
 R.act(()=>{preview.unmount();food.unmount();});
 }
});
test('Food Lab contextual note distinguishes now, browsing, missing schedule and outside hours without duplicated reasons',()=>{
 for(const [profile,at,title,reason] of [[p,'08:00','Why this fits your day','first four hours'],[null,'08:00','Plan at your own pace','usable waking schedule'],[p,'02:00','Plan at your own pace','outside your saved waking hours']]){
 let r;R.act(()=>r=R.create(React.createElement(FoodRecipes,{profile,now:new Date(`2026-11-02T${at}Z`),onPreferencesChange:()=>{throw new Error('unexpected write')}})));
 const note=r.root.findByType('aside');assert.match(text(note),new RegExp(title));assert.match(text(note),new RegExp(reason));assert.equal(text(r.root).split(reason).length-1,1);
 R.act(()=>r.root.findAllByType('button').find(b=>b.children.includes('Last meal')).props.onClick());assert.match(text(r.root.findByType('aside')),/Planning another meal.*not a suggestion to eat now/);
 assert.ok(r.root.findAllByType('summary').some(s=>text(s)==='Ingredients & cooking steps'));assert.ok(r.root.findAllByType('a').some(a=>/^https:\/\/codyoakland.com\/recipe\//.test(a.props.href)));R.act(()=>r.unmount());
 }
});
test('Food Lab keeps existing navigation route and icon and does not add a Today control',()=>{
 const fs=require('node:fs'); const nav=fs.readFileSync('components/journey-design.tsx','utf8');assert.match(nav,/href: "\/food", label: "Food Lab", icon: "food"/);assert.match(fs.readFileSync('views/food-page.tsx','utf8'),/<h1>Food Lab<\/h1>/);
});
