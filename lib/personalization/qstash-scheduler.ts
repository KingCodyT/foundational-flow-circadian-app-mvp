import { createHash } from "node:crypto";
import { qstashErrorCategory } from "./qstash-error";

/** Fixed-size transport identifier; JSON preserves tuple boundaries. */
export function qstashDeduplicationId(input: {
  clientId: string;
  notificationId: string;
  scheduleRevision: string;
}) {
  return createHash("sha256")
    .update(JSON.stringify([input.clientId, input.notificationId, input.scheduleRevision]))
    .digest("hex");
}

// Match the endpoint to the region of the existing QStash token.
function qstashBaseUrl() {
  const configured = process.env.QSTASH_URL?.trim();
  if (!configured) return "https://qstash.upstash.io";
  let url: URL;
  try { url = new URL(configured); } catch { throw new Error("invalid_qstash_url"); }
  if (
    url.protocol !== "https:" || url.username || url.password || url.port ||
    url.search || url.hash || !/^\/$/.test(url.pathname) ||
    !["qstash.upstash.io", "qstash-eu-central-1.upstash.io", "qstash-us-east-1.upstash.io"].includes(url.hostname)
  ) throw new Error("invalid_qstash_url");
  return url.origin;
}

export function qstashConfigured() {
  return Boolean(process.env.QSTASH_TOKEN && process.env.PUSH_DISPATCH_SECRET);
}

export async function scheduleQStashDispatch(input: {
  destination: string;
  clientId: string;
  notificationId: string;
  scheduleRevision: string;
  scheduledFor: string;
}) {
  const token = process.env.QSTASH_TOKEN;
  const dispatchSecret = process.env.PUSH_DISPATCH_SECRET;
  if (!token || !dispatchSecret) throw new Error("qstash_unavailable");

  const baseUrl = qstashBaseUrl();
  const notBefore = Math.max(
    Math.floor(Date.now() / 1000),
    Math.ceil(new Date(input.scheduledFor).getTime() / 1000),
  );
  if (!Number.isFinite(notBefore)) throw new Error("invalid_schedule_time");

  // QStash expects the destination URL directly after /publish/, as in its SDK.
  const response = await fetch(
    `${baseUrl}/v2/publish/${input.destination}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Upstash-Method": "POST",
        "Upstash-Not-Before": String(notBefore),
        "Upstash-Retries": "3",
        "Upstash-Deduplication-Id": qstashDeduplicationId(input),
        "Upstash-Forward-Authorization": `Bearer ${dispatchSecret}`,
      },
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({
        clientId: input.clientId,
        notificationId: input.notificationId,
        scheduleRevision: input.scheduleRevision,
      }),
    },
  );

  if (!response.ok) throw new Error(`qstash_publish_failed:${response.status}:${await qstashErrorCategory(response)}`);
  return (await response.json()) as { messageId?: string; deduplicated?: boolean };
}
