import type { DailyProfile } from '@/types/circadian';
import { SIGNAL_REGISTRY } from '@/lib/personalization/signal-registry';
import { hasGuidanceSchedule, missingScheduleDescription, opportunityLabel, type CueOpportunity } from '@/lib/journey-value';

/** Read-only orientation using the opportunity already selected by Today. */
export function TodayPersonalCue({ signalId, profile, now, opportunity, quiet = false }: {
  signalId: string; profile: DailyProfile | null; now: Date; opportunity?: CueOpportunity | null; quiet?: boolean;
}) {
  const focus = SIGNAL_REGISTRY[signalId]?.label?.replace(/ Priority$/, '');
  if (!hasGuidanceSchedule(profile)) return <aside className="today-personal-cue" aria-label="Your personal guidance"><p><strong>Guidance timed to your day</strong></p><p>{missingScheduleDescription(profile)} You can still explore sunlight and food.</p><a href="/profile?edit=schedule&returnTo=%2Ftoday%23today-coaching#your-schedule">Set my schedule →</a></aside>;
  if (!focus) return <aside className="today-personal-cue" aria-label="Your personal guidance"><p><strong>No personal focus selected</strong></p><p>{opportunity ? opportunityLabel(opportunity, now, profile?.timeZone) : 'Your schedule is saved. The assessment can help choose a personal focus.'}</p>{opportunity && <a href="#today-coaching">See schedule guidance →</a>}<p><a href="/audit">Explore the assessment →</a></p></aside>;
  return <aside className="today-personal-cue" aria-label="Your personal guidance">
    <p><strong>Your focus: {focus}</strong></p>
    <p>{quiet ? 'See your guidance and optional check-ins. No new action is requested here.' : opportunity ? opportunityLabel(opportunity, now, profile?.timeZone) : 'No action suggested right now. Your selected focus stays in place.'}</p>
    <a href="#today-coaching">See my guidance →</a>
  </aside>;
}
