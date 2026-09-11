# Foundational Flow — Light Domain Personalization Spec

This document records the approved Light-domain personalization decisions from the recent review. This is a product/engineering specification only — do not implement any behavioral changes yet.

---

## Overview

This file captures the authoritative mapping between Audit questions in the Light domain and their intended personalization meaning. The Audit remains the source of user data; the rules engine (in `lib/flow-engine.ts`) will determine how to translate these signals into timed interventions. Changes recorded here are specification-only and must not be applied to the live questionnaire until coordinated with design and release.

---

## LIGHT DOMAIN

Q1 — Morning Light Timing Priority

- Existing question (do not change in live app):
  - “How soon after waking do you get outside or into bright natural light?”
- Keep the existing question and scoring.
- Personalization meaning:
  - Identifies **Morning Light Timing Priority**.
  - The assessment identifies the user's existing timing pattern, but the intervention timing must be computed by the rules engine using the user's `wakeTime`, location (latitude/longitude), actual sunrise, and current local solar conditions (sunrise, civil twilight, etc.).
  - Important behavior note for the rules engine (spec only): if a user wakes before sunrise, do not automatically instruct immediate outdoor sun exposure; morning outdoor exposure is optional pre-sunrise but the primary morning-light intervention should remain a solar-anchored `sunrise`/`morning light` event.

Q2 — Morning Light Exposure Priority

- Existing question (do not change in live app):
  - “How much bright morning light do you usually accumulate?”
- Keep the existing question and scoring.
- Personalization meaning:
  - Identifies **Morning Light Exposure Priority** (dose/exposure weakness).
  - Q1 (timing) and Q2 (dose) are distinct signals: Q1 expresses timing weakness; Q2 expresses exposure/dose weakness. The rules engine should treat them separately when generating guidance.
  - The rules engine should not prescribe a fixed stopwatch duration solely from the Audit; instead, use the Audit as an initialization signal and compute context-aware guidance (duration suggestions, progressive dosing) based on solar conditions and user constraints.

Q3 — Morning Movement Optimization

- Existing question (do not change in live app):
  - “How often do you pair morning light with a walk or light movement?”
- Keep the existing question and scoring.
- Personalization meaning:
  - This is a **secondary optimization** signal. Movement can amplify the morning-light effect but should be layered onto an established morning-light behavior rather than presented as an equal-priority requirement for users who lack consistent morning light.

Q4 — Evening Light Transition Priority

- Existing question (do not change in live app):
  - “How much do you dim lights in the final 2 to 3 hours before bed?”
- Keep the existing question and scoring for now.
- Personalization meaning:
  - Identifies **Evening Light Transition Priority**.
  - Interventions should be anchored to **actual sunset/darkness** (location, season, solar timing) rather than an arbitrary countdown from bedtime. The rules engine should compute evening transition timing using solar times and bedtime together.

Q5 — Evening Artificial Light Priority (Specification wording change)

- SPECIFICATION: Change the specification question wording (do not change the live questionnaire yet).
  - New specification wording:
    - “How often do you reduce or avoid bright screen exposure after sunset, especially as bedtime approaches?”
- Approved answers & scoring (retain current scoring):
  - Consistently — 100
  - Often — 75
  - Sometimes — 45
  - Rarely — 15
  - Weight: 1.1
- Personalization meaning:
  - Identifies **Evening Artificial Light Priority** (screens and close-range devices).
  - This is subordinate to the broader evening-light environment (Q4). If both Q4 and Q5 are weak, the app should consolidate into a single evening-light intervention rather than produce duplicate notifications. If Q4 is strong and Q5 is weak, address screens as the remaining specific issue.

Q6 — Sleep Environment Priority (Specification wording change)

- SPECIFICATION: Change the specification question wording (do not change the live questionnaire yet).
  - New specification wording:
    - “How dark is your bedroom while you sleep?”
