import { pushFailure } from "@/lib/personalization/push-configuration";
import type { NextApiRequest, NextApiResponse } from "next";
import { activeKey, publicReminder } from "@/lib/personalization/push-lifecycle";
import { getServerPushSchedule, redisCommand, getServerPushDeliveries } from "@/lib/personalization/server-push-store";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const clientId = req.query.clientId;
  if (typeof clientId !== "string" || clientId.length < 8 || clientId.length > 200) {
    return res.status(400).json({ error: "invalid_client_id" });
  }

  try {
    const deliveries = await getServerPushDeliveries(clientId);
    const id = await redisCommand<string | null>(["GET", activeKey(clientId)]);
    const active = id ? await getServerPushSchedule(clientId, id) : null;
    return res.status(200).json({ deliveries, reminder: active ? publicReminder(active) : null });
  } catch (error) {
    console.error("push_delivery_receipts_failed", error);
    return res.status(503).json(pushFailure(error, true));
  }
}
