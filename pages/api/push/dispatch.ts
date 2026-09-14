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

  const { clientId, notificationId, scheduleRevision } = req.body ?? {};
  if (
    !validClientId(clientId) ||
    typeof notificationId !== "string" ||
    typeof scheduleRevision !== "string" ||
    !scheduleRevision
  ) {
    return res.status(400).json({ error: "invalid_dispatch_request" });
  }

  try {
    const schedule = await getServerPushSchedule(clientId, notificationId);

    // The durable schedule is the current delivery intent. Cancellation removes
    // it; replacement changes its revision. Either condition makes an older
    // delayed callback a quiet NOOP rather than a zombie notification.
    if (!schedule) return res.status(204).end();
    if (schedule.scheduleRevision !== scheduleRevision) {
      return res.status(204).end();
    }

    const now = Date.now();
    const scheduledAt = new Date(schedule.scheduledFor).getTime();
    if (Number.isFinite(scheduledAt) && scheduledAt - now > 15_000) {
      return res.status(425).json({ error: "dispatch_arrived_too_early" });
    }

    // Future coaching is valid only inside the biological opportunity that
    // approved it. A delayed retry after that window closes is discarded.
    if (schedule.validUntil) {
      const validUntil = new Date(schedule.validUntil).getTime();
      if (!Number.isFinite(validUntil) || now > validUntil) {
        await completeServerPushSchedule(schedule);
        return res.status(204).end();
      }
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
