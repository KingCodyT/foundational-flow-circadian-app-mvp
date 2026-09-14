const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-typescript.cjs');

const store = load('lib/personalization/server-push-store.ts');
const push = load('lib/personalization/web-push-server.ts');
const qstash = load('lib/personalization/qstash-scheduler.ts');

function withEnv(values, fn) {
  const previous = {};
  for (const [key, value] of Object.entries(values)) {
    previous[key] = process.env[key];
    if (value == null) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value == null) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test('server push store stays unavailable without durable Redis configuration', () => {
  withEnv(
    {
      KV_REST_API_URL: null,
      KV_REST_API_TOKEN: null,
      UPSTASH_REDIS_REST_URL: null,
      UPSTASH_REDIS_REST_TOKEN: null,
    },
    () => assert.equal(store.pushStoreConfigured(), false),
  );
});

test('server push store recognizes Vercel KV-style REST configuration', () => {
  withEnv(
    {
      KV_REST_API_URL: 'https://example.test',
      KV_REST_API_TOKEN: 'token',
    },
    () => assert.equal(store.pushStoreConfigured(), true),
  );
});

test('VAPID public key is exposed only when both VAPID keys exist', () => {
  withEnv(
    {
      WEB_PUSH_VAPID_PUBLIC_KEY: 'public-key',
      WEB_PUSH_VAPID_PRIVATE_KEY: null,
    },
    () => {
      assert.equal(push.webPushConfigured(), false);
      assert.equal(push.getVapidPublicKey(), null);
    },
  );

  withEnv(
    {
      WEB_PUSH_VAPID_PUBLIC_KEY: 'public-key',
      WEB_PUSH_VAPID_PRIVATE_KEY: 'private-key',
    },
    () => {
      assert.equal(push.webPushConfigured(), true);
      assert.equal(push.getVapidPublicKey(), 'public-key');
    },
  );
});

test('one-shot scheduler requires both QStash token and dispatch secret', () => {
  withEnv(
    {
      QSTASH_TOKEN: 'token',
      PUSH_DISPATCH_SECRET: null,
    },
    () => assert.equal(qstash.qstashConfigured(), false),
  );

  withEnv(
    {
      QSTASH_TOKEN: 'token',
      PUSH_DISPATCH_SECRET: 'secret',
    },
    () => assert.equal(qstash.qstashConfigured(), true),
  );
});
