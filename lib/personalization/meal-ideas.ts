import type { FoodGuidancePhase } from './food-guidance';
export type MealIdea = {
  id: string; title: string; ingredients: string; plantBased: boolean; dairyFree: boolean;
  early: boolean; quick: boolean; protein: string; carbs: string; fats: string; swap: string;
};
// Curated meal combinations, not recipes or calculated nutrient prescriptions.
export const MEAL_IDEAS: MealIdea[] = [
{"id": "egg-potato", "title": "Egg & potato bowl", "ingredients": "Eggs, cooked potatoes, spinach, and olive oil.", "plantBased": false, "dairyFree": true, "early": true, "quick": true, "protein": "Eggs", "carbs": "Potatoes", "fats": "Olive oil and egg yolks", "swap": "Swap spinach for tomatoes."},
{"id": "salmon-toast", "title": "Salmon & avocado toast", "ingredients": "Ready-to-eat cooked salmon, dairy-free whole-grain toast, and avocado.", "plantBased": false, "dairyFree": true, "early": true, "quick": true, "protein": "Salmon", "carbs": "Toast", "fats": "Salmon and avocado", "swap": "Swap toast for cooked potatoes."},
{"id": "tuna", "title": "Tuna & rice bowl", "ingredients": "Canned tuna, ready-cooked brown rice, cucumber, and olive oil.", "plantBased": false, "dairyFree": true, "early": false, "quick": true, "protein": "Tuna", "carbs": "Brown rice", "fats": "Olive oil", "swap": "Swap rice for cooked potatoes."},
{"id": "turkey", "title": "Turkey & avocado wrap", "ingredients": "Cooked turkey, a dairy-free whole-grain wrap, lettuce, and avocado.", "plantBased": false, "dairyFree": true, "early": false, "quick": true, "protein": "Turkey", "carbs": "Whole-grain wrap", "fats": "Avocado", "swap": "Swap lettuce for shredded carrots."},
  {id:'yogurt',title:'Yogurt & berry bowl',ingredients:'Plain Greek yogurt, oats, berries, and walnuts.',plantBased:false,dairyFree:false,early:true,quick:true,protein:'Greek yogurt',carbs:'Oats and berries',fats:'Walnuts',swap:'Swap berries for sliced apple.'},
  {id:'eggs',title:'Eggs & avocado toast',ingredients:'Eggs, dairy-free whole-grain toast, avocado, and fruit.',plantBased:false,dairyFree:true,early:true,quick:true,protein:'Eggs',carbs:'Toast and fruit',fats:'Avocado and egg yolks',swap:'Swap toast for leftover cooked potatoes.'},
  {id:'tofu-toast',title:'Tofu scramble & toast',ingredients:'Tofu, spinach, dairy-free whole-grain toast, and olive oil.',plantBased:true,dairyFree:true,early:true,quick:true,protein:'Tofu',carbs:'Whole-grain toast',fats:'Olive oil and tofu',swap:'Swap spinach for chopped tomatoes.'},
  {id:'soy-oats',title:'Soy oats & banana',ingredients:'Oats, unsweetened soy milk, banana, and peanut butter.',plantBased:true,dairyFree:true,early:true,quick:true,protein:'Soy milk and peanut butter',carbs:'Oats and banana',fats:'Peanut butter',swap:'Swap peanut butter for sunflower-seed butter.'},
  {id:'bean-toast',title:'White beans on toast',ingredients:'Cooked white beans, dairy-free whole-grain toast, tomato, and olive oil.',plantBased:true,dairyFree:true,early:true,quick:true,protein:'White beans',carbs:'Beans and toast',fats:'Olive oil',swap:'Swap white beans for chickpeas.'},
  {id:'chia',title:'Overnight soy & chia oats',ingredients:'Oats soaked in soy milk, chia seeds, and berries; prepare ahead.',plantBased:true,dairyFree:true,early:true,quick:false,protein:'Soy milk and chia seeds',carbs:'Oats and berries',fats:'Chia seeds',swap:'Swap berries for diced pear.'},
  {id:'chicken',title:'Chicken & rice bowl',ingredients:'Cooked chicken, ready-cooked brown rice, vegetables, and olive oil.',plantBased:false,dairyFree:true,early:false,quick:true,protein:'Chicken',carbs:'Brown rice',fats:'Olive oil',swap:'Swap rice for a cooked potato.'},
  {id:'salmon',title:'Salmon & potatoes',ingredients:'Baked salmon, potatoes, and green vegetables.',plantBased:false,dairyFree:true,early:false,quick:false,protein:'Salmon',carbs:'Potatoes',fats:'Salmon',swap:'Swap potatoes for brown rice.'},
  {id:'tofu-rice',title:'Tofu & vegetable bowl',ingredients:'Tofu, ready-cooked brown rice, vegetables, and olive oil.',plantBased:true,dairyFree:true,early:false,quick:true,protein:'Tofu',carbs:'Brown rice',fats:'Olive oil and tofu',swap:'Swap rice for ready-cooked quinoa.'},
  {id:'lentil',title:'Lentil & quinoa bowl',ingredients:'Cooked lentils, ready-cooked quinoa, tomatoes, cucumber, and olive oil.',plantBased:true,dairyFree:true,early:false,quick:true,protein:'Lentils and quinoa',carbs:'Quinoa and lentils',fats:'Olive oil',swap:'Swap cucumber for cooked zucchini.'},
  {id:'chickpea',title:'Chickpea & tahini wrap',ingredients:'Chickpeas, a dairy-free whole-grain wrap, vegetables, and tahini.',plantBased:true,dairyFree:true,early:false,quick:true,protein:'Chickpeas and tahini',carbs:'Chickpeas and wrap',fats:'Tahini',swap:'Swap tahini for olive oil and lemon.'},
  {id:'bean-potato',title:'Loaded bean potato',ingredients:'Baked potato, black beans, salsa, and avocado.',plantBased:true,dairyFree:true,early:false,quick:false,protein:'Black beans',carbs:'Potato and beans',fats:'Avocado',swap:'Swap black beans for lentils.'},
];
export type SuggestedMeal = MealIdea & { portion: string; why: string; preparation: string };
// Serving formats for comfort near bedtime, not metabolically optimal macro ratios.
const eveningVersions: Record<string, { title: string; ingredients: string; preparation: string }> = {
  tuna: { title: 'Tuna & rice cup', ingredients: 'Canned tuna, cooked brown rice, cucumber, and a drizzle of olive oil.', preparation: 'Combine the tuna and rice in a small bowl; add cucumber and olive oil.' },
  turkey: { title: 'Turkey & avocado half-wrap', ingredients: 'Cooked turkey, half a dairy-free whole-grain wrap, lettuce, and avocado.', preparation: 'Fill half a wrap with turkey, lettuce, and avocado. Make more if you need a fuller meal.' },
  chicken: { title: 'Small chicken & rice bowl', ingredients: 'Cooked chicken, brown rice, cooked vegetables, and a drizzle of olive oil.', preparation: 'Warm the cooked chicken, rice, and vegetables; finish with olive oil.' },
  salmon: { title: 'Salmon & potato small plate', ingredients: 'Baked salmon, cooked potato, and green vegetables.', preparation: 'Serve the baked salmon with potato and vegetables on a small plate; adjust to your appetite.' },
  'tofu-rice': { title: 'Small tofu & rice bowl', ingredients: 'Tofu, cooked brown rice, cooked vegetables, and a drizzle of olive oil.', preparation: 'Warm the tofu with cooked rice and vegetables; finish with olive oil.' },
  lentil: { title: 'Warm lentil & quinoa cup', ingredients: 'Cooked lentils, cooked quinoa, cooked zucchini, and a drizzle of olive oil.', preparation: 'Warm the lentils, quinoa, and zucchini together, then add olive oil.' },
  chickpea: { title: 'Chickpea & tahini half-wrap', ingredients: 'Chickpeas, half a dairy-free whole-grain wrap, vegetables, and tahini.', preparation: 'Mash the chickpeas and tuck into half a wrap with vegetables and tahini. Make more if you need it.' },
  'bean-potato': { title: 'Bean & potato small plate', ingredients: 'Baked potato, black beans, avocado, and optional salsa.', preparation: 'Top a portion of baked potato with warmed beans and avocado. Add salsa if it suits you.' },
};

