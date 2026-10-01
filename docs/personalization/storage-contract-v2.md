# Consolidation Stage 1 — storage contract v2

Implemented only in the isolated integration worktree based on `628d01c`. The approved consolidation blueprint remains unchanged. This document records Stage 1 behavior; it does not authorize runtime, navigation, Timeline or delivery work.

## Schema and preservation

The primary key remains `foundational-flow-circadian-app-state`. `schemaVersion: 2` wraps the existing food storage shape additively. Unversioned and version-1 food/architecture payloads and version-2 combined payloads are decoded. Invalid JSON, malformed known structures and unsupported envelope/runtime/focus/migration versions block hydration and all saves. The raw source is left in place; decoding does not guess corrections, erase invalid records or fabricate missing behavior.

All retained fields survive migration, including original date buckets, empty food buckets, timestamp strings and offsets, historical timezone/anchors, answers, profile, first-run handoff, notification history, wearable state, actual recommendation records and unknown extensions. Migration does not regroup historical data: future Timeline presentation uses saved-profile calendar dates without changing source buckets. Missing receipt times or historical anchors remain missing.

Accepted focus is independent of candidate selection:

```ts
{
  version: 1,
  status: "unset" | "accepted",
  signalId: string | null,
  acceptedAt: string | null,
  source: "uninitialized" | "legacy-profile" | "explicit"
}
```

An existing `dailyProfile.coachingTargetSignalId` is carried over, including explicit null (accepted no-target). Missing focus remains unset. No ranking, inferred initial acceptance, target promotion or new interface is introduced. Existing combined focus wins over legacy profile fields. Stage 2 must read this representation and reconcile legacy profile updates; Stage 1 deliberately does not add transition ownership.

Existing `personalizationRuntime` is stored as a validated but otherwise opaque checkpoint. Its accepted signal state, confidence, Established/Disrupted progress, baselines, answers, history, acknowledgement and resolutions are not recomputed. A legacy checkpoint's old global input cache is invalidated once. A demonstrably unassessed pending behavioral placeholder with retained accepted answer also loses only its stale per-signal evidence cache. `runtimeMigration` records version 1, `rebuildRequired: true` and the affected signal IDs. Migration is idempotent. This prepares the corrected Stage 2 runtime to initialize first evidence; it does not execute the runtime or resolve a review. Stage 2 must consume/acknowledge this marker after a successful full rebuild.

Genuine existing recommendation records, including unknown archive formats, are retained. Future archival should append versioned records carrying ID, generatedAt, display timezone, recommendation content and evidence/model provenance. No archival writer or invented historical entries exist in Stage 1.

## Provider boundary

Provider changes are limited to hydration/persistence and retaining extension fields during a cross-date meal edit. The food action APIs, existing profile/context behavior and route-owned personalization algorithms otherwise remain unchanged for Stage 2.

A storage session loads before `isHydrated` becomes true. Read failures, invalid data and future formats leave it false. `storageIssue` exposes the reason without raw payloads. `retryStorage()` retries hydration or pending writes; it is an API only, not a new user interface. Malformed data needs explicit recovery/repair outside automatic migration. A failed save leaves the in-memory edits available and the last successful source/baseline unchanged; subsequent changes or an explicit retry persist the latest values.

The first hydrated UI projection is a comparison baseline, not a replacement document. Notification pruning and wearable normalization may still make the in-memory display view narrower, but do not erase stored history on hydration or unrelated saves. A three-way merge preserves fields that an older typed UI omits, and retains records hidden by display normalization. Explicit dictionary removals (meal/date/event/material-change keys) and visible record deletions still apply; explicit null can clear a value. Cross-date meal edits preserve unknown record and historical-context extensions while the existing edit logic updates the known anchors.

Existing explicit account reset is guarded when recovery is blocked. It no longer removes storage eagerly: the old account is backed up before replacement, and its runtime/focus is not carried into the new account. No resets were executed against personal data during development.

## Recovery and concurrency

Before the first successful migrated write, store and read back the exact original serialized payload in `foundational-flow-circadian-app-state:recovery:v2`:

```ts
{ version: 1, originals: string[] }
```

Originals are deduplicated, retained without automatic eviction and never silently overwritten. Existing recovery metadata is retained. Backup parse/write/readback failure blocks the primary write. A primary write failure leaves the backup and original primary intact; retries/reloads are safe. Reset uses the same safeguard. No automatic restore/discard action is exposed.

The writer compares primary storage with its last observed value before backup and again before replacement. A detected intervening change blocks with `concurrent-change`; it does not overwrite a newer/future-version payload. This is conflict detection, not a transactional cross-tab lock. Legacy builds can still overwrite a new schema if run against the same origin because those older builds do not enforce this contract. Use isolated origins/browser profiles, and resolve downgrade/multi-tab release coordination before real-user rollout. Recovery copies can consume quota; if space is insufficient, migration fails closed rather than evicting history.

## Validation

Synthetic fixtures only:

- `tests/fixtures/storage/food-v1.json`
- `tests/fixtures/storage/architecture-v1.json`
- `tests/fixtures/storage/combined-v2.json`
- `tests/fixtures/storage/pre-fix-pending-v1.json`

The provider tests execute actual provider code, effects and the persistence adapter with an in-memory storage port and substituted React hook scheduling. They do not mount routes, notification bridges or a browser, and are not a claim of real React/browser acceptance. Browser validation and full runtime transition tests remain later-stage work.

Focused non-browser command:

```sh
node --test tests/storage-migration.test.cjs tests/storage-provider.test.cjs tests/notification-persistence.test.cjs tests/historical-biological-context.test.cjs tests/food-timing-action.test.cjs tests/circadian-food-timing.test.cjs tests/onboarding-profile-handoff.test.cjs tests/wearable-connection.test.cjs
node node_modules/typescript/bin/tsc --noEmit --incremental false
```

Result: 86 tests passing; typecheck clean. Do not use the current broad `npm test` command for Stage 1 because its glob includes browser tests. Dependencies were installed from the lockfile/cache in this isolated worktree with installation scripts disabled; no manifest/lockfile changes were needed.

Additional files beyond the blueprint's named migration test: `tests/storage-provider.test.cjs` validates the required real persistence boundary, and this document records its contract. Neither expands the implementation into Stages 2–5. No routes, artwork, notification transport, wearable integration, personalization runtime implementation, staging or commits were changed by Stage 1.
