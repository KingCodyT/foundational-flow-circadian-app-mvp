import { InterventionCandidate } from "./intervention-candidate";

export type NotificationDeliveryChannel =
  | "SILENT"
  | "IN_APP_ONLY"
  | "NOTIFICATION"
  | "CONTEXTUAL_ALERT";

export type NotificationDeliveryDecision = {
  channel: NotificationDeliveryChannel;
  shouldInterrupt: boolean;
  reason: string;
  level: 0 | 1 | 2 | 3 | 4;
  targetSignalId: string | null;
};

export function decideNotificationDelivery(
  candidate: InterventionCandidate,
): NotificationDeliveryDecision {
  const level = candidate.finalLevel;
  const targetSignalId = candidate.targetSignalId ?? null;

  // Delivery never upgrades the coaching decision. Levels 0-2 stay inside the app.
  if (level === 0 || candidate.disposition === "SILENT") {
    return {
      channel: "SILENT",
      shouldInterrupt: false,
      reason: "candidate_is_silent",
      level,
      targetSignalId,
    };
  }

  if (level === 1 || candidate.disposition === "PASSIVE_CONTEXT") {
    return {
      channel: "IN_APP_ONLY",
      shouldInterrupt: false,
      reason: "passive_context_never_interrupts",
      level,
      targetSignalId,
    };
  }

  if (level === 2 || candidate.disposition === "IN_APP_GUIDANCE") {
    return {
      channel: "IN_APP_ONLY",
      shouldInterrupt: false,
      reason: "guidance_has_not_earned_interruption",
      level,
      targetSignalId,
    };
  }

  // Level 3 earns a notification only when timing and actionability remain true
  // after the upstream decision + eligibility pass.
  if (level === 3) {
    const eligible =
      candidate.disposition === "NOTIFICATION_ELIGIBLE" &&
      candidate.interruptionEligible &&
      candidate.biologicallyRelevantNow &&
      candidate.actionableNow &&
      candidate.eligibility.redundant !== true;

    return {
      channel: eligible ? "NOTIFICATION" : "IN_APP_ONLY",
      shouldInterrupt: eligible,
      reason: eligible
        ? "time_sensitive_actionable_nonredundant_guidance"
        : "notification_guardrail_not_satisfied",
      level,
      targetSignalId,
    };
  }

  // Level 4 is reserved for material contextual disruption. It can interrupt even
  // when the normal biological event-window/actionability requirements do not apply.
  const materialDisruption =
    candidate.disposition === "CONTEXTUAL_ALERT_ELIGIBLE" &&
    candidate.interruptionEligible &&
    candidate.originalDecision.reason === "material_contextual_disruption";

  return {
    channel: materialDisruption ? "CONTEXTUAL_ALERT" : "IN_APP_ONLY",
    shouldInterrupt: materialDisruption,
    reason: materialDisruption
      ? "material_contextual_disruption"
      : "contextual_alert_guardrail_not_satisfied",
    level,
    targetSignalId,
  };
}

export default decideNotificationDelivery;
