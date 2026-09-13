type RedisCommandArg = string | number;

export type PushSubscriptionRecord = {
  clientId: string;
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
  updatedAt: string;
};

export type ServerPushScheduleRecord = {
  clientId: string;
  notificationId: string;
  scheduledFor: string;
  notification: {
    id: string;
    targetSignalId: string | null;
    eventId: string | null;
    channel: "NOTIFICATION" | "CONTEXTUAL_ALERT";
    title: string;
    body: string;
    scheduledFor: string;
  };
  createdAt: string;
};

export type ServerPushDeliveryRecord = {
  id: string;
  targetSignalId: string | null;
  eventId: string | null;
  channel: "NOTIFICATION" | "CONTEXTUAL_ALERT";
  deliveredAt: string;
};

function getRedisConfig() {
  const url =
    process.env.KV_REST_API_URL ??
    process.env.UPSTASH_REDIS_REST_URL ??
    null;
  const token =
    process.env.KV_REST_API_TOKEN ??
    process.env.UPSTASH_REDIS_REST_TOKEN ??
    null;

  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ""), token };
}

async function redisCommand<T>(command: RedisCommandArg[]): Promise<T> {
  const config = getRedisConfig();
  if (!config) throw new Error("push_store_unavailable");

  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });

  if (!response.ok) throw new Error(`push_store_error:${response.status}`);
  const payload = (await response.json()) as { result?: T; error?: string };
  if (payload.error) throw new Error(`push_store_error:${payload.error}`);
  return payload.result as T;
}

function subscriptionKey(clientId: string) {
  return `ff:push:subscription:${clientId}`;
}

function scheduleKey(clientId: string, notificationId: string) {
  return `ff:push:schedule:${clientId}:${notificationId}`;
}

function deliveryKey(clientId: string) {
  return `ff:push:deliveries:${clientId}`;
}

export function pushStoreConfigured() {
  return Boolean(getRedisConfig());
}

export async function savePushSubscription(record: PushSubscriptionRecord) {
  await redisCommand(["SET", subscriptionKey(record.clientId), JSON.stringify(record)]);
}

export async function getPushSubscription(
  clientId: string,
): Promise<PushSubscriptionRecord | null> {
  const raw = await redisCommand<string | null>([
    "GET",
    subscriptionKey(clientId),
  ]);
  return raw ? (JSON.parse(raw) as PushSubscriptionRecord) : null;
}

export async function deletePushSubscription(clientId: string) {
  await redisCommand(["DEL", subscriptionKey(clientId)]);
}

export async function saveServerPushSchedule(record: ServerPushScheduleRecord) {
  const score = new Date(record.scheduledFor).getTime();
  if (!Number.isFinite(score)) throw new Error("invalid_schedule_time");

  await redisCommand([
    "SET",
    scheduleKey(record.clientId, record.notificationId),
    JSON.stringify(record),
  ]);
}

export async function getServerPushSchedule(
  clientId: string,
  notificationId: string,
): Promise<ServerPushScheduleRecord | null> {
  const raw = await redisCommand<string | null>([
    "GET",
    scheduleKey(clientId, notificationId),
  ]);
  return raw ? (JSON.parse(raw) as ServerPushScheduleRecord) : null;
}

export async function cancelServerPushSchedule(
  clientId: string,
  notificationId: string,
) {
  await redisCommand(["DEL", scheduleKey(clientId, notificationId)]);
}

export async function completeServerPushSchedule(record: ServerPushScheduleRecord) {
  await cancelServerPushSchedule(record.clientId, record.notificationId);
}

export async function saveServerPushDelivery(
  clientId: string,
  record: ServerPushDeliveryRecord,
) {
  const key = deliveryKey(clientId);
  await redisCommand(["LPUSH", key, JSON.stringify(record)]);
  await redisCommand(["LTRIM", key, 0, 49]);
}

export async function getServerPushDeliveries(
  clientId: string,
): Promise<ServerPushDeliveryRecord[]> {
  const rows = await redisCommand<string[]>([
    "LRANGE",
    deliveryKey(clientId),
    0,
    49,
  ]);
  const records: ServerPushDeliveryRecord[] = [];
  for (const row of rows ?? []) {
    try {
      records.push(JSON.parse(row) as ServerPushDeliveryRecord);
    } catch {
      // Ignore malformed historical rows rather than poisoning hydration.
    }
  }
  return records;
}
