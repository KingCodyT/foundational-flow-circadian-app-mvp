import type { NextApiRequest, NextApiResponse } from "next";
import { getPushSubscription, getServerPushSchedule, deletePushSubscription, redisCommand } from "@/lib/personalization/server-push-store";
import { activeKey, publicReminder, withPushLock, saveLifecycle } from "@/lib/personalization/push-lifecycle";
import { sendWebPush } from "@/lib/personalization/web-push-server";
import { missingPushConfiguration, pushFailure } from "@/lib/personalization/push-configuration";
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "method_not_allowed" }); }
  if (!process.env.PUSH_DISPATCH_SECRET || req.headers.authorization !== `Bearer ${process.env.PUSH_DISPATCH_SECRET}`) return res.status(401).json({ error: "unauthorized" });
  if (missingPushConfiguration().length) return res.status(503).json(pushFailure(null));
  const { clientId, notificationId, scheduleRevision } = req.body ?? {};
  if (typeof clientId !== "string" || typeof notificationId !== "string" || typeof scheduleRevision !== "string") return res.status(400).json({ error: "invalid_dispatch_request" });
  try {
    const result = await withPushLock(clientId, async () => {
      const record = await getServerPushSchedule(clientId, notificationId);
      if (!record || record.scheduleRevision !== scheduleRevision || !["scheduled", "deferred"].includes(record.state || "scheduled") ||
        await redisCommand(["GET", activeKey(clientId, record.notification.eventId, record.dateKey)]) !== notificationId) return 204;
      if (Date.parse(record.scheduledFor) > Date.now()) return 425;
      if (!record.validUntil || Date.parse(record.validUntil) < Date.now()) {
        record.state = "failed"; record.reason = "Reminder window expired before delivery"; await saveLifecycle(record); return 204;
      }
      const subscription = await getPushSubscription(clientId);
      if (!subscription) { record.state = "failed"; record.reason = "No phone/browser push subscription; enable notifications on that device"; await saveLifecycle(record); return 204; }
      const sent = await sendWebPush(subscription, publicReminder(record));
      if (sent.ok) {
        record.state = "sent"; record.reason = "Push service accepted; device display is not yet confirmed";
        await saveLifecycle(record); return 204;
      }
      if (sent.subscriptionExpired) {
        await deletePushSubscription(clientId); record.state = "failed"; record.reason = "Push subscription expired; reconnect notifications on this device";
        await saveLifecycle(record); return 204;
      }
      record.reason = `web_push_rejected:${sent.status}`; await saveLifecycle(record); throw new Error(record.reason);
    });
    return result === 425 ? res.status(425).json({ error: "dispatch_arrived_too_early" }) : res.status(204).end();
  } catch (error) { return res.status(503).json(pushFailure(error)); }
}
