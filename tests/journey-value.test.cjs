const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),load=require('./load-typescript.cjs');
const {assessmentPurpose,opportunityLabel}=load('lib/journey-value.ts');
const {TodayPersonalCue}=load('components/today-personal-cue.tsx');
const {questionnaire}=load('lib/questionnaire.ts');
const now=new Date('2026-11-18T14:00:00Z');
const profile={timeZone:'America/Los_Angeles'};
test('all 16 unchanged assessment questions have bounded explanations',()=>{
 assert.equal(questionnaire.length,16);
 for(const q of questionnaire) assert.ok(assessmentPurpose(q.id).length>20);
 assert.match(assessmentPurpose('morning_light_timing'),/does not set a time/);
 assert.match(assessmentPurpose('sleep_latency'),/does not diagnose/);
 assert.match(assessmentPurpose('travel_schedule_variability'),/does not follow a live shift roster/);
});
test('cue uses passed opportunity and saved timezone without choosing or scheduling another',()=>{
 const future={action:'A test step',start:'2026-11-18T15:00:00Z'};
 assert.match(opportunityLabel(future,now,profile.timeZone),/7:00 AM.*A test step/);
 assert.match(opportunityLabel({...future,start:now},now,profile.timeZone),/^Available now/);
 const html=renderToStaticMarkup(React.createElement(TodayPersonalCue,{signalId:'morning_light_timing',now,profile,opportunity:future}));
 assert.match(html,/Your focus: Morning Light Timing/); assert.match(html,/href="#today-coaching"/);
 assert.doesNotMatch(html,/<button|Done|notification|remind you/);
});
test('quiet and missing opportunities do not invent actions',()=>{
 const props={signalId:'morning_light_timing',now,profile};
 assert.match(renderToStaticMarkup(React.createElement(TodayPersonalCue,props)),/focus stays in place/);
 const html=renderToStaticMarkup(React.createElement(TodayPersonalCue,{...props,quiet:true,opportunity:{action:'Hidden step',start:now}}));
 assert.doesNotMatch(html,/Hidden step|Available now/);assert.match(html,/No new action/);
});
test('live sunlight remains and compact cue shares existing Today decisions',()=>{
 const read=f=>fs.readFileSync(f,'utf8');
 const journey=read('components/journey-now.tsx');
 assert.match(journey,/\{personalCue\}<SunlightNow/); assert.match(journey,/id="today-coaching"/);
 assert.match(read('views/now-page.tsx'),/opportunity=\{handled \? nextOpportunity : \(displayedReminder \|\| pending \|\| nextOpportunity\)\}/);
 const setup=read('views/profile-setup-page.tsx');
 assert.match(setup,/\["Basics", "Schedule", "Environment", "Your Reality", "Finish"\]/);
 assert.ok(setup.indexOf('<h2>Your starting point')<setup.indexOf('<h2>Your profile at a glance'));
 assert.match(setup,/no background reminder is promised here/);
});
