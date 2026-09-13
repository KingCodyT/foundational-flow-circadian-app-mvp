## 1. Executive verdict

This architecture is ready for a conservative Reconsideration Triggers v1 layer, but not for automatic confidence decay.

The current code already supports:
- direct-assessment semantic conflict detection in [lib/personalization/initial-confidence.ts](lib/personalization/initial-confidence.ts)
- daily evidence aggregation in [lib/personalization/daily-evidence.ts](lib/personalization/daily-evidence.ts)
- profile and runtime context in [types/circadian.ts](types/circadian.ts), [components/circadian-provider.tsx](components/circadian-provider.tsx), [lib/audit-store.ts](lib/audit-store.ts), and [lib/live-clock.ts](lib/live-clock.ts)

What is missing is a reliable signal-level historical context snapshot and a minimal trigger reason model. The architecture can detect some material context change, but not yet in a durable or fully semantic way.

The correct boundary is:
- keep confidence semantics separate from severity, target ranking, and intervention
- create a lightweight signal-level reconsideration assessment
- decide later whether a trigger should preserve confidence, ask for fresh evidence, or lower confidence conservatively

---

## 2. Existing assets we can reuse

- Daily event model and timestamps:
  - [types/circadian.ts](types/circadian.ts)
  - EventRecord.status and EventRecord.at are the current evidence-bearing fields

- Daily event to signal mapping:
  - [lib/personalization/daily-evidence.ts](lib/personalization/daily-evidence.ts)
  - EVENT_SIGNAL_MAP is the current authoritative mapping

- Initial confidence semantics:
  - [lib/personalization/initial-confidence.ts](lib/personalization/initial-confidence.ts)
  - semanticConflictExists is already the correct pattern: same direct-behavior question with genuinely different answers can lower confidence

- Derived environment and solar context:
  - [lib/personalization/derived-environment.ts](lib/personalization/derived-environment.ts)
  - solar/day-length functions are used in the personalization environment and schedule model

- Signal registry and relevance:
  - [lib/personalization/signal-registry.ts](lib/personalization/signal-registry.ts)
  - This is the canonical list of signal identities and context relevance anchors

- Personalization state:
  - [lib/personalization/initial-state.ts](lib/personalization/initial-state.ts)
  - confidence, evidence, and notes are already the stable state container

- Target and intervention boundaries:
  - [lib/personalization/primary-target.ts](lib/personalization/primary-target.ts)
  - [lib/personalization/intervention.ts](lib/personalization/intervention.ts)
  - [lib/personalization/intervention-eligibility.ts](lib/personalization/intervention-eligibility.ts)
  - [lib/personalization/feasibility.ts](lib/personalization/feasibility.ts)

These files confirm the architectural rule:
- confidence is a signal interpretation concern
- severity, target hierarchy, and intervention are separate concerns

---

## 3. Missing state/data

The current architecture is missing the minimum historical state needed for reliable trigger detection:

- previous timezone
- previous location
- prior profile wake/sleep values
- prior participation or schedule context
- prior solar context snapshot
- context-at-evidence-time metadata
- signal-specific validity window metadata
- last-observed summary per signal under prior conditions
- a durable signal state version or context hash

Without this, the app can compare current vs current, but not reliably compare current vs prior interpretation.

---

## 4. Current change-detection capability

### 1. Timezone
- Stored profile timezone: DailyProfile.timeZone in [types/circadian.ts](types/circadian.ts)
- Runtime/browser timezone: read via the time utilities in [lib/live-clock.ts](lib/live-clock.ts)
- Both are available at the same time in runtime state
- Mismatch is detectable today, but only as a current mismatch
- Historical timezone state is not persisted
- The app can know current timezone differs from saved profile, but not confidently infer a travel event vs a user-edit or device mismatch

### 2. Location
- Stored location fields: latitude, longitude, locationPermissionGranted in [types/circadian.ts](types/circadian.ts)
- This is explicit user profile data, not a continuous device-tracking record
- Previous location is not persisted
- Location change is not reliably detectable today
- Location is used directly in solar calculations via the solar context layer

### 3. Solar / day length / season
- Sunrise/sunset/day-length calculations are in the solar layer, supplemented by derived-environment logic in [lib/personalization/derived-environment.ts](lib/personalization/derived-environment.ts)
- Day length is available
- Season is inferred via solar context, date, and latitude, not explicitly modeled as a persisted season state
- Previous day-length or seasonal state is not preserved
- A meaningful seasonal change can be detected only by comparing derived environment context over time; currently there is no durable historical comparison layer

### 4. Schedule / daily profile
Current profile fields include:
- wakeTime
- targetBedtime
- participationLevel
- location/profile fields
- there is no durable history of previous values
- material schedule change is detectable only when the app reads current values and compares them to a previous snapshot, which does not currently exist

### 5. Evidence age
- Evidence records have timestamps in EventRecord.at
- Confidence objects carry lastEvidenceAt in [lib/personalization/types.ts](lib/personalization/types.ts)
- generatedAt in [lib/personalization/initial-state.ts](lib/personalization/initial-state.ts) is a snapshot timestamp, not a semantic evidence age anchor
- The code can distinguish old assessment evidence vs recent daily evidence only if the metadata is preserved at each state boundary
- There is no current age-based logic
- Confidence does not decay automatically

### 6. Semantic conflict
- Initial confidence already recognizes same-question contradictory direct answers in [lib/personalization/initial-confidence.ts](lib/personalization/initial-confidence.ts)
- Daily evidence currently expresses only support-style completed records
- There is no first-class semantic contradiction status in daily evidence
- Daily evidence is support-only in practice
- It is not safe to add contradiction now without inventing negative evidence semantics that the current model does not explicitly support

