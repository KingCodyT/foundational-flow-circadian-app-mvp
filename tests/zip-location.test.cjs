const test=require('node:test'),assert=require('node:assert/strict'),load=require('./load-typescript.cjs');
const {parseZipLocation}=load('lib/location/zip-location.ts');
const handler=load('pages/api/location.ts').default;
const fixture={places:[{'place name':'Beverly Hills','state abbreviation':'CA',latitude:'34.09',longitude:'-118.4'}]};
test('ZIP results validate coordinates and preserve area labels',()=>{
 assert.deepEqual(parseZipLocation(fixture),[{label:'Beverly Hills, CA',latitude:34.09,longitude:-118.4}]);
 for(const latitude of ['','NaN','91'])assert.deepEqual(parseZipLocation({places:[{...fixture.places[0],latitude}]}),[]);
 assert.deepEqual(parseZipLocation(null),[]);
});
test('ZIP endpoint validates input, handles missing and unavailable services, and returns valid areas',async t=>{
 const before=global.fetch;t.after(()=>global.fetch=before);
 function res(){return {headers:{},setHeader(k,v){this.headers[k]=v;},status(s){this.code=s;return this;},json(body){this.body=body;return this;}};}
 let calls=0;global.fetch=async()=>{calls++;return {ok:true,json:async()=>fixture};};
 let r=res();await handler({method:'GET',query:{zip:'90210'}},r);assert.equal(r.code,200);assert.equal(r.body.locations[0].label,'Beverly Hills, CA');
 r=res();await handler({method:'GET',query:{zip:'../secret'}},r);assert.equal(r.code,400);assert.equal(calls,1);
 r=res();await handler({method:'POST',query:{zip:'90210'}},r);assert.equal(r.code,405);
 global.fetch=async()=>({status:404,ok:false});r=res();await handler({method:'GET',query:{zip:'00000'}},r);assert.equal(r.code,404);
 global.fetch=async()=>{throw new Error('timeout');};r=res();await handler({method:'GET',query:{zip:'90210'}},r);assert.equal(r.code,503);
});
