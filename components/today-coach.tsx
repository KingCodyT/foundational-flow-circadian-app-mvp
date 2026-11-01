import { EstablishedCheckin } from './established-checkin';
import type { WeeklyAction } from '@/lib/weekly-checkin';
import { useEffect, useRef, useState } from 'react';
import type { DailyEventState, DailyProfile } from '@/types/circadian';
import type { ContextualReminder } from '@/lib/personalization/contextual-reminders';
import { deferredTime, isLightReduction, smallerAction, savedClockTime, savedZoneLabel } from '@/lib/today-coaching';
import { shiftDateKey } from '@/lib/schedule-time';

type Props = {
  signalId: string; updateWeekly: (id: string, action: WeeklyAction) => void;
  profile: DailyProfile | null; clientId: string; now: Date; day: string;
  reminder: ContextualReminder | null; pending: ContextualReminder | null;
  firstStepContext?: { heading: string; why: string; next?: { start: string; action: string; label: string; clock: string; reason?: string } };
  nextOpportunity?: { start: string; action: string }; handled?: DailyEventState[string]; count: number; established: boolean;
  respond: (response: 'completed' | 'skipped' | 'adjust', at?: string) => boolean;
  saveProfile: (profile: DailyProfile) => void;
};
export function TodayCoach({signalId, updateWeekly, profile, clientId, now, day, reminder, pending, handled, nextOpportunity, firstStepContext, count, established, respond, saveProfile}: Props) {
  const [view, setView] = useState('action');
  const [error, setError] = useState('');
  const [returning, setReturning] = useState(false);
  const wakeInput = useRef<HTMLInputElement>(null);
  const bedInput = useRef<HTMLInputElement>(null);
  const region = useRef<HTMLDivElement>(null);
  const visitedKey = `ff-today-visit-v1:${clientId}`;
  useEffect(() => {
    try {
      const prior = localStorage.getItem(visitedKey);
      setReturning(Boolean(prior && /^\d{4}-\d{2}-\d{2}$/.test(prior) && prior < shiftDateKey(day, -1)));
      // Keep the previous visit until schedule confirmation, including refresh.
      if (prior !== day && (!prior || prior >= shiftDateKey(day, -1))) localStorage.setItem(visitedKey, day);
    } catch { /* Optional visit convenience must not block coaching. */ }
  }, [visitedKey, day]);
  const change = (next: string) => { setView(next); setError(''); requestAnimationFrame(() => region.current?.focus()); };
  const confirmReturn = () => { try { localStorage.setItem(visitedKey, day); } catch {} setReturning(false); change('action'); };
  const submit = (response: 'completed' | 'skipped' | 'adjust', at?: string) => {
    if (respond(response, at)) change('action');
    else { change('action'); setError('This opportunity changed. Check the current step before responding.'); }
  };
  const button = (label: string, fn: () => void, primary = false) => <button className={primary ? 'journey-primary' : 'journey-outline'} onClick={fn}>{label}</button>;
  const time = (date: Date) => `${new Intl.DateTimeFormat('en-US',{timeZone:profile?.timeZone || undefined,weekday:'long',month:'short',day:'numeric'}).format(date)} at ${new Intl.DateTimeFormat('en-US',{timeZone:profile?.timeZone || undefined,hour:'numeric',minute:'2-digit',hour12:true}).format(date)} (${savedZoneLabel(profile)})`;
  const explanation = firstStepContext && <><p>{firstStepContext.why}</p>{firstStepContext.next && <p><strong>{firstStepContext.next.label} at {firstStepContext.next.clock}.</strong> {firstStepContext.next.action}. {firstStepContext.next.reason}</p>}</>;
  let content;
  if (returning && profile) content = view === 'schedule' ? <>
    <h3>What fits your days now?</h3><p>Your location, timezone, and other schedule details stay as saved.</p>
    <div className="today-coach-fields"><label>Wake time<input type="time" ref={wakeInput} defaultValue={profile.wakeTime || ''} required /></label><label>Bedtime<input type="time" ref={bedInput} defaultValue={profile.targetBedtime || ''} required /></label></div>
    <div className="today-coach-actions">{button('Save schedule',()=>{const wake=wakeInput.current?.value || '', bed=bedInput.current?.value || '';if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(wake)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(bed)){setError('Add both times to continue.');return;}saveProfile({...profile,wakeTime:wake,targetBedtime:bed});confirmReturn();},true)}{button('Cancel',()=>change('action'))}</div>
  </> : <><h3>Good to see you again.</h3><p>Is your usual schedule still about right? Wake {savedClockTime(profile.wakeTime)}, bedtime {savedClockTime(profile.targetBedtime)} ({savedZoneLabel(profile)}).</p><p>No catch-up list. Time away from the app doesn’t tell us how your days went.</p><div className="today-coach-actions">{button('Still about right',confirmReturn,true)}{button('Update schedule',()=>change('schedule'))}</div></>;
  else if (profile && (established || profile.weeklyCheckins?.[signalId]?.mode === 'weekly')) content = <>{handled && <p>{handled.status === 'completed' ? 'You marked today’s step done.' : 'You left today’s step. There’s nothing to make up.'}</p>}<EstablishedCheckin profile={profile} signalId={signalId} now={now} established={established} update={updateWeekly} /></>;
  else if (handled) content = <><h3>{handled.status === 'completed' ? 'That’s enough for now.' : 'Leave this one for today.'}</h3><p>{handled.status === 'completed' ? 'You marked this step done.' : 'Today’s prompt is closed. There’s nothing to make up.'}</p><p>Next: your focus stays in place. {established ? 'It is now established, so routine prompts stop.' : nextOpportunity ? `Your next focus opportunity is ${time(new Date(nextOpportunity.start))}: ${nextOpportunity.action}.` : 'Come back for the next useful opportunity.'}</p></>;

  else if (reminder) {
    const light = isLightReduction(reminder.id), alternative = smallerAction(reminder.id), later = deferredTime(reminder, now);
    const done = button('I did that',()=>submit('completed'),true), skip = button('Not today',()=>submit('skipped'));
    if (view === 'constraints') content = <><h3>Long day? Make the step smaller.</h3><p>Choose what fits. Selecting an option doesn’t mark it done.</p><div className="today-coach-actions">{light && button('I’m sharing the room',()=>change('shared'))}{button('I have very little energy',()=>change('tired'))}{button('I need to focus on safety or work',()=>change('safety'))}{button('Cancel',()=>change('action'))}</div></>;
    else if (view === 'safety') content = <><h3>Keep safety first.</h3><p>Driving, working, and moving safely come first. Leave this step for today.</p><div className="today-coach-actions">{skip}{button('Back',()=>change('constraints'))}</div></>;
    else if (view === 'shared' || view === 'tired') content = <><h3>{view === 'shared' ? 'Just the light you control.' : 'Keep the step manageable.'}</h3><p>{light ? view === 'shared' ? 'Dim one unnecessary light you control, without changing the room for everyone. If that isn’t practical, skip it.' : 'If you’re already near an unnecessary lamp, switch just that one off.' : alternative || 'There isn’t a smaller version of this step to suggest safely. Keep your usual routine or leave it for today.'}</p>{light && <p>Keep enough light to see and move safely. Don’t change lighting while driving or doing safety-critical work.</p>}<div className="today-coach-actions">{(light || alternative) && done}{skip}{button('Back',()=>change('constraints'))}</div></>;
    else if(view === 'later') content = <><h3>{later ? 'Set this step aside for 15 minutes?' : 'There isn’t room for another 15-minute delay.'}</h3><p>{later ? `The step will return here at ${time(later)}, within this opportunity. This does not confirm a background notification.` : 'You can take the current step now if it fits, or leave it today.'}</p><div className="today-coach-actions">{later && button('Later — 15 minutes',()=>submit('adjust',later.toISOString()),true)}{button(later?'Cancel':'See the step now',()=>change('action'))}{skip}</div></>;
    else content = <><h3>{firstStepContext ? `${firstStepContext.heading}: ` : ''}{reminder.action}</h3><p>{reminder.reason}</p>{explanation}{light && <><p>Your saved bedtime is {savedClockTime(profile?.targetBedtime)} ({savedZoneLabel(profile)}).</p><p>Keep the light you need for safety. Don’t dim lights while driving or doing safety-critical work.</p></>}<div className="today-coach-actions">{button('Done',()=>submit('completed'),true)}{button('Smaller step',()=>change('constraints'))}{button('Later',()=>change('later'))}{skip}</div></>;
  } else if(pending) content = <><h3>{firstStepContext?.heading || `Your next opportunity: ${time(pending.start)}`}.</h3><p>{pending.action}</p>{firstStepContext && <p>{pending.reason}</p>}{explanation}{firstStepContext && <p>Times shown in {profile?.timeZone || 'your device timezone'}.</p>}<p>Come back at the time shown to choose Done, Smaller step, Later, or Not today. This page does not confirm a background notification.</p></>;
  else if(nextOpportunity) content = <><h3>Your next focus opportunity: {time(new Date(nextOpportunity.start))}.</h3><p>{nextOpportunity.action}</p><p>Your focus stays in place. There’s nothing to make up from earlier windows.</p></>;
  else content = <><h3>Nothing to catch up on.</h3><p>Your focus stays in place. Return for the next useful opportunity; missed windows don’t become overdue tasks.</p></>;
  return <section className="journey-card today-coaching-loop"><div ref={region} tabIndex={-1} aria-label="Today coaching" role="region">{content}<p role="alert">{error}</p></div>{count>0 && <p className="today-coach-progress">You reported this focus on {count} {count===1?'day':'different days'} in the past 7 days. This reflects your reports, not a measured change in sleep.</p>}</section>;
}
