const test=require('node:test'),assert=require('node:assert/strict');
const load=require('./load-typescript.cjs');
const {focusReason,establishedReason}=load('lib/coaching-explanations.ts');
const {questionnaire}=load('lib/questionnaire.ts');
test('focus explanation uses the actual selected answer',()=>{
 const q=questionnaire.find(q=>q.id==='morning_light_timing'),o=q.options[0];
 assert.ok(focusReason({[q.id]:o.value},q.id).includes(o.detail||o.label));
});
test('established explanation distinguishes assessment, practice and unknown saved origin',()=>{
 const q=questionnaire.find(q=>q.id==='morning_light_timing'),o=q.options.find(o=>o.score>=85);
 assert.match(establishedReason({[q.id]:o.value},q.id),/assessment described/);
 assert.match(establishedReason({},q.id,['advanced_by_repeated_daily_evidence_DEVELOPING_to_ESTABLISHED']),/logged practice/);
 assert.match(establishedReason({},q.id),/saved coaching state/);
 assert.doesNotMatch(establishedReason({},q.id),/Your logged practice/);
});
