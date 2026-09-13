import type { NextApiRequest, NextApiResponse } from "next";
import {
  completeServerPushSchedule,
  deletePushSubscription,
  getDueServerPushSchedules,
  getPushSubscription,
} from "@/lib/personalization/server-push-store";
import { sendWebPush, webPushConfigured } from "@/lib/personalization/web-push-server";

function authorized(req: NextApiRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.authorization === `Bearer ${secret}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method_not_allowed" });
  }
  if (!authorized(req)) return res.status(401).json({ error: "unauthorized" });
  if (!webPushConfigured()) {
    return res.status(503).json({ error: "web_push_not_configured" });
  }

  const due = await getDueServerPushSchedules(new Date(), 100);
  let sent = 0;
  let dropped = 0;
  let retryable = 0;

  for (const schedule of due) {
    try {
      const subscription = await getPushSubscription(schedule.clientId);
      if (!subscription) {
        await completeServerPushSchedule(schedule);
        dropped += 1;
        continue;
      }

      const result = await sendWebPush(subscription, schedule.notification);
      if (result.ok) {
        await completeServerPushSchedule(schedule);
        sent += 1;
        continue;
      }

      if (result.subscriptionExpired) {
        await deletePushSubscription(schedule.clientId);
        await completeServerPushSchedule(schedule);
        dropped += 1;
        continue;
      }

      retryable += 1;
      console.error("web_push_delivery_failed", {
        clientId: schedule.clientId,
        notificationId: schedule.notificationId,
        status: result.status,
      });
    } catch (error) {
      retryable += 1;
      console.error("web_push_dispatch_error", error);
    }
  }

  return res.status(200).json({ checked: due.length, sent, dropped, retryable });
}
