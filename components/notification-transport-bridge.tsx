"use client";

import { useEffect } from "react";
import { useCircadian } from "@/components/circadian-provider";
import {
  dispatchScheduledNotification,
  normalizeDeliveredTransportMessage,
  registerNotificationServiceWorker,
} from "@/lib/personalization/background-notification-transport";

export function NotificationTransportBridge() {
  const {
    isHydrated,
    notificationState,
    recordDeliveredNotification,
  } = useCircadian();

  useEffect(() => {
    if (!isHydrated || typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    void registerNotificationServiceWorker();

    const onMessage = (event: MessageEvent) => {
      const delivered = normalizeDeliveredTransportMessage(event.data);
      if (delivered) recordDeliveredNotification(delivered);
    };

    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [isHydrated, recordDeliveredNotification]);

  useEffect(() => {
    if (!isHydrated || !notificationState.scheduledNotification) return;

    // This dispatches only notifications that are already due and already
    // approved upstream. Permission prompts are never triggered automatically.
    void dispatchScheduledNotification(notificationState.scheduledNotification);
  }, [isHydrated, notificationState.scheduledNotification]);

  return null;
}

export default NotificationTransportBridge;
