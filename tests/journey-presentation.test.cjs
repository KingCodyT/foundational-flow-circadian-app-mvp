const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-typescript.cjs');
const { selectJourneyReference } = load('lib/journey-presentation.ts');
const base = { overview:false, hour:7, now:7*3600000, sunrise:6*3600000, sunset:19*3600000, morningEvidenceAt:null, sleepOpportunity:false, hasAction:true };
test('approved artwork follows the ten app reference states without changing input', () => {
 const scenarios = [
  [{overview:true},6], [{hour:5,now:5*3600000},7], [{},8],
  [{morningEvidenceAt:7*3600000-60000},9], [{morningEvidenceAt:6*3600000},10],
  [{hour:18,now:18*3600000},11], [{hour:19,now:19*3600000+60000},12],
  [{hour:20,now:20*3600000},13], [{hour:20,now:20*3600000,hasAction:false},14], [{sleepOpportunity:true},15],
 ];
 for (const [override,expected] of scenarios) {const input=Object.freeze({...base,...override});assert.equal(selectJourneyReference(input),expected);}
});
test('missing location does not fabricate solar timestamps', () => {
 const input=Object.freeze({...base,sunrise:null,sunset:null,hour:2,now:2*3600000,hasAction:false});
 assert.equal(selectJourneyReference(input),14);assert.equal(input.sunrise,null);assert.equal(input.sunset,null);
});
