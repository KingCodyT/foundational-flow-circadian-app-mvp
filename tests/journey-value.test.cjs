const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),load=require('./load-typescript.cjs');
const {opportunityLabel}=load('lib/journey-value.ts');
const {TodayPersonalCue}=load('components/today-personal-cue.tsx');
const now=new Date('2026-11-18T14:00:00Z');
const profile={timeZone:'America/Los_Angeles',wakeTime:'06:00',targetBedtime:'22:00'};
test('cue uses passed opportunity and saved timezone without choosing or scheduling another',()=>{
 const future={action:'A test step',start:'2026-11-18T15:00:00Z'};
 assert.match(opportunityLabel(future,now,profile.timeZone),/7:00 AM.*A test step/);
 assert.match(opportunityLabel({...future,start:now},now,profile.timeZone),/^Available now/);
 const html=renderToStaticMarkup(React.createElement(TodayPersonalCue,{signalId:'morning_light_timing',now,profile,opportunity:future}));
 assert.match(html,/Your focus: <strong>Morning Light Timing/); assert.match(html,/href="#today-coaching"/);
 assert.doesNotMatch(html,/<button|Done|notification|remind you/);
});
test('quiet and missing opportunities do not invent actions',()=>{
 const props={signalId:'morning_light_timing',now,profile};
 assert.match(renderToStaticMarkup(React.createElement(TodayPersonalCue,props)),/selected focus stays in place/);
 const html=renderToStaticMarkup(React.createElement(TodayPersonalCue,{...props,quiet:true,opportunity:{action:'Hidden step',start:now}}));
 assert.doesNotMatch(html,/Hidden step|Available now/);assert.match(html,/No new action/);
});
test('live sunlight remains and compact cue shares existing Today decisions',()=>{
 const read=f=>fs.readFileSync(f,'utf8');
 const journey=read('components/journey-now.tsx');
 assert.ok(journey.indexOf('{personalCue}') < journey.indexOf('<DayDashboard')); assert.match(journey,/<SunlightNow/); assert.match(journey,/id="today-coaching"/);
 assert.match(read('views/now-page.tsx'),/opportunity=\{handled \? nextOpportunity : \(displayedReminder \|\| pending \|\| nextOpportunity\)\}/);

});
const {hasGuidanceSchedule}=load('lib/journey-value.ts');
const {TodayCoach}=load('components/today-coach.tsx');
const renderCue=overrides=>renderToStaticMarkup(React.createElement(TodayPersonalCue,{signalId:'morning_light_timing',now,profile,...overrides}));
const renderCoach=overrides=>renderToStaticMarkup(React.createElement(TodayCoach,{signalId:'morning_light_timing',profile,now,day:'2026-11-18',clientId:'test',reminder:null,pending:null,count:0,established:false,updateWeekly:()=>{},respond:()=>true,saveProfile:()=>{},...overrides}));
test('missing or invalid schedule offers direct setup, not fabricated guidance',()=>{
 for(const p of [null,{}, {...profile,wakeTime:null},{...profile,targetBedtime:''},{...profile,wakeTime:'25:00'}]) {
  assert.equal(hasGuidanceSchedule(p),false);
  for(const html of [renderCue({profile:p,opportunity:{start:now,action:'Should not show'}}),renderCoach({profile:p})]) {
   assert.match(html,/href="\/profile\?edit=schedule.*#your-schedule"/);assert.doesNotMatch(html,/Nothing to catch up|Should not show|Your saved daily rhythm/);
  }
 }
});
test('no selected focus is stated honestly and assessment is optional',()=>{
 for(const render of [renderCue,renderCoach]) {const html=render({signalId:'',assessment:assessmentContext({},false)});assert.match(html,/No assessment answers are saved/);assert.match(html,/href="\/audit"/);assert.doesNotMatch(html,/This is your saved focus|Your focus stays/);}
 const html=renderCue({signalId:'',opportunity:{start:now,action:'Existing schedule step'}});assert.match(html,/Existing schedule step/);assert.match(html,/See the full guidance/);
});
test('valid focus distinguishes quiet, current and future without backlog',()=>{
 assert.match(renderCoach({}),/No action suggested right now/);
 assert.match(renderCoach({reminder:{id:'morning_light',start:now,action:'Existing current action',reason:'Saved timing'}}),/Existing current action/);
 assert.match(renderCoach({pending:{start:new Date(+now+3600000),action:'Existing future action'}}),/Existing future action/);
 assert.match(renderCoach({nextOpportunity:{start:new Date(+now+3600000).toISOString(),action:'Existing next action'}}),/Existing next action/);
});
test('preview ocean-slate surfaces are scoped to Today and coastline is retained',()=>{const css=fs.readFileSync('app/coastal-theme.css','utf8').split('/* Today review:')[1];assert.match(css,/\.journey:has\(\.today-dashboard\)/);assert.match(css,/--coastal-bg: #293642/);assert.match(css,/coastal-hero-placeholder.jpg/);assert.doesNotMatch(css,/:root|html, body/);});
test('schedule-only future guidance never claims a selected focus',()=>{const html=renderCoach({signalId:'',nextOpportunity:{start:new Date(+now+3600000).toISOString(),action:'Schedule step'}});assert.match(html,/saved schedule, not a selected assessment focus/);assert.doesNotMatch(html,/Your focus stays/);});

test('partial schedule prompts only for the missing field',()=>{for(const render of [renderCue,renderCoach]){assert.match(render({profile:{...profile,targetBedtime:null}}),/Your wake time is saved. Add your usual bedtime/);assert.match(render({profile:{...profile,wakeTime:null}}),/Your bedtime is saved. Add your usual wake time/);}});

test("Today light details omit distracting Food shortcut while main navigation retains Food",()=>{
 const journey=fs.readFileSync("components/journey-now.tsx","utf8");assert.doesNotMatch(journey,/today-food-link/);assert.match(journey,/More about today’s light/);
 const navigation=fs.readFileSync("components/journey-design.tsx","utf8");assert.match(navigation,/href: "\/food", label: "Food"/);
});
const {assessmentPurpose}=load('lib/journey-value.ts');
const {questionnaire}=load('lib/questionnaire.ts');
test('16 unchanged questions receive bounded explanations from actual signal roles',()=>{assert.equal(questionnaire.length,16);for(const q of questionnaire)assert.ok(assessmentPurpose(q.id).length>20);assert.match(assessmentPurpose('morning_light_timing'),/starting focus.*answer alone does not set a time/);assert.match(assessmentPurpose('sleep_latency'),/does not diagnose/);assert.match(assessmentPurpose('travel_schedule_variability'),/does not follow a live shift roster/);});
test('finish explains existing first-step decision before profile summary, without changing setup structure',()=>{const source=fs.readFileSync('views/profile-setup-page.tsx','utf8');assert.match(source,/\["Basics", "Schedule", "Environment", "Your Reality", "Finish"\]/);assert.ok(source.indexOf('<h2>Your starting point')<source.indexOf('<h2>Your profile at a glance'));assert.match(source,/selectFirstRunGuidance\(draft, now, eventStateByDate\)/);assert.match(source,/assessmentContext\(answers, hasCompletedAudit/);assert.match(source,/no background reminder is promised here/);});

const {assessmentContext}=load('lib/journey-value.ts');
const {assembleDay1Personalization}=load('lib/personalization/day1.ts');
const strongAnswers=Object.fromEntries(questionnaire.map(q=>[q.id,[...q.options].sort((a,b)=>b.score-a.score)[0].value]));
test('complete strong assessment means maintain rhythm, never another assessment request',()=>{
 const candidate=assembleDay1Personalization({answers:strongAnswers}).primaryCoachingTarget;
 assert.equal(candidate.signalId,null);
 const state=assessmentContext(strongAnswers,true,candidate.noTargetReason);assert.equal(state.kind,'complete');
 for(const render of [renderCue,renderCoach]){const html=render({signalId:'',assessment:state});assert.match(html,/did not identify a priority habit/);assert.doesNotMatch(html,/href="\/audit|Explore the assessment|retake/);}
});
test('completion, partial, absent origin and unavailable focus stay distinct without mutating answers',()=>{
 const original=JSON.stringify(strongAnswers);
 assert.equal(assessmentContext(strongAnswers,false).kind,'setup');assert.equal(assessmentContext(strongAnswers,false).href,'/setup');
 const partial={[questionnaire[0].id]:strongAnswers[questionnaire[0].id]};assert.equal(assessmentContext(partial,false).href,'/audit?question=2');
 assert.equal(assessmentContext({},false).kind,'absent');assert.match(assessmentContext({},false).explanation,/same address and browser/);
 assert.equal(assessmentContext({},true).kind,'unavailable');assert.equal(assessmentContext(strongAnswers,true).kind,'unavailable');assert.equal(JSON.stringify(strongAnswers),original);
});
test('weak answer still gets real target, and existing action-specific cue',()=>{
 const q=questionnaire.find(q=>q.id==='morning_light_timing');const answers={...strongAnswers,[q.id]:[...q.options].sort((a,b)=>a.score-b.score)[0].value};
 const candidate=assembleDay1Personalization({answers}).primaryCoachingTarget;assert.equal(candidate.signalId,'morning_light_timing');
 assert.match(renderCue({signalId:candidate.signalId,assessment:assessmentContext(answers,true)}),/Your focus: <strong>Morning Light Timing/);
});
test('first action explains actual when and why, rejecting expired and invalid windows',()=>{
 const opportunity={action:'Existing action',reason:'Existing rationale',start:'2026-11-18T15:00:00Z',end:'2026-11-18T16:00:00Z'};
 const html=renderCue({opportunity});assert.match(html,/<h3>Existing action/);assert.match(html,/Today at 7:00 AM PST/);assert.match(html,/Why this step:.*Existing rationale/);assert.doesNotMatch(html,/America\/Los_Angeles/);
 assert.match(renderCue({opportunity:{...opportunity,start:now}}),/When:<\/strong> Now/);
 for(const bad of [{...opportunity,end:now},{...opportunity,start:'bad'}])assert.doesNotMatch(renderCue({opportunity:bad}),/Existing action|Existing rationale/);
 assert.doesNotMatch(renderCue({quiet:true,opportunity}),/Existing action|Existing rationale|check-in/);
 assert.doesNotMatch(renderCue({opportunity:{...opportunity,reason:undefined}}),/Why this step/);
});
