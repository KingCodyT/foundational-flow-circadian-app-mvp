import type { NextApiRequest, NextApiResponse } from "next";
import {
  cancelServerPushSchedule,
  saveServerPushSchedule,
} from "@/lib/personalization/server-push-store";

function validClientId(value: unknown): value is string {
  return typeof value === "string" && value.length >= 8 && value.length <= 200;
}

function validNotification(value: any) {
  return Boolean(
    value &&
      typeof value.id === "string" &&
      typeof value.title === "string" &&
      typeof value.body === "string" &&
      typeof value.scheduledFor === "string" &&
      (value.channel === "NOTIFICATION" || value.channel === "CONTEXTUAL_ALERT") &&
      Number.isFinite(new Date(value.scheduledFor).getTime()),
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { clientId } = req.body ?? {};
  if (!validClientId(clientId)) {
    return res.status(400).json({ error: "invalid_client_id" });
  }

  try {
    if (req.method === "POST") {
      const { notification } = req.body ?? {};
      if (!validNotification(notification)) {
        return res.status(400).json({ error: "invalid_notification" });
      }

      await saveServerPushSchedule({
        clientId,
        notificationId: notification.id,
        scheduledFor: notification.scheduledFor,
        notification: {
          id: notification.id,
          targetSignalId: notification.targetSignalId ?? null,
          eventId: notification.eventId ?? null,
          channel: notification.channel,
          title: notification.title,
          body: notification.body,
          scheduledFor: notification.scheduledFor,
        },
        createdAt: new Date().toISOString(),
      });

      return res.status(204).end();
    }

    if (req.method === "DELETE") {
      const { notificationId } = req.body ?? {};
      if (typeof notificationId !== "string" || !notificationId) {
        return res.status(400).json({ error: "invalid_notification_id" });
      }
      await cancelServerPushSchedule(clientId, notificationId);
      return res.status(204).end();
    }

    res.setHeader("Allow", "POST, DELETE");
    return res.status(405).json({ error: "method_not_allowed" });
  } catch (error) {
    console.error("push_schedule_store_failed", error);
    return res.status(503).json({ error: "push_store_unavailable" });
  }
}
