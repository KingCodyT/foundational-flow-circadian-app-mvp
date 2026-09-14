import { NotificationOrchestrationResult, NotificationPayload } from "./notification-orchestration";
import { NotificationDeliveryMemoryDecision } from "./notification-memory";

export type NotificationPermissionState = "GRANTED" | "DENIED" | "PROMPT" | "UNAVAILABLE";

export type ScheduledNotificationRecord = {
  id: string;
  targetSignalId: string | null;
  eventId: string | null;
  channel: "NOTIFICATION" | "CONTEXTUAL_ALERT";
  title: string;
  body: string;
  scheduledFor: string;
  validUntil?: string | null;
};

export type DeliveredNotificationRecord = {
  id: string;
  targetSignalId: string | null;
  eventId: string | null;
  channel: "NOTIFICATION" | "CONTEXTUAL_ALERT";
  deliveredAt: string;
};

export type NotificationRuntimeCommand =
  | {
      type: "SCHEDULE";
      notification: ScheduledNotificationRecord;
      reason: "approved_notification_ready";
    }
  | {
      type: "CANCEL";
      notificationId: string;
      reason:
        | "orchestration_no_longer_deliverable"
        | "scheduled_notification_is_stale";
    }
  | {
      type: "NOOP";
      reason:
        | "permission_not_granted"
        | "nothing_to_schedule"
        | "already_scheduled"
        | "already_delivered"
        | "cooldown_active";
    };

export type NotificationRuntimeInput = {
  orchestration: NotificationOrchestrationResult;
  permission: NotificationPermissionState;
  memory?: NotificationDeliveryMemoryDecision | null;
  scheduled?: ScheduledNotificationRecord | null;
  delivered?: DeliveredNotificationRecord[] | null;
  now?: Date | null;
};

export type NotificationRuntimeResult = {
  command: NotificationRuntimeCommand;
  evaluatedAt: string;
};

function payloadIdentity(payload: NotificationPayload): string {
  return [
    payload.channel,
    payload.targetSignalId ?? "none",
    payload.eventId ?? "none",
    payload.title,
    payload.body,
  ].join("::");
}

function recordIdentity(record: ScheduledNotificationRecord): string {
  return [
    record.channel,
    record.targetSignalId ?? "none",
    record.eventId ?? "none",
    record.title,
    record.body,
  ].join("::");
}

function deliveredMatchesPayload(
  delivered: DeliveredNotificationRecord,
  payload: NotificationPayload,
): boolean {
  return (
    delivered.channel === payload.channel &&
    delivered.targetSignalId === payload.targetSignalId &&
    delivered.eventId === payload.eventId
  );
}

function scheduledMatchesPayload(
  scheduled: ScheduledNotificationRecord,
  payload: NotificationPayload,
): boolean {
  return recordIdentity(scheduled) === payloadIdentity(payload);
}

function makeNotificationId(payload: NotificationPayload): string {
  return [
    payload.channel.toLowerCase(),
    payload.targetSignalId ?? "none",
    payload.eventId ?? "none",
  ].join(":");
}

export function planNotificationRuntime(
  input: NotificationRuntimeInput,
): NotificationRuntimeResult {
  const now = input.now ?? new Date();
  const scheduled = input.scheduled ?? null;
  const payload = input.orchestration.payload;

  if (!input.orchestration.shouldDeliver || !payload) {
    if (scheduled) {
      return {
        command: {
          type: "CANCEL",
          notificationId: scheduled.id,
          reason: "orchestration_no_longer_deliverable",
        },
        evaluatedAt: now.toISOString(),
      };
    }

    return {
      command: { type: "NOOP", reason: "nothing_to_schedule" },
      evaluatedAt: now.toISOString(),
    };
  }

  if (input.memory && !input.memory.allowDelivery) {
    return {
      command: { type: "NOOP", reason: "cooldown_active" },
      evaluatedAt: now.toISOString(),
    };
  }

  if (input.permission !== "GRANTED") {
    return {
      command: { type: "NOOP", reason: "permission_not_granted" },
      evaluatedAt: now.toISOString(),
    };
  }

  const delivered = input.delivered ?? [];
  if (delivered.some((record) => deliveredMatchesPayload(record, payload))) {
    return {
      command: { type: "NOOP", reason: "already_delivered" },
      evaluatedAt: now.toISOString(),
    };
  }

  if (scheduled) {
    if (scheduledMatchesPayload(scheduled, payload)) {
      return {
        command: { type: "NOOP", reason: "already_scheduled" },
        evaluatedAt: now.toISOString(),
      };
    }

    return {
      command: {
        type: "CANCEL",
        notificationId: scheduled.id,
        reason: "scheduled_notification_is_stale",
      },
      evaluatedAt: now.toISOString(),
    };
  }

  return {
    command: {
      type: "SCHEDULE",
      notification: {
        id: makeNotificationId(payload),
        targetSignalId: payload.targetSignalId,
        eventId: payload.eventId,
        channel: payload.channel,
        title: payload.title,
        body: payload.body,
        scheduledFor: now.toISOString(),
      },
      reason: "approved_notification_ready",
    },
    evaluatedAt: now.toISOString(),
  };
}

export function recordDeliveredNotification(
  scheduled: ScheduledNotificationRecord,
  deliveredAt: Date = new Date(),
): DeliveredNotificationRecord {
  return {
    id: scheduled.id,
    targetSignalId: scheduled.targetSignalId,
    eventId: scheduled.eventId,
    channel: scheduled.channel,
    deliveredAt: deliveredAt.toISOString(),
  };
}

export default planNotificationRuntime;
