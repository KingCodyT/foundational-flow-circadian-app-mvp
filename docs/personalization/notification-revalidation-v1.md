# Notification Revalidation v1

## Purpose

Prevent a future notification that was once approved from becoming a stale or duplicate interrupt by the time its delayed server callback arrives.

## Boundary

Revalidation is restraint, not a second intelligence engine.

The server does not recalculate biology, select a coaching target, infer a context change, rewrite copy, or upgrade delivery. Upstream client intelligence remains authoritative. When the app learns something that changes the future plan, the planner replaces or clears the durable schedule. The server only verifies that the callback still represents that current approved intent.

## Contract

A server schedule now carries:

- `scheduleRevision`: unique to each accepted scheduling request.
- `validUntil`: optional end of the biological opportunity.

QStash receives the schedule revision in its delayed callback. At dispatch time the server requires:

1. the authoritative schedule still exists;
2. the callback revision still matches the authoritative schedule;
3. the callback is not materially early;
4. the biological validity window has not closed;
5. a usable push subscription still exists.

Failure of a revalidation condition makes delivery quieter. It never creates another notification.

## Replacement and cancellation

Cancellation deletes the authoritative Redis schedule. A later QStash callback therefore NOOPs.

Replacement writes a new schedule revision. An older QStash callback can still physically arrive, but its revision no longer matches and therefore NOOPs.

This closes a race that notification ID alone cannot close when the same future slot is rescheduled with changed copy or timing.

## Biological validity

Future Notification Planner v1 now sets `validUntil` to the end of the known future FlowEvent window. A delayed QStash retry after that opportunity closes is discarded and the schedule is completed without delivery.

Immediate/runtime notifications may omit `validUntil`; this change does not invent a validity window where upstream biology did not provide one.

## What v1 cannot know while the app is closed

The server deliberately does not infer unseen real-world changes such as travel, a changed schedule, or new behavior while the app has no evidence of them. If the app observes a material change before delivery, the existing planner/bridge updates or cancels the authoritative intent. If no new evidence exists, the server preserves the last approved intent but still enforces revision identity and the biological window.

Principle: **Yesterday's approval is not permanent permission to interrupt. Delivery must still match the current stored intent and remain inside the opportunity that justified it.**
