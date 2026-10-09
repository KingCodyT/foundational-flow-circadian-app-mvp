# Reminder delivery diagnosis and manual phone test

## Confirmed blocker

Before editing code, invoking `GET /api/push/deliveries` with the Next-loaded project environment failed in `getServerPushDeliveries → redisCommand → getRedisConfig`: neither Redis REST URL/token pair existed. The original handler caught `Error("push_store_unavailable")` and returned HTTP 503. This was a missing durable-store configuration, not a timezone error, browser permission error, or a missing native mobile SDK.

The running local HTTP endpoint now reproduces the same missing configuration as an explicit 503 listing `KV_REST_API_URL or UPSTASH_REDIS_REST_URL` and `KV_REST_API_TOKEN or UPSTASH_REDIS_REST_TOKEN`. No dummy receipts, in-memory production store, or fake success response was substituted. This environment also lacks the scheduler credentials, VAPID configuration, and public HTTPS origin listed below. External delivery remains blocked until those values are supplied.

## Delivery path and fixes

1. Existing contextual/first-run selection approves one action. The existing Needs Attention / Developing / Established, first-meal, constraint, evidence, and silence rules are unchanged.
2. Schedule conversion uses the saved IANA timezone. The transport adds the corresponding local date key and persists the ISO instant. Future schedules now survive reload; the old retention check incorrectly discarded all future timestamps. An approved current reminder is retained through its valid delivery window instead of being cancelled at its start time.
3. After explicit browser permission, the service worker and Push API subscription register with the existing Redis-backed server. The scheduler is now authoritative for both near-due and future reminders: a page timer is not used for delivery. There is only one active server reminder per client. Repeat schedule requests are idempotent, replaced jobs are invalidated, and per-client locks serialize dispatch/actions.
4. QStash calls the protected dispatcher at or after the approved instant. The server checks the active reminder, revision, state, and expiry before sending encrypted VAPID Web Push. This works independently of page visibility when the configured platform delivers push. Transport/network/OS delays are possible; this is not an exact-alarm API.
5. A successful push-provider HTTP response means **accepted**, not delivered. The service worker verifies current intent and expiry, deduplicates display across worker restarts, shows the notification, then acknowledges it. Only successful browser display acknowledgement produces **Delivered**. It cannot prove that a human saw the notification.
6. Notification tap routes to `/today?reminder=<id>`. The existing Today guidance and response UI remain in charge. Done, 15 minutes later, and Not tonight call a reminder-specific authenticated action endpoint. The capability token is bounded to that reminder, not a production credential exposed in UI. Deferral changes only that reminder's time and dispatch revision, is capped at 15 minutes and its original valid window, and leaves schedule anchors alone. Done/Not tonight record handled evidence for the original local day; evening-cue suppression preserves the existing grouping rule.
7. The service worker persists action intents before network calls. Failed offline actions are shown as failures and retried using Background Sync where available, or on the next app launch/online reconciliation. Local Done/Not tonight evidence is retained even if remote acknowledgement is pending. Offline background deferral cannot be guaranteed on platforms without Background Sync.
8. The existing notification settings now contain a **Reminder delivery status** detail with Scheduled, Delivered, Deferred, Completed, Suppressed, or Failed plus a reason and local reminder time. Status survives reload. No unrelated Profile/Today copy or coaching calculation was changed.

The PWA manifest and installation icons enable standalone Home Screen installation; they are not a native wrapper.

## Platform boundaries

Web Push requires a secure context, service-worker and Push API support, permission granted by the user, a valid push subscription, VAPID keys, and a reachable configured backend. `http://localhost` is a development exception on the computer itself; `http://192.168...` on a phone is not an equivalent secure origin. See [Notifications API secure-context and action options](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification).

