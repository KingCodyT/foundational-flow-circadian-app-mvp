// Protected Stage 5B smoke test. Run only against the guarded local server.
// Uses ephemeral Chrome contexts and synthetic fixtures; no personal browser data.
const { chromium } = require('playwright-core');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const out = path.join(root, '.tools/stage5b');
const base = 'http://127.0.0.1:3027';
const key = 'foundational-flow-circadian-app-state';
const report = { checks: [], console: [], errors: [], failed: [], blocked: [], safety: [], layouts: [], screenshots: [] };
const save = () => fs.writeFileSync(path.join(out, 'browser-results.json'), JSON.stringify(report, null, 2));
const fixed = '2026-10-01T12:00:00Z';
const fixture = (zone = 'Europe/London') => {
  const value = JSON.parse(fs.readFileSync(path.join(root, 'tests/fixtures/storage/architecture-v1.json'), 'utf8'));
  value.clientId = 'stage5b-synthetic';
  value.dailyProfile = { ...value.dailyProfile, displayName:'Alex', timeZone:zone, wakeTime:'07:00', targetBedtime:'22:00', lastMealTime:'18:30', remindersEnabled:false };
  value.firstRunHandoff = null;
  value.acceptedFocus = { version:1,status:'accepted',signalId:'morning_light_timing',acceptedAt:'2026-08-19T00:00:00Z',source:'explicit' };
  value.answers = { ...value.answers, morning_light_timing:'within_15', bedroom_darkness:'blackout' };
  value.notificationState = { scheduledNotification:null, deliveredNotifications:[], materialChangeKeys:{} };
  const context = { capturedAt:'2026-10-01T09:00:00Z',timeZone:'Europe/London',wakeAt:'2026-10-01T06:00:00Z',targetSleepAt:'2026-10-01T21:00:00Z',sunriseAt:'2026-10-01T06:05:00Z',sunsetAt:'2026-10-01T17:40:00Z',morningLightAt:null,latitude:51.5,longitude:-0.12 };
  value.foodTimingEvidenceByDate = { '2026-10-01':[{id:'synthetic-breakfast',action:'MEAL_STARTED',source:'USER',at:'2026-10-01T08:15:00+01:00',recordedAt:'2026-10-01T08:16:00+01:00',historicalContext:context}] };
  value.eventStateByDate = { ...value.eventStateByDate, '2026-10-01':{ morning_light:{status:'skipped',at:'2026-10-01T08:00:00+01:00'}, evening_light:{status:'upcoming',at:'2026-10-01T10:00:00+01:00',remindAt:'2026-10-01T20:00:00+01:00'} } };
  return value;
};
(async () => {
 fs.mkdirSync(path.join(out,'screenshots'),{recursive:true});
 const browser = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--disable-background-networking','--disable-sync','--no-first-run','--disable-component-update','--disable-default-apps']});
 async function makeContext(width, timezoneId='America/Los_Angeles') {
   const context = await browser.newContext({viewport:{width,height:900},timezoneId,serviceWorkers:'block',permissions:[]});
   await context.route('**/*',route=>{
     const url=new URL(route.request().url());
     if(url.origin!==base || url.pathname.startsWith('/api/')) {report.blocked.push({url:url.href,method:route.request().method()});return route.abort('blockedbyclient');}
     return route.continue();
   });
   await context.addInitScript(({fixed})=>{
     const RealDate=Date;
     window.Date=class extends RealDate {constructor(...args){super(...(args.length?args:[fixed]));}static now(){return new RealDate(fixed).getTime();}};
     window.__safety=[];window.__storageWrites=[];
     const originalSet=Storage.prototype.setItem,originalRemove=Storage.prototype.removeItem,originalClear=Storage.prototype.clear;
     Storage.prototype.setItem=function(k,v){window.__storageWrites.push(['set',k]);return originalSet.call(this,k,v);};
     Storage.prototype.removeItem=function(k){window.__storageWrites.push(['remove',k]);return originalRemove.call(this,k);};
     Storage.prototype.clear=function(){window.__storageWrites.push(['clear']);return originalClear.call(this);};
     const block=name=>()=>{window.__safety.push(name);throw Error('Stage5B blocked '+name);};
     if(window.Notification){Object.defineProperty(Notification,'permission',{get:()=> 'denied'});Notification.requestPermission=block('notification permission');}
     if(navigator.serviceWorker)navigator.serviceWorker.register=block('service worker registration');
     if(window.PushManager)PushManager.prototype.subscribe=block('push subscription');
     if(navigator.geolocation)navigator.geolocation.getCurrentPosition=block('geolocation');
   },{fixed});
   const page=await context.newPage();
   page.on('console',m=>{if(['warning','error'].includes(m.type()))report.console.push({type:m.type(),text:m.text(),url:page.url()});});
   page.on('pageerror',e=>report.errors.push({message:e.message,url:page.url()}));
   page.on('requestfailed',r=>report.failed.push({url:r.url(),error:r.failure()?.errorText}));
   page.on('response',r=>{if(r.status()>=400)report.failed.push({url:r.url(),status:r.status()});});
   return {context,page};
 }
 async function check(name,fn) {try{await fn();report.checks.push({name,pass:true});}catch(e){report.checks.push({name,pass:false,error:e.stack});}save();}
 const settle=async page=>{await page.waitForTimeout(700);await page.evaluate(()=>document.fonts.ready);};
 const state=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
 const integrity=s=>JSON.stringify({runtime:s.personalizationRuntime,focus:s.acceptedFocus,answers:s.answers,profile:s.dailyProfile,participation:s.participationLevel,events:s.eventStateByDate,food:s.foodTimingEvidenceByDate});
 // Read the real provider value from React's rendered context, without adding a test route or application code.
 const runtime=page=>page.evaluate(()=>{
   const el=document.querySelector('main')||document.querySelector('.journey');
   let fiber=el[Object.keys(el).find(k=>k.startsWith('__reactFiber$'))];
   while(fiber){const v=fiber.memoizedProps?.value;if(v?.runtime && v?.environment)return JSON.stringify({runtime:v.runtime,focus:v.acceptedFocus,answers:v.answers,profile:v.dailyProfile,participation:v.participationLevel,events:v.eventStateByDate,food:v.foodTimingEvidenceByDate,localDate:v.environment.localDate});fiber=fiber.return;}
   throw Error('Provider context not found');
 });
 async function layout(page,name,screenshot=false) {
   await settle(page);
   const result=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,brokenImages:[...document.images].filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.src)}));
   report.layouts.push({name,...result});assert.ok(result.scrollWidth<=result.width,`${name} horizontal overflow`);assert.deepEqual(result.brokenImages,[]);
   if(screenshot){await page.evaluate(()=>window.scrollTo(0,0));await settle(page);const file=path.join(out,'screenshots',name+'.png');await page.screenshot({path:file,fullPage:true});report.screenshots.push(file);}
 }
 async function seed(page,value) {await page.goto(base+'/profile',{waitUntil:'networkidle'});await page.evaluate(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),{key,value});await page.reload({waitUntil:'networkidle'});await settle(page);}
 for(const width of [1440,390]) {
   const {context,page}=await makeContext(width);const size=width===1440?'desktop':'mobile';
   await check(`${size} five-stage onboarding, draft recovery and handoff`,async()=>{
     await page.goto(base+'/',{waitUntil:'networkidle'});await page.getByRole('heading',{name:/personalize/}).waitFor();
     assert.deepEqual(await page.locator('.journey-steps small').allTextContents(),['Basics','Schedule','Environment','Your Reality','Finish']);
     await page.getByLabel('What’s your name?').fill('Alex');await page.getByRole('button',{name:'Save and Finish Later'}).click();await page.reload({waitUntil:'networkidle'});
     await page.waitForFunction(()=>document.querySelector('input[type="text"]')?.value==='Alex');
     await layout(page,`onboarding-1-${size}`,true);
     await page.getByRole('button',{name:/Next:/}).click();await page.getByLabel('Typical wake time').fill('07:00');await page.getByLabel('Target bedtime').fill('22:00');await page.getByLabel('When do you usually have your last meal?').fill('18:30');await layout(page,`onboarding-2-${size}`,true);
     await page.getByRole('button',{name:/Next:/}).click();await page.getByText('Location is optional',{exact:false}).first().waitFor();await layout(page,`onboarding-3-${size}`,true);
     await page.getByRole('button',{name:/Next:/}).click();await layout(page,`onboarding-4-${size}`,true);
     await page.getByRole('button',{name:/Next:/}).click();await page.getByRole('button',{name:'Continue to Today →'}).waitFor();await layout(page,`onboarding-5-${size}`,true);
     await page.getByRole('button',{name:'Continue to Today →'}).click();await page.waitForURL('**/today?view=overview');await settle(page);
     const s=await state(page);assert.equal(s.dailyProfile.displayName,'Alex');assert.equal(s.dailyProfile.timeZone,'America/Los_Angeles');assert.equal(s.hasCompletedAudit,true);
   });
   await seed(page,fixture());
   await check(`${size} assessment keyboard disclosure: zero storage writes and unchanged live runtime`,async()=>{
     const before=await page.evaluate(()=>JSON.stringify({...localStorage})),beforeRuntime=await runtime(page);
     const start=await page.evaluate(()=>window.__storageWrites.length);
     const details=page.locator('.assessment-disclosure'),summary=details.locator('summary');
     assert.equal(await details.getAttribute('open'),null);
     await summary.focus();assert.ok(await summary.evaluate(el=>el===document.activeElement));
     assert.notEqual(await summary.evaluate(el=>getComputedStyle(el).outlineStyle),'none');
     await page.keyboard.press('Enter');assert.notEqual(await details.getAttribute('open'),null);await page.getByText('Within 15 min',{exact:true}).waitFor();
     assert.equal(await details.locator('input,button,form').count(),0);
     await layout(page,`assessment-open-${size}`,true);
     await summary.focus();await page.keyboard.press('Space');assert.equal(await details.getAttribute('open'),null);await settle(page);
     assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage})),before);assert.equal(await runtime(page),beforeRuntime);
     assert.equal(await page.evaluate(()=>window.__storageWrites.length),start);
   });
   await check(`${size} Profile progressive disclosure`,async()=>{
     const before=integrity(await state(page)),live=await runtime(page);
     for(const name of ['Edit your schedule','Manage coaching preferences','Retake options','More history options','Manage wearables']) {
       const summary=page.locator('summary').filter({hasText:new RegExp('^'+name+'$')});
       await summary.focus();await page.keyboard.press('Enter');assert.notEqual(await summary.locator('..').getAttribute('open'),null);await layout(page,`${name}-${size}`);
       if(name==='Retake options')assert.equal(await page.getByRole('link',{name:'Retake assessment',exact:true}).getAttribute('href'),'/audit');
       await summary.focus();await page.keyboard.press('Enter');assert.equal(await summary.locator('..').getAttribute('open'),null);
     }
     assert.equal(integrity(await state(page)),before);assert.equal(await runtime(page),live);
   });
   await check(`${size} direct destinations, reload and navigation preserve Established, pending review and accepted focus`,async()=>{
     const s=await state(page),before=integrity(s),live=await runtime(page);
     assert.equal(s.personalizationRuntime.state.perSignal.morning_light_timing.coachingState,'ESTABLISHED');assert.ok(s.personalizationRuntime.state.perSignal.morning_light_timing.reconsideration);
     assert.equal(s.acceptedFocus.signalId,'morning_light_timing');
     for(const route of ['today','timeline','profile']) {
       await page.goto(base+'/'+route,{waitUntil:'networkidle'});await settle(page);assert.equal(integrity(await state(page)),before);assert.equal(await runtime(page),live);
       assert.equal(await page.locator('nav[aria-label="Primary navigation"] a[aria-current="page"]').getAttribute('href'),'/'+route);
       await layout(page,`${route}-${size}`,true);await page.reload({waitUntil:'networkidle'});await settle(page);assert.equal(integrity(await state(page)),before);
     }
     const nav=page.getByRole('navigation',{name:'Primary navigation'});assert.deepEqual(await nav.locator('a span').allTextContents(),['Today','Timeline','Profile']);
     await nav.getByRole('link',{name:'Today',exact:true}).click();await page.waitForURL('**/today');await nav.getByRole('link',{name:'Timeline',exact:true}).click();await page.waitForURL('**/timeline');await page.goBack();await page.waitForURL('**/today');await page.goForward();await page.waitForURL('**/timeline');await settle(page);assert.equal(integrity(await state(page)),before);assert.equal(await runtime(page),live);
   });
   await check(`${size} Timeline provenance disclosure and date browsing are read-only`,async()=>{
     await page.goto(base+'/timeline?date=2026-10-01&tag=kept',{waitUntil:'networkidle'});await settle(page);
     const before=integrity(await state(page)),live=await runtime(page),writes=await page.evaluate(()=>window.__storageWrites.length);
     const entry=page.locator('.timeline-entry').filter({has:page.getByRole('heading',{name:'Recorded meal',exact:true})});
     const summary=entry.locator('summary');await summary.focus();await page.keyboard.press('Enter');assert.notEqual(await entry.locator('details').getAttribute('open'),null);
     assert.ok((await entry.innerText()).includes('2026-10-01T08:15:00+01:00'));await page.keyboard.press('Enter');
     assert.ok((await page.locator('.timeline-entries').innerText()).includes('skipped'));
     await page.getByRole('button',{name:'Previous day',exact:true}).click();await settle(page);assert.equal(new URL(page.url()).searchParams.get('tag'),'kept');
     await page.getByRole('navigation',{name:'Timeline date',exact:true}).getByLabel('Timeline date').fill('2030-01-01');await settle(page);
     await page.getByRole('button',{name:'Return to Today',exact:true}).click();await settle(page);
     assert.equal(integrity(await state(page)),before);assert.equal(await runtime(page),live);assert.equal(await page.evaluate(()=>window.__storageWrites.length),writes);
   });
   await check(`${size} record/edit historical meal, modal focus, persistence`,async()=>{
     await page.goto(base+'/timeline',{waitUntil:'networkidle'});await page.getByText('Record or edit a meal time',{exact:true}).click();
     const before=await state(page);await page.getByRole('button',{name:"I'm eating now",exact:true}).click();await settle(page);
     const meal=Object.values((await state(page)).foodTimingEvidenceByDate).flat().find(m=>m.id!=='synthetic-breakfast');assert.ok(meal);
     const trigger=page.getByRole('button',{name:'Change time',exact:true}).last();await trigger.click();const dialog=page.getByRole('dialog');await dialog.waitFor();
     assert.equal(await page.locator(':focus').getAttribute('id'),'food-time-hour');await page.keyboard.press('Shift+Tab');assert.ok(await dialog.evaluate(el=>el.contains(document.activeElement)));await page.keyboard.press('Tab');assert.ok(await dialog.evaluate(el=>el.contains(document.activeElement)));
     await layout(page,`meal-dialog-${size}`,true);
    await page.keyboard.press('Escape');await dialog.waitFor({state:'detached'});await page.waitForFunction(element=>document.activeElement===element,await trigger.elementHandle());
     await trigger.click();await dialog.getByLabel('Meal date').fill('2026-09-01');await dialog.locator('button[type="submit"]').click();await settle(page);
     const edited=Object.values((await state(page)).foodTimingEvidenceByDate).flat().find(m=>m.id===meal.id);assert.deepEqual(edited.historicalContext,meal.historicalContext);assert.equal(edited.historicalContextOccurrenceAt,meal.at);
     assert.deepEqual((await state(page)).acceptedFocus,before.acceptedFocus);
     await page.getByRole('navigation',{name:'Timeline date',exact:true}).getByLabel('Timeline date').fill('2026-09-01');await settle(page);
     const unavailable=page.locator('.timeline-entry').filter({has:page.getByRole('heading',{name:'Historical biological context unavailable',exact:true})});await unavailable.locator('summary').click();assert.ok((await unavailable.innerText()).includes('edited occurrence is unavailable'));
     const stable=integrity(await state(page));await page.goto(base+'/today',{waitUntil:'networkidle'});await page.reload({waitUntil:'networkidle'});await settle(page);assert.equal(integrity(await state(page)),stable);
   });
   report.safety.push(...await page.evaluate(()=>window.__safety));await context.close();
 }
 for(const browserZone of ['Europe/London','America/New_York','Asia/Tokyo']) {
   const {context,page}=await makeContext(390,browserZone);
   await check(`wall-clock display and reload: browser ${browserZone}`,async()=>{
     for(const profileZone of ['Europe/London','America/New_York','Asia/Tokyo']) {
       await seed(page,fixture(profileZone));
       const fact=label=>page.getByText(label,{exact:true}).locator('..').locator('p').nth(1).innerText();
       assert.equal(await fact('Wake'),'7:00 AM');assert.equal(await fact('Bedtime'),'10:00 PM');
       const before=integrity(await state(page)),live=await runtime(page);await page.reload({waitUntil:'networkidle'});await settle(page);
       assert.equal(await fact('Wake'),'7:00 AM');assert.equal(await fact('Bedtime'),'10:00 PM');assert.equal(integrity(await state(page)),before);assert.equal(await runtime(page),live);
     }
   });
   report.safety.push(...await page.evaluate(()=>window.__safety));await context.close();
 }
 await check('no browser errors, failed requests, external/API activity or protected calls',async()=>{
   assert.deepEqual(report.errors,[]);assert.deepEqual(report.failed,[]);assert.deepEqual(report.blocked,[]);assert.deepEqual(report.safety,[]);assert.deepEqual(report.console,[]);
 });
 save();await browser.close();
 console.log(JSON.stringify({passed:report.checks.filter(c=>c.pass).length,total:report.checks.length,failed:report.checks.filter(c=>!c.pass)},null,2));
 if(report.checks.some(c=>!c.pass))process.exitCode=1;
})().catch(error=>{report.fatal=error.stack;save();console.error(error);process.exitCode=1;});
