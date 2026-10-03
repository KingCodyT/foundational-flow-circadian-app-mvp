import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { redisCommand, getServerPushSchedule, saveServerPushSchedule, type ServerPushScheduleRecord } from "./server-push-store";
import { scheduleQStashDispatch } from "./qstash-scheduler";
import { pushOrigin } from "./push-configuration";
import type { ScheduledNotificationRecord } from "./notification-runtime";
import { scheduleDateKey } from "../schedule-time";

export const activeKey = (clientId: string, eventId?: string | null, dateKey?: string) =>
  eventId === "meal_suggestion" ? `ff:push:meal-active:${clientId}:${dateKey}` : `ff:push:active:${clientId}`;
const evidenceKey = (record: ServerPushScheduleRecord) => `ff:push:handled:${record.clientId}:${record.dateKey}:${["sunset", "dim_house", "digital_sunset"].includes(record.notification.eventId || "") ? "evening" : record.notification.eventId}`;
export async function withPushLock<T>(clientId: string, work: () => Promise<T>): Promise<T> {
  const key = `ff:push:lock:${clientId}`, owner = randomUUID();
  const acquired = await redisCommand(["SET", key, owner, "NX", "EX", 60]);
  if (!acquired) throw new Error("push_lock_busy");
  try { return await work(); }
  finally { await redisCommand(["EVAL", "if redis.call('GET',KEYS[1]) == ARGV[1] then return redis.call('DEL',KEYS[1]) end return 0", 1, key, owner]); }
}
function token(record: ServerPushScheduleRecord) {
  const secret = process.env.PUSH_DISPATCH_SECRET;
  if (!secret) throw new Error("qstash_unavailable");
  return createHmac("sha256", secret).update(JSON.stringify([record.clientId, record.notificationId, record.scheduleRevision])).digest("base64url");
}
export function validActionToken(record: ServerPushScheduleRecord, supplied: unknown) {
  if (typeof supplied !== "string") return false;
  const expected = record.actionToken || token(record), a = Buffer.from(expected), b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}
export async function saveLifecycle(record: ServerPushScheduleRecord) {
  record.updatedAt = new Date().toISOString();
  await saveServerPushSchedule(record);
}
export async function enqueue(record: ServerPushScheduleRecord) {
  record.actionToken = record.actionToken || token(record);
  await saveLifecycle(record);
  await redisCommand(["SET", activeKey(record.clientId, record.notification.eventId, record.dateKey), record.notificationId]);
  try {
    await scheduleQStashDispatch({ destination: `${pushOrigin()}/api/push/dispatch`, clientId: record.clientId, notificationId: record.notificationId, scheduleRevision: record.scheduleRevision, scheduledFor: record.scheduledFor });
  } catch (error) {
    record.state = "failed"; record.reason = error instanceof Error ? error.message : "scheduler_failed";
    await saveLifecycle(record); throw error;
  }
  return record;
}
export async function scheduleReminder(clientId: string, notification: ScheduledNotificationRecord) {
  return withPushLock(clientId, async () => {
    const existing = await getServerPushSchedule(clientId, notification.id);
    if (existing?.notification.eventId === "meal_suggestion" && existing.state === "deferred") return existing;
    if (existing && existing.scheduledFor === notification.scheduledFor && existing.state !== "failed" && existing.state !== "suppressed") return existing;
    const zone = notification.timeZone || "UTC";
    const record: ServerPushScheduleRecord = { clientId, notificationId: notification.id, notification,
      scheduledFor: notification.scheduledFor, validUntil: notification.validUntil || null,
      scheduleRevision: randomUUID(), createdAt: new Date().toISOString(), timeZone: zone,
      dateKey: notification.dateKey || scheduleDateKey(new Date(notification.scheduledFor), zone), state: "scheduled" };
    if (await redisCommand(["GET", evidenceKey(record)])) {
      record.state = "suppressed"; record.reason = "Already handled for this local day"; await saveLifecycle(record); return record;
    }
    const previousId = await redisCommand<string | null>(["GET", activeKey(clientId, notification.eventId, record.dateKey)]);
    if (previousId) {
      const pending = await getServerPushSchedule(clientId, previousId);
      if (pending?.state === "deferred" && pending.notification.eventId === notification.eventId && pending.dateKey === record.dateKey && Date.parse(pending.scheduledFor) === Date.parse(notification.scheduledFor)) return pending;
    }
    if (previousId && previousId !== notification.id) {
      const previous = await getServerPushSchedule(clientId, previousId);
      if (previous && ["scheduled", "deferred", "sent"].includes(previous.state || "scheduled")) { previous.state = "suppressed"; previous.reason = "Replaced by the one current reminder"; await saveLifecycle(previous); }
    }
    return enqueue(record);
  });
}
export async function reminderAction(clientId: string, notificationId: string, suppliedToken: unknown, action: string, remindAt?: string) {
  return withPushLock(clientId, async () => {
    const record = await getServerPushSchedule(clientId, notificationId);
    if (!record || !validActionToken(record, suppliedToken)) throw new Error("invalid_action_token");
    if (action === "inspect") {
      if (await redisCommand(["GET", activeKey(clientId, record.notification.eventId, record.dateKey)]) !== notificationId) return { ...record, state: "suppressed" as const, reason: "Replaced by the current reminder" };
      return record;
    }
    if (["completed", "suppressed"].includes(record.state || "")) return record;
    if (action === "delivered") {
      if (!["delivered", "deferred"].includes(record.state || "")) { record.state = "delivered"; record.reason = "Browser reported displaying this notification"; record.deliveredAt = new Date().toISOString(); await saveLifecycle(record); }
      return record;
    }
    if (action === "done" || action === "skip") {
      record.state = action === "done" ? "completed" : "suppressed";
      record.reason = action === "done" ? "Done" : "Not tonight";
      await redisCommand(["SET", evidenceKey(record), record.state, "EX", 172800]);
      await saveLifecycle(record); return record;
    }
    if (action === "later") {
      if (record.state === "deferred") return record; // repeated action cannot push it back again
      const at = remindAt ? Date.parse(remindAt) : Date.now() + 15 * 60000;
      if (!Number.isFinite(at) || at <= Date.now() || at > Date.now() + 15 * 60000 + 5000 || !record.validUntil || at > Date.parse(record.validUntil)) throw new Error("deferral_outside_window");
      record.scheduledFor = new Date(at).toISOString(); record.notification.scheduledFor = record.scheduledFor;
      record.state = "deferred"; record.reason = "Deferred by 15 minutes"; record.deliveredAt = undefined;
      // Keep the action capability stable; a distinct dispatch revision invalidates old callbacks.
      record.scheduleRevision = randomUUID();
      return enqueue(record);
    }
    throw new Error("invalid_action");
  });
}
export function publicReminder(record: ServerPushScheduleRecord) {
  return { ...record.notification, clientId: record.clientId, actionToken: record.actionToken,
    scheduledFor: record.scheduledFor, dateKey: record.dateKey, timeZone: record.timeZone,
    state: record.state, reason: record.reason, updatedAt: record.updatedAt, deliveredAt: record.deliveredAt };
}
