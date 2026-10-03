import type { NextApiRequest, NextApiResponse } from "next";
import { getServerPushSchedule } from "@/lib/personalization/server-push-store";
import { scheduleReminder, publicReminder, withPushLock, saveLifecycle } from "@/lib/personalization/push-lifecycle";
import { missingPushConfiguration, pushFailure, pushOrigin } from "@/lib/personalization/push-configuration";

function validClientId(value: unknown): value is string {
  return typeof value === "string" && value.length >= 8 && value.length <= 200;
}

function validNotification(value: any) {
  const scheduledFor = value?.scheduledFor ? new Date(value.scheduledFor).getTime() : NaN;
  const validUntil = value?.validUntil ? new Date(value.validUntil).getTime() : null;
  return Boolean(
    value &&
      typeof value.id === "string" &&
      typeof value.title === "string" &&
      typeof value.body === "string" &&
      typeof value.scheduledFor === "string" &&
      (value.channel === "NOTIFICATION" || value.channel === "CONTEXTUAL_ALERT") &&
      Number.isFinite(scheduledFor) &&
      (validUntil === null || (Number.isFinite(validUntil) && validUntil >= scheduledFor)),
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { clientId } = req.body ?? {};
  if (!validClientId(clientId)) return res.status(400).json({ error: "invalid_client_id" });
  try {
    if (req.method === "POST") {
      if (missingPushConfiguration().length) return res.status(503).json(pushFailure(null));
      pushOrigin();
      const { notification } = req.body ?? {};
      if (!validNotification(notification) || notification.eventId === "first_meal" || !notification.validUntil || Date.parse(notification.validUntil) < Date.now()) {
        return res.status(400).json({ error: "invalid_or_expired_reminder" });
      }
      const record = await scheduleReminder(clientId, notification);
      return res.status(200).json({ reminder: publicReminder(record) });
    }
    if (req.method === "DELETE") {
      const { notificationId } = req.body ?? {};
      if (typeof notificationId !== "string") return res.status(400).json({ error: "invalid_notification_id" });
      await withPushLock(clientId, async () => {
        const record = await getServerPushSchedule(clientId, notificationId);
        if (record && !["completed", "delivered", "suppressed"].includes(record.state || "")) {
          record.state = "suppressed"; record.reason = "Cancelled by current app evidence or preference";
          await saveLifecycle(record);
        }
      });
      return res.status(204).end();
    }
    res.setHeader("Allow", "POST, DELETE"); return res.status(405).json({ error: "method_not_allowed" });
  } catch (error) { return res.status(503).json(pushFailure(error)); }
}
