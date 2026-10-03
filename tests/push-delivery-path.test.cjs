const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-typescript.cjs');
const store = load('lib/personalization/server-push-store.ts');
const lifecycle = load('lib/personalization/push-lifecycle.ts');
const push = load('lib/personalization/web-push-server.ts');
const deliveries = load('pages/api/push/deliveries.ts').default;
const dispatch = load('pages/api/push/dispatch.ts').default;
const action = load('pages/api/push/action.ts').default;
const config = load('pages/api/push/status.ts').default;
async function call(handler, body = {}, method = 'POST', headers = {}) {
  const response = { code: 200, value: null, status(code) { this.code = code; return this; }, json(value) { this.value = value; return this; }, end() { return this; }, setHeader() {} };
  await handler({ method, body, query: body, headers }, response); return response;
}
const env = ['KV_REST_API_URL','KV_REST_API_TOKEN','UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN','QSTASH_TOKEN','PUSH_DISPATCH_SECRET','WEB_PUSH_VAPID_PUBLIC_KEY','WEB_PUSH_VAPID_PRIVATE_KEY','WEB_PUSH_VAPID_SUBJECT','APP_ORIGIN'];
test('missing Redis configuration is a real 503 with exact missing names, never an empty success', async () => {
  const saved = Object.fromEntries(env.map(k => [k, process.env[k]]));
  env.forEach(k => delete process.env[k]);
  try {
    const result = await call(deliveries, { clientId: 'test-client-0001' }, 'GET');
    assert.equal(result.code, 503);
    assert.deepEqual(result.value.missing, ['KV_REST_API_URL or UPSTASH_REDIS_REST_URL','KV_REST_API_TOKEN or UPSTASH_REDIS_REST_TOKEN']);
    assert.equal((await call(load('pages/api/push/meals.ts').default,{clientId:'test-client-0001',profile:{}})).code,503);
    const status = await call(config, {}, 'GET');
    assert.equal(status.code, 503);
    assert.ok(status.value.missing.includes('APP_ORIGIN'));
  } finally { for (const [k,v] of Object.entries(saved)) v === undefined ? delete process.env[k] : process.env[k] = v; }
});
test('durable delivery path: local timezone, one action, dispatch dedup, acknowledgement, deferral, suppression and restart', async () => {
  const saved = Object.fromEntries(env.map(k => [k, process.env[k]]));
  const nativeFetch = global.fetch, nativeDate = global.Date, nativeSend = push.sendWebPush;
  let now = Date.parse('2026-09-19T02:46:00Z');
  global.Date = class extends nativeDate { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } };
  env.forEach(k => delete process.env[k]);
  Object.assign(process.env, { UPSTASH_REDIS_REST_URL: 'https://redis.test', UPSTASH_REDIS_REST_TOKEN: 'test-only', QSTASH_TOKEN: 'test-only', PUSH_DISPATCH_SECRET: 'test-only-dispatch', WEB_PUSH_VAPID_PUBLIC_KEY: 'test-only', WEB_PUSH_VAPID_PRIVATE_KEY: 'test-only', WEB_PUSH_VAPID_SUBJECT: 'mailto:test@example.invalid', APP_ORIGIN: 'https://app.test' });
  const data = new Map(), jobs = []; let sent = 0;
  global.fetch = async (url, options) => {
    if (String(url).startsWith('https://qstash.upstash.io/')) { jobs.push(JSON.parse(options.body)); return new Response(JSON.stringify({ messageId: String(jobs.length) })); }
    assert.equal(url, 'https://redis.test');
    const [cmd, key, ...args] = JSON.parse(options.body); let result = null;
    if (cmd === 'GET') result = data.get(key) ?? null;
    if (cmd === 'SET') { if (!args.includes('NX') || !data.has(key)) { data.set(key, args[0]); result = 'OK'; } }
    if (cmd === 'DEL') { data.delete(key); result = 1; }
    if (cmd === 'EVAL') { const lock = args[1], owner = args[2]; if (data.get(lock) === owner) data.delete(lock); result = 1; }
    if (cmd === 'LRANGE') result = [];
    return new Response(JSON.stringify({ result }));
  };
  push.sendWebPush = async () => { sent++; return { ok: true, status: 201, subscriptionExpired: false }; };
  const clientId = 'test-client-0001';
  const notification = { id: 'test-reminder-1', eventId: 'digital_sunset', targetSignalId: 'evening_screen_exposure', channel: 'NOTIFICATION', title: 'Reduce bright screens', body: 'Supports your 9:30 PM bedtime', scheduledFor: '2026-09-19T03:30:00Z', validUntil: '2026-09-19T04:30:00Z', timeZone: 'America/Los_Angeles' };
  try {
    await store.savePushSubscription({ clientId, endpoint: 'https://push.test', keys: { auth: 'test', p256dh: 'test' }, expirationTime: null, updatedAt: new Date().toISOString() });
    const original = JSON.stringify(notification);
    const plan = await lifecycle.scheduleReminder(clientId, notification);
    assert.equal(plan.dateKey, '2026-09-18'); assert.equal(plan.scheduledFor, notification.scheduledFor);
    assert.equal((await lifecycle.scheduleReminder(clientId, notification)).scheduleRevision, plan.scheduleRevision);
    assert.equal(jobs.length, 1);
    const headers = { authorization: 'Bearer test-only-dispatch' };
    assert.equal((await call(dispatch, jobs[0], 'POST', headers)).code, 425);
    now = Date.parse(notification.scheduledFor);
    assert.equal((await call(dispatch, jobs[0], 'POST', headers)).code, 204);
    assert.equal((await call(dispatch, jobs[0], 'POST', headers)).code, 204);
    assert.equal(sent, 1);
    let receipt = await call(deliveries, { clientId }, 'GET');
    assert.equal(receipt.value.reminder.state, 'sent'); // server acceptance is NOT Delivered
    const request = { clientId, notificationId: notification.id, actionToken: plan.actionToken };
    assert.equal((await call(action, { ...request, actionToken: 'bad', action: 'done' })).code, 401);
    assert.equal((await call(action, { ...request, action: 'delivered' })).value.reminder.state, 'delivered');
    const defer = await call(action, { ...request, action: 'later' });
    assert.equal(defer.value.reminder.state, 'deferred');
    assert.equal(defer.value.reminder.scheduledFor, '2026-09-19T03:45:00.000Z');
    await call(action, { ...request, action: 'later' }); assert.equal(jobs.length, 2);
    await call(dispatch, jobs[0], 'POST', headers); assert.equal(sent, 1); // superseded job
    now += 15 * 60000;
    await call(dispatch, jobs[1], 'POST', headers); assert.equal(sent, 2);
    await call(action, { ...request, action: 'done' });
    receipt = await call(deliveries, { clientId }, 'GET');
    assert.equal(receipt.value.reminder.state, 'completed'); // available after app restart
    const suppressed = await lifecycle.scheduleReminder(clientId, { ...notification, id: 'another-evening-cue', eventId: 'dim_house', scheduledFor: new Date(now + 60000).toISOString() });
    assert.equal(suppressed.state, 'suppressed'); assert.equal(jobs.length, 2);
    assert.equal(JSON.stringify(notification), original); // server never edits user input
    const tomorrow = await lifecycle.scheduleReminder(clientId, { ...notification, id: 'tomorrow', scheduledFor: '2026-09-20T03:30:00Z', validUntil: '2026-09-20T04:30:00Z' });
    const skip = await call(action, { clientId, notificationId: tomorrow.notificationId, actionToken: tomorrow.actionToken, action: 'skip' });
    assert.equal(skip.value.reminder.state, 'suppressed'); assert.equal(skip.value.reminder.reason, 'Not tonight');
    assert.equal((await lifecycle.scheduleReminder(clientId, { ...notification, id: 'same-day-again', scheduledFor: '2026-09-20T03:40:00Z', validUntil: '2026-09-20T04:30:00Z' })).state, 'suppressed');
    now = Date.parse('2026-09-21T04:25:00Z');
    const late = await lifecycle.scheduleReminder(clientId, { ...notification, id: 'late', scheduledFor: '2026-09-21T04:00:00Z', validUntil: '2026-09-21T04:30:00Z' });
    assert.equal((await call(action, { clientId, notificationId: late.notificationId, actionToken: late.actionToken, action: 'later' })).code, 409);
    await lifecycle.scheduleReminder(clientId, { ...notification, id: 'replacement', scheduledFor: '2026-09-21T04:26:00Z', validUntil: '2026-09-21T04:30:00Z' });
    const old = await call(action, { clientId, notificationId: late.notificationId, actionToken: late.actionToken, action: 'inspect' });
    assert.equal(old.value.reminder.state, 'suppressed');
    const meals = load('pages/api/push/meals.ts').default;
    const mealProfile={wakeTime:'07:00',targetBedtime:'23:00',lastMealTime:'19:00',timeZone:'America/Los_Angeles'};
    const mealPlan=load('lib/personalization/meal-notifications.ts').planMealNotifications(mealProfile,new Date());
    const coachingId=await store.redisCommand(['GET',lifecycle.activeKey(clientId)]);
    assert.equal((await call(meals,{clientId,profile:mealProfile})).value.scheduled,7);
    assert.equal(await store.redisCommand(['GET',lifecycle.activeKey(clientId)]),coachingId);
    const queuedJobs=jobs.length;
    await call(meals,{clientId,profile:mealProfile});assert.equal(jobs.length,queuedJobs);
    const mealRecord=await store.getServerPushSchedule(clientId,mealPlan[0].id);
    const mealJob=jobs.find(j=>j.notificationId===mealRecord.notificationId);
    now=Date.parse(mealRecord.scheduledFor);
    const sentBefore=sent;assert.equal((await call(dispatch,mealJob,'POST',headers)).code,204);assert.equal(sent,sentBefore+1);
    assert.equal((await call(action,{clientId,notificationId:mealRecord.notificationId,actionToken:mealRecord.actionToken,action:'inspect'})).value.reminder.state,'sent');
    await call(action,{clientId,notificationId:mealRecord.notificationId,actionToken:mealRecord.actionToken,action:'later'});
    await call(meals,{clientId,profile:mealProfile});
    assert.equal((await store.getServerPushSchedule(clientId,mealRecord.notificationId)).state,'deferred');
    assert.equal((await call(meals,{clientId},'DELETE')).code,200);
    for(const meal of mealPlan)assert.equal((await store.getServerPushSchedule(clientId,meal.id)).state,'suppressed');
    assert.equal(await store.redisCommand(['GET',lifecycle.activeKey(clientId)]),coachingId);

  } finally { global.fetch = nativeFetch; global.Date = nativeDate; push.sendWebPush = nativeSend; for (const [k,v] of Object.entries(saved)) v === undefined ? delete process.env[k] : process.env[k] = v; }
});
