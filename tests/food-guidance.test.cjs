const test = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const Renderer = require('react-test-renderer');
const load = require('./load-typescript.cjs');
const { foodGuidancePhase } = load('lib/personalization/food-guidance.ts');
const { FoodGuidance } = load('components/food-guidance.tsx');
const profile = {timeZone:'America/Los_Angeles',wakeTime:'07:00',targetBedtime:'23:00'};
test('food guidance uses saved local schedule including midnight and conservative fallbacks', () => {
 for (const [at, phase] of [['2026-10-02T15:00Z','early'],['2026-10-02T21:00Z','daytime'],['2026-10-03T04:00Z','evening'],['2026-10-03T08:00Z','general']]) {
  assert.equal(foodGuidancePhase(profile,new Date(at)),phase);
 }
 assert.equal(foodGuidancePhase({...profile,wakeTime:'10:00',targetBedtime:'02:00'},new Date('2026-10-03T07:30Z')),'evening');
 for (const p of [null,{}, {...profile,timeZone:'invalid'}, {...profile,workStructure:'overnight'}, {...profile,workStructure:'shift'}, {...profile,wakeTime:'25:00'}]) assert.equal(foodGuidancePhase(p,new Date('2026-10-02T15:00Z')),'general');
});
test('food guidance works without evidence and switches meal ideas without mutating profile', () => {
 const original=JSON.stringify(profile);
 let renderer;
 Renderer.act(()=>{renderer=Renderer.create(React.createElement(FoodGuidance,{profile,now:new Date('2026-10-02T15:00Z')}));});
 const text=n=>n.children.map(c=>typeof c==='string'?c:text(c)).join('');
 assert.match(text(renderer.root),/Egg & potato bowl/);
 Renderer.act(()=>renderer.root.findByType('select').props.onChange({target:{value:'plant'}}));
 assert.match(text(renderer.root),/Tofu scramble/);
 Renderer.act(()=>renderer.root.findByType('select').props.onChange({target:{value:'omnivore'}}));
 Renderer.act(()=>renderer.root.findAllByType('input')[0].props.onChange({target:{checked:true}}));
 assert.doesNotMatch(text(renderer.root),/Greek yogurt/);
 assert.match(text(renderer.root),/Eggs & avocado toast/);
 assert.match(text(renderer.root),/No meal logging needed/);
 assert.equal(JSON.stringify(profile),original);
 Renderer.act(()=>renderer.unmount());
});

const { selectMealIdeas } = load('lib/personalization/meal-ideas.ts');
test('all filter combinations deliver three distinct compatible ideas and preserve filters when rotating', () => {
 for (const phase of ['early','daytime','evening','general']) for (const plantBased of [true,false]) for (const dairyFree of [true,false]) for (const quick of [true,false]) {
  for (const offset of [0,3,6,99]) {
   const result=selectMealIdeas({phase,plantBased,dairyFree,quick,offset});
   assert.equal(result.meals.length,3);
   assert.equal(new Set(result.meals.map(m=>m.id)).size,3);
   for(const meal of result.meals) {
    assert.equal(meal.plantBased,plantBased);
    if(!plantBased) assert.doesNotMatch(JSON.stringify(meal),/tofu|lentil|quinoa/i);
    if(dairyFree) assert.equal(meal.dairyFree,true);
    if(quick) assert.equal(meal.quick,true);
    assert.equal(meal.early,phase==='early');
    assert.ok(meal.protein && meal.carbs && meal.fats && meal.swap);
   }
  }
 }
 const input={phase:'early',plantBased:false,dairyFree:false,quick:false,offset:0};
 assert.notDeepEqual(selectMealIdeas(input).meals,selectMealIdeas({...input,offset:3}).meals);
});

test('daytime and near-bedtime meals differ in serving format and explanations without changing diet filters', () => {
 for(const plantBased of [true,false]) {
  const input={plantBased,dairyFree:true,quick:false,offset:0};
  const day=selectMealIdeas({...input,phase:'daytime'}).meals;
  const night=selectMealIdeas({...input,phase:'evening'}).meals;
  assert.deepEqual(day.map(m=>m.id),night.map(m=>m.id));
  for(let i=0;i<day.length;i++) {
   assert.notEqual(day[i].title,night[i].title);
   assert.notEqual(day[i].ingredients,night[i].ingredients);
   assert.match(day[i].portion,/full meal/);
   assert.match(night[i].portion,/eat enough to satisfy/);
   assert.match(night[i].why,/usual bedtime/);
   assert.ok(night[i].preparation);
  }
 }
 const general=selectMealIdeas({phase:'general',plantBased:false,dairyFree:false,quick:false,offset:0});
 assert.ok(general.meals.every(m=>m.portion.includes('No time-based portion adjustment')));
});
test('mounted food card updates from daytime to bedtime as the clock advances', () => {
 let renderer;
 const text=n=>n.children.map(c=>typeof c==='string'?c:text(c)).join('');
 Renderer.act(()=>{renderer=Renderer.create(React.createElement(FoodGuidance,{profile,now:new Date('2026-10-03T02:59Z')}));});
 assert.match(text(renderer.root),/Daytime · based on your saved schedule/);
 assert.match(text(renderer.root),/Tuna & rice bowl/);
 Renderer.act(()=>renderer.update(React.createElement(FoodGuidance,{profile,now:new Date('2026-10-03T03:00Z')})));
 assert.match(text(renderer.root),/Near bedtime · based on your saved schedule/);
 assert.match(text(renderer.root),/Tuna & rice cup/);
 Renderer.act(()=>renderer.update(React.createElement(FoodGuidance,{profile:null,now:new Date('2026-10-03T03:00Z')})));
 assert.match(text(renderer.root),/General ideas · no timing adjustment/);
 assert.doesNotMatch(text(renderer.root),/Tuna & rice cup/);
 Renderer.act(()=>renderer.unmount());
});
