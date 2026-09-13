import type { NextApiRequest, NextApiResponse } from "next";
import { scheduleQStashDispatch } from "@/lib/personalization/qstash-scheduler";
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
      (value.channel === "NOTIFICATION" ||
        value.channel === "CONTEXTUAL_ALERT") &&
      Number.isFinite(new Date(value.scheduledFor).getTime()),
  );
}

function appOrigin(req: NextApiRequest) {
  if (process.env.APP_ORIGIN) return process.env.APP_ORIGIN.replace(/\/$/, "");
  const forwardedProto = req.headers["x-forwarded-proto"];
  const protocol = Array.isArray(forwardedProto)
    ? forwardedProto[0]
    : forwardedProto ?? "https";
  const host = req.headers.host;
  if (!host) throw new Error("missing_app_origin");
  return `${protocol}://${host}`;
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

      const record = {
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
      } as const;

      await saveServerPushSchedule(record);

      try {
        await scheduleQStashDispatch({
          destination: `${appOrigin(req)}/api/push/dispatch`,
          clientId,
          notificationId: notification.id,
          scheduledFor: notification.scheduledFor,
        });
      } catch (error) {
        await cancelServerPushSchedule(clientId, notification.id);
        throw error;
      }

      return res.status(204).end();
    }

    if (req.method === "DELETE") {
      const { notificationId } = req.body ?? {};
      if (typeof notificationId !== "string" || !notificationId) {
        return res.status(400).json({ error: "invalid_notification_id" });
      }

      // Removing the authoritative schedule is sufficient cancellation. A
      // delayed QStash callback that later arrives will see no record and NOOP.
      await cancelServerPushSchedule(clientId, notificationId);
      return res.status(204).end();
    }

    res.setHeader("Allow", "POST, DELETE");
    return res.status(405).json({ error: "method_not_allowed" });
  } catch (error) {
    console.error("push_schedule_failed", error);
    return res.status(503).json({ error: "push_scheduler_unavailable" });
  }
}
