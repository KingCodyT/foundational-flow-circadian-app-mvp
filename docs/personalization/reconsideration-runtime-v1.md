# Shared personalization runtime — consolidation Stage 2

Implemented against Stage 1 HEAD `cf3c8074f96cd7425166a703f9cd4e318a323040`, adapting reviewed architecture donor `3bf96c51585e2a9bc6ea21d898d24d5dfdad4521`. The richer food provider and existing interface remain in place.

## Ownership and rebuild

The root CircadianProvider owns hydration, the live saved-profile-timezone date, derived environment, runtime transitions, explicit per-signal resolution and persistence. Routes consume shared selectors and dispatch actions. Route/query/date browsing is not a runtime input.

The shared rebuild composes assessment interpretation and initial confidence, daily evidence, then food evidence/progression exactly once. Per-signal accepted evidence keys prevent repeated progression on unchanged evidence. Meal addition, occurrence edits, deletion and cross-date moves affect food evidence identity. Intent, receipt/edit metadata and historical biological context are not new meal behavior. Historical fallback noon is constructed in the saved profile timezone, independently of the device timezone.

## Reconsideration lifecycle

The conservative donor application core remains intact. Each signal retains its own accepted baseline. Context or conflicting evidence opens pending metadata without replacing accepted interpretation, confidence, evidence or Established progress. First genuine evidence can initialize an unassessed signal even while contextual review remains pending. Unrelated signals retain their state and identity.

Historical context correction for an existing meal at the same instant contributes contextual review metadata. Raw incoming food records remain stored separately from the runtime's accepted food snapshot. Pending review retains that accepted snapshot; food resolution archives it with the prior signal.

Only explicit per-signal resolution advances that signal's baseline and accepted evidence. It archives the prior signal and review, clears only that pending review and leaves others pending. Batched resolutions use a functional provider update so both survive persistence. An unchanged rebuild returns the existing runtime without rewriting storage.

## Accepted focus contract

Candidate ranking is a read-only recommendation. Genuinely unset focus initializes once from the existing eligible primary-target selection, with timestamp and `source: system-initialization`. No eligible candidate leaves focus unset. Initialization is not represented as explicit user review.

Persisted accepted focus is authoritative thereafter, including an accepted null signal (explicit no-target). Candidate ranking, environment, meals, time, routes and reconsideration cannot replace it. Existing `explicit` and `legacy-profile` provenance remain distinct. A target may become quiet or Established without being replaced. No target-transition policy or new acceptance interface is introduced.

## Stage 1 storage boundary

The provider continues to hydrate and save through the combined versioned storage session. A normalized hydration projection is registered before the first runtime rebuild, allowing that first transition to persist while preserving absent legacy fields. Migration markers are acknowledged only after a successful behavioral rebuild; invalidated legacy caches retain legitimate accepted coaching state and history.

Unknown retained fields, recovery backup, future-version refusal, hydration gating and storage-failure retry remain in force. Two owned-field exceptions are explicit: resolving a signal can remove its known reconsideration field, and changed runtime food-context/accepted-food projections replace their prior projection so deleted entries cannot be resurrected. This does not delete retained raw user records or unknown fields outside those managed projections.

## Validation

On 2026-10-01:

- `npm run test:non-browser`: 308 passing, zero failures/skips. Includes all existing non-browser food, onboarding, timezone, storage and coaching tests; unchanged donor application/runtime regressions; combined lifecycle tests; actual React provider hydration, effects, persistence and reload tests.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false`: passed.
- `git diff --check`: passed.

Provider tests use synthetic in-memory storage and React's renderer, not personal browser data. Coverage includes first evidence during pending review, Established preservation, food mutations and historical context, per-signal/batched resolution, timezone/location/schedule/seasonal change, midnight/DST, stale legacy recovery, accepted-focus provenance/stability, explicit no-target, route independence and no-op writes.

## Scope and limitations

A development-only React 18.3.1 test renderer and explicit non-browser runner support real provider tests. Target tests are grouped in the combined/runtime suites instead of a separate accepted-target file. Existing food algorithms, five-stage onboarding, artwork, navigation and notification/wearable implementation remain preserved; no external delivery is activated.

Browser validation is intentionally deferred. Stage 3 navigation and Timeline are not implemented. Future user-reviewed target replacement remains a separate product decision. Stage 1 storage remains a local single-writer contract; this work does not add multi-tab conflict arbitration or guarantee safety for older application versions writing the same storage key. No historical recommendations or accepted raw meal snapshots are fabricated when a legacy checkpoint did not retain them.
