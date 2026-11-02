// Adapted from Cody Oakland’s published working recipes, read 2026-11-02.
// Quantities converted to ounces (weight) / US fluid ounces and rounded to 0.01.
// No nutritional analysis is inferred from these converted quantities.
export type MealSlot = "first" | "middle" | "last";
export type FoodRecipe = {id:string; title:string; slot:MealSlot; servings:number; minutes:number; ingredients:string[]; steps:string[]; source:string; allergens:string; dairyFree:boolean; produce:string[]; swap:string};
export const FOOD_RECIPES: FoodRecipe[] = [
  {
    "id": "potato-spinach-and-egg-skillet",
    "title": "Potato, spinach and egg skillet",
    "slot": "first",
    "servings": 2,
    "minutes": 35,
    "ingredients": [
      "10.58 oz raw russet potato, skin on, 1/2-inch cubes",
      "2.03 fl oz water",
      "2.12 oz raw trimmed onion, diced",
      "3.53 oz raw spinach",
      "7.05 oz shell-free eggs (about 4 large eggs)",
      "9.17 oz pasteurized liquid egg whites",
      "0.68 fl oz olive oil",
      "0.04 oz salt",
      "0.01 oz black pepper (optional)",
      "Whole-grain toast (optional extra)"
    ],
    "steps": [
      "Wash vegetables before cutting. Put the weighed potato cubes in a covered microwave-safe bowl with 1.01 fl oz water per serving. Microwave until just tender, about 6–9 minutes, stirring halfway; retain the small amount of cooking liquid for the skillet.",
      "Heat the measured oil in a large nonstick skillet over medium heat. Add onion and potatoes with any cooking liquid. Cook 6–8 minutes until onion softens and potatoes begin to color; avoid draining away oil or solids.",
      "Add spinach and wilt for about 2 minutes. Whisk whole eggs, whites, salt and optional pepper; lower heat and fold them into the vegetables until set and 160°F/71°C throughout. Divide all contents equally between two plates. Toast is an optional extra outside this estimate."
    ],
    "source": "https://codyoakland.com/recipe/potato-spinach-and-egg-skillet/",
    "allergens": "Egg; optional toast may contain wheat",
    "dairyFree": true,
    "produce": [
      "spinach",
      "potatoes",
      "onions"
    ],
    "swap": "Try chopped chard instead of spinach; cook the stems first until tender, then add the leaves."
  },
  {
    "id": "salmon-cucumber-and-warm-rice-breakfast-bowls",
    "title": "Salmon, cucumber and warm rice breakfast bowls",
    "slot": "first",
    "servings": 2,
    "minutes": 45,
    "ingredients": [
      "9.88 oz Canned salmon",
      "3.35 oz White rice (dry)",
      "7.05 oz Cucumber",
      "1.06 oz Scallions",
      "3.53 oz shell-free eggs (about 2 large eggs)",
      "1.18 fl oz Olive oil",
      "0.68 fl oz Soy sauce",
      "Water for rice: 8.45 fl oz, or package directions",
      "Optional seasonings to taste"
    ],
    "steps": [
      "Wash the cucumber and scallions, then dice or slice them. Open the ready-to-eat canned pink salmon and retain all edible natural liquid with the fish. Check carefully for any unwanted fragments; no drained-fish weight is assumed.",
      "Cook the 3.35 oz dry long-grain white rice with 8.45 fl oz water, or the package-directed quantity, covered until tender, about 15–20 minutes. Rest covered 5 minutes. Do not discard edible cooked rice or cooking liquid; if the package requires rinsing, any nutrient loss from rinse water is unquantified.",
      "Whisk the two whole eggs. Heat 0.34 fl oz of the measured oil in a nonstick skillet, add eggs and stir gently until fully set and 160°F/71°C. Transfer all cooked egg to a clean dish.",
      "Put salmon and its natural juices in the skillet with the soy sauce. Heat gently until steaming throughout. Fold into the rice with the remaining 0.85 fl oz oil. Divide rice, salmon, juices and cooked egg equally between two bowls; top with half the cucumber and scallions each. The cucumber is intentionally served cool against the warm base."
    ],
    "source": "https://codyoakland.com/recipe/salmon-cucumber-and-warm-rice-breakfast-bowls/",
    "allergens": "Fish, egg, soy; soy sauce may contain wheat",
    "dairyFree": true,
    "produce": [
      "cucumber",
      "scallions"
    ],
    "swap": "Use diced tomatoes instead of cucumber for a different cool topping."
  },
  {
    "id": "lemon-chicken-and-white-bean-salad",
    "title": "Chicken and chickpea salad with whole-wheat pita",
    "slot": "middle",
    "servings": 2,
    "minutes": 30,
    "ingredients": [
      "14.11 oz boneless skinless chicken breast (raw)",
      "3.53 oz Peeled & Steamed Chickpeas (Garbanzo Beans)",
      "1.98 oz Whole Wheat Pita",
      "5.64 oz ONE SWEET cucumbers",
      "6 oz Campari tomatoes",
      "0.98 fl oz Olive oil",
      "2 tsp Dijon mustard",
      "0.51 fl oz Red wine vinegar",
      "Water: 2.03 fl oz for chicken",
      "Optional parsley or lemon juice"
    ],
    "steps": [
      "Wash vegetables first. Dice 5.64 oz trimmed cucumber and 6 oz tomatoes, keeping edible tomato juices. Cut 14.11 oz fresh or safely thawed chicken into 1-inch pieces on a separate board.",
      "Place chicken and 2.03 fl oz water in a covered nonstick skillet. Cook at a gentle simmer for 8–12 minutes, stirring occasionally, until all pieces reach 170°F/77°C. Keep all pan juices.",
      "Whisk 0.98 fl oz oil,2 teaspoons Dijon and 0.51 fl oz red wine vinegar in a bowl. Fold in 3.53 oz ready-to-eat steamed chickpeas as packaged, cucumber, tomatoes and the warm chicken with all pan juices. Optional parsley or lemon juice is outside the estimate.",
      "Divide the entire salad evenly into 2 portions. Split one 1.98 oz whole-wheat pita into two halves and serve half with each salad. Eat immediately warm, or refrigerate promptly in shallow containers and keep cold until serving."
    ],
    "source": "https://codyoakland.com/recipe/lemon-chicken-and-white-bean-salad/",
    "allergens": "Wheat, mustard",
    "dairyFree": true,
    "produce": [
      "cucumber",
      "tomatoes"
    ],
    "swap": "Use diced bell pepper instead of cucumber for crunch."
  },
  {
    "id": "broccoli-and-cottage-cheese-baked-potatoes",
    "title": "Chicken, broccoli and cottage cheese baked potato bowls",
    "slot": "middle",
    "servings": 4,
    "minutes": 80,
    "ingredients": [
      "17.64 oz raw russet potatoes",
      "14.11 oz raw broccoli florets",
      "14.11 oz raw boneless skinless chicken breast",
      "2.03 fl oz water",
      "31.75 oz pasteurized 2% cottage cheese",
      "2.82 oz pasteurized sharp cheddar",
      "1.35 fl oz olive oil",
      "Salt, chives and black pepper (optional)"
    ],
    "steps": [
      "Heat the oven to 425°F/220°C. Scrub and dry the potatoes, prick with a fork, and bake plain without foil or the finishing oil for approximately 40–60 minutes, until a knife passes easily through the centers. Larger potatoes may need longer. Use 17.64 oz raw edible potato total.",
      "During the final 15 minutes, put the 14.11 oz chicken pieces and 2.03 fl oz water in a covered nonstick skillet over medium heat. Bring to a gentle simmer and cook for approximately 8–12 minutes, stirring occasionally and adding a splash of water if the pan dries. Check that the chicken reaches 170°F/77°C throughout, following the reference product’s cooking guidance. Reserve all pan juices to serve with the chicken; do not drain them. Temperature, not the estimated time, determines doneness.",
      "Meanwhile, steam the 14.11 oz trimmed broccoli over simmering water for approximately 5–7 minutes, until tender. Rest the baked potatoes for 5 minutes, then split or chunk them, retaining all edible skin.",
      "Divide all the potato, broccoli, chicken and chicken juices evenly among four bowls. Top each with 7.94 oz cottage cheese and 0.71 oz cheddar. Drizzle each bowl with 0.34 fl oz olive oil (2 measured 0.17 fl oz teaspoons). Serve immediately. The cottage cheese is a cool topping; no second bake is required. Add optional chopped chives or black pepper if desired; taste before salting. Added seasonings are outside the base nutrition estimate."
    ],
    "source": "https://codyoakland.com/recipe/broccoli-and-cottage-cheese-baked-potatoes/",
    "allergens": "Milk",
    "dairyFree": false,
    "produce": [
      "broccoli",
      "potatoes"
    ],
    "swap": "Steam cauliflower instead of broccoli until tender."
  },
  {
    "id": "salmon-and-lentil-spinach-patties-with-cucumber-yogurt",
    "title": "Salmon and lentil spinach patties with cucumber yogurt",
    "slot": "last",
    "servings": 4,
    "minutes": 75,
    "ingredients": [
      "29.98 oz skinless sockeye salmon (raw)",
      "7.05 oz Steamed Lentils",
      "7.05 oz Spinach",
      "1.76 oz large whole egg (shell-free)",
      "11.99 oz pasteurized plain nonfat Greek yogurt",
      "8.47 oz ONE SWEET cucumbers",
      "3 oz Panko Bread Crumbs",
      "2.68 oz extra-virgin olive oil",
      "Water as needed to wilt spinach",
      "Pepper, dill or lemon juice (optional)"
    ],
    "steps": [
      "Wash spinach and cucumber before handling fish. Wilt 7.05 oz spinach in a wide skillet with a small splash of water if needed. Cook until loose water evaporates; do not squeeze or drain. Cool 10 minutes, then chop finely.",
      "Use fresh salmon or safely refrigerator-thawed salmon. Remove fish from vacuum packaging before refrigerator thawing unless its package explicitly provides a different safe method. Finely chop 29.98 oz raw skinless sockeye salmon, checking carefully for bones. Mash 7.05 oz ready-to-eat steamed lentils as supplied, without draining, then mix gently with salmon, spinach,1.76 oz shell-free egg and 3 oz panko. Form 16 equal patties, roughly 3–3.17 oz each before cooking. Keep the raw mixture refrigerated while batches cook.",
      "Heat 0.85 oz of the measured oil in a large nonstick skillet over medium heat. Cook the first five or six patties for about 4–5 minutes per side, adjusting heat to avoid burning. Their centers must reach 165°F/74°C, a conservative endpoint for these fish-and-egg patties. Repeat in two more batches with 0.85 oz and 0.99 oz oil, using all measured oil and keeping cooked patties warm only briefly.",
      "Mix 11.99 oz plain nonfat Greek yogurt with 8.47 oz finely diced cucumber. Keep the sauce cold and away from raw-fish equipment. Do not drain the cucumber or add unmeasured mayonnaise.",
      "Serve four patties per person with one-quarter of the full cucumber-yogurt sauce and an equal share of edible cooked pan juices. Optional pepper, chopped dill or lemon juice is outside the defined estimate."
    ],
    "source": "https://codyoakland.com/recipe/salmon-and-lentil-spinach-patties-with-cucumber-yogurt/",
    "allergens": "Fish, egg, milk, wheat",
    "dairyFree": false,
    "produce": [
      "spinach",
      "cucumber"
    ],
    "swap": "Use finely chopped chard instead of spinach; cook until tender and let loose moisture evaporate before mixing."
  },
  {
    "id": "chickpea-and-broccoli-noodles-with-ginger",
    "title": "Chicken and chickpea bowls with broccoli and ginger noodles",
    "slot": "last",
    "servings": 2,
    "minutes": 40,
    "ingredients": [
      "17.11 oz boneless skinless chicken breast (raw)",
      "2.82 oz plain ready-to-eat steamed chickpeas",
      "1.23 oz dry rice noodles",
      "7.05 oz broccoli florets",
      "2.12 oz whole carrot",
      "0.21 oz fresh ginger",
      "0.14 oz garlic",
      "1.01 fl oz reduced-sodium soy sauce",
      "0.51 fl oz unseasoned rice vinegar",
      "0.17 fl oz toasted sesame oil",
      "1.42 fl oz neutral cooking oil",
      "Salt (optional)"
    ],
    "steps": [
      "Wash and prepare vegetables before raw chicken. Cook the weighed 1.23 oz dry rice noodles according to their package and drain. Mix soy sauce, vinegar, sesame oil and 1.01 fl oz water in a cup.",
      "Heat 0.71 fl oz neutral oil in a wide skillet. Cook chicken in uncrowded batches, turning until several thickest pieces reach 170°F/77°C, following the reference producer instruction. Transfer cooked chicken and juices to a clean bowl. Wash equipment that touched raw chicken.",
      "Add the remaining 0.71 fl oz neutral oil, broccoli and carrot to the skillet with 1.52 fl oz water. Cover until the vegetables begin to soften, then uncover and continue until tender enough for you. Stir in the ginger and garlic briefly without burning.",
      "Add steamed chickpeas, cooked noodles, chicken with its edible juices, and the measured sauce. Toss until hot throughout, adding only water if needed to loosen. Divide all components and sauce equally between two bowls. Do not discard oily cooking juices."
    ],
    "source": "https://codyoakland.com/recipe/chickpea-and-broccoli-noodles-with-ginger/",
    "allergens": "Soy, sesame; soy sauce may contain wheat",
    "dairyFree": true,
    "produce": [
      "broccoli",
      "carrots"
    ],
    "swap": "Use thinly sliced cabbage instead of broccoli; cook until tender before adding the noodles."
  }
];

// Shared by Today and Food: never substitute an incompatible recipe.
export function recipesForSlot(slot: MealSlot, preferences: {foodPreference?: 'omnivore'|'plant'; foodDairyFree?: boolean; foodQuick?: boolean}|null) {
  if (preferences?.foodPreference === 'plant') return [];
  return FOOD_RECIPES.filter(r => r.slot === slot && (!preferences?.foodDairyFree || r.dairyFree) && (!preferences?.foodQuick || r.minutes <= 30));
}
