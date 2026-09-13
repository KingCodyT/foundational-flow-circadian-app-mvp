# Server-Side Web Push Scheduling + Subscription v1

## Purpose

This layer gives Foundational Flow a durable server-side delivery path for an **already-approved future notification**. It does not create biological guidance and it does not move coaching decisions out of the existing personalization engine.

The contract remains:

**Biology → Coaching Decision → Voice → Orchestration → Runtime → Persistent App State → Delivery Transport**

This v1 adds a durable branch to the delivery transport:

**Approved future notification → Web Push subscription → durable schedule → cron dispatcher → service worker → notification → delivery receipt**

## What v1 does

- Registers a browser Push API subscription after notification permission is already granted.
- Never triggers a permission prompt automatically.
- Stores subscriptions in a durable Redis-compatible REST store.
- Stores approved future notification jobs in a sorted set keyed by delivery time.
- Runs a protected Vercel cron dispatcher once per minute.
- Sends standards-based Web Push without adding an npm dependency.
- Removes expired subscriptions on 404/410 responses.
- Keeps retryable delivery failures queued for a later cron pass.
- Writes successful delivery receipts server-side.
- Hydrates server delivery receipts back into the local notification history on next app open.
- Keeps due-now notifications local-first to avoid local + cron duplicate delivery.

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

That future planner must preserve the same zombie-notification safeguards before creating or refreshing the job. The server dispatcher itself intentionally does not reinterpret biology.

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

Cron protection:

- `CRON_SECRET`

Generate a VAPID key pair with:

```bash
node scripts/generate-vapid-keys.cjs
```

## API surface

- `GET /api/push/public-key` — exposes only the public VAPID key when the push stack is configured.
- `POST /api/push/subscribe` — stores one browser subscription for the app client ID.
- `POST /api/push/schedule` — stores an approved notification job.
- `DELETE /api/push/schedule` — cancels a stored job.
- `GET /api/push/deliveries?clientId=...` — returns recent server delivery receipts for local cooldown/history hydration.
- `GET /api/cron/push-dispatch` — protected cron-only dispatcher.

## Storage model

- Subscription: `ff:push:subscription:{clientId}`
- Schedule: `ff:push:schedule:{clientId}:{notificationId}`
- Due queue: sorted set `ff:push:due`
- Delivery receipts: `ff:push:deliveries:{clientId}`, capped at 50 records

## Delivery restraint

Server-side scheduling does not supersede the existing cooldown memory. Successful server deliveries are returned to the app and merged into the same delivered-notification history used by the existing restraint logic.

The server may help Foundational Flow reach the person when the app is closed. It does not earn the right to speak more often.
