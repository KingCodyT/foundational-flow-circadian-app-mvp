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

const DUE_SET_KEY = "ff:push:due";

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

export function pushStoreConfigured() {
  return Boolean(getRedisConfig());
}

export async function savePushSubscription(record: PushSubscriptionRecord) {
  await redisCommand(["SET", subscriptionKey(record.clientId), JSON.stringify(record)]);
}

export async function getPushSubscription(
  clientId: string,
): Promise<PushSubscriptionRecord | null> {
  const raw = await redisCommand<string | null>(["GET", subscriptionKey(clientId)]);
  return raw ? (JSON.parse(raw) as PushSubscriptionRecord) : null;
}

export async function deletePushSubscription(clientId: string) {
  await redisCommand(["DEL", subscriptionKey(clientId)]);
}

export async function saveServerPushSchedule(record: ServerPushScheduleRecord) {
  const key = scheduleKey(record.clientId, record.notificationId);
  const score = new Date(record.scheduledFor).getTime();
  if (!Number.isFinite(score)) throw new Error("invalid_schedule_time");

  await redisCommand(["SET", key, JSON.stringify(record)]);
  await redisCommand(["ZADD", DUE_SET_KEY, score, key]);
}

export async function cancelServerPushSchedule(
  clientId: string,
  notificationId: string,
) {
  const key = scheduleKey(clientId, notificationId);
  await redisCommand(["ZREM", DUE_SET_KEY, key]);
  await redisCommand(["DEL", key]);
}

export async function getDueServerPushSchedules(
  now: Date,
  limit = 100,
): Promise<ServerPushScheduleRecord[]> {
  const keys = await redisCommand<string[]>([
    "ZRANGEBYSCORE",
    DUE_SET_KEY,
    0,
    now.getTime(),
    "LIMIT",
    0,
    limit,
  ]);

  const records: ServerPushScheduleRecord[] = [];
  for (const key of keys ?? []) {
    const raw = await redisCommand<string | null>(["GET", key]);
    if (!raw) {
      await redisCommand(["ZREM", DUE_SET_KEY, key]);
      continue;
    }

    try {
      records.push(JSON.parse(raw) as ServerPushScheduleRecord);
    } catch {
      await redisCommand(["ZREM", DUE_SET_KEY, key]);
      await redisCommand(["DEL", key]);
    }
  }

  return records;
}

export async function completeServerPushSchedule(record: ServerPushScheduleRecord) {
  await cancelServerPushSchedule(record.clientId, record.notificationId);
}
