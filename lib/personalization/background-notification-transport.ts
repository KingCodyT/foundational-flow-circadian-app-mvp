import {
  DeliveredNotificationRecord,
  NotificationPermissionState,
  ScheduledNotificationRecord,
} from "./notification-runtime";

export const NOTIFICATION_SERVICE_WORKER_PATH = "/ff-notification-sw.js";
export const NOTIFICATION_DELIVERED_MESSAGE = "FF_NOTIFICATION_DELIVERED";
export const SHOW_NOTIFICATION_MESSAGE = "FF_SHOW_NOTIFICATION";

export type NotificationTransportSupport = {
  supported: boolean;
  serviceWorker: boolean;
  notifications: boolean;
};

export type NotificationTransportRegistrationResult =
  | { ok: true; registration: ServiceWorkerRegistration }
  | { ok: false; reason: "unsupported" | "registration_failed" };

export type NotificationTransportDispatchResult =
  | { ok: true; reason: "dispatched_to_service_worker" }
  | {
      ok: false;
      reason:
        | "unsupported"
        | "permission_not_granted"
        | "not_due_yet"
        | "service_worker_unavailable";
    };

export function getNotificationTransportSupport(): NotificationTransportSupport {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return { supported: false, serviceWorker: false, notifications: false };
  }

  const serviceWorker = "serviceWorker" in navigator;
  const notifications = "Notification" in window;

  return {
    supported: serviceWorker && notifications,
    serviceWorker,
    notifications,
  };
}

export function getBrowserNotificationPermissionState(): NotificationPermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "UNAVAILABLE";
  }

  switch (Notification.permission) {
    case "granted":
      return "GRANTED";
    case "denied":
      return "DENIED";
    default:
      return "PROMPT";
  }
}

export async function requestBrowserNotificationPermission(): Promise<NotificationPermissionState> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "UNAVAILABLE";
  }

  const permission = await Notification.requestPermission();
  if (permission === "granted") return "GRANTED";
  if (permission === "denied") return "DENIED";
  return "PROMPT";
}

export async function registerNotificationServiceWorker(): Promise<NotificationTransportRegistrationResult> {
  const support = getNotificationTransportSupport();
  if (!support.supported) return { ok: false, reason: "unsupported" };

  try {
    const registration = await navigator.serviceWorker.register(
      NOTIFICATION_SERVICE_WORKER_PATH,
      { scope: "/" },
    );
    return { ok: true, registration };
  } catch {
    return { ok: false, reason: "registration_failed" };
  }
}

export function isNotificationDue(
  notification: Pick<ScheduledNotificationRecord, "scheduledFor">,
  now: Date = new Date(),
): boolean {
  const scheduledAt = new Date(notification.scheduledFor);
  if (Number.isNaN(scheduledAt.getTime())) return false;
  return scheduledAt.getTime() <= now.getTime();
}

export async function dispatchScheduledNotification(
  notification: ScheduledNotificationRecord,
  now: Date = new Date(),
): Promise<NotificationTransportDispatchResult> {
  const support = getNotificationTransportSupport();
  if (!support.supported) return { ok: false, reason: "unsupported" };
  if (getBrowserNotificationPermissionState() !== "GRANTED") {
    return { ok: false, reason: "permission_not_granted" };
  }
  if (!isNotificationDue(notification, now)) {
    return { ok: false, reason: "not_due_yet" };
  }

  const registration = await navigator.serviceWorker.ready.catch(() => null);
  const worker = registration?.active ?? navigator.serviceWorker.controller;
  if (!worker) {
    return { ok: false, reason: "service_worker_unavailable" };
  }

  worker.postMessage({
    type: SHOW_NOTIFICATION_MESSAGE,
    notification,
  });

  return { ok: true, reason: "dispatched_to_service_worker" };
}

export function normalizeDeliveredTransportMessage(
  data: unknown,
): DeliveredNotificationRecord | null {
  if (!data || typeof data !== "object") return null;
  const value = data as Record<string, unknown>;
  if (value.type !== NOTIFICATION_DELIVERED_MESSAGE) return null;

  const record = value.record;
  if (!record || typeof record !== "object") return null;
  const candidate = record as Record<string, unknown>;

  if (
    typeof candidate.id !== "string" ||
    (candidate.targetSignalId !== null &&
      typeof candidate.targetSignalId !== "string") ||
    (candidate.eventId !== null && typeof candidate.eventId !== "string") ||
    (candidate.channel !== "NOTIFICATION" &&
      candidate.channel !== "CONTEXTUAL_ALERT") ||
    typeof candidate.deliveredAt !== "string"
  ) {
    return null;
  }

  const deliveredAt = new Date(candidate.deliveredAt);
  if (Number.isNaN(deliveredAt.getTime())) return null;

  return {
    id: candidate.id,
    targetSignalId: candidate.targetSignalId as string | null,
    eventId: candidate.eventId as string | null,
    channel: candidate.channel,
    deliveredAt: deliveredAt.toISOString(),
  };
}
