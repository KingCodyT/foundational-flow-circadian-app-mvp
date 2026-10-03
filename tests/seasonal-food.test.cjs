const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-typescript.cjs');
const {seasonalFood, regionFromCoordinates, FOOD_REGIONS} = load('lib/seasonal/seasonal-food.ts');
const {selectMealIdeas} = load('lib/personalization/meal-ideas.ts');
const input={phase:'daytime',plantBased:false,dairyFree:true,quick:true,offset:0};
function context(region, date){return seasonalFood({foodRegion:region,timeZone:'America/New_York'},new Date(date));}
test('coordinates select actual states, both coasts, islands and no foreign nearest-state fallback',()=>{
 for(const [lat,lon,id] of [[37.77,-122.42,'NCA'],[34.05,-118.24,'SCA'],[40.71,-74.0,'NY'],[25.76,-80.19,'SFL'],[30.44,-84.28,'NFL'],[61.22,-149.9,'AK'],[21.31,-157.86,'HI'],[38.907,-77.037,'DC']]) assert.equal(regionFromCoordinates(lat,lon),id);
 for(const p of [[51.5,-.12],[0,0],[NaN,0],[91,0]]) assert.equal(regionFromCoordinates(...p),null);
});
test('permission, manual override, missing location and invalid timezone are respected',()=>{
 const now=new Date('2026-10-02T20:00Z');
 const profile={latitude:37.77,longitude:-122.42,locationPermissionGranted:false};
 assert.equal(seasonalFood(profile,now),null);
 assert.equal(seasonalFood({...profile,locationPermissionGranted:true},now).region,'NCA');
 assert.equal(seasonalFood({...profile,foodRegion:'NY'},now).region,'NY');
 assert.equal(seasonalFood({...profile,foodRegion:'fake'},now),null);
 assert.equal(seasonalFood({foodRegion:'NY',timeZone:'invalid'},now),null);
});
test('half-month and year transitions follow the saved timezone',()=>{
 const profile={foodRegion:'HI',timeZone:'Pacific/Honolulu'};
 assert.equal(seasonalFood(profile,new Date('2026-01-16T05:00Z')).period,1);
 assert.equal(seasonalFood(profile,new Date('2026-01-16T12:00Z')).period,2);
 assert.equal(seasonalFood(profile,new Date('2027-01-01T05:00Z')).period,24);
 assert.equal(seasonalFood(profile,new Date('2027-01-01T12:00Z')).period,1);
});
test('region and season actually change meal ingredients and explanations',()=>{
 const winter=context('NY','2026-01-05T18:00Z'), summer=context('NY','2026-07-05T18:00Z');
 assert.notDeepEqual(winter.vegetables,summer.vegetables);
 const meals=selectMealIdeas({...input,seasonal:summer});
 assert.equal(meals.seasonalApplied,true);
 assert.match(meals.meals[0].why,/New York · Early July/);
 assert.notDeepEqual(meals.meals,selectMealIdeas({...input,seasonal:winter}).meals);
 assert.notDeepEqual(context('HI','2026-01-05T18:00Z'),winter);
});
test('all regions and periods preserve filters, valid produce, and explicit empty-calendar fallback',()=>{
 assert.equal(FOOD_REGIONS.filter(r=>r.id.length===2).length,51);
 for(const region of FOOD_REGIONS) for(let period=1;period<=24;period++) {
  const season=context(region.id,`2026-${String(Math.ceil(period/2)).padStart(2,'0')}-${period%2?'05':'20'}T18:00Z`);
  for(const phase of ['early','daytime','evening','general']) for(const plantBased of [false,true]) {
   const result=selectMealIdeas({...input,phase,plantBased,seasonal:season,offset:3});
   assert.ok(result.meals.length>0);
   for(const meal of result.meals){
    assert.equal(meal.plantBased,plantBased);assert.equal(meal.dairyFree,true);assert.equal(meal.quick,true);
    if(result.seasonalApplied){assert.ok([...season.vegetables,...season.fruits].some(v=>meal.ingredients.toLowerCase().includes(v.toLowerCase())));assert.match(meal.why,/regional seasonal calendar/);}
   }
  }
 }
 const none={...context('AK','2026-01-05T18:00Z'),vegetables:[],fruits:[]};
 assert.equal(selectMealIdeas({...input,seasonal:none}).seasonalApplied,false);
});