On iPhone/iPad, use a supported OS/browser and install the site as a Home Screen web app before requesting permission (WebKit documents this from iOS/iPadOS 16.4). Standards-based Web Push uses Apple's underlying push service without requiring this project to implement a native APNs client. See [WebKit's Home Screen Web Push requirements](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/) and [Apple's Web Push documentation](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers).

Supporting Android browsers can use the same Web Push / service-worker path. Native APNs/FCM device-token registration, native notification categories, and native background behavior would require a real native app/wrapper and its platform configuration; none was added or claimed. Browser/OS notification-button support varies: the worker respects `Notification.maxActions`. If fewer than three buttons appear, tap the notification and use Today’s existing Done, Adjust → Remind me in 15 minutes, and Not today responses. Three visible OS buttons cannot be promised on every phone.

## External configuration still required

All values below are absent from this workspace environment. Use **one** complete Redis pair; do not mix projects or expose secrets with a `NEXT_PUBLIC_` prefix.

| Value | Purpose |
| --- | --- |
| `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` | Durable subscription, schedule, action, and receipt storage. Alternatives: `KV_REST_API_URL` and `KV_REST_API_TOKEN`. |
| `QSTASH_TOKEN` | Authorization to publish one-shot delayed callbacks. |
| `PUSH_DISPATCH_SECRET` | A strong server-only secret protecting dispatch callbacks and signing per-reminder action capabilities. |
| `WEB_PUSH_VAPID_PUBLIC_KEY` | P-256 uncompressed public key, base64url encoded. |
| `WEB_PUSH_VAPID_PRIVATE_KEY` | Matching 32-byte P-256 private key, base64url encoded; server only. |
| `WEB_PUSH_VAPID_SUBJECT` | Your valid `mailto:` contact or HTTPS contact URL. There is no fallback identity. |
| `APP_ORIGIN` | The exact public HTTPS origin that the phone opens and QStash can reach, without a path. |

The phone additionally needs a supported browser/PWA installation, notification permission, network access, and OS notification settings that allow display. No Redis/QStash account was created, no service was purchased, no tunnel/deployment was started, and no production credentials were generated. `cloudflared` was not installed in this environment.

## Exact next manual phone-test commands

Run these only after reviewing the change and obtaining existing **test** Redis and QStash credentials. These instructions do not provision services.

```bash
cd /Users/codyoakland/Documents/foundational-flow-circadian-app-mvp-food-timing-fix
cp -n .env.example .env.local
open -e .env.local
```

Fill the values in the table. If you need a new disposable test VAPID pair and dispatch secret, the following optional command prints values for you to paste into `.env.local`; it was **not executed** during this task:

```bash
node - <<'JS'
const { createECDH, randomBytes } = require('node:crypto');
const key = createECDH('prime256v1');
key.generateKeys();
console.log('WEB_PUSH_VAPID_PUBLIC_KEY=' + key.getPublicKey().toString('base64url'));
console.log('WEB_PUSH_VAPID_PRIVATE_KEY=' + key.getPrivateKey().toString('base64url'));
console.log('PUSH_DISPATCH_SECRET=' + randomBytes(32).toString('base64url'));
JS
```

For a local phone test with an already installed Cloudflare tunnel client, run in a separate terminal:

```bash
cloudflared tunnel --url http://localhost:3014
```

Copy its assigned HTTPS origin into `APP_ORIGIN` in `.env.local`. If the tunnel client is not available, use your already approved HTTPS testing origin/tool; do not substitute a phone's HTTP LAN URL. Start/restart the app **after** editing the environment:

```bash
npm run dev -- --hostname 0.0.0.0 --port 3014
```

Keep both terminal processes running. Verify actual configuration and Redis connectivity:

```bash
curl -i http://localhost:3014/api/push/status
curl -i 'http://localhost:3014/api/push/deliveries?clientId=manual-phone-config-check'
```

The first endpoint checks presence/origin validity, not vendor connectivity. The second must return 200 from the real Redis-backed route. Any 503 is a blocker to investigate, not a successful test. Open the public HTTPS tunnel URL on the phone. On iPhone, add it to the Home Screen and launch that installed app. Keep that origin stable; a changed origin needs a new install/subscription.

Use a separate test profile. To calculate a bedtime that places its one-hour wind-down cue about three minutes from now, using your intended test timezone:

```bash
TZ=America/Los_Angeles node - <<'JS'
const now = new Date();
const bed = new Date(now.getTime() + 63 * 60000);
console.log('Current local time:', now.toLocaleString());
console.log('Test bedtime:', bed.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }));
console.log('Expected wind-down reminder:', new Date(bed.getTime() - 60 * 60000).toLocaleString());
JS
```

In that fresh test profile, enter an appropriate earlier wake time and your test last-meal value; the app must preserve those entries. Complete onboarding, enable reminders through the explicit permission button, and check Today’s displayed time against **You → Your schedule → Reminder delivery status**. Confirm Scheduled, then background/close the PWA and lock the phone. After the notification arrives, separately test tap, Done, 15 minutes later, and Not tonight on fresh eligible test opportunities. Verify no repeat after Done/Not tonight, exactly one deferred opportunity inside the valid window, and unchanged anchors after reopening. Repeated tests require fresh eligible opportunities, not bypassing handled evidence.

Automated commands used locally (no real provider delivery):

```bash
node --test tests/push-delivery-path.test.cjs tests/push-service-worker.test.cjs tests/server-web-push-scheduling.test.cjs tests/notification-persistence.test.cjs tests/background-notification-transport.test.cjs tests/future-notification-planner.test.cjs tests/walkthrough-coaching.test.cjs
npx tsc --noEmit
node scripts/smoke/push-delivery.cjs
node scripts/smoke/first-run-today.cjs
npm run build
```

## Verification boundaries

The automated backend test uses explicit test-only Redis/QStash/push responses and verifies timezone metadata, idempotent scheduling, old-job rejection, device acknowledgement versus server acceptance, bounded 15-minute deferral, Done, Not tonight, and persisted receipt recovery. The service-worker tests cover offline intent persistence/replay and duplicate suppression across worker restart. Chromium browser smoke invokes the **real service worker and Notifications API**, using CDP-injected push events and local API fixtures, with an open tab, a background tab, and all app tabs closed; action clicks are simulated. Desktop/mobile viewport checks exercise real missing-configuration errors, denied permission, persisted failure status, and unchanged bedtime/meal values. Existing first-run browser regression still passes.

None of these tests establishes real QStash timing, live VAPID delivery, physical iOS/Android receipt, OS lock-screen presentation, or force-quit/reboot behavior. Those remain the manual phone test above, after external configuration is supplied. The app cannot schedule new biological opportunities while closed without an already approved server reminder; this change does not add a background coaching engine or a daily lineup.

## Exact source, configuration, and test files changed in this request

- `.env.example`
- `components/circadian-provider.tsx`
- `components/future-notification-planner-bridge.tsx`
- `components/notification-transport-bridge.tsx`
- `components/reminder-delivery-status.tsx`
- `components/todays-flow/daily-profile-form.tsx`
- `docs/personalization/server-web-push-scheduling-v1.md`
- `docs/reminder-delivery-review.md`
- `lib/personalization/notification-persistence.ts`
- `lib/personalization/notification-runtime.ts`
- `lib/personalization/push-configuration.ts`
- `lib/personalization/push-lifecycle.ts`
- `lib/personalization/qstash-scheduler.ts`
- `lib/personalization/server-push-store.ts`
- `lib/personalization/web-push-client.ts`
- `lib/personalization/web-push-server.ts`
- `pages/_app.tsx`
- `pages/api/push/action.ts`
- `pages/api/push/deliveries.ts`
- `pages/api/push/dispatch.ts`
- `pages/api/push/public-key.ts`
- `pages/api/push/schedule.ts`
- `pages/api/push/status.ts`
- `public/ff-notification-sw.js`
- `public/manifest.webmanifest`
- `public/push-icon-192.png`
- `public/push-icon-512.png`
- `scripts/smoke/first-run-today.cjs`
- `scripts/smoke/push-delivery.cjs`
- `tests/notification-persistence.test.cjs`
- `tests/push-delivery-path.test.cjs`
- `tests/push-service-worker.test.cjs`
- `tests/server-web-push-scheduling.test.cjs`
- `views/now-page.tsx`

Local `.next` and `tsconfig.tsbuildinfo` outputs are generated validation caches, not source changes. Earlier uncommitted work was preserved.
