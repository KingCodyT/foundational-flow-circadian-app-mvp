import {
  createCipheriv,
  createECDH,
  createHmac,
  createPrivateKey,
  randomBytes,
  sign,
} from "node:crypto";
import { PushSubscriptionRecord } from "./server-push-store";

function base64UrlEncode(value: Buffer | string) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value);
  return buffer
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(normalized + padding, "base64");
}

function hmac(key: Buffer, data: Buffer) {
  return createHmac("sha256", key).update(data).digest();
}

function hkdfExpand(prk: Buffer, info: Buffer, length: number) {
  const block = hmac(prk, Buffer.concat([info, Buffer.from([1])]));
  return block.subarray(0, length);
}

function getVapidConfig() {
  const publicKey = process.env.WEB_PUSH_VAPID_PUBLIC_KEY ?? null;
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY ?? null;
  const subject = process.env.WEB_PUSH_VAPID_SUBJECT ?? "mailto:notifications@codyoakland.com";

  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject };
}

export function webPushConfigured() {
  return Boolean(getVapidConfig());
}

export function getVapidPublicKey() {
  return getVapidConfig()?.publicKey ?? null;
}

function createVapidAuthorization(endpoint: string) {
  const config = getVapidConfig();
  if (!config) throw new Error("web_push_vapid_unavailable");

  const publicKeyBytes = base64UrlDecode(config.publicKey);
  const privateKeyBytes = base64UrlDecode(config.privateKey);
  if (publicKeyBytes.length !== 65 || publicKeyBytes[0] !== 4) {
    throw new Error("invalid_vapid_public_key");
  }
  if (privateKeyBytes.length !== 32) throw new Error("invalid_vapid_private_key");

  const x = publicKeyBytes.subarray(1, 33);
  const y = publicKeyBytes.subarray(33, 65);
  const key = createPrivateKey({
    key: {
      kty: "EC",
      crv: "P-256",
      x: base64UrlEncode(x),
      y: base64UrlEncode(y),
      d: base64UrlEncode(privateKeyBytes),
    },
    format: "jwk",
  });

  const audience = new URL(endpoint).origin;
  const nowSeconds = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ typ: "JWT", alg: "ES256" }));
  const body = base64UrlEncode(
    JSON.stringify({
      aud: audience,
      exp: nowSeconds + 12 * 60 * 60,
      sub: config.subject,
    }),
  );
  const unsigned = `${header}.${body}`;
  const signature = sign("sha256", Buffer.from(unsigned), {
    key,
    dsaEncoding: "ieee-p1363",
  });
  const token = `${unsigned}.${base64UrlEncode(signature)}`;

  return `vapid t=${token}, k=${config.publicKey}`;
}

function encryptPayload(subscription: PushSubscriptionRecord, payload: string) {
  const clientPublicKey = base64UrlDecode(subscription.keys.p256dh);
  const authSecret = base64UrlDecode(subscription.keys.auth);
  if (clientPublicKey.length !== 65 || clientPublicKey[0] !== 4) {
    throw new Error("invalid_push_subscription_public_key");
  }
  if (authSecret.length !== 16) throw new Error("invalid_push_subscription_auth_secret");

  const serverEcdh = createECDH("prime256v1");
  const serverPublicKey = serverEcdh.generateKeys();
  const sharedSecret = serverEcdh.computeSecret(clientPublicKey);

  const keyInfo = Buffer.concat([
    Buffer.from("WebPush: info\0", "utf8"),
    clientPublicKey,
    serverPublicKey,
  ]);
  const prkKey = hmac(authSecret, sharedSecret);
  const ikm = hkdfExpand(prkKey, keyInfo, 32);

  const salt = randomBytes(16);
  const prk = hmac(salt, ikm);
  const contentEncryptionKey = hkdfExpand(
    prk,
    Buffer.from("Content-Encoding: aes128gcm\0", "utf8"),
    16,
  );
  const nonce = hkdfExpand(
    prk,
    Buffer.from("Content-Encoding: nonce\0", "utf8"),
    12,
  );

  const plaintext = Buffer.concat([Buffer.from(payload, "utf8"), Buffer.from([2])]);
  const cipher = createCipheriv("aes-128-gcm", contentEncryptionKey, nonce);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  const recordSize = Buffer.alloc(4);
  recordSize.writeUInt32BE(4096, 0);
  const header = Buffer.concat([
    salt,
    recordSize,
    Buffer.from([serverPublicKey.length]),
    serverPublicKey,
  ]);

  return Buffer.concat([header, ciphertext, tag]);
}

export type WebPushSendResult = {
  ok: boolean;
  status: number;
  subscriptionExpired: boolean;
};

export async function sendWebPush(
  subscription: PushSubscriptionRecord,
  notification: Record<string, unknown>,
): Promise<WebPushSendResult> {
  const body = encryptPayload(
    subscription,
    JSON.stringify({ notification }),
  );
  const authorization = createVapidAuthorization(subscription.endpoint);

  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: "300",
      Urgency: "normal",
    },
    body,
  });

  return {
    ok: response.ok,
    status: response.status,
    subscriptionExpired: response.status === 404 || response.status === 410,
  };
}
