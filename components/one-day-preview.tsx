'use client';
import { useState } from 'react';
import type { DailyProfile } from '@/types/circadian';
import { oneDayPreview } from '@/lib/one-day-preview';

export function OneDayPreview({profile,now}:{profile:DailyProfile|null;now:Date}) {
  const [open,setOpen]=useState(false);
  const [day,setDay]=useState<'today'|'tomorrow'>('tomorrow');
  const [wake,setWake]=useState(''); const [bed,setBed]=useState('');
  const reset=()=>{setWake(profile?.wakeTime||'');setBed(profile?.targetBedtime||'');setDay('tomorrow');};
  const format=(d:Date)=>new Intl.DateTimeFormat('en-US',{timeZone:profile?.timeZone||undefined,weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(d);
  const result=oneDayPreview(profile || {},now,day,wake,bed);
  const usual=profile?.wakeTime&&profile?.targetBedtime?oneDayPreview(profile,now,day,profile.wakeTime,profile.targetBedtime):null;
  if(!open) return <div className="one-day-entry"><button onClick={()=>{reset();setOpen(true);}}>Different plans for one day? →</button></div>;
  return <section className="one-day-preview" aria-label="One-day schedule preview">
    <h2>Try a different day</h2><p>A what-if preview for an early start, a sleep-in, or a late evening. Your usual plan stays untouched.</p>
    <label>Wake-up day<select value={day} onChange={e=>setDay(e.target.value as typeof day)}><option value="today">Today</option><option value="tomorrow">Tomorrow</option></select></label>
    <div className="one-day-inputs"><label>Wake time<input type="time" value={wake} onChange={e=>setWake(e.target.value)}/></label><label>Bedtime the night before<input type="time" value={bed} onChange={e=>setBed(e.target.value)}/></label></div>
    <p>For tomorrow’s wake, choose tonight’s bedtime. After-midnight bedtime belongs to the wake-up date. The following evening keeps your usual bedtime.</p>
    {result?<div aria-live="polite">
      <h3>What would change?</h3>
      <p>Wake: <strong>{format(result.wakeAt)}</strong><br/>Bed: <strong>{format(result.bedAt)}</strong></p>
      {usual?<p>Usual wake: {format(usual.wakeAt)}<br/>Usual bed: {format(usual.bedAt)}<br/>Time between bed and wake: {result.sleepHours.toFixed(1)} hours (usual {usual.sleepHours.toFixed(1)}). This is time available, not measured sleep.</p>:<p>Your usual schedule is incomplete, so a full comparison is unavailable. Nothing here fills in or saves it.</p>}
      <article><h3>The night before</h3>{result.evening?<><strong>{format(result.evening.start)}</strong><p>Begin reducing bright light and unnecessary screen exposure.</p><p>{result.evening.guidance} This follows the bedtime you entered, not a prediction that your body clock has already changed.</p>{usual?.evening&&<p>Usual wind-down: {format(usual.evening.start)}{+usual.evening.start===+result.evening.start?' (unchanged).':'.'}</p>}</>:<p>No evening window is available for these times.</p>}</article>
      <article><h3>The selected morning</h3>{result.morning?<><strong>{format(result.morning.start)}</strong><p>Get some daylight after waking, when it’s available.</p><p>{result.morning.guidance}</p>{usual?.morning&&<p>Usual daylight opportunity: {format(usual.morning.start)}</p>}</>:<p>{result.located?'No daylight opportunity is available in this waking window.':'Local daylight timing needs a saved location. No sunrise time has been invented.'}</p>}</article>
      {result.sleepHours<6&&<p>This leaves a short sleep opportunity. An earlier start does not automatically bring bedtime earlier.</p>}
      <p>Past times are for comparison only, never tasks to catch up on. All times use your saved timezone{!profile?.timeZone?' (or this device’s timezone)':''}. Your biological clock does not shift instantly with a one-day change.</p>
    </div>:<p>Enter both times to compare this night and morning. Bedtime must come before waking; this preview is not a shift-work planner.</p>}
    <p><strong>Preview only.</strong> No changes are applied, saved, tracked, or sent as reminders.</p>
    <div className="one-day-buttons"><button onClick={reset}>Reset preview</button><button onClick={()=>setOpen(false)}>Close preview</button></div>
  </section>;
}