- Keep existing answers, scoring, and weight.
- Personalization meaning:
  - Identifies **Sleep Environment Priority** (environmental correction).
  - This is primarily a one-time environmental correction issue rather than a recurring timed-notification. Once the problem is resolved, the app should not continue to nag daily about it.

---

## GLOBAL PERSONALIZATION PRINCIPLES (Light-review)

1. Assessment identifies problems; the rules engine determines today's intervention.
2. A weak Audit score does not automatically produce a notification or intervention — biological priority and sequencing matter.
3. Related weak signals should be consolidated into the smallest number of meaningful interventions rather than many overlapping notifications.
4. Some findings require daily timing guidance; others require one-time or occasional environmental correction.
5. The mobile experience should behave as a circadian companion, not a checklist.
6. The app must follow the user's timezone/location and recalculate solar/timing guidance as the user moves.
7. Assessment data initializes personalization; users should not need to repeat the Audit for daily app usage.

---

## Implementation notes (for future engineering work — read-only)

- Do not implement these rules yet. This file is a specification to guide future changes to the rules engine, notification logic, and UI.
- When implementing, ensure:
  - Temporal vs. user-action state remains separate (do not auto-mark actions Done/Missed when windows pass).
  - Only the rules engine uses profile + solar data to compute intervention times.
  - Consolidation logic merges related evening-light problems into minimal interventions.

---

Document created: Light-domain personalization decisions (Audit-derived). See `lib/questionnaire.ts` for the live Audit questions and scoring.

---

# FOUNDATIONAL FLOW PERSONALIZATION & COACHING ARCHITECTURE (SOURCE-OF-TRUTH)

This document is now the canonical product/engineering specification for Foundational Flow personalization and coaching architecture. It preserves the question-level mappings and locked Light-domain revisions previously recorded above. The content that follows is LOCKED architecture (documentation-only) and must not be implemented without a coordinated engineering/design plan.

All changes here are documentation-only. Do not modify runtime code, `lib/questionnaire.ts`, `lib/scoring.ts`, the rules engine, UI components, or scoring behavior as part of this change.

---

## 1. PRODUCT PHILOSOPHY

Foundational Flow is a circadian companion, not a habit tracker.

The system follows the person’s biological day using:
- local time
- timezone
- location when permitted
- sunrise
- sunset
- darkness
- day length
- season
- wake target
- bedtime target
- meaningful context changes

No wearable integrations. Ever.

The system must never infer that a human behavior occurred merely because a biological or clock-time window occurred. Environmental occurrence ≠ human behavior.

The long-term intelligence loop is:

ASSESS → PERSONALIZE → GUIDE → LEARN → ADAPT

Website assessment and mobile app are one intelligence system.

---

## 2. BIOLOGICAL PRIORITY HIERARCHY (LOCKED)

1. Morning Light / Circadian Anchor
2. Daytime Light Environment
3. Evening Light → Sunset → Darkness
4. Sleep Opportunity / Timing
5. Optimization Layers
6. Meal Timing

Optimization Layers include secondary behaviors such as movement pairing, screens, environmental refinements, and other secondary optimizations. Meal Timing is downstream of the first five layers.

Context and constraints are NOT hierarchy rungs — they modify what is possible across the hierarchy. Outcome signals are NOT hierarchy rungs — they provide supporting evidence about upstream mismatches.

Conceptual model:

CONTEXT → INPUTS → BEHAVIOR → OUTCOMES → ADAPTATION

Among multiple Needs Attention signals, biological hierarchy outranks raw numerical severity. A strong/established higher-level signal does not block movement down the hierarchy.

---

## 3. DATA CLASSIFICATION (LOCKED)

Assessment information must be classified as one of:

- BEHAVIOR — Can receive a coaching state.
- OUTCOME — Provides supporting/diagnostic evidence but does not prove causation.
- CONTEXT / CONSTRAINT — Modifies recommendations and feasibility. Constraint ≠ noncompliance.
- DERIVED ENVIRONMENT — Calculated by the system when reliable rather than asking the user to estimate it (latitude, season, sunrise, sunset, darkness, day length).

