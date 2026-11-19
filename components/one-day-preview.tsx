'use client';
import { useState, useId, useRef, useEffect } from 'react';
import type { DailyProfile } from '@/types/circadian';
import { createOneDayPlan, type OneDayPlan } from '@/lib/one-day-plan';
import { oneDayPreview } from '@/lib/one-day-preview';

export function OneDayPreview({profile,now,onApply,blocked,applyError,applied}:{profile:DailyProfile|null;now:Date;onApply?:(day:"today"|"tomorrow",wake:string,bed:string)=>void;blocked?:string;applyError?:string;applied?:OneDayPlan}) {
  const panelId=useId();
  const opener=useRef<HTMLButtonElement>(null);
  const heading=useRef<HTMLHeadingElement>(null);
  const returnY=useRef(0);
  const close=()=>{setOpen(false);if(typeof window!=='undefined') requestAnimationFrame(()=>{opener.current?.focus({preventScroll:true});window.scrollTo({top:returnY.current,behavior:'instant' as ScrollBehavior});});};
  const [open,setOpen]=useState(false);
  useEffect(()=>{
    if(!open||typeof window==='undefined') return;
    const frame=requestAnimationFrame(()=>{
      heading.current?.focus({preventScroll:true});
      heading.current?.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant' as ScrollBehavior:'smooth'});
    });
    return ()=>cancelAnimationFrame(frame);
  },[open]);
  const [day,setDay]=useState<'today'|'tomorrow'>('tomorrow');
  const [wake,setWake]=useState(''); const [bed,setBed]=useState('');
  const reset=()=>{setWake(profile?.wakeTime||'');setBed(profile?.targetBedtime||'');setDay('tomorrow');};
  const format=(d:Date)=>new Intl.DateTimeFormat('en-US',{timeZone:profile?.timeZone||undefined,weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(d);
  const invalidHours=!!wake&&!!bed&&(wake<'04:00'||wake>'12:00'||!(bed>='18:00'||bed<='03:00'));
  const result=invalidHours?null:oneDayPreview(profile || {},now,day,wake,bed);
  const wakeError=!wake?'Choose a wake time and check AM/PM.':wake<'04:00'||wake>'12:00'?'Wake time must be 4 AM to noon. Check AM/PM.':'';
  const bedError=!bed?'Choose the bedtime the night before.':!(bed>='18:00'||bed<='03:00')?'Bedtime must be 6 PM to 3 AM. Check AM/PM.':'';
  const missing=!profile?.wakeTime||!profile?.targetBedtime||!profile?.timeZone;
  const candidate=createOneDayPlan(profile,now,day,wake,bed);
  const already=!!candidate&&applied?.date===candidate.date&&applied?.wake===wake&&applied?.bed===bed;
  const unchanged=wake===profile?.wakeTime&&bed===profile?.targetBedtime;
  const reason=missing?'Save your usual wake time, bedtime and timezone in Profile first.':wakeError||bedError||blocked||(unchanged?'These match your usual times. Change at least one time to use a one-day plan.':!candidate?'These times cannot be applied for this date. Check that the morning is still ahead and the times fit a daytime schedule; clock-change gaps or repeated times are not supported.':'');
  const usual=profile?.wakeTime&&profile?.targetBedtime?oneDayPreview(profile,now,day,profile.wakeTime,profile.targetBedtime):null;
  return <><div className="one-day-entry"><button ref={opener} type="button" aria-expanded={open} aria-controls={panelId} onClick={()=>{if(open){close();return;}returnY.current=typeof window==='undefined'?0:window.scrollY;reset();setOpen(true);}}>Different plans for one day? <span aria-hidden="true">{open?'−':'→'}</span></button></div>
  {open && <section id={panelId} className="one-day-preview" aria-label="One-day schedule preview">
    <h2 ref={heading} tabIndex={-1}>Try a different day</h2><p>A what-if preview for an early start, a sleep-in, or a late evening. Your usual plan stays untouched. Applying replaces only Today’s evening and morning guidance for these dates.</p>
    <label>Wake-up day<select value={day} onChange={e=>setDay(e.target.value as typeof day)}><option value="today">Today</option><option value="tomorrow">Tomorrow</option></select></label>
    <div className="one-day-inputs"><label>Wake time<input type="time" min="04:00" max="12:00" aria-invalid={!!wakeError} aria-describedby={`${panelId}-wake-error`} value={wake} onChange={e=>setWake(e.target.value)}/><span id={`${panelId}-wake-error`} className="one-day-field-help">{wakeError || 'Morning wake time (AM, or noon).'}</span></label><label>Bedtime the night before<input type="time" aria-invalid={!!bedError} aria-describedby={`${panelId}-bed-error`} value={bed} onChange={e=>setBed(e.target.value)}/><span id={`${panelId}-bed-error`} className="one-day-field-help">{bedError || 'Evening PM, or after-midnight AM.'}</span></label></div>
    <p>For tomorrow’s wake, choose tonight’s bedtime. After-midnight bedtime belongs to the wake-up date. The following evening keeps your usual bedtime.</p>
    {result?<div aria-live="polite">
      <h3>What would change?</h3>
      <p>Wake: <strong>{format(result.wakeAt)}</strong><br/>Bed: <strong>{format(result.bedAt)}</strong></p>
      {usual?<p>Usual wake: {format(usual.wakeAt)}<br/>Usual bed: {format(usual.bedAt)}<br/>Time between bed and wake: {result.sleepHours.toFixed(1)} hours (usual {usual.sleepHours.toFixed(1)}). This is time available, not measured sleep.</p>:<p>Your usual schedule is incomplete, so a full comparison is unavailable. Nothing here fills in or saves it.</p>}
      <article><h3>The night before</h3>{result.evening?<><strong>{format(result.evening.start)}</strong><p>Begin reducing bright light and unnecessary screen exposure.</p><p>{result.evening.guidance} This follows the bedtime you entered, not a prediction that your body clock has already changed.</p>{usual?.evening&&<p>Usual wind-down: {format(usual.evening.start)}{+usual.evening.start===+result.evening.start?' (unchanged).':'.'}</p>}</>:<p>No evening window is available for these times.</p>}</article>
      <article><h3>The selected morning</h3>{result.morning?<><strong>{format(result.morning.start)}</strong><p>Get some daylight after waking, when it’s available.</p><p>{result.morning.guidance}</p>{usual?.morning&&<p>Usual daylight opportunity: {format(usual.morning.start)}</p>}</>:<p>{result.located?'No daylight opportunity is available in this waking window.':'Local daylight timing needs a saved location. No sunrise time has been invented.'}</p>}</article>
      {result.sleepHours<6&&<p>This leaves a short sleep opportunity. An earlier start does not automatically bring bedtime earlier.</p>}
      <p>Past times are for comparison only, never tasks to catch up on. All times use your saved timezone{!profile?.timeZone?' (or this device’s timezone)':''}. Your biological clock does not shift instantly with a one-day change.</p>
    </div>:<p role="status">{invalidHours?'Check AM and PM. Choose a wake time from 4 AM to noon and a bedtime from 6 PM to 3 AM. This one-day plan is not a shift-work planner.':'Enter both times to compare this night and morning. Bedtime must come before waking; this preview is not a shift-work planner.'}</p>}
    <p>Meals, solar readings, Timeline and push reminders keep your usual settings. No notifications are sent by this plan.</p>{onApply && <div className="one-day-apply"><p id={`${panelId}-apply-status`} role={applyError?'alert':'status'}>{applyError || (already?'Saved for this one day. The dates and times below are now applied to Today’s light guidance.':reason||'Ready to apply these dates and times to Today’s light guidance only.')}</p>{already&&result&&<p><strong>Bed: {format(result.bedAt)}<br/>Wake: {format(result.wakeAt)}</strong><br/>Your usual schedule is unchanged. Undo is available in the applied-plan card above.</p>}<button className="journey-primary" aria-describedby={`${panelId}-apply-status`} disabled={!!reason||already} onClick={()=>onApply(day,wake,bed)}>{already?'Plan saved':'Use this plan for one day'}</button></div>}
    <div className="one-day-buttons"><button onClick={reset}>Reset preview</button><button onClick={close}>Close preview</button></div>
  </section>}</>;
}
