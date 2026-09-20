import type { ScheduledNotificationRecord } from "./notification-runtime";
export type RemoteReminder = ScheduledNotificationRecord & { state?: string; reason?: string; updatedAt?: string; deliveredAt?: string; pendingAction?: string };
async function request(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const payload = response.status === 204 ? {} : await response.json();
  if (!response.ok) throw new Error(payload.reason || payload.error || `Push request failed (${response.status})`);
  return payload;
}
function post(body: unknown): RequestInit { return { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }; }
function bytes(value: string) {
  const raw = atob(value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4));
  return Uint8Array.from(raw, character => character.charCodeAt(0));
}
export async function ensureWebPushSubscription(clientId: string) {
  if (!window.isSecureContext) throw new Error("Push requires HTTPS (localhost is allowed only on this computer)");
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) throw new Error("Web Push unavailable; on iPhone use an installed Home Screen web app");
  if (Notification.permission !== "granted") throw new Error("Notification permission is not granted on this device");
  const { publicKey } = await request("/api/push/public-key");
  if (!publicKey) throw new Error("VAPID public key is missing");
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription() || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes(publicKey) });
  await request("/api/push/subscribe", post({ clientId, subscription: subscription.toJSON() }));
  return "SUBSCRIBED" as const;
}
export async function syncServerPushSchedule(clientId: string, notification: ScheduledNotificationRecord): Promise<RemoteReminder> {
  const result = await request("/api/push/schedule", post({ clientId, notification }));
  if (!result.reminder) throw new Error("Scheduler returned no confirmed reminder");
  return result.reminder;
}
export async function cancelServerPushSchedule(clientId: string, notificationId: string) {
  await request("/api/push/schedule", { ...post({ clientId, notificationId }), method: "DELETE" });
}
export async function fetchServerPushDeliveries(clientId: string): Promise<{ deliveries: import("./notification-runtime").DeliveredNotificationRecord[]; reminder: RemoteReminder | null }> {
  return request(`/api/push/deliveries?clientId=${encodeURIComponent(clientId)}`);
}
export async function sendReminderAction(notification: ScheduledNotificationRecord, action: string, remindAt?: string): Promise<RemoteReminder> {
  return (await request("/api/push/action", post({ clientId: notification.clientId, notificationId: notification.id, actionToken: notification.actionToken, action, remindAt }))).reminder;
}
