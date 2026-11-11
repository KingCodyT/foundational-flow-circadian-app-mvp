# Sunlight now
Visible Today section using the existing shared clock, location and SPECTRL2 lookup. Initial implementation left homepage, onboarding and accepted coaching focus unchanged; returning-home behavior is revised below. Four grouped bands and body explanations with clear modeled-versus-measured labeling, night/twilight/location/polar states, and existing time-slider explorer. Removed the old nested duplicate explorer from LightCheckIn.

Sources checked: pvlib 0.13.0 SPECTRL2 documentation; WHO ultraviolet-radiation fact sheet; NIH circadian-rhythms fact sheet; Liu et al. 2014 controlled UVA study (PubMed 24445737). No claims of personal dose, UV Index, vitamin D quantity, or universal frequency switching times.

Validation: TypeScript, production build and 486 non-browser tests pass, including new dashboard states and existing independent model-reference fixtures. Lint remains interactive setup, not passed. Initial preview passed desktop browser checks. Revised preview QA follows remote update. Mobile viewport testing is unavailable in this browser tool. Draft PR25 only; no production deployment or merge.

## Dashboard revision
Cody clarified that completed users need a live personalized home, not a website to explore. Today now leads with local clock, solar phase, sunrise/sunset, saved wake/bed, immediate light/food/movement options and visible spectral bands. Learning and time exploration remain optional. Completed returning users opening / route to Today; the first-visit welcome remains unchanged. Accepted-focus and event-record logic are unchanged; options do not imply a new target, logged completion or measured sleep. Shift/overnight, missing location, night/twilight and polar states remain explicit.