Environmental reality is context, not behavior.

---

## 4. COACHING STATES (LOCKED)

Locked behavioral coaching states:

- NEEDS ATTENTION — Meaningfully misaligned and deserving active coaching.
- DEVELOPING — Improving but not sufficiently stable. Coaching begins backing off.
- ESTABLISHED — Sufficiently stable that active coaching is no longer providing meaningful value. Established does NOT mean perfect.
- DISRUPTED — Temporary contextual state for an Established signal that needs renewed attention because circumstances materially changed.

Typical progression: NEEDS ATTENTION → DEVELOPING → ESTABLISHED. DISRUPTED is temporary and leads back to ESTABLISHED after re-stabilization.

Do not treat disruption as failure or restart the person as a beginner.

---

## 5. DAY 1 ENGINE (LOCKED)

Day 1 pipeline:

Assessment → Classify Evidence → Assign Coaching States → Apply Context & Constraints → Walk Foundational Flow Hierarchy → Select Primary Coaching Target → Generate Personalized Guidance

Rules:
- Needs Attention outranks Developing when selecting the active coaching target.
- Among multiple Needs Attention signals, biological hierarchy outranks raw numerical severity.
- Behavior produces coaching states; Outcome produces supporting evidence; Constraint produces modifiers; Derived environment produces conditions.
- DISRUPTED cannot be an initial Day 1 state.

---

## 6. DAY 2+ ENGINE (LOCKED)

Ongoing coaching loop: WAKE → ORIENT → GUIDE → OBSERVE → INTERPRET → ADAPT

Rules:
- The Day 1 Primary Coaching Target carries forward unless new evidence justifies a change.
- At each new local day, recalculate relevant environmental context.
- Today’s Flow events do NOT automatically generate notifications.
- Guidance is delivered only when biologically relevant and useful.
- Environmental occurrence must never auto-complete human behavior.
- No wearables.

Behavioral learning comes from assessment, minimal intentional human feedback, and system-derived context. Do not turn the experience into a daily checklist.

---

## 7. CONFIDENCE MODEL (LOCKED)

Each behavioral signal has:
- COACHING STATE (Needs Attention / Developing / Established / Disrupted)
- CONFIDENCE (internal certainty that the current coaching state remains accurate)

Confidence is internal and must not be gamified or exposed as a consumer score. Confidence does not decay merely because a fixed timer elapsed. Time can make evidence stale; uncertainty becomes operationally important when it affects a coaching decision.

Three reconsideration triggers:
1. Evidence becomes stale because coaching may have changed the original behavior.
2. Context materially changes.
3. The engine reaches a decision point.

Examples of material context: timezone/location change, meaningful wake-time change, meaningful bedtime change, schedule change, meaningful seasonal/day-length change.

---

## 8. QUESTION ELIGIBILITY (LOCKED)

Foundational Flow asks a question only when the answer could meaningfully change what it does next. A feedback question is eligible when uncertainty is meaningful, a coaching decision is approaching, and the answer could change that decision.

Never ask for information the system can reliably derive. Questions should focus on human behavior the system cannot know.

Core flow: Evidence → Confidence → Decision Point → Ask Only If Necessary → Update State → Adapt Coaching

---

## 9. ADVANCEMENT ENGINE (LOCKED)

Established means FF has enough evidence that active coaching is no longer necessary. Rules:
1. Progress, not perfection.
2. Stability, not streaks.
3. Sufficient evidence, not completed tasks.
4. Established means coaching backs off but the signal remains in the model.
5. Advance by re-evaluating the hierarchy.

When the Primary Coaching Target becomes Established, find the next highest-priority meaningful weakness. Needs Attention outranks Developing.

---

## 10. INTERVENTION ENGINE (LOCKED)

Governing rule: intervene only when there is a meaningful biological reason, a relevant coaching target or meaningful disruption, and something useful and realistically actionable.

