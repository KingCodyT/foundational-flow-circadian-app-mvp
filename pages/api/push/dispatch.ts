import type { NextApiRequest, NextApiResponse } from "next";
import {
  completeServerPushSchedule,
  deletePushSubscription,
  getPushSubscription,
  getServerPushSchedule,
  saveServerPushDelivery,
} from "@/lib/personalization/server-push-store";
import { sendWebPush, webPushConfigured } from "@/lib/personalization/web-push-server";

function authorized(req: NextApiRequest) {
  const secret = process.env.PUSH_DISPATCH_SECRET;
  if (!secret) return false;
  return req.headers.authorization === `Bearer ${secret}`;
}

function validClientId(value: unknown): value is string {
  return typeof value === "string" && value.length >= 8 && value.length <= 200;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }
  if (!authorized(req)) return res.status(401).json({ error: "unauthorized" });
  if (!webPushConfigured()) {
    return res.status(503).json({ error: "web_push_not_configured" });
  }

  const { clientId, notificationId } = req.body ?? {};
  if (!validClientId(clientId) || typeof notificationId !== "string") {
    return res.status(400).json({ error: "invalid_dispatch_request" });
  }

  try {
    const schedule = await getServerPushSchedule(clientId, notificationId);

    // Cancellation and stale replacement both resolve to a quiet NOOP. QStash
    // may still deliver a previously published callback, but the durable store
    // remains authoritative about whether the interrupt is still wanted.
    if (!schedule) return res.status(204).end();

    const scheduledAt = new Date(schedule.scheduledFor).getTime();
    if (Number.isFinite(scheduledAt) && scheduledAt - Date.now() > 15_000) {
      return res.status(425).json({ error: "dispatch_arrived_too_early" });
    }

    const subscription = await getPushSubscription(clientId);
    if (!subscription) {
      await completeServerPushSchedule(schedule);
      return res.status(204).end();
    }

    const result = await sendWebPush(subscription, schedule.notification);
    if (result.ok) {
      await saveServerPushDelivery(clientId, {
        id: schedule.notification.id,
        targetSignalId: schedule.notification.targetSignalId,
        eventId: schedule.notification.eventId,
        channel: schedule.notification.channel,
        deliveredAt: new Date().toISOString(),
      });
      await completeServerPushSchedule(schedule);
      return res.status(204).end();
    }

    if (result.subscriptionExpired) {
      await deletePushSubscription(clientId);
      await completeServerPushSchedule(schedule);
      return res.status(204).end();
    }

    return res.status(503).json({ error: "web_push_delivery_retryable" });
  } catch (error) {
    console.error("web_push_dispatch_error", error);
    return res.status(503).json({ error: "web_push_dispatch_failed" });
  }
}
