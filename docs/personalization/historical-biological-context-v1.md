# Historical Biological Context v1

## Purpose

Historical Biological Context v1 prevents new longitudinal evidence from being reinterpreted against a later profile.

When meal timing evidence is created, Foundational Flow now stores the biological context that existed at that moment:

- captured timestamp;
- timezone;
- latitude and longitude when available;
- wake anchor;
- morning-light anchor;
- sunrise;
- sunset;
- target sleep anchor.

## Product rule

History should remain history.

Changing wake time, bedtime, location, timezone, or season later must not rewrite the biological meaning of evidence that was already captured.

## Interpretation precedence

For evidence with a stored historical context:

`stored historical context → relationship calculation`

For legacy evidence that predates this feature:

`current reconstructed anchors → fallback only`

The fallback preserves compatibility with existing local data, but it is not treated as equally trustworthy historical context.

## Architectural boundary

This is a context-persistence layer, not a second biological engine and not a Food-specific coaching engine. Food Timing is the first consumer because its longitudinal interpretation exposed the need clearly.

The same pattern can later support other evidence domains that depend on historical biological context.

## What this does not do

v1 does not:

- infer missing past context;
- backfill old records with invented historical values;
- change primary-target hierarchy;
- alter severity, confidence, intervention eligibility, Voice, or notifications;
- create travel coaching;
- change timezone behavior globally.

Unknown historical context remains unknown rather than being fabricated.
