import type { NextApiRequest, NextApiResponse } from "next";
import { reminderAction, publicReminder } from "@/lib/personalization/push-lifecycle";
import { pushFailure } from "@/lib/personalization/push-configuration";
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "method_not_allowed" }); }
  const { clientId, notificationId, actionToken, action, remindAt } = req.body ?? {};
  if (typeof clientId !== "string" || clientId.length < 8 || typeof notificationId !== "string" ||
    !["inspect", "delivered", "done", "later", "skip"].includes(action)) return res.status(400).json({ error: "invalid_action" });
  try { return res.status(200).json({ reminder: publicReminder(await reminderAction(clientId, notificationId, actionToken, action, remindAt)) }); }
  catch (error) {
    const message = error instanceof Error ? error.message : "";
    return res.status(message === "invalid_action_token" ? 401 : message === "deferral_outside_window" ? 409 : 503).json(pushFailure(error));
  }
}
