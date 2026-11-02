import { useState } from 'react';
import type { DailyProfile } from '@/types/circadian';
import { recipesForSlot, type MealSlot } from '@/lib/personalization/food-recipes';
import { recipeWindow } from '@/lib/personalization/recipe-window';
import { seasonalFood } from '@/lib/seasonal/seasonal-food';
import { JourneyCard } from './journey-design';
const labels:Record<MealSlot,string>={first:'First meal',middle:'Middle meal',last:'Last meal'};
export function FoodRecipes({profile,now,onPreferencesChange}:{profile:DailyProfile|null;now:Date;onPreferencesChange:(p:Partial<DailyProfile>)=>void}) {
 const timing=recipeWindow(profile,now);
 const [selection,setSelection]=useState<MealSlot|null>(null);
 const slot=selection??timing.slot??'first';
 const season=seasonalFood(profile,now);
 const recipes=recipesForSlot(slot, profile);
 const plant=profile?.foodPreference==='plant';
 return <JourneyCard className="food-recipes">
  <p className="recipe-eyebrow">Meals for your waking day</p>
  <h2>{selection || !timing.slot ? `Plan your ${labels[slot].toLowerCase()}` : `${labels[slot]} ideas for now`}</h2>
  <p>{selection ? 'You’re browsing this meal slot. Your saved schedule and reminders stay the same.' : timing.reason}</p>
  {timing.schedule && <p className="food-idea-note">{timing.schedule}</p>}
  <p className="food-idea-note">Pick a recipe, check the ingredients, then open the steps. No meal logging needed.</p>
  <div className="recipe-slots" role="group" aria-label="Browse meal slots">
   {(Object.keys(labels) as MealSlot[]).map(key=><button key={key} type="button" aria-pressed={slot===key} onClick={()=>setSelection(key)}>{labels[key]}</button>)}
  </div>
  <p className="food-idea-note">Meal slots follow your waking day, including overnight schedules.</p>
  {selection && <button className="journey-outline" onClick={()=>setSelection(null)}>Use my schedule</button>}
  <details className="recipe-filters"><summary>Food preferences</summary>
   <label>Food preference<select value={profile?.foodPreference??'omnivore'} onChange={e=>onPreferencesChange({foodPreference:e.target.value as 'plant'|'omnivore'})}><option value="omnivore">Omnivore</option><option value="plant">Plant-based</option></select></label>
   <label><input type="checkbox" checked={profile?.foodDairyFree??false} onChange={e=>onPreferencesChange({foodDairyFree:e.target.checked})}/> No dairy ingredients</label>
   <label><input type="checkbox" checked={profile?.foodQuick??false} onChange={e=>onPreferencesChange({foodQuick:e.target.checked})}/> 30 minutes or less</label>
  </details>
  {plant ? <p role="status">This first recipe collection includes animal foods. Your plant-based preference is still saved; we haven’t substituted an incompatible recipe.</p> : recipes.length ? <div className="recipe-list">{recipes.map(recipe=>{
   const matches=season?.vegetables.filter(v=>recipe.produce.some(p=>p.toLowerCase()===v.toLowerCase()))??[];
   return <article key={`${slot}:${recipe.id}`} className="recipe-card">
    <p className="recipe-eyebrow">{recipe.minutes} min · makes {recipe.servings} servings</p>
    <h3>{recipe.title}</h3>
    <p>{slot==='first'?'A protein-and-produce first meal.':slot==='middle'?'A full meal for a break in your waking day.':'A complete last-meal option; adjust the serving to your hunger.'} These foods can fit other times too.</p>
    {matches.length>0 && <p className="food-idea-note">{matches.join(', ')}: listed for {season!.regionName}, {season!.periodLabel}. Check local growers for actual availability.</p>}
    <details><summary>Ingredients & cooking steps</summary>
     <p><strong>Whole recipe · {recipe.servings} servings.</strong> Divide evenly to serve. Ounces are weight; fl oz are US volume. Conversions are approximate.</p>
     <ul>{recipe.ingredients.map((item,i)=><li key={i}>{item}</li>)}</ul>
     <ol>{recipe.steps.map((step,i)=><li key={i}>{step}</li>)}</ol>
     <p><strong>Check before cooking:</strong> {recipe.allergens}. Check every package and cross-contact guidance for your allergies; this is not an allergy-safe certification.</p>
     <p><strong>Simple swap:</strong> {recipe.swap} Swaps change the original recipe; check any replacement for your allergies.</p>
     <p><strong>Make it local:</strong> Choose the listed produce from a nearby grower when available. A different vegetable may need a different cooking time; swaps change the recipe and its nutrition.</p>
     <p className="food-idea-note">Cody’s original working recipe—not kitchen-tested. Times are estimates. This app does not calculate recipe nutrition.</p>
     <a href={recipe.source} target="_blank" rel="noreferrer">Full recipe & source notes (new tab)</a>
    </details>
   </article>;
  })}</div> : <p role="status">No recipes in this meal slot match those filters yet. Try another slot or change a filter; your preferences won’t be ignored.</p>}
  <p className="food-idea-note">Next: cook what fits your plans. Browse another meal slot whenever you need it—opening a recipe doesn’t record a meal.</p>
  <details><summary>Meal templates & recipe limits</summary><p>Planning targets, in protein/fat/carbohydrate order: first meal 30/40/30, middle meal 40/35/25, last meal 40/40/20. These are design targets, not verified nutrition for the portions shown or a requirement for every meal. Ingredient brands, swaps and portions change the result.</p></details>
 </JourneyCard>;
}
