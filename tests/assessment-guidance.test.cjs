const test=require('node:test'),assert=require('node:assert/strict'),load=require('./load-typescript.cjs');
const {assessmentAdaptations}=load('lib/assessment-guidance.ts');
const {focusReason}=load('lib/coaching-explanations.ts');
test('explicit constraints produce actionable, truthful adaptations without changing focus',()=>{
 const result=assessmentAdaptations({home_environment_support:'low',travel_schedule_variability:'shift_or_irregular'},'evening_light_reduction');
 assert.equal(result.length,2);assert.match(result[0].suggestion,/one unnecessary/);assert.match(result[1].why,/not a live work roster/);
});
test('sleep outcomes adapt evening guidance but never infer disease or promise sleep',()=>{
 const result=assessmentAdaptations({bedroom_darkness:'bright_room',sleep_duration:'low',sleep_latency:'very_delayed',stress_winddown:'low'},'sleep_schedule');
 assert.equal(result.length,4);assert.ok(result.every(x=>x.youSaid && x.suggestion && x.why));
 assert.equal(assessmentAdaptations({sleep_latency:'very_delayed'},'morning_movement').length,0);
});
test('missing, unknown and favorable answers do not manufacture constraints',()=>{
 assert.deepEqual(assessmentAdaptations({},'sleep_schedule'),[]);
 assert.deepEqual(assessmentAdaptations({home_environment_support:'ideal',travel_schedule_variability:'unknown'},'sleep_schedule'),[]);
 assert.doesNotMatch(focusReason({},'sleep_schedule'),/Your assessment helped/);
});
