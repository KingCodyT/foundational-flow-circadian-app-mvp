import type { NextApiRequest, NextApiResponse } from "next";
import { missingPushConfiguration, pushOrigin, pushFailure } from "@/lib/personalization/push-configuration";
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();
  res.setHeader("Cache-Control", "no-store");
  if (missingPushConfiguration().length) return res.status(503).json(pushFailure(null));
  try { pushOrigin(); return res.status(200).json({ configured: true, note: "Configuration present; provider connectivity and phone permission still require verification." }); }
  catch (error) { return res.status(503).json(pushFailure(error)); }
}
