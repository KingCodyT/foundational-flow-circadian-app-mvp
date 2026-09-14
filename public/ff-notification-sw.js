/* Foundational Flow notification transport service worker.
 * This worker renders notifications that have already been approved upstream.
 * It does not choose targets, timing, coaching level, or biological relevance.
 */

const SHOW_NOTIFICATION_MESSAGE = "FF_SHOW_NOTIFICATION";
const NOTIFICATION_DELIVERED_MESSAGE = "FF_NOTIFICATION_DELIVERED";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function validNotification(notification) {
  return Boolean(
    notification &&
      typeof notification.id === "string" &&
      typeof notification.title === "string" &&
      typeof notification.body === "string" &&
      (notification.channel === "NOTIFICATION" ||
        notification.channel === "CONTEXTUAL_ALERT"),
  );
}

async function broadcastDelivered(notification, deliveredAt) {
  const clients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });

  for (const client of clients) {
    client.postMessage({
      type: NOTIFICATION_DELIVERED_MESSAGE,
      record: {
        id: notification.id,
        targetSignalId: notification.targetSignalId ?? null,
        eventId: notification.eventId ?? null,
        channel: notification.channel,
        deliveredAt,
      },
    });
  }
}

async function showApprovedNotification(notification) {
  if (!validNotification(notification)) return;

  const deliveredAt = new Date().toISOString();
  await self.registration.showNotification(notification.title, {
    body: notification.body,
    tag: notification.id,
    renotify: false,
    data: {
      notificationId: notification.id,
      targetSignalId: notification.targetSignalId ?? null,
      eventId: notification.eventId ?? null,
      channel: notification.channel,
      url: "/now",
    },
  });

  await broadcastDelivered(notification, deliveredAt);
}

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== SHOW_NOTIFICATION_MESSAGE) return;
  event.waitUntil(showApprovedNotification(data.notification));
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    return;
  }

  const notification = payload?.notification ?? payload;
  event.waitUntil(showApprovedNotification(notification));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/now";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
      return undefined;
    }),
  );
});
