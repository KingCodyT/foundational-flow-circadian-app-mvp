import {
  DeliveredNotificationRecord,
  ScheduledNotificationRecord,
} from "./notification-runtime";

export type NotificationPersistenceState = {
  scheduledNotification: ScheduledNotificationRecord | null;
  deliveredNotifications: DeliveredNotificationRecord[];
  materialChangeKeys: Record<string, string>;
};

export const DEFAULT_NOTIFICATION_PERSISTENCE_STATE: NotificationPersistenceState = {
  scheduledNotification: null,
  deliveredNotifications: [],
  materialChangeKeys: {},
};

const MAX_DELIVERED_HISTORY = 100;
const DELIVERED_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const SCHEDULED_RETENTION_MS = 24 * 60 * 60 * 1000;

function isValidDate(value?: string | null): boolean {
  if (!value) return false;
  return !Number.isNaN(new Date(value).getTime());
}

export function pruneNotificationPersistenceState(
  state?: Partial<NotificationPersistenceState> | null,
  now: Date = new Date(),
): NotificationPersistenceState {
  const delivered = Array.isArray(state?.deliveredNotifications)
    ? state!.deliveredNotifications!
        .filter((record) => {
          if (!record || !isValidDate(record.deliveredAt)) return false;
          const ageMs = now.getTime() - new Date(record.deliveredAt).getTime();
          return ageMs >= 0 && ageMs <= DELIVERED_RETENTION_MS;
        })
        .sort(
          (a, b) =>
            new Date(b.deliveredAt).getTime() - new Date(a.deliveredAt).getTime(),
        )
        .slice(0, MAX_DELIVERED_HISTORY)
    : [];

  let scheduledNotification = state?.scheduledNotification ?? null;
  if (scheduledNotification) {
    if (!isValidDate(scheduledNotification.scheduledFor)) {
      scheduledNotification = null;
    } else {
      const ageMs =
        now.getTime() - new Date(scheduledNotification.scheduledFor).getTime();
      if (ageMs < 0 || ageMs > SCHEDULED_RETENTION_MS) {
        scheduledNotification = null;
      }
    }
  }

  const materialChangeKeys =
    state?.materialChangeKeys && typeof state.materialChangeKeys === "object"
      ? { ...state.materialChangeKeys }
      : {};

  return {
    scheduledNotification,
    deliveredNotifications: delivered,
    materialChangeKeys,
  };
}

export function upsertDeliveredNotification(
  current: DeliveredNotificationRecord[],
  record: DeliveredNotificationRecord,
  now: Date = new Date(record.deliveredAt),
): DeliveredNotificationRecord[] {
  const next = [
    record,
    ...current.filter((existing) => existing.id !== record.id),
  ];

  return pruneNotificationPersistenceState(
    { deliveredNotifications: next },
    now,
  ).deliveredNotifications;
}

export function setMaterialChangeKey(
  current: Record<string, string>,
  identity: string,
  materialChangeKey: string | null,
): Record<string, string> {
  const next = { ...current };

  if (!materialChangeKey) {
    delete next[identity];
  } else {
    next[identity] = materialChangeKey;
  }

  return next;
}
