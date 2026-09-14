# Server-Side Web Push Scheduling + Subscription v1

## Purpose

This layer gives Foundational Flow a durable server-side delivery path for an **already-approved future notification**. It does not create biological guidance and it does not move coaching decisions out of the existing personalization engine.

The contract remains:

**Biology → Coaching Decision → Voice → Orchestration → Runtime → Persistent App State → Delivery Transport**

This v1 adds a durable branch to the delivery transport:

**Approved future notification → Web Push subscription → durable schedule record → one-shot delayed QStash callback → service worker → notification → delivery receipt**

## What v1 does

- Registers a browser Push API subscription after notification permission is already granted.
- Never triggers a permission prompt automatically.
- Stores subscriptions in a durable Redis-compatible REST store.
- Stores approved future notification records server-side.
- Publishes a one-shot delayed QStash message using the approved `scheduledFor` time.
- Authenticates the delayed dispatch callback with a server-only secret.
- Sends standards-based Web Push without adding an npm dependency.
- Removes expired subscriptions on 404/410 responses.
- Lets QStash retry transient dispatch failures.
- Writes successful delivery receipts server-side.
- Hydrates server delivery receipts back into the local notification history on next app open.
- Keeps due-now notifications local-first to avoid local + server duplicate delivery.

## Why one-shot scheduling instead of Vercel cron

Minute-level Vercel cron requires a plan that supports minute frequency. Foundational Flow needs delivery tied to biological timing, so a daily or imprecise cron is the wrong primitive. v1 therefore uses a one-shot delayed message per approved notification rather than a continuously polling cron.

## What v1 does not do

This server layer does **not**:

- choose a target,
- decide biological relevance,
- author coaching copy,
- upgrade an intervention level,
- bypass cooldown or redundancy rules,
- infer a disruption,
- recalculate circadian state in the background,
- manufacture future notification jobs.

The server only executes a `ScheduledNotificationRecord` that the existing intelligence stack has already approved.

That distinction matters. A server clock is not a second coaching engine.

## Future scheduling boundary

The current runtime may still create many notification records at the moment they become relevant. Those remain local-first. This infrastructure becomes true closed-app scheduling when an upstream planner supplies an approved `scheduledFor` time more than 30 seconds in the future.

That future planner must preserve the same zombie-notification safeguards before creating or refreshing the job. The server dispatcher intentionally does not reinterpret biology.

Cancellation is store-authoritative: deleting the server schedule record is sufficient. If a previously published delayed QStash callback still arrives afterward, the dispatch endpoint finds no schedule and quietly returns without sending anything.

## Required environment variables

Durable store, using either Vercel KV-style names or Upstash REST names:

- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

or:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Web Push:

- `WEB_PUSH_VAPID_PUBLIC_KEY`
- `WEB_PUSH_VAPID_PRIVATE_KEY`
- `WEB_PUSH_VAPID_SUBJECT` (optional; defaults to `mailto:notifications@codyoakland.com`)

One-shot scheduler:

- `QSTASH_TOKEN`
- `PUSH_DISPATCH_SECRET`
- `APP_ORIGIN` (optional; otherwise inferred from the request host)

Generate a VAPID key pair with:

```bash
node scripts/generate-vapid-keys.cjs
```

## API surface

- `GET /api/push/public-key` — exposes only the public VAPID key when the complete durable push stack is configured.
- `POST /api/push/subscribe` — stores one browser subscription for the app client ID.
- `POST /api/push/schedule` — stores an approved notification job and publishes its delayed one-shot dispatch.
- `DELETE /api/push/schedule` — cancels the authoritative stored job.
- `POST /api/push/dispatch` — authenticated scheduler callback that sends Web Push only if the stored job still exists.
- `GET /api/push/deliveries?clientId=...` — returns recent server delivery receipts for local cooldown/history hydration.

## Storage model

- Subscription: `ff:push:subscription:{clientId}`
- Schedule: `ff:push:schedule:{clientId}:{notificationId}`
- Delivery receipts: `ff:push:deliveries:{clientId}`, capped at 50 records

## Delivery restraint

Server-side scheduling does not supersede the existing cooldown memory. Successful server deliveries are returned to the app and merged into the same delivered-notification history used by the existing restraint logic.

The server may help Foundational Flow reach the person when the app is closed. It does not earn the right to speak more often.
