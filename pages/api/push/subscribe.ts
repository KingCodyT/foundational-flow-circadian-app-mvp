import type { NextApiRequest, NextApiResponse } from "next";
import {
  PushSubscriptionRecord,
  savePushSubscription,
} from "@/lib/personalization/server-push-store";

function validClientId(value: unknown): value is string {
  return typeof value === "string" && value.length >= 8 && value.length <= 200;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const { clientId, subscription } = req.body ?? {};
  if (
    !validClientId(clientId) ||
    !subscription ||
    typeof subscription.endpoint !== "string" ||
    !subscription.keys ||
    typeof subscription.keys.p256dh !== "string" ||
    typeof subscription.keys.auth !== "string"
  ) {
    return res.status(400).json({ error: "invalid_subscription" });
  }

  const record: PushSubscriptionRecord = {
    clientId,
    endpoint: subscription.endpoint,
    expirationTime:
      typeof subscription.expirationTime === "number"
        ? subscription.expirationTime
        : null,
    keys: {
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    updatedAt: new Date().toISOString(),
  };

  try {
    await savePushSubscription(record);
    return res.status(204).end();
  } catch (error) {
    console.error("push_subscription_save_failed", error);
    return res.status(503).json({ error: "push_store_unavailable" });
  }
}
