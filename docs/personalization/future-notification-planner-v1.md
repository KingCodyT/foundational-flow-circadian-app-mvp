# Future Notification Planner v1

## Purpose

The Future Notification Planner lets Foundational Flow schedule a known upcoming biological coaching opportunity before it becomes current, so the server-side Web Push transport can reach the person even if the app is closed at that moment.

It does **not** create a second coaching engine.

The planner asks the existing intelligence stack a narrow question:

> If the currently selected coaching target and known context remain unchanged until this upcoming circadian event begins, would the existing coaching, delivery, voice, and orchestration layers approve an interruption then?

Only if the answer is yes does it create a future `ScheduledNotificationRecord`.

## Architecture

The path is:

**Assessment + daily evidence + context → selected target → known upcoming FlowEvent → projected coaching evaluation at event start → delivery rules → Voice → orchestration → cooldown memory → future schedule → server Web Push transport**

The future projection reuses the existing stack. It does not duplicate eligibility rules.

## v1 rules

- Plans only the next known `upcoming` circadian event.
- Uses the event start as the projected evaluation time.
- Keeps the current selected coaching target unchanged.
- Reuses `assembleNowCoachingDecision` for projected candidate generation.
- Reuses the Voice & Relationship layer for message copy.
- Reuses Notification Orchestration for zombie/eligibility safeguards.
- Reuses Delivery History + Cooldown Memory before scheduling.
- Schedules only Level 3 `NOTIFICATION` coaching.
- Does not project Level 4 contextual alerts because future disruptions are not known.
- Default planning horizon is 12 hours.
- Planner-created records use the `future:` ID prefix so stale planner work can be removed without touching immediate/runtime notifications.

## Important semantic boundary

The planner is **not claiming the future is known with certainty**.

It is scheduling against a known circadian opportunity using the best current model. If the user opens the app and the target, timing, evidence, event state, or context changes, the planner recalculates and replaces or clears its own future schedule. The server transport cancels the prior schedule when the local scheduled notification changes.

This preserves the rule:

**A future plan may execute an approved coaching decision. It may never manufacture one.**

## Restraint

The planner can make Foundational Flow quieter:

- unrelated future events do not become coaching,
- DEVELOPING guidance remains non-interrupting,
- cooldown can suppress a projected repeat,
- events beyond the planning horizon are ignored,
- absence of an approved future interruption produces no schedule.

The planner cannot upgrade intervention level, change severity, increase confidence, select a different target, infer a disruption, or bypass notification cooldown.

## Integration

`FutureNotificationPlannerBridge` runs inside the NOW experience after the same personalization, context, and FlowEvent model used to render the page has been built.

When a valid plan exists, it writes that `ScheduledNotificationRecord` into the existing persistent notification state. The already-promoted Background Delivery Transport and Server-Side Web Push Scheduling layers then handle subscription, durable scheduling, delivery, and delivery-history hydration.
