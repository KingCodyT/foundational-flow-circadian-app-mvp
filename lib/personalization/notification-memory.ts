import { NotificationPayload } from "./notification-orchestration";

export const DEFAULT_DELIVERY_COOLDOWN_MINUTES = 90;

export type NotificationDeliveryMemoryRecord = {
  channel: "NOTIFICATION" | "CONTEXTUAL_ALERT";
  targetSignalId: string | null;
  eventId: string | null;
  deliveredAt: string;
  materialChangeKey?: string | null;
};

export type NotificationDeliveryMemoryInput = {
  payload: NotificationPayload;
  history?: NotificationDeliveryMemoryRecord[] | null;
  now?: Date | null;
  cooldownMinutes?: number | null;
  materialChangeKey?: string | null;
};

export type NotificationDeliveryMemoryDecision = {
  allowDelivery: boolean;
  reason:
    | "no_prior_delivery"
    | "material_change_bypasses_cooldown"
    | "cooldown_elapsed"
    | "cooldown_active";
  evaluatedAt: string;
  lastDeliveredAt: string | null;
  cooldownMinutes: number;
  remainingCooldownMinutes: number;
};

function sameDeliverySlot(
  record: NotificationDeliveryMemoryRecord,
  payload: NotificationPayload,
): boolean {
  return (
    record.channel === payload.channel &&
    record.targetSignalId === payload.targetSignalId &&
    record.eventId === payload.eventId
  );
}

function parseDeliveredAt(value: string): number | null {
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

export function evaluateNotificationDeliveryMemory(
  input: NotificationDeliveryMemoryInput,
): NotificationDeliveryMemoryDecision {
  const now = input.now ?? new Date();
  const cooldownMinutes = Math.max(
    0,
    input.cooldownMinutes ?? DEFAULT_DELIVERY_COOLDOWN_MINUTES,
  );
  const cooldownMs = cooldownMinutes * 60_000;

  const matchingHistory = (input.history ?? [])
    .map((record) => ({ record, timestamp: parseDeliveredAt(record.deliveredAt) }))
    .filter(
      (entry): entry is { record: NotificationDeliveryMemoryRecord; timestamp: number } =>
        entry.timestamp !== null && sameDeliverySlot(entry.record, input.payload),
    )
    .sort((a, b) => b.timestamp - a.timestamp);

  const latest = matchingHistory[0] ?? null;

  if (!latest) {
    return {
      allowDelivery: true,
      reason: "no_prior_delivery",
      evaluatedAt: now.toISOString(),
      lastDeliveredAt: null,
      cooldownMinutes,
      remainingCooldownMinutes: 0,
    };
  }

  const currentChangeKey = input.materialChangeKey ?? null;
  const previousChangeKey = latest.record.materialChangeKey ?? null;
  if (
    currentChangeKey &&
    previousChangeKey &&
    currentChangeKey !== previousChangeKey
  ) {
    return {
      allowDelivery: true,
      reason: "material_change_bypasses_cooldown",
      evaluatedAt: now.toISOString(),
      lastDeliveredAt: latest.record.deliveredAt,
      cooldownMinutes,
      remainingCooldownMinutes: 0,
    };
  }

  const elapsedMs = Math.max(0, now.getTime() - latest.timestamp);
  if (elapsedMs >= cooldownMs) {
    return {
      allowDelivery: true,
      reason: "cooldown_elapsed",
      evaluatedAt: now.toISOString(),
      lastDeliveredAt: latest.record.deliveredAt,
      cooldownMinutes,
      remainingCooldownMinutes: 0,
    };
  }

  return {
    allowDelivery: false,
    reason: "cooldown_active",
    evaluatedAt: now.toISOString(),
    lastDeliveredAt: latest.record.deliveredAt,
    cooldownMinutes,
    remainingCooldownMinutes: Math.ceil((cooldownMs - elapsedMs) / 60_000),
  };
}

export function recordNotificationDeliveryMemory(
  payload: NotificationPayload,
  deliveredAt: Date = new Date(),
  materialChangeKey?: string | null,
): NotificationDeliveryMemoryRecord {
  return {
    channel: payload.channel,
    targetSignalId: payload.targetSignalId,
    eventId: payload.eventId,
    deliveredAt: deliveredAt.toISOString(),
    materialChangeKey: materialChangeKey ?? null,
  };
}

export default evaluateNotificationDeliveryMemory;
