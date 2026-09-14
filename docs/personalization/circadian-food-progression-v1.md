# Circadian Food Progression v1

## Purpose

Circadian Food Progression v1 lets repeated direct meal-timing evidence make coaching quieter as alignment becomes established, while allowing repeated recent drift to reopen coaching.

Progression remains:

`NEEDS_ATTENTION → DEVELOPING → ESTABLISHED`

Food does not get a separate coaching hierarchy.

## Evidence restraint

- Missing meal days are unknown, not failures.
- One aligned meal day cannot establish a signal.
- One late dinner cannot regress an established pattern.
- Three aligned observed days may support `NEEDS_ATTENTION → DEVELOPING`.
- Seven aligned observed days may support `DEVELOPING → ESTABLISHED`.
- Reopening requires at least two mismatch days among the four most recent observed meal days.
- Reopening moves a quieter state to `DEVELOPING`; it does not automatically declare `NEEDS_ATTENTION`.

These are conservative v1 internal progression guards. They are not client-facing universal nutrition prescriptions.

## Alignment observable

v1 uses last-meal separation from target sleep as its narrow progression observable: at least two hours before target sleep.

Sunset remains useful biological context, but it is not a binary meal cutoff. A meal after sunset may still count as aligned when it is well separated from target sleep. This avoids turning seasonal or latitude-driven sunset changes into false failure signals.

This is intentionally narrower than future Food Engine physiology. It does not score food quality, calories, macros, fasting duration, or meal composition.

## Architectural boundary

Food Progression may revise the coaching state of an existing Meal Timing signal. The existing Foundational Flow system still owns:

- primary-target selection;
- hierarchy and severity override;
- confidence semantics;
- constraint adaptation;
- intervention eligibility;
- Voice;
- notifications and delivery.

The goal is not more food coaching. The goal is earned silence when meal timing is being handled.
