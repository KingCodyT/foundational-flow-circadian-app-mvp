# Notification Delivery Rules v1

Foundational Flow should earn the right to interrupt the user.

The notification layer does not decide biology, coaching priority, severity, confidence, actionability, or intervention intensity. It consumes the already-normalized `InterventionCandidate` and decides only where that decision may be delivered.

## Delivery hierarchy

- **Level 0 — SILENT:** no delivery.
- **Level 1 — PASSIVE_CONTEXT:** in-app only; never interrupts.
- **Level 2 — IN_APP_GUIDANCE:** in-app only; never interrupts.
- **Level 3 — NOTIFICATION_ELIGIBLE:** may interrupt only when the upstream candidate still says the moment is biologically relevant, actionable, interruption-eligible, and nonredundant.
- **Level 4 — CONTEXTUAL_ALERT_ELIGIBLE:** reserved for a material contextual disruption already identified upstream.

## Guardrails

1. Delivery can never upgrade an intervention level.
2. Passive context never becomes a notification.
3. Ordinary in-app guidance never becomes a notification.
4. Level 3 requires all interruption guardrails to remain true at delivery time.
5. Redundant recent guidance must not interrupt.
6. Level 4 may bypass the normal event-window/actionability requirements only when the upstream decision explicitly represents `material_contextual_disruption`.
7. A delivery decision changes channel only. It must not mutate the primary target, coaching state, severity, confidence, reconsideration, or biological interpretation.

## Product principle

A notification is not a reward for having data. It is an interruption cost. Foundational Flow should spend that cost only when the timing matters and the user can do something useful with it.
