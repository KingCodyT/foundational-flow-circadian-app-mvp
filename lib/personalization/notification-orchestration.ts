import { FlowEvent } from "@/lib/flow-engine";
import { VoiceRelationshipOutput } from "@/lib/voice/voice-relationship";
import { InterventionCandidate } from "./intervention-candidate";
import decideNotificationDelivery, {
  NotificationDeliveryChannel,
} from "./notification-delivery";
import { eventSupportsSignal } from "./now-coaching";

export type NotificationPayload = {
  title: string;
  body: string;
  channel: "NOTIFICATION" | "CONTEXTUAL_ALERT";
  level: 3 | 4;
  targetSignalId: string | null;
  eventId: string | null;
};

export type NotificationScheduleIdentity = {
  targetSignalId?: string | null;
  eventId?: string | null;
};

export type NotificationOrchestrationInput = {
  candidate: InterventionCandidate;
  activeEvent?: FlowEvent | null;
  voice?: VoiceRelationshipOutput | null;
  scheduled?: NotificationScheduleIdentity | null;
  contextualAlertCopy?: { title: string; body: string } | null;
  now?: Date | null;
};

export type NotificationOrchestrationResult = {
  shouldDeliver: boolean;
  channel: NotificationDeliveryChannel;
  reason: string;
  evaluatedAt: string;
  payload: NotificationPayload | null;
};

function isInsideWindow(
  window: { start?: string | null; end?: string | null } | null | undefined,
  now: Date,
): boolean {
  if (!window) return false;
  const start = window.start ? new Date(window.start) : null;
  const end = window.end ? new Date(window.end) : null;
  if (start && Number.isNaN(start.getTime())) return false;
  if (end && Number.isNaN(end.getTime())) return false;
  if (start && end) return now >= start && now <= end;
  if (start) return now >= start;
  if (end) return now <= end;
  return false;
}

export function orchestrateNotificationDelivery(
  input: NotificationOrchestrationInput,
): NotificationOrchestrationResult {
  const now = input.now ?? new Date();
  const candidate = input.candidate;
  const activeEvent = input.activeEvent ?? null;
  const delivery = decideNotificationDelivery(candidate);

  const noDelivery = (reason: string): NotificationOrchestrationResult => ({
    shouldDeliver: false,
    channel: delivery.channel,
    reason,
    evaluatedAt: now.toISOString(),
    payload: null,
  });

  if (!delivery.shouldInterrupt) {
    return noDelivery("delivery_decision_does_not_interrupt");
  }

  const scheduledTarget = input.scheduled?.targetSignalId ?? null;
  if (scheduledTarget && scheduledTarget !== candidate.targetSignalId) {
    return noDelivery("scheduled_target_is_stale");
  }

  if (delivery.channel === "NOTIFICATION") {
    if (!activeEvent) return noDelivery("no_current_event");

    const scheduledEvent = input.scheduled?.eventId ?? null;
    if (scheduledEvent && scheduledEvent !== activeEvent.id) {
      return noDelivery("scheduled_event_is_stale");
    }

    if (activeEvent.status !== "current") {
      return noDelivery("event_is_no_longer_current");
    }

    if (!eventSupportsSignal(activeEvent.id, candidate.targetSignalId)) {
      return noDelivery("current_event_no_longer_supports_target");
    }

    if (!candidate.biologicallyRelevantNow || !candidate.actionableNow) {
      return noDelivery("candidate_is_no_longer_relevant_or_actionable");
    }

    if (!isInsideWindow(candidate.eventWindow, now)) {
      return noDelivery("biological_window_has_closed");
    }

    const voice = input.voice ?? null;
    if (
      !voice ||
      voice.mode !== "COACHING" ||
      voice.silent ||
      !voice.headline ||
      !voice.guidance
    ) {
      return noDelivery("no_valid_coaching_copy");
    }

    return {
      shouldDeliver: true,
      channel: "NOTIFICATION",
      reason: "current_notification_ready",
      evaluatedAt: now.toISOString(),
      payload: {
        title: voice.headline,
        body: voice.guidance,
        channel: "NOTIFICATION",
        level: 3,
        targetSignalId: candidate.targetSignalId,
        eventId: activeEvent.id,
      },
    };
  }

  if (delivery.channel === "CONTEXTUAL_ALERT") {
    const copy = input.contextualAlertCopy ?? null;
    if (!copy?.title || !copy?.body) {
      return noDelivery("no_contextual_alert_copy");
    }

    return {
      shouldDeliver: true,
      channel: "CONTEXTUAL_ALERT",
      reason: "material_contextual_alert_ready",
      evaluatedAt: now.toISOString(),
      payload: {
        title: copy.title,
        body: copy.body,
        channel: "CONTEXTUAL_ALERT",
        level: 4,
        targetSignalId: candidate.targetSignalId,
        eventId: activeEvent?.id ?? null,
      },
    };
  }

  return noDelivery("unsupported_interrupt_channel");
}

export default orchestrateNotificationDelivery;
