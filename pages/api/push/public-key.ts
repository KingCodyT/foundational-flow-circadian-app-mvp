import { missingPushConfiguration, pushFailure, pushOrigin } from "@/lib/personalization/push-configuration";
import type { NextApiRequest, NextApiResponse } from "next";
import { qstashConfigured } from "@/lib/personalization/qstash-scheduler";
import { pushStoreConfigured } from "@/lib/personalization/server-push-store";
import { getVapidPublicKey } from "@/lib/personalization/web-push-server";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  if (missingPushConfiguration().length) return res.status(503).json(pushFailure(null));
  try { pushOrigin(); } catch (error) { return res.status(503).json(pushFailure(error)); }
  const publicKey = getVapidPublicKey();
  if (!publicKey || !pushStoreConfigured() || !qstashConfigured()) {
    return res.status(503).json({ error: "web_push_not_configured" });
  }

  return res.status(200).json({ publicKey });
}
