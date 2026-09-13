"use client";

import { useEffect, useRef } from "react";
import { useCircadian } from "@/components/circadian-provider";
import {
  dispatchScheduledNotification,
  normalizeDeliveredTransportMessage,
  registerNotificationServiceWorker,
} from "@/lib/personalization/background-notification-transport";
import {
  cancelServerPushSchedule,
  ensureWebPushSubscription,
  fetchServerPushDeliveries,
  syncServerPushSchedule,
} from "@/lib/personalization/web-push-client";

const SERVER_SCHEDULE_LEAD_MS = 30_000;

export function NotificationTransportBridge() {
  const {
    clientId,
    isHydrated,
    notificationState,
    recordDeliveredNotification,
  } = useCircadian();
  const serverScheduledId = useRef<string | null>(null);

  useEffect(() => {
    if (
      !isHydrated ||
      !clientId ||
      typeof navigator === "undefined" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    void registerNotificationServiceWorker().then(async () => {
      await ensureWebPushSubscription(clientId);
      const deliveries = await fetchServerPushDeliveries(clientId);
      for (const delivery of deliveries) recordDeliveredNotification(delivery);
    });

    const onMessage = (event: MessageEvent) => {
      const delivered = normalizeDeliveredTransportMessage(event.data);
      if (delivered) recordDeliveredNotification(delivered);
    };

    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [clientId, isHydrated, recordDeliveredNotification]);

  useEffect(() => {
    if (!isHydrated || !clientId) return;

    const scheduled = notificationState.scheduledNotification;
    const previousServerId = serverScheduledId.current;

    if (previousServerId && previousServerId !== scheduled?.id) {
      void cancelServerPushSchedule(clientId, previousServerId);
      serverScheduledId.current = null;
    }

    if (!scheduled) return;

    const scheduledTime = new Date(scheduled.scheduledFor).getTime();
    const isMeaningfullyFuture =
      Number.isFinite(scheduledTime) && scheduledTime - Date.now() > SERVER_SCHEDULE_LEAD_MS;

    if (isMeaningfullyFuture) {
      void ensureWebPushSubscription(clientId).then(async (state) => {
        if (state !== "SUBSCRIBED") return;
        const synced = await syncServerPushSchedule(clientId, scheduled);
        if (synced) serverScheduledId.current = scheduled.id;
      });
      return;
    }

    // Due-now notifications remain local-first to avoid a local + cron duplicate.
    // Future approved notifications are handed to the durable server scheduler.
    void dispatchScheduledNotification(scheduled);
  }, [clientId, isHydrated, notificationState.scheduledNotification]);

  return null;
}

export default NotificationTransportBridge;
