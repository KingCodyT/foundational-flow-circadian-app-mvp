import type { NextApiRequest, NextApiResponse } from "next";
import { getServerPushDeliveries } from "@/lib/personalization/server-push-store";

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
    return res.status(200).json({ deliveries });
  } catch (error) {
    console.error("push_delivery_receipts_failed", error);
    return res.status(503).json({ error: "push_store_unavailable" });
  }
}
