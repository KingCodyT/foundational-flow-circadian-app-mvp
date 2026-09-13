import type { NextApiRequest, NextApiResponse } from "next";
import { getVapidPublicKey } from "@/lib/personalization/web-push-server";
import { pushStoreConfigured } from "@/lib/personalization/server-push-store";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const publicKey = getVapidPublicKey();
  if (!publicKey || !pushStoreConfigured()) {
    return res.status(503).json({ error: "web_push_not_configured" });
  }

  return res.status(200).json({ publicKey });
}