function describeMeal(meal: MealIdea, phase: FoodGuidancePhase): SuggestedMeal {
  const sources = `Protein comes from ${meal.protein.toLowerCase()}, carbohydrates from ${meal.carbs.toLowerCase()}, and fats from ${meal.fats.toLowerCase()}.`;
  const base = { ...meal, preparation: `Combine the listed ingredients, using cooked or ready-to-eat components. ${meal.id === 'chia' ? 'Soak the oats and chia in soy milk in the refrigerator overnight, then add the berries.' : 'Cook any raw ingredients before assembling.'}` };
  if (phase === 'evening') return { ...base, ...eveningVersions[meal.id],
    swap: meal.id === 'lentil' ? 'Swap zucchini for cooked carrots.' : meal.swap,
    portion: 'If you only need a snack, start with a smaller serving of the whole combination. If you need dinner, eat enough to satisfy your hunger. Carbs and fats are still included.',
    why: `${sources} This smaller serving format offers an alternative to a heavy meal near your usual bedtime; it does not prescribe a different nutrient percentage.` };
  if (phase === 'early') return { ...base,
    portion: `Build a first meal around ${meal.protein.toLowerCase()}, with ${meal.carbs.toLowerCase()} alongside. Choose an amount that fits your appetite; you don’t need to force a large breakfast.`,
    why: `${sources} This breakfast-style combination includes protein as well as carbohydrates early in your waking day, without assigning either a special metabolic window.` };
  if (phase === 'daytime') return { ...base,
    portion: `Serve as a full meal with vegetables. Adjust ${meal.carbs.toLowerCase()} and the rest of the meal to your hunger and activity, rather than a fixed percentage.`,
    why: `${sources} This full-meal format fits the middle of your saved waking schedule. It is not a claim that these ingredients are only useful at this time.` };
  return { ...base,
    portion: 'Choose a meal-sized or snack-sized serving according to your hunger and activity. No time-based portion adjustment has been applied.',
    why: `${sources} This is a general balanced combination. We are not claiming a particular timing advantage without a usable waking schedule.` };
}

export function selectMealIdeas(input: {phase: FoodGuidancePhase; plantBased: boolean; dairyFree: boolean; quick: boolean; offset: number}) {
  const matches = MEAL_IDEAS.filter(m => m.early === (input.phase === 'early') && (m.plantBased === input.plantBased) && (!input.dairyFree || m.dairyFree) && (!input.quick || m.quick));
  if (!matches.length) return { total: 0, meals: [] as SuggestedMeal[] };
  const start = ((input.offset % matches.length) + matches.length) % matches.length;
  return { total: matches.length, meals: Array.from({length:Math.min(3,matches.length)},(_,i)=>describeMeal(matches[(start+i)%matches.length], input.phase)) };
}
