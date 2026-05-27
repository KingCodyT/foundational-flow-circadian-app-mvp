import type { NextApiRequest, NextApiResponse } from "next";
import { buildProtocolEmail } from "@/lib/email-template";
import { CircadianInsight, CircadianScores, ProtocolPlan } from "@/types/circadian";

type ApiResponse =
  | { success: true; configured: boolean }
  | { success: false; configured: boolean; error: string };

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM;
const EMAIL_REPLY_TO = process.env.EMAIL_REPLY_TO;

function isConfigured() {
  return Boolean(RESEND_API_KEY && EMAIL_FROM);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({
      success: false,
      configured: isConfigured(),
      error: "Method not allowed.",
    });
    return;
  }

  const {
    email,
    insight,
    scores,
    protocol,
  } = req.body as {
    email?: string;
    insight?: CircadianInsight;
    scores?: CircadianScores;
    protocol?: ProtocolPlan;
  };

  if (!email || !insight || !scores || !protocol) {
    res.status(400).json({
      success: false,
      configured: isConfigured(),
      error: "Email, scores, insight, and protocol are required.",
    });
    return;
  }

  if (!isConfigured()) {
    res.status(200).json({
      success: false,
      configured: false,
      error: "Email provider is not configured yet.",
    });
    return;
  }

  try {
    const message = buildProtocolEmail({ insight, scores, protocol });

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [email],
        reply_to: EMAIL_REPLY_TO || undefined,
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Unable to send email.");
    }

    res.status(200).json({
      success: true,
      configured: true,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      configured: true,
      error: error instanceof Error ? error.message : "Unknown email error.",
    });
  }
}
