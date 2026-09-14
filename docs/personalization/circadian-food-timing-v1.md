# Circadian Food Engine — Timing v1

## Product boundary

Timing v1 answers one narrow question:

> When did food enter the user's biological day?

It does not score food quality, count calories or macros, prescribe a fasting window, infer meal composition, require a wearable, or create a second coaching engine.

The Circadian Food Engine remains subordinate to the existing Foundational Flow personalization and coaching architecture.

## Product principle

Daily experience stays simple. Science remains available on demand.

**DO → UNDERSTAND → GO DEEPER**

Timing v1 produces timing evidence and circadian relationships. The existing coaching system decides whether anything is worth surfacing.

## Inputs

### Direct intentional evidence

- `MEAL_STARTED` — the user explicitly indicates that eating has begun.
- `NOT_YET` — intent/context only; not evidence that a meal occurred.
- `EATING_LATER` — intent/context only; not evidence that a meal occurred.

Timing v1 deliberately gives direct user evidence semantic priority. `NOT_YET` and `EATING_LATER` must never be converted into a meal event.

### Biological anchors

Where known:

- wake time
- observed morning-light time
- sunset
- darkness transition
- target sleep time

Missing anchors remain unknown. The engine must not manufacture relationships from absent data.

## Derived relationships

For each observed meal, Timing v1 can calculate:

- minutes from wake
- minutes from observed morning light
- minutes from sunset
- minutes from darkness transition
- minutes before target sleep

Across multiple meals in the same interpreted day it can also derive:

- first observed meal
- last observed meal
- eating-span duration
- observed meal count

These are descriptive relationships, not scores.

## Non-goals

Timing v1 must not:

- label a meal `good` or `bad`
- encode a universal breakfast requirement
- encode a universal clock-time dinner cutoff
- encode a universal 16:8 or other fasting rule
- infer that earlier is always better
- recommend skipping a meal because an ideal window passed
- treat one late meal as longitudinal mismatch
- treat constraints as noncompliance
- infer meal composition
- infer calories or macros
- infer metabolic state from a wearable score
- create independent intervention, notification, confidence, or progression logic

## Architecture

```text
Solar / environmental context
            +
Wake / morning-light / sleep anchors
            +
Direct meal-timing evidence
            ↓
Circadian Food Timing v1
(descriptive timing relationships only)
            ↓
Existing longitudinal evidence / personalization system
            ↓
Existing Coaching Decision Engine
            ↓
Voice / delivery / NOW / RHYTHM / YOU
```

The Food Timing layer describes reality. It does not decide what deserves coaching.

## Initial UX contract

The lowest-friction client actions are intentionally small:

- **I'm eating** → direct meal-timing evidence
- **Not yet** → intent/context
- **Eating later** → intent/context / constraint adaptation opportunity

A user should receive meaningful Timing v1 value without photographing food, scanning barcodes, counting macros, or opening a traditional food diary.

## Surface behavior

### NOW

May use Timing v1 context to support a concise action when the existing coaching engine determines food timing matters now.

### RHYTHM

May place first meal, midday meal context, last meal, sunset, darkness, and sleep in the same biological-day sequence.

### YOU

May summarize longitudinal meal-timing patterns only after repeated credible evidence exists. No streaks, scores, or shame states.

## Science-depth boundary

The daily recommendation stays brief. Optional explanation can expand through:

1. **DO** — the action/context that matters now.
2. **UNDERSTAND** — plain-language explanation of why biological timing changes meal context.
3. **GO DEEPER** — optional physiology/evidence detail such as glucose tolerance, insulin sensitivity, beta-cell responsiveness, peripheral clocks, digestive timing, and melatonin-related mechanisms where the evidence supports the explanation.

Mechanistic plausibility alone must not become a coaching rule.

## Future extensions — not Timing v1

Potential later work, each requiring its own evidence gate:

- meal size distribution across the biological day
- carbohydrate placement
- protein distribution
- fat handling
- post-meal movement
- seasonal / latitude adaptation
- travel and timezone meal adaptation
- optional wearable observations

Optional wearables may extend delivery and provide carefully qualified supporting observations, but Foundational Flow must never require a wearable for the complete experience.
