"use client";
import { useEffect, useRef } from "react";
import { useCircadian } from "./circadian-provider";
import { registerNotificationServiceWorker } from "@/lib/personalization/background-notification-transport";
import { cancelServerPushSchedule, ensureWebPushSubscription, fetchServerPushDeliveries, syncServerPushSchedule, sendReminderAction, type RemoteReminder } from "@/lib/personalization/web-push-client";
import { localDateKey } from "@/lib/live-clock";

export function NotificationTransportBridge() {
  const context = useCircadian();
  const latest = useRef(context); latest.current = context;
  const { isHydrated, clientId } = context;
  useEffect(() => {
    if (!isHydrated || !clientId) return;
    let stopped = false, busy = false, subscribed = false, statusKey = "";
    let registered = false;
    const fail = (id: string, error: unknown) => {
      const reason = error instanceof Error ? error.message : String(error);
      const key = `${id}:Failed:${reason}`;
      if (key !== statusKey && !stopped) {
        statusKey = key;
        latest.current.recordDeliveryStatus({ id, status: "Failed", reason, at: new Date().toISOString() });
        latest.current.setDeliverySetup({ id, status: "unavailable", reason });
      }
    };
    const apply = (reminder: RemoteReminder | null) => {
      if (reminder?.eventId === "meal_suggestion") return;
      if (stopped || !reminder || !reminder.id || !reminder.scheduledFor) return;
      const ctx = latest.current;
      if (["scheduled", "sent", "deferred"].includes(reminder.state || "") && Date.parse(reminder.validUntil || "") < Date.now()) return;
      const labels = { scheduled: "Scheduled", sent: "Scheduled", delivered: "Delivered", deferred: "Deferred", completed: "Completed", suppressed: "Suppressed", failed: "Failed" } as const;
      const status = labels[reminder.state as keyof typeof labels];
      if (!status) return;
      const key = `${reminder.id}:${status}:${reminder.scheduledFor}:${reminder.reason}`;
      if (key !== statusKey) {
        statusKey = key;
        ctx.recordDeliveryStatus({ id: reminder.id, status, reason: reminder.reason, scheduledFor: reminder.scheduledFor, at: reminder.updatedAt || new Date().toISOString() });
      }
      if (["scheduled", "deferred", "sent"].includes(reminder.state!)) {
        ctx.setDeliverySetup({ id: ctx.notificationState.scheduledNotification?.id || reminder.id, status: "scheduled" });
        const last = ctx.notificationState.lastNotification;
        if (last?.id !== reminder.id || last.actionToken !== reminder.actionToken || last.scheduledFor !== reminder.scheduledFor) ctx.setScheduledNotification(reminder);
      }
      if (reminder.deliveredAt) ctx.recordDeliveredNotification({ id: reminder.id, eventId: reminder.eventId, targetSignalId: reminder.targetSignalId, channel: reminder.channel, deliveredAt: reminder.deliveredAt });
      const effectiveState = reminder.pendingAction === "done" ? "completed" : reminder.pendingAction === "skip" ? "suppressed" : reminder.state;
      if (reminder.dateKey && reminder.eventId && ["completed", "suppressed", "deferred"].includes(effectiveState!)) {
        // Only explicit user suppression is evidence, not automatic planner cancellation.
        if (effectiveState === "suppressed" && reminder.reason !== "Not tonight" && reminder.pendingAction !== "skip") return;
        const record = ctx.eventStateByDate?.[reminder.dateKey]?.[reminder.eventId];
        const desired = effectiveState === "completed" ? "completed" : effectiveState === "suppressed" ? "skipped" : "upcoming";
        if (record?.status !== desired || (desired === "upcoming" && record.remindAt !== reminder.scheduledFor)) ctx.setEventRecord(reminder.dateKey, reminder.eventId, {
          fromNotification: true, status: desired, at: reminder.updatedAt || new Date().toISOString(), ...(desired === "upcoming" ? { remindAt: reminder.scheduledFor } : {}),
        });
        if (desired !== "upcoming" && ctx.notificationState.scheduledNotification?.id === reminder.id) ctx.setScheduledNotification(null);
      }
    };
    async function tick() {
      if (busy || stopped) return;
      busy = true;
      const ctx = latest.current;
      const local = ctx.notificationState.lastNotification;
      const scheduled = ctx.notificationState.scheduledNotification;
      try {
        if (ctx.dailyProfile?.remindersEnabled !== true) {
          subscribed = false;
          if (local?.actionToken && !["Completed", "Suppressed", "Delivered"].includes(ctx.notificationState.deliveryStatus?.status || "")) {
            await cancelServerPushSchedule(clientId, local.id);
            ctx.recordDeliveryStatus({ id: local.id, status: "Suppressed", reason: "Notifications are off", at: new Date().toISOString() });
          }
          return;
        }
        if (!("Notification" in window) || Notification.permission !== "granted") {
          subscribed = false; throw new Error("Notification permission is not granted on this device");
        }
        if (!registered) {
          const registration = await registerNotificationServiceWorker();
          if (!registration.ok) throw new Error(`Service worker ${registration.reason}`);
          registered = true;
          const worker = (await navigator.serviceWorker.ready).active;
          worker?.postMessage({ type: "FF_GET_REMINDER_STATE" });
        }
        if (!subscribed) { await ensureWebPushSubscription(clientId); subscribed = true; }
        if (stopped) return;
        if (local?.actionToken && local.dateKey && local.eventId) {
          const response = ctx.eventStateByDate?.[local.dateKey]?.[local.eventId];
          const action = response?.status === "completed" ? "done" : response?.status === "skipped" ? "skip" : response?.remindAt && response.remindAt !== local.scheduledFor ? "later" : null;
          const acknowledged = ctx.notificationState.deliveryStatus?.id === local.id &&
            ((action === "done" && ctx.notificationState.deliveryStatus.status === "Completed") || (action === "skip" && ctx.notificationState.deliveryStatus.status === "Suppressed"));
          if (action && !acknowledged) { apply(await sendReminderAction(local, action, response?.remindAt)); return; }
        }
        navigator.serviceWorker.controller?.postMessage({ type: "FF_RETRY_REMINDER_ACTIONS" });
        const receipts = await fetchServerPushDeliveries(clientId);
        // Only service-worker acknowledgement marks delivery, not push-service acceptance.
        for (const receipt of receipts.deliveries || []) ctx.recordDeliveredNotification(receipt);
        const remote = receipts.reminder;
        if (remote && remote.id === local?.id && ["completed", "suppressed", "deferred"].includes(remote.state || "")) { apply(remote); if (remote.state !== "deferred" && (!scheduled || scheduled.id === remote.id)) return; }
        if (scheduled) {
          const timeZone = ctx.dailyProfile?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
          const candidate = { ...scheduled, clientId, timeZone, dateKey: scheduled.dateKey || localDateKey(new Date(scheduled.scheduledFor), timeZone) };
          if (remote?.id === scheduled.id && remote.scheduledFor === scheduled.scheduledFor && remote.state !== "failed") apply(remote);
          else apply(await syncServerPushSchedule(clientId, candidate));
        } else if (remote) {
          const explicit = local?.dateKey && local.eventId ? ctx.eventStateByDate?.[local.dateKey]?.[local.eventId] : null;
          if (["scheduled", "deferred"].includes(remote.state || "") && !explicit?.remindAt) {
            await cancelServerPushSchedule(clientId, remote.id);
          } else apply(remote);
        }
      } catch (error) { fail(scheduled?.id || local?.id || "push-setup", error); }
      finally { busy = false; }
    }
    const onMessage = (event: MessageEvent) => { if (event.data?.type === "FF_REMINDER_STATE") { apply(event.data.record); void tick(); } };
    const refresh = () => { void tick(); };
    navigator.serviceWorker?.addEventListener("message", onMessage);
    window.addEventListener("focus", refresh); window.addEventListener("online", refresh);
    const timer = window.setInterval(refresh, 2000); // Only status/reconciliation; server scheduler owns delivery while closed.
    void tick();
    return () => { stopped = true; window.clearInterval(timer); navigator.serviceWorker?.removeEventListener("message", onMessage); window.removeEventListener("focus", refresh); window.removeEventListener("online", refresh); };
  }, [isHydrated, clientId]);
  return null;
}
export default NotificationTransportBridge;
