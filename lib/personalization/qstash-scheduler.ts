export function qstashConfigured() {
  return Boolean(process.env.QSTASH_TOKEN && process.env.PUSH_DISPATCH_SECRET);
}

export async function scheduleQStashDispatch(input: {
  destination: string;
  clientId: string;
  notificationId: string;
  scheduledFor: string;
}) {
  const token = process.env.QSTASH_TOKEN;
  const dispatchSecret = process.env.PUSH_DISPATCH_SECRET;
  if (!token || !dispatchSecret) throw new Error("qstash_unavailable");

  const notBefore = Math.max(
    Math.floor(Date.now() / 1000),
    Math.floor(new Date(input.scheduledFor).getTime() / 1000),
  );
  if (!Number.isFinite(notBefore)) throw new Error("invalid_schedule_time");

  const response = await fetch(
    `https://qstash.upstash.io/v2/publish/${encodeURIComponent(input.destination)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Upstash-Method": "POST",
        "Upstash-Not-Before": String(notBefore),
        "Upstash-Retries": "3",
        "Upstash-Deduplication-Id": `${input.clientId}:${input.notificationId}:${notBefore}`,
        "Upstash-Forward-Authorization": `Bearer ${dispatchSecret}`,
      },
      body: JSON.stringify({
        clientId: input.clientId,
        notificationId: input.notificationId,
      }),
    },
  );

  if (!response.ok) throw new Error(`qstash_publish_failed:${response.status}`);
  return (await response.json()) as { messageId?: string; deduplicated?: boolean };
}
