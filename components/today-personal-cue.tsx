import { scheduleDateKey, shiftDateKey } from '@/lib/schedule-time';
import type { DailyProfile } from '@/types/circadian';
import { SIGNAL_REGISTRY } from '@/lib/personalization/signal-registry';
import { hasGuidanceSchedule, missingScheduleDescription, type AssessmentContext, type CueOpportunity } from '@/lib/journey-value';

/** Read-only: explain the step already selected by Today, never choose another. */
export function TodayPersonalCue({ signalId, profile, now, opportunity, quiet = false, assessment }: {
  assessment?: AssessmentContext; signalId: string; profile: DailyProfile | null; now: Date; opportunity?: CueOpportunity | null; quiet?: boolean;
}) {
  const focus = SIGNAL_REGISTRY[signalId]?.label?.replace(/ Priority$/, '');
  if (!hasGuidanceSchedule(profile)) return <aside className="today-personal-cue" aria-label="Your personal guidance"><h2>Set the timing for your next step</h2><p>{missingScheduleDescription(profile)} You can still explore sunlight and food.</p><a href="/profile?edit=schedule&returnTo=%2Ftoday%23today-coaching#your-schedule">Set my schedule →</a></aside>;
  const start = opportunity ? new Date(opportunity.start) : null;
  const end = opportunity?.end ? new Date(opportunity.end) : null;
  const valid = start && Number.isFinite(+start) && (!end || (Number.isFinite(+end) && end > now && end > start));
  const step = !quiet && valid ? opportunity : null;
  const format = (at: Date) => {
    const zone = profile?.timeZone || undefined;
    const today = scheduleDateKey(now, zone), day = scheduleDateKey(at, zone);
    const label = day === today ? 'Today' : day === shiftDateKey(today, 1) ? 'Tomorrow' : new Intl.DateTimeFormat('en-US', {timeZone:zone,weekday:'short',month:'short',day:'numeric'}).format(at);
    return `${label} at ${new Intl.DateTimeFormat('en-US', {timeZone:zone,hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(at)}`;
  };
  const current = Boolean(step && start && start <= now);
  return <aside className="today-personal-cue" aria-label="Your personal guidance">
    <h2>{step ? current ? 'Your step now' : 'Your next step' : quiet ? 'Keep your rhythm' : 'No action suggested right now'}</h2>
    {step && <><h3>{step.action}</h3><p><strong>When:</strong> {current ? 'Now' : format(start!)}{end ? ` · until ${format(end)}` : ''}</p>{step.reason && <p><strong>Why this step:</strong> {step.reason}</p>}</>}
    {focus ? <p>Your focus: <strong>{focus}</strong>{!step && !quiet ? '. Your selected focus stays in place.' : ''}</p> : <details><summary>{assessment?.heading || 'Guidance from your saved schedule'}</summary><p>{assessment?.explanation || 'This step follows your saved schedule, not a selected assessment focus.'}</p>{assessment?.href && <a href={assessment.href}>{assessment.label} →</a>}</details>}
    {quiet && <p>No new action is requested here. Your guidance remains available below.</p>}
    {!step && !quiet && <p>There is no current or upcoming step to show. Missed windows do not become overdue tasks.</p>}
    <a href="#today-coaching">{step ? 'See the full guidance' : 'View my guidance'} →</a>
  </aside>;
}