Every potential intervention checks: Biological relevance now; Coaching relevance; Actionability/feasibility; Added value/novelty; Interruption value.

Intervention levels: LEVEL 0 NOTHING, LEVEL 1 QUIET CONTEXT, LEVEL 2 GUIDANCE, LEVEL 3 TIMELY NUDGE, LEVEL 4 CONTEXTUAL ALERT.

Push notification eligibility is stricter than ordinary guidance. Notifications should back off when repeated unless evidence supports continued need.

---

## 11. INTERVENTION CONSOLIDATION (LOCKED)

Related weak signals should produce the smallest number of meaningful actions. Do not turn each assessment weakness into a separate card or notification. Prioritize Primary Coaching Target, then disruption of an Established foundational signal, then high-value contextual change, then Developing signals, then general information.

---

## 12. SILENCE IS AN OUTPUT (LOCKED)

If the person is doing well, nothing meaningful changed, and no useful decision or action is required, Foundational Flow should say nothing. Silence is an intentional output of the Intervention Engine.

---

## 13. ARCHITECTURAL LOOP (LOCKED)

Assessment Engine → Day 1 Engine → Day 2+ Engine → Confidence & Questioning → Advancement → Intervention → continued learning/adaptation

Overall: ASSESS → PERSONALIZE → GUIDE → LEARN → ADAPT

---

## 14. IMPLEMENTATION REVIEW — NOT YET IMPLEMENTED (DOCUMENTATION-ONLY)

This section lists conflicts, terminology that should be migrated, runtime behavior that likely reflects checklist assumptions, data structures the eventual implementation will likely require, and questions that remain unresolved. Do NOT resolve these issues in code here.

LOCKED / PROVISIONAL / FUTURE IMPLEMENTATION / UNRESOLVED distinctions should guide the migration.

### Conflicts or implementation gaps observed (documentation-only):
- `lib/questionnaire.ts` currently contains items the spec proposes to derive automatically rather than score (e.g., `season_daylight`, `location_latitude`). This conflicts with the "Derived Environment" principle and will require either deprecating those scored items or mapping them to derived fields.
- Several live questions combine multiple behaviors into one item (e.g., `day_meal_regular` currently conflates meal timing and activity blocks; `late_meals_stimulants` conflates late meals, alcohol, and stimulants). The spec recommends splitting these concepts. Scoring logic in `lib/scoring.ts` assumes existing question IDs and options; splitting questions will require migration and mapping to maintain historical comparability.
- `travel_schedule_variability` is presently a frequency score but the spec proposes a constraint-profile branching flow (travel, shift work, variable schedule). This structural change will require UI/UX flow updates and scoring model changes.
- The spec emphasizes that environmental items should not be penalized; existing scoring and UI components currently surface numeric scores per category (`scoreKey`) that may be consumed elsewhere (dashboards, protocols). Careful mapping and potential adjustment to downstream consumers will be needed.
- Historical behavior: prior iterations of the rules engine conflated temporal passage with user action (auto-marking missed/completed). Recent engine changes moved toward separating temporal vs user action state, but residual code paths or UI assumptions may still rely on earlier behavior. The implementation review must verify all places that consume event-state or progress counts.

### Terminology and migration items (documentation-only):
- Define canonical signal names and map `questionId` → `signalName` (e.g., `morning_light_timing` → `morning_light_timing`, `day_brightness` → `daytime_light_strength`).
- Define `coachingState` and `confidence` schemas per signal.
- Define `derivedEnvironment` schema for lat/long, sunrise/sunset/civil twilight, day length, season.

### Runtime behavior that may reflect checklist assumptions (documentation-only):
- Any code that auto-completes or auto-resolves events when temporal windows pass must be audited (the spec forbids auto-completion). Search for consumers of event state and progress counts.
- UI elements that present progress as a simple percent or checklist may need to be adjusted to reflect coaching states and explicit user actions only.

