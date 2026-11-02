# Local Food recipe review — 2026-11-02

Base: 354ee9e, review/today-coaching-loop-local. Local only.

Implemented six recipes read directly from Cody Oakland’s public Recipe JSON-LD on 2026-11-02 (all six returned successfully). Source URLs are stored alongside each recipe. Two first-meal, two middle-meal and two last-meal choices. No tofu/oats in the collection. Ingredients/steps preserve original batch servings and temperatures, with grams converted to weight ounces and mL to US fluid ounces; conversions rounded to .01. Added clearly labeled produce swaps, allergy checks and source links. Recipes remain original working recipes, not kitchen-tested. No calculated app nutrition or asserted macro compliance.

Food now leads with recipes; growing-region education and reminder settings remain available below. Existing educational references retained. Local produce matching uses the existing regional calendar, not real-time availability. No background delivery changes.

Recipe selection is presentation-only: existing four-hour early/three-hour before-bed bands plus the saved last-meal cue (-30/+60 minutes), bounded by saved wake/sleep. Fixed overnight schedules use the same relative logic, with first/middle/last labels. Unknown/outside schedules allow browsing without implied missed meals. No engine, completion, progression, onboarding or notification changes. Manual slot browsing is transient and resets on navigation/reload; saved preferences remain persisted by the existing provider. Plant-based preferences are preserved with an explicit no-match message for this initial omnivore collection. Quick filter means <=30 minutes in the recipe collection; this can yield no results. Today’s existing meal-combination preview remains unchanged.

Validation:
- 479 non-browser tests passed (472 existing +7 recipe regression tests).
- 7 recipe tests repeated after content refinement; TypeScript passed.
- Next production build passed; minor final label/ingredient clarifications followed and were typechecked. Existing Browserslist age warning; standalone lint remains unconfigured, build lint/type phase passed.
- Actual Chrome at 320px: recipe selection, keyboard Enter expansion/collapse, visible ounce list and long-text wrapping. Back left the page; Forward returned to schedule default. No completion recorded by browsing (also covered by component regression).
- Actual Chrome at 390px: overview and expanded recipe visually inspected and screenshots saved.
- Isolated development-only food-review route: Day at6PM showed saved6PM last-meal cue; Overnight wake5PM/sleep9AM showed first-meal at6PM; Unknown showed browse guidance. Route left untracked/excluded from commit, production notFound.
- All six source URLs fetched successfully; outbound hrefs inspected. No notifications enabled/sent. Owner4181 storage not edited or reset. Existing synthetic4180 profile only used for UI rendering.
- Initial browser keyboard automation timed out before dispatch; recovered via fresh tab and native documented controls, then verified successful keyboard action. No unresolved blocker.

Limits: six recipes only, no plant-only recipes yet; no cooking validation or brand-specific recalculation; no actual local stock/harvest verification. Overnight schedule follows the saved fixed anchors and cannot infer changing shifts. Local server is not a friend-shareable release.

## Today reconciliation follow-up

Today previously used selectMealIdeas (generated seasonal/fixed combinations including tofu/oats) and foodGuidancePhase (overnight => general). It now uses the same recipeWindow and recipesForSlot functions as Food. Saved dietary filters apply identically, including honest empty states. /food handoff uses the current saved schedule; crossing a timing boundary naturally recalculates, with no stored meal-slot override. MealNudge and all timing/completion engines are unchanged. Existing legacy FoodGuidance is retained but not used by the actual Food page or Today preview.

Source/quantity audit:
1. Potato, spinach and egg skillet — https://codyoakland.com/recipe/potato-spinach-and-egg-skillet/
2. Salmon, cucumber and warm rice breakfast bowls — https://codyoakland.com/recipe/salmon-cucumber-and-warm-rice-breakfast-bowls/
3. Chicken and chickpea salad with whole-wheat pita — https://codyoakland.com/recipe/lemon-chicken-and-white-bean-salad/
4. Chicken, broccoli and cottage cheese baked potato bowls — https://codyoakland.com/recipe/broccoli-and-cottage-cheese-baked-potatoes/
5. Salmon and lentil spinach patties with cucumber yogurt — https://codyoakland.com/recipe/salmon-and-lentil-spinach-patties-with-cucumber-yogurt/
6. Chicken and chickpea bowls with broccoli and ginger noodles — https://codyoakland.com/recipe/chickpea-and-broccoli-noodles-with-ginger/

Original Recipe JSON-LD was fetched from each URL and retained locally in /tmp/cody-food-sources.json. Source slugs differ from current titles for recipes3,4,6; the title/ingredients came from the current published content, not the slug. Audit script compared all86 gram/mL occurrences in original ingredient and instruction fields with converted values in the matching app recipe: no missing converted values. Formula: grams/28.349523125 for weight oz; mL/29.5735295625 for US fl oz; round to two decimal places. Examples:300g potato=10.58oz;850g salmon=29.98oz;60mL water=2.03fl oz;20mL oil=.68fl oz. The85–90g patty range was manually corrected to3–3.17oz (both range endpoints). Batch servings remain2/2/2/4/4/2; quantities are whole-recipe totals, not per-person portions. Egg counts were cross-checked against source instructions/notes. Teaspoons already in source remain teaspoons. No nutrition is recalculated from these rounded conversions. This verifies transcription/conversion, not kitchen yield or nutritional accuracy.

Follow-up validation:480/480 non-browser tests pass and TypeScript passes. Real390px Today preview opened Food with the same last-meal recipe/slot. Isolated actual browser rendered Today and Food side-by-side for day, overnight and unknown profiles with matching recipes/reasons. No owner state writes. New mobile screenshot Library ID:libfile_8b5862916d8881919cce3a2da433cb0a. Production build was passed in the immediately preceding Food implementation; not rerun for this selector/preview-only follow-up.
