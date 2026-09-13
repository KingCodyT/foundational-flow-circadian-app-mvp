import { ScheduledNotificationRecord } from "./notification-runtime";

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

export type WebPushSubscriptionState =
  | "UNAVAILABLE"
  | "PERMISSION_NOT_GRANTED"
  | "SERVER_UNAVAILABLE"
  | "SUBSCRIBED";

export async function ensureWebPushSubscription(
  clientId: string,
): Promise<WebPushSubscriptionState> {
  if (
    typeof window === "undefined" ||
    typeof navigator === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window)
  ) {
    return "UNAVAILABLE";
  }

  if (Notification.permission !== "granted") {
    return "PERMISSION_NOT_GRANTED";
  }

  const publicKeyResponse = await fetch("/api/push/public-key");
  if (!publicKeyResponse.ok) return "SERVER_UNAVAILABLE";
  const { publicKey } = (await publicKeyResponse.json()) as { publicKey?: string };
  if (!publicKey) return "SERVER_UNAVAILABLE";

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const response = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientId,
      subscription: subscription.toJSON(),
    }),
  });

  return response.ok ? "SUBSCRIBED" : "SERVER_UNAVAILABLE";
}

export async function syncServerPushSchedule(
  clientId: string,
  notification: ScheduledNotificationRecord,
) {
  const response = await fetch("/api/push/schedule", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, notification }),
  });

  return response.ok;
}

export async function cancelServerPushSchedule(
  clientId: string,
  notificationId: string,
) {
  const response = await fetch("/api/push/schedule", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, notificationId }),
  });

  return response.ok;
}