### Data structures likely required for implementation (documentation-only):
- Signal registry: list of signals, their sources (questionId, derived), and hierarchy rank.
- Per-signal coaching state + confidence + lastEvidenceAt + history.
- Derived environment store: lat/long, sunrise/sunset, civil twilight, day length, timezone.
- Constraint profile object: scheduleConstraint, environmentalControl, caregiving/travel flags.
- Event→signal mapping for Today's Flow and intervention generation.

### Questions intentionally unresolved (documentation-only):
- Migration strategy and timing for replacing scored `season_daylight` and `location_latitude` with derived environment fields.
- Historical comparability: how to preserve or map historical user scores if question IDs change or split.
- Specific thresholds for "meaningful" context changes (e.g., what counts as a meaningful wake-time change?).

---

Document updated as the source-of-truth for personalization architecture. This file must be reviewed and approved by product and engineering before any implementation work begins.


---

## DAYTIME ENVIRONMENT (Approved revisions)

DAYTIME Q1 — Daytime Light Strength Priority

- Existing question (do not change in live app):
  - “How bright is your work or daytime environment for most of the day?”
- APPROVED SPECIFICATION REVISION (spec only):
  - Change the specification wording to:
    - “How much natural daylight are you exposed to during most of your day?”
  - Approved provisional answers/scoring (spec only):
    - Strong natural daylight / frequently outdoors — 100
    - Good natural daylight / near windows much of the day — 75
    - Mostly indoors with limited natural daylight — 35
    - Almost entirely indoors with little natural daylight — 10
  - Keep weight provisionally at 1.3.
  - Do NOT change the live questionnaire yet.
- Personalization meaning:
  - Identifies **Daytime Light Strength Priority**.
  - Distinguish subjective "brightness" from biologically meaningful natural daylight; do not treat bright artificial indoor light as equivalent to outdoor or strong natural daylight.
  - If daytime natural light is already strong, the app should not generate unnecessary interventions. If daytime natural light is weak, daytime outdoor-light opportunities may be prioritized.

DAYTIME Q2 — Daytime Outdoor Exposure Priority

- Existing question (do not change in live app):
  - “How often do you take midday daylight breaks outdoors?”
- APPROVED SPECIFICATION REVISION (spec only):
  - Change the specification wording to:
    - “How often do you get outside for natural daylight during the daytime, beyond your morning light exposure?”
  - Keep existing answer structure and scoring provisionally (Daily / Several times weekly / Occasional / Almost never).
  - Keep weight provisionally at 1.0.
  - Do NOT change the live questionnaire yet.
- Personalization meaning:
  - Identifies **Daytime Outdoor Exposure Priority**. Interpret Q1 and Q2 together — a low Q2 should not force an intervention when Q1 is already strong.

DAYTIME Q3 — Meal Timing Regularity

- Existing question (do not change in live app):
  - “How regular are your daytime meals and activity blocks?”
- APPROVED SPECIFICATION REVISION (spec only):
  - Replace the combined concept with:
    - “How consistent is the timing of your meals from day to day?”
  - Approved provisional answers (Consistent / Often consistent / Sometimes consistent / Rarely consistent).
  - Keep weight provisionally at 0.7.
  - Do NOT change the live questionnaire yet.
- Personalization meaning:
  - Identifies **Meal Timing Regularity**. Do not conflate meal timing and daytime activity — separate behaviors may warrant different personalization decisions.

---

## SLEEP TIMING (Approved revisions)

SLEEP Q1 — Sleep-Wake Timing Stability

- Existing question (do not change in live app):
  - “How consistent are your bedtime and wake time across the week?”
- APPROVED SPECIFICATION REVISION (spec only):
  - Change the specification wording to:
    - “How much do your usual sleep and wake times vary from day to day?”
  - Approved provisional answers/scoring:
    - Usually within 30 minutes — 100
    - Usually within 1 hour — 75
    - Often varies by 1–2 hours — 45
    - Frequently varies by more than 2 hours — 15
  - Keep weight provisionally at 1.3.
  - Do NOT change the live questionnaire yet.
