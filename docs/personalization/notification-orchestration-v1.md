# Notification Orchestration v1

Notification Orchestration sits after coaching and delivery decisions. It does not decide biological truth, coaching priority, intervention level, or interruption eligibility.

Its job is narrow:

1. Re-check that an interrupt-capable delivery decision is still valid at send time.
2. Reject stale target or stale event identity.
3. Confirm a Level 3 event is still current, still supports the selected target, and remains inside the biological event window.
4. Require valid coaching copy from the Voice layer for Level 3 notifications.
5. Require explicit upstream copy for Level 4 contextual alerts rather than inventing language.
6. Produce the final payload only when every guardrail still passes.

## Principle

A notification is not a stored instruction waiting to fire. It is a delivery opportunity that must still be biologically and contextually valid when the send moment arrives.

This prevents "zombie notifications": messages that were once appropriate but are no longer relevant because time, target, event, or context changed.

## Boundary

Notification Orchestration may suppress delivery. It may never upgrade a coaching decision, create a new coaching target, manufacture biological relevance, or rewrite Voice output.

The flow is:

`Biology → Coaching Decision → Delivery Rules → Voice → Notification Orchestration → Human`

For Level 3, orchestration packages the existing Voice headline and guidance unchanged. For Level 4, the caller must supply explicit contextual-alert copy.
