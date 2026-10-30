const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-typescript.cjs');
const {qstashDeduplicationId} = load('lib/personalization/qstash-scheduler.ts');
const input={clientId:'synthetic-client',notificationId:'meal:America/Los_Angeles:1793390400000',scheduleRevision:'revision-1'};
test('repeated logical identities have stable fixed-size hexadecimal identifiers',()=>{
  const id=qstashDeduplicationId(input);
  assert.match(id,/^[a-f0-9]{64}$/);
  assert.equal(qstashDeduplicationId({...input}),id);
  assert.equal(qstashDeduplicationId({...input,destination:'https://different.test',scheduledFor:'2099-01-01'}),id);
  for(const key of Object.keys(input)) assert.notEqual(qstashDeduplicationId({...input,[key]:input[key]+'changed'}),id);
});
test('tuple serialization distinguishes ambiguous delimiter concatenations',()=>{
  const a={clientId:'a:b',notificationId:'c',scheduleRevision:'d'};
  const b={clientId:'a',notificationId:'b:c',scheduleRevision:'d'};
  assert.equal(Object.values(a).join(':'),Object.values(b).join(':'));
  assert.notEqual(qstashDeduplicationId(a),qstashDeduplicationId(b));
  assert.notEqual(qstashDeduplicationId({clientId:'a',notificationId:'b',scheduleRevision:'c:d'}),qstashDeduplicationId(b));
});
test('long, escaped and Unicode tuple values remain bounded without leaking their contents',()=>{
  for(const value of ['x'.repeat(10000),'quote" slash\\ colon: newline\n','日本語/🙂','']) {
    const result=qstashDeduplicationId({...input,notificationId:value});
    assert.match(result,/^[a-f0-9]{64}$/);
  }
});