- Personalization meaning:
  - Identifies **Sleep-Wake Timing Stability**. Weak scores indicate timing instability that may require higher coaching priority, but avoid rigid clock-time commands.

SLEEP Q2 — Sleep Sufficiency Priority

- Existing question (do not change in live app):
  - “How often do you get enough total sleep for your body to feel restored?”
- APPROVED SPECIFICATION REVISION (spec only):
  - Change the specification wording to:
    - “How often do you get enough sleep to wake feeling physically and mentally restored?”
  - Keep existing answer structure/scoring and weight provisionally at 1.1.
  - Do NOT change the live questionnaire yet.
- Personalization meaning:
  - Identifies **Sleep Sufficiency Priority**. Treat as an outcome/diagnostic amplifier pointing to plausible upstream causes rather than a direct command to "sleep more".

SLEEP Q3 — Sleep Initiation Signal

- Existing question (do not change in live app):
  - “How easily do you fall asleep once you intend to sleep?”
- APPROVED SPECIFICATION REVISION (spec only):
  - Change the specification wording to:
    - “Once you intend to sleep, how long does it usually take you to fall asleep?”
  - Approved provisional answers/scoring:
    - Usually within 20 minutes — 100
    - Usually 20–40 minutes — 65
    - Often 40–60 minutes — 35
    - Often more than 60 minutes — 10
  - Keep weight provisionally at 0.8.
  - Do NOT change the live questionnaire yet.
- Personalization meaning:
  - Identifies **Sleep Initiation Signal**. Use as an outcome/diagnostic amplifier to prioritize plausible upstream mismatches rather than inventing causes.

---

## DISRUPTION LOAD (Approved structural revisions)

DISRUPTION Q1 — Schedule Constraint Profile

- Existing question (do not change in live app):
  - “How often do travel, shift work, or large schedule swings affect your week?”
- APPROVED STRUCTURAL REVISION (spec only):
  - Do not treat travel, shift work, and general schedule variability as a single frequency score. The specification should identify the primary schedule constraint (travel, shift work, variable schedule, etc.) via a new conditional flow.
  - Keep the existing weight (1.2) provisionally for historical context; do not assume this remains a scored item.
  - Do NOT change the live questionnaire yet.
- Personalization meaning:
  - Identifies **Schedule Constraint Profile**. Treat constraints as context, not noncompliance.

DISRUPTION Q2 — Last Meal Timing

- Existing question (do not change in live app):
  - “How often do late meals, alcohol, or stimulants push into your evening window?”
- APPROVED STRUCTURAL REVISION (spec only):
  - Replace with a focused Last Meal Timing concept: “How long before your usual bedtime do you typically finish your final meal or snack?”
  - Do NOT change the live questionnaire yet.
- Personalization meaning:
  - Identifies **Last Meal Timing**. Meal Timing Regularity + Last Meal Timing + bedtime + Today's Flow should eventually form a meal-timing system.

DISRUPTION Q3 — Pre-Sleep Activation Signal

- Existing question (do not change in live app):
  - “How often do you create a true wind-down period before bed?”
- APPROVED SPECIFICATION REVISION (spec only):
  - Change the concept to:
    - “How often do you feel mentally or physically wound up when you intend to sleep?”
  - Provisional answer direction: Rarely / Sometimes / Often / Very often.
  - Keep current weight provisionally at 0.8.
  - Do NOT change the live questionnaire yet.
- Personalization meaning:
  - Identifies **Pre-Sleep Activation Signal**. Treat as output/diagnostic information rather than a requirement for a prescribed "wind-down routine." Use to prioritize upstream mismatches as appropriate.

---

## LOCATION / SEASON (Approved structural revisions)

LOCATION / SEASON Q1 — Seasonal Daylight Context

