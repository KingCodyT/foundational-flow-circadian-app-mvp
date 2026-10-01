# Reconsideration runtime v1

The application provider owns the personalization transition, context sampling,
primary target selection and local persistence. Views consume its result. No
view mount, navigation event, notification or questionnaire change is required.

## Lifecycle

- Each signal has its own context baseline. Minor drift does not advance it, so
  cumulative schedule, location and seasonal changes can reach a threshold.
  Previously unknown fields acquire a baseline when first observed.
- A trigger adds `status: pending` reconsideration metadata. Reasons and evidence
  accumulate; the first observed timestamp remains stable. Returning home,
  midnight, reload and navigation do not resolve a review.
- A pending signal retains its previous coaching state, evidence and confidence.
  Latest assessment answers and dated event records remain saved independently.
  New answers are retained in history; context never creates behavioral evidence.
  Unchanged behavioral evidence does not refresh confidence's evidence timestamp.
- `resolveReconsideration(signalId)` explicitly accepts the current behavioral
  evidence and acknowledges current context for that signal. It rebuilds from
  the latest assessment answer and dated daily evidence, records a resolved
  review with its prior full signal, and advances only that signal's baseline.
  This can change coaching state and the primary target when behavioral evidence
  warrants it. Context-only resolution preserves both.
- Old assessment history is retained but acknowledged, so it does not immediately
  reopen the same conflict. A subsequent changed answer can open a new review,
  including a return to a previously seen value. Other pending signals remain.
- No automatic resolver or consumer resolution control is introduced in v1.
  Pending reviews remain pending until an explicit caller resolves them.

## Persistence and migration

`LocalAuditState.personalizationRuntime` stores a version-1 checkpoint containing
signal interpretations, per-signal baselines, observed and accepted answers,
assessment history, acknowledged history, evidence identities and resolved review
records. The provider saves the derived checkpoint together with its source
answers and event records, rather than saving an older checkpoint for new inputs.
Reset clears the checkpoint and migration inputs along with existing audit data.

Older saves without a checkpoint are initialized from their existing evidence.
Legacy previous/current context snapshots supply the initial baseline. If retained
answer history conflicts, the oldest retained answer supplies the conservative
initial interpretation and a pending review is opened. Historical interpretations
or timestamps never stored by the previous implementation cannot be recovered.

## Validation boundaries

Runtime tests use the real initialization, confidence, daily-evidence,
reconsideration and target-selection functions. Provider tests execute the real
provider and storage effects with an in-memory React hook scheduler and clock;
they do not substitute the personalization engine. They verify application-level
provider ownership, route-independent updates, reload, resolution and reset.
These tests are not a browser or React DOM integration test.
