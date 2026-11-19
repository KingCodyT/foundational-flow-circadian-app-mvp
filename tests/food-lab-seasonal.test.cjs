const test=require('node:test'),assert=require('node:assert/strict'),load=require('./load-typescript.cjs');
const {FOOD_RECIPES,recipesForSlot}=load('lib/personalization/food-recipes.ts'),{FOOD_LAB_ADDITIONS,foodLabRecipesForSlot,seasonalRecipeMatches}=load('lib/personalization/food-lab-recipes.ts'),{seasonalFood}=load('lib/seasonal/seasonal-food.ts');
test('tied two-per-slot baseline gets three Food-only middle meals; Today stays exact',()=>{
 assert.deepEqual(['first','middle','last'].map(s=>FOOD_RECIPES.filter(r=>r.slot===s).length),[2,2,2]);assert.deepEqual(['first','middle','last'].map(s=>foodLabRecipesForSlot(s,null).length),[2,5,2]);
 for(const s of ['first','middle','last'])for(const p of [null,{foodDairyFree:true},{foodQuick:true},{foodPreference:'plant'}]){const existing=recipesForSlot(s,p);assert.deepEqual(foodLabRecipesForSlot(s,p).filter(r=>!r.original),existing);assert.equal(foodLabRecipesForSlot(s,p)[0]?.id,existing[0]?.id);}
 assert.equal(new Set([...FOOD_RECIPES,...FOOD_LAB_ADDITIONS].map(r=>r.id)).size,9);
});
test('original recipes complete, imperial, honest source and permitted ingredients',()=>{
 for(const r of FOOD_LAB_ADDITIONS){assert.equal(r.source,undefined);assert.equal(r.original,true);assert.equal(r.servings,2);assert.ok(r.ingredients.every(i=>/oz/.test(i)));assert.equal(r.steps.length,4);assert.ok(r.allergens&&r.swap);assert.doesNotMatch(JSON.stringify(r),/microwave|tofu|oats|seed oil|neutral oil/i);}
});
test('calendar badges match exact featured vegetables or fruit, never require a region to browse',()=>{
 const ca=seasonalFood({foodRegion:'CA'},new Date('2026-11-19T12:00:00Z'));assert.deepEqual(FOOD_LAB_ADDITIONS.map(r=>seasonalRecipeMatches(r,ca)),[['Winter Squash'],['Oranges'],['Carrots']]);
 const mismatch={...ca,vegetables:['Broccoli'],fruits:['Apples']};for(const r of FOOD_LAB_ADDITIONS){assert.deepEqual(seasonalRecipeMatches(r,mismatch),[]);assert.deepEqual(seasonalRecipeMatches(r,null),[]);}assert.equal(foodLabRecipesForSlot('middle',null).length,5);
});
test('new recipes retain accessible inline steps and no invented external recipe links',()=>{
 const React=require('react'),R=require('react-test-renderer'),{FoodRecipes}=load('components/food-recipes.tsx');let r;R.act(()=>r=R.create(React.createElement(FoodRecipes,{profile:{wakeTime:'07:00',targetBedtime:'22:00',timeZone:'UTC',foodRegion:'CA'},now:new Date('2026-11-19T13:00Z'),onPreferencesChange:()=>{throw Error('write')}})));
 const articles=r.root.findAllByType('article');assert.equal(articles.length,5);for(const a of articles.slice(2)){assert.equal(a.findByType('summary').children.join(''),'Ingredients & cooking steps');assert.equal(a.findAllByType('ol').length,1);assert.equal(a.findByType('a').props.href,'https://www.foodsafety.gov/food-safety-charts/safe-minimum-internal-temperatures');}R.act(()=>r.unmount());
});
