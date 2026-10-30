const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-typescript.cjs');
const {qstashErrorCategory} = load('lib/personalization/qstash-error.ts');
test('provider rejection categories expose only fixed labels, never echoed sensitive values',async()=>{
  for(const [word,label] of [['deduplication','deduplication_rejected'],['not-before','schedule_rejected'],['destination','destination_rejected'],['quota','limit_reached'],['invalid token','authentication_rejected'],['header','header_rejected'],['unknown','unclassified']]) {
    const secret='Bearer PRIVATE-TOKEN https://device.test/private?secret=PRIVATE-DISPATCH';
    assert.equal(await qstashErrorCategory(new Response(JSON.stringify({error:`${word}: ${secret}`}))),label);
  }
});
test('malformed, oversized and failed body reads never escape into diagnostics',async()=>{
  for(const body of ['<html>private</html>','null','{"error":123}','{"message":"private"}']) assert.equal(await qstashErrorCategory(new Response(body)),'unclassified');
  assert.equal(await qstashErrorCategory(new Response('x'.repeat(4097))),'response_too_large');
  assert.equal(await qstashErrorCategory(new Response(new ReadableStream({start(c){c.error(new Error('secret'));}}))),'unclassified');
});
test('stream reading is bounded and cancels after the size limit',async()=>{
  let cancelled=false;
  const stream=new ReadableStream({pull(c){c.enqueue(new Uint8Array(4097));},cancel(){cancelled=true;}});
  assert.equal(await qstashErrorCategory(new Response(stream)),'response_too_large');
  assert.equal(cancelled,true);
});
test('public failure response allows only fixed category suffixes',()=>{
  const {pushFailure}=load('lib/personalization/push-configuration.ts');
  const keys=['KV_REST_API_URL','KV_REST_API_TOKEN','WEB_PUSH_VAPID_PUBLIC_KEY','WEB_PUSH_VAPID_PRIVATE_KEY','WEB_PUSH_VAPID_SUBJECT','QSTASH_TOKEN','PUSH_DISPATCH_SECRET','APP_ORIGIN'];
  const saved=keys.map(k=>process.env[k]);keys.forEach(k=>process.env[k]='test');
  try {
    assert.equal(pushFailure(new Error('qstash_publish_failed:400:header_rejected')).error,'qstash_publish_failed:400:header_rejected');
    for(const suffix of ['PRIVATE-TOKEN','header_rejected:https://private.test','unclassified\nsecret']) assert.equal(pushFailure(new Error(`qstash_publish_failed:400:${suffix}`)).error,'push_dependency_request_failed');
  } finally {keys.forEach((k,i)=>saved[i]===undefined?delete process.env[k]:process.env[k]=saved[i]);}
});
test('stalled provider response is cancelled within the diagnostic deadline',async()=>{
  let cancelled=false;
  const stream=new ReadableStream({cancel(){cancelled=true;}});
  assert.equal(await qstashErrorCategory(new Response(stream)),'unclassified');
  assert.equal(cancelled,true);
});
