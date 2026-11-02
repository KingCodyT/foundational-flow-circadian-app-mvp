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
