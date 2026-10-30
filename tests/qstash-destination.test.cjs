const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-typescript.cjs');
const {scheduleQStashDispatch} = load('lib/personalization/qstash-scheduler.ts');
const lifecycle = load('lib/personalization/push-lifecycle.ts');
const store = load('lib/personalization/server-push-store.ts');
async function fixture(run) {
  const values={QSTASH_TOKEN:'test-token',PUSH_DISPATCH_SECRET:'test-secret',APP_ORIGIN:'https://app.test',KV_REST_API_URL:'https://redis.test',KV_REST_API_TOKEN:'test-token'};
  const saved=Object.fromEntries(Object.keys(values).map(k=>[k,process.env[k]])),fetch=global.fetch;
  Object.assign(process.env,values);
  try { await run(); } finally { global.fetch=fetch;for(const [k,v] of Object.entries(saved))v===undefined?delete process.env[k]:process.env[k]=v; }
}
test('QStash publish embeds raw destination URL and preserves scheduling contract',()=>fixture(async()=>{
  const input={destination:'https://circadianflow.app/api/push/dispatch',clientId:'test-client',notificationId:'test-reminder',scheduleRevision:'revision-1',scheduledFor:'2099-01-01T18:30:00Z'};
  global.fetch=async(url,options)=>{
    assert.equal(url,'https://qstash.upstash.io/v2/publish/https://circadianflow.app/api/push/dispatch');
    assert.equal(options.method,'POST');assert.equal(options.headers['Upstash-Not-Before'],String(Date.parse(input.scheduledFor)/1000));
    assert.equal(options.headers['Upstash-Retries'],'3');assert.equal(options.headers['Upstash-Deduplication-Id'],'test-client:test-reminder:revision-1');
    assert.equal(options.headers['Upstash-Forward-Authorization'],'Bearer test-secret');
    assert.deepEqual(JSON.parse(options.body),{clientId:input.clientId,notificationId:input.notificationId,scheduleRevision:input.scheduleRevision});
    return new Response(JSON.stringify({messageId:'test-message'}));
  };
  assert.deepEqual(await scheduleQStashDispatch(input),{messageId:'test-message'});
}));
test('failed publish records failure; explicit retry recovers and successful repeat is deduplicated',()=>fixture(async()=>{
  const data=new Map();let publishes=0;
  global.fetch=async(url,options)=>{
    if(String(url).startsWith('https://qstash.upstash.io/')){
      assert.equal(url,'https://qstash.upstash.io/v2/publish/https://app.test/api/push/dispatch');publishes++;
      return publishes===1?new Response('not found',{status:404}):new Response(JSON.stringify({messageId:'test-message'}));
    }
    assert.equal(url,'https://redis.test');const [cmd,key,...args]=JSON.parse(options.body);let result=null;
    if(cmd==='GET')result=data.get(key)??null;
    if(cmd==='SET'&&(!args.includes('NX')||!data.has(key))){data.set(key,args[0]);result='OK';}
    if(cmd==='EVAL'){const lock=args[1],owner=args[2];if(data.get(lock)===owner)data.delete(lock);result=1;}
    return new Response(JSON.stringify({result}));
  };
  const n={id:'test-meal',eventId:'meal_suggestion',channel:'NOTIFICATION',title:'Test',body:'Test only',scheduledFor:'2099-01-01T18:30:00Z',validUntil:'2099-01-01T19:30:00Z',timeZone:'UTC'};
  await assert.rejects(lifecycle.scheduleReminder('test-client',n),/qstash_publish_failed:404/);
  const failed=await store.getServerPushSchedule('test-client',n.id);assert.equal(failed.state,'failed');assert.equal(publishes,1);
  const recovered=await lifecycle.scheduleReminder('test-client',n);assert.equal(recovered.state,'scheduled');assert.notEqual(recovered.scheduleRevision,failed.scheduleRevision);assert.equal(publishes,2);
  const repeat=await lifecycle.scheduleReminder('test-client',n);assert.equal(repeat.scheduleRevision,recovered.scheduleRevision);assert.equal(publishes,2);
}));
