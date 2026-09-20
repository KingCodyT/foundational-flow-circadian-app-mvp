/** Names and actionable errors only; never expose configuration values or credentials. */
export function missingPushConfiguration(storeOnly = false): string[] {
  const missing: string[] = [];
  if (!(process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL)) missing.push("KV_REST_API_URL or UPSTASH_REDIS_REST_URL");
  if (!(process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN)) missing.push("KV_REST_API_TOKEN or UPSTASH_REDIS_REST_TOKEN");
  if (!storeOnly) for (const name of ["WEB_PUSH_VAPID_PUBLIC_KEY", "WEB_PUSH_VAPID_PRIVATE_KEY", "WEB_PUSH_VAPID_SUBJECT", "QSTASH_TOKEN", "PUSH_DISPATCH_SECRET", "APP_ORIGIN"]) {
    if (!process.env[name]?.trim()) missing.push(name);
  }
  return missing;
}
export function pushFailure(error: unknown, storeOnly = false) {
  const missing = missingPushConfiguration(storeOnly);
  if (missing.length) return { error: "push_configuration_missing", reason: `Missing configuration: ${missing.join(", ")}`, missing };
  const code = error instanceof Error ? error.message : "push_request_failed";
  // Do not echo upstream response bodies, tokens or endpoints.
  const safe = /^(push_store_error:\d{3}|qstash_publish_failed:\d{3}|web_push_rejected:\d{3}|push_lock_busy|invalid_app_origin|subscription_missing|reminder_expired|deferral_outside_window|stale_action|invalid_action_token|invalid_vapid_\w+|push_store_unavailable)$/.test(code) ? code : "push_dependency_request_failed";
  return { error: safe, reason: safe.replaceAll("_", " ") };
}
export function pushOrigin(): string {
  const origin = new URL(process.env.APP_ORIGIN || "invalid:");
  if (origin.protocol !== "https:" || ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname)) throw new Error("invalid_app_origin");
  return origin.origin;
}
