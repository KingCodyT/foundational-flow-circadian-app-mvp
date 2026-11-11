# Sunlight now
Visible Today section using the existing shared clock, location and SPECTRL2 lookup. No changes to homepage, onboarding or accepted coaching focus. Four grouped bands and body explanations with clear modeled-versus-measured labeling, night/twilight/location/polar states, and existing time-slider explorer. Removed the old nested duplicate explorer from LightCheckIn.

Sources checked: pvlib 0.13.0 SPECTRL2 documentation; WHO ultraviolet-radiation fact sheet; NIH circadian-rhythms fact sheet; Liu et al. 2014 controlled UVA study (PubMed 24445737). No claims of personal dose, UV Index, vitamin D quantity, or universal frequency switching times.

Validation: TypeScript and production build passed; 483 non-browser tests passed, including new rendering states and existing independent model-reference fixtures. Lint remains interactive setup, not passed. Visual browser checks blocked by Chromium socket restriction and cloud-browser inability to reach executor-local server. No production deployment or remote push performed.