---

## 5. Per-signal context relevance

### Morning Light Circadian Anchor
Most relevant triggers:
- timezone change
- schedule change
- wake time change
- seasonal daylight change
- location/latitude change
- travel
- relevant because morning timing is strongly contextual

### Daytime Light Environment
Most relevant:
- latitude/day length
- location
- season
- timezone
- schedule / workday shifts

### Evening Light / Darkness
Most relevant:
- timezone
- sunset timing
- schedule change
- home environment and participation context
- travel and daylight changes

### Sleep Opportunity Timing
Most relevant:
- timezone change
- bedtime/wake schedule changes
- travel
- season if it materially alters sleep opportunity
- work schedule / participation

### Meal Timing
Most relevant:
- schedule changes
- wake/sleep pattern changes
- participation changes
- less relevant to latitude/solar season unless the behavior is tightly coupled to the daily rhythm

### Optimization signals
Most relevant:
- schedule changes
- profile participation changes
- context changes that alter feasibility or routine consistency
- often less central than anchor signals

Important architectural point:
- not all context changes matter equally across all signals
- trigger logic must be signal-specific, not universally global

---

## 6. Best architectural boundary

The cleanest boundary is a separate signal-level trigger assessment layer, not a direct mutation of:
- severity
- target hierarchy
- coaching state
- intervention logic
- confidence decay

Best fit:
- between evidence interpretation and downstream decisioning
- produce a small trigger record associated with a signal or context snapshot
- allow the caller to decide whether to preserve, revisit, or lower confidence

Recommended shape conceptually:
- current interpretation
- current evidence
- current context snapshot
- prior context snapshot
- signal relevance
- trigger reasons
- observedAt
- relevantSignalIds

This belongs as signal/context metadata, not as a cross-cutting global timer.

---

## 7. Minimum Reconsideration Triggers v1

Recommended v1 trigger set:
- EVIDENCE_STALE
- TIMEZONE_CHANGED
- LOCATION_CHANGED
- SCHEDULE_CHANGED
- SEASONAL_CONTEXT_CHANGED
- EVIDENCE_CONFLICT

Do not add more than this without a real architecture need.

The preferred behavior:
- one trigger should be enough to justify a revisit
- trigger reasons should be per-signal and conservative
- trigger should never imply automatic confidence reduction
- trigger should not be a global invalidation event

---

## 8. What NOT to implement yet

Do not implement:
- automatic time-based confidence decay
- universal timer-based reconsideration
- “X days old means lower confidence”
- raw missing-data conflict logic
- skipped/missed as negative evidence
- inferred contradiction from severity differences
- confidence-driven target ranking
- confidence-driven intervention changes
- global invalidation on any context change
- travel detection as a separate domain model
- Bayesian or probabilistic inference
- UI-facing confidence score redesign

---

## 9. Recommended files for implementation

Likely implementation files:
- [lib/personalization/daily-evidence.ts](lib/personalization/daily-evidence.ts)
- [lib/personalization/initial-confidence.ts](lib/personalization/initial-confidence.ts)
- [lib/personalization/derived-environment.ts](lib/personalization/derived-environment.ts)
- [lib/personalization/types.ts](lib/personalization/types.ts)
- [components/circadian-provider.tsx](components/circadian-provider.tsx)
- [lib/audit-store.ts](lib/audit-store.ts)
- [lib/live-clock.ts](lib/live-clock.ts)
- [lib/solar.ts](lib/solar.ts)

Optional if versioning is needed:
- a very small new re-evaluation helper file, but only if the trigger logic expands beyond a single utility

---

## 10. Required tests

Future implementation tests should cover:
- no trigger from time passing alone
- timezone mismatch only triggers when relevant to the signal
- DST-safe handling
- location/latitude change triggers only for relevant light signals
- schedule change triggers for sleep and morning timing
- seasonal context change triggers for light signals
- semantic evidence conflict triggers when actual evidence is contradictory
- irrelevant context changes do not trigger unrelated signals
- constraint or infeasibility does not count as conflict
- missing data does not create false contradiction
- trigger does not mutate severity
- trigger does not mutate coachingState
- trigger does not mutate target automatically
- trigger does not mutate intervention automatically

---

## 11. Risks / false positives / false negatives

### False positives
- browser timezone mismatch mistaken for travel
- DST mistaken for timezone or seasonal change
- minor sunrise drift mistaken for major context shift
- profile edits mistaken for behavior change
- temporary schedule edit treated as durable change
- location permission missing treated as location change

### False negatives
- user travels but saved profile timezone remains stale
- schedule changes without profile update
- geographic change with missing coordinates
- no historical context snapshot means current change cannot be measured
- no direct contradiction semantics means conflict can remain unrecognized

---

## 12. Exact next implementation batch

The first implementation batch should be restricted to:

1. Add minimal historical context snapshot
   - prior timezone
   - prior location
   - prior schedule values
   - prior derived environment summary

2. Add a small signal relevance map
   - which context changes matter to which signals

3. Add a conservative trigger result object
   - shouldReconsider
   - reasons
   - relevantSignalIds
   - observedAt

4. Gate trigger generation to semantic relevance only
   - no global invalidation
   - no automatic confidence decay
   - no target or intervention mutation

5. Keep conflict handling conservative
   - only support true semantic contradiction
   - no silent negative evidence from skipped or absent records

This is the minimum safe Reconsideration Triggers v1 design.

---

## Final rule

This was architecture discovery only. No code was modified. No review branch was created. No commit or push was made.