- Existing question (do not change in live app):
  - “How supportive is your current season for natural daylight exposure?”
- APPROVED STRUCTURAL REVISION (spec only):
  - Remove seasonal daylight from future behavioral scoring. Derive seasonal context automatically from location, date, and solar calculations.
  - Do NOT change the live questionnaire yet.
- Personalization meaning:
  - Becomes **Environmental Context: Seasonal Daylight**. Use derived solar data rather than subjective scoring.

LOCATION / SEASON Q2 — Latitude / Seasonal Variability Context

- Existing question (do not change in live app):
  - “How extreme is the daylight swing where you live?”
- APPROVED STRUCTURAL REVISION (spec only):
  - Remove this from behavioral scoring; derive latitude/seasonal variability automatically.
  - Do NOT change the live questionnaire yet.
- Personalization meaning:
  - Becomes **Environmental Context: Latitude / Seasonal Variability**.

LOCATION / SEASON Q3 — Environmental Control / Constraint Profile

- Existing question (do not change in live app):
  - “How easy is it to shape your home for both bright mornings and dark evenings?”
- APPROVED SPECIFICATION REVISION (spec only):
  - Change the specification wording to:
    - “How much control do you have over the light environment in your home, especially in the evening and while you sleep?”
  - Do NOT change the live questionnaire yet.
- Personalization meaning:
  - Identifies **Environmental Control / Constraint Profile**. Use this to determine realistic recommendations based on the user's control level.

---

## NEW GLOBAL PERSONALIZATION PRINCIPLES (append)

Add these principles to the existing global personalization section without removing previously approved Light-domain principles.

1. Distinguish behavior, outcomes, and context/constraints.

   - Behavior: Things the user can potentially change.
   - Outcomes: Signals such as sleep restoration, sleep initiation, and pre-sleep activation that identify where to investigate but do not prove causation.
   - Context/constraints: Season, latitude, shift work, travel, caregiving, environmental control, and other realities the engine should adapt around rather than score as poor behavior.

2. Constraint does not equal noncompliance.

3. Environmental reality is context, not behavior.

4. If the system can reliably derive environmental information from location, date, timezone, or solar data, do not ask the user to estimate it unnecessarily.

5. Do not combine multiple behaviors into one assessment question when those behaviors could lead to different personalization decisions.

6. Outcome signals can increase the priority of plausible upstream mismatches, but they must not be used to invent causation that the assessment does not support.

7. Personalization must account not only for what needs improvement, but also for what the user can realistically control.

8. Observed behavior may eventually supersede self-report.

9. The app should adapt over time.

   - The model: ASSESS → PERSONALIZE → GUIDE → LEARN → ADAPT

10. The long-term mobile experience remains a circadian companion, not a checklist or habit tracker.

11. Free and paid experiences should share the same underlying personalization architecture.

12. Website assessment and mobile app are two connected experiences inside one Foundational Flow intelligence system.

---

## IMPORTANT IMPLEMENTATION INSTRUCTION

- Do not implement any of these rules yet.
- Do not edit live questionnaire behavior, questionnaire scoring, rules engine, Today's Flow event logic, notification behavior, UI, or persistence behavior.

---

### Notes: conflicts or ambiguities observed (documentation only)

- Several specification changes propose replacing or removing concepts that currently exist in the live `lib/questionnaire.ts` data model (e.g., combining vs separating meal/activity questions, removing seasonal scoring). The timing and release plan for reconciling live questionnaire content with these spec changes is unspecified.
- The spec sometimes asks to remove certain items from behavioral scoring (Location / Season) while leaving the live questionnaire unchanged; this creates ambiguity about when and how to deprecate those items in the scoring pipeline.
- DISRUPTION structural revisions propose replacing one frequency-based item with a constraint-profile branching flow. This will require work to preserve historical comparability if needed.
- The spec instructs not to change live questionnaire wording or scoring now; therefore the product/engineering team should coordinate a migration plan when ready.

