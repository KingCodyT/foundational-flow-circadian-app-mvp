import { FlowEvent } from "@/lib/flow-engine";
import { buildVoiceRelationshipOutput } from "@/lib/voice/voice-relationship";
import { Day1PersonalizationResult } from "./day1";
import { DerivedEnvironment } from "./derived-environment";
import {
  evaluateNotificationDeliveryMemory,
  NotificationDeliveryMemoryRecord,
} from "./notification-memory";
import { orchestrateNotificationDelivery } from "./notification-orchestration";
import { ScheduledNotificationRecord } from "./notification-runtime";
import { assembleNowCoachingDecision } from "./now-coaching";
import { SignalReconsideration } from "./reconsideration";

export const DEFAULT_FUTURE_NOTIFICATION_HORIZON_MINUTES = 12 * 60;

export type FutureNotificationPlanReason =
  | "planned"
  | "no_future_event"
  | "event_not_upcoming"
  | "event_not_in_future"
  | "event_beyond_planning_horizon"
  | "future_opportunity_not_interrupt_eligible"
  | "cooldown_active";

export type FutureNotificationPlan = {
  notification: ScheduledNotificationRecord | null;
  reason: FutureNotificationPlanReason;
  evaluatedAt: string;
  opportunityAt: string | null;
};

export type FutureNotificationPlannerInput = {
  day1: Day1PersonalizationResult;
  futureEvent?: FlowEvent | null;
  derivedEnvironment?: DerivedEnvironment | null;
  reconsideration?: Record<string, SignalReconsideration> | null;
  delivered?: NotificationDeliveryMemoryRecord[] | null;
  materialChangeKey?: string | null;
  now?: Date | null;
  horizonMinutes?: number | null;
};

function futureNotificationId(event: FlowEvent, targetSignalId: string | null) {
  return [
    "future",
    targetSignalId ?? "none",
    event.id,
    event.start.toISOString(),
  ].join(":");
}

export function planFutureNotification(
  input: FutureNotificationPlannerInput,
): FutureNotificationPlan {
  const now = input.now ?? new Date();
  const futureEvent = input.futureEvent ?? null;
  const noPlan = (
    reason: FutureNotificationPlanReason,
    opportunityAt: string | null = futureEvent?.start?.toISOString?.() ?? null,
  ): FutureNotificationPlan => ({
    notification: null,
    reason,
    evaluatedAt: now.toISOString(),
    opportunityAt,
  });

  if (!futureEvent) return noPlan("no_future_event", null);
  if (futureEvent.status !== "upcoming") return noPlan("event_not_upcoming");

  const opportunityAt = futureEvent.start;
  const leadMs = opportunityAt.getTime() - now.getTime();
  if (!Number.isFinite(leadMs) || leadMs <= 0) {
    return noPlan("event_not_in_future");
  }

  const horizonMinutes = Math.max(
    0,
    input.horizonMinutes ?? DEFAULT_FUTURE_NOTIFICATION_HORIZON_MINUTES,
  );
  if (leadMs > horizonMinutes * 60_000) {
    return noPlan("event_beyond_planning_horizon");
  }

  // Planning evaluates the already-known future biological opportunity at the
  // time it begins. This does not make the opportunity current now and does not
  // change the selected target. It asks the existing coaching stack what it
  // would approve if nothing else changed before that known event starts.
  const projectedEvent: FlowEvent = {
    ...futureEvent,
    status: "current",
  };

  const projectedDecision = assembleNowCoachingDecision({
    day1: input.day1,
    activeEvent: projectedEvent,
    derivedEnvironment: input.derivedEnvironment ?? input.day1.derivedEnvironment ?? null,
    reconsideration: input.reconsideration ?? null,
    now: opportunityAt,
  });
  const voice = buildVoiceRelationshipOutput(projectedDecision);
  const orchestration = orchestrateNotificationDelivery({
    candidate: projectedDecision.candidate,
    activeEvent: projectedEvent,
    voice,
    now: opportunityAt,
  });

  // Future v1 schedules only ordinary Level 3 coaching notifications tied to a
  // known circadian event. Contextual alerts depend on disruptions that cannot
  // be safely projected ahead of time.
  if (
    !orchestration.shouldDeliver ||
    !orchestration.payload ||
    orchestration.payload.channel !== "NOTIFICATION" ||
    orchestration.payload.level !== 3
  ) {
    return noPlan("future_opportunity_not_interrupt_eligible");
  }

  const memory = evaluateNotificationDeliveryMemory({
    payload: orchestration.payload,
    history: input.delivered ?? null,
    now: opportunityAt,
    materialChangeKey: input.materialChangeKey ?? null,
  });
  if (!memory.allowDelivery) return noPlan("cooldown_active");

  return {
    notification: {
      id: futureNotificationId(projectedEvent, orchestration.payload.targetSignalId),
      targetSignalId: orchestration.payload.targetSignalId,
      eventId: projectedEvent.id,
      channel: "NOTIFICATION",
      title: orchestration.payload.title,
      body: orchestration.payload.body,
      scheduledFor: opportunityAt.toISOString(),
    },
    reason: "planned",
    evaluatedAt: now.toISOString(),
    opportunityAt: opportunityAt.toISOString(),
  };
}

export default planFutureNotification;
