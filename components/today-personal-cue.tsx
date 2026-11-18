import type { DailyProfile } from '@/types/circadian';
import { SIGNAL_REGISTRY } from '@/lib/personalization/signal-registry';
import { hasGuidanceSchedule, missingScheduleDescription, opportunityLabel, type AssessmentContext, type CueOpportunity } from '@/lib/journey-value';

/** Read-only orientation using the opportunity already selected by Today. */
export function TodayPersonalCue({ signalId, profile, now, opportunity, quiet = false, assessment }: {
  assessment?: AssessmentContext; signalId: string; profile: DailyProfile | null; now: Date; opportunity?: CueOpportunity | null; quiet?: boolean;
}) {
  const focus = SIGNAL_REGISTRY[signalId]?.label?.replace(/ Priority$/, '');
  if (!hasGuidanceSchedule(profile)) return <aside className="today-personal-cue" aria-label="Your personal guidance"><p><strong>Guidance timed to your day</strong></p><p>{missingScheduleDescription(profile)} You can still explore sunlight and food.</p><a href="/profile?edit=schedule&returnTo=%2Ftoday%23today-coaching#your-schedule">Set my schedule →</a></aside>;
  if (!focus) return <aside className="today-personal-cue" aria-label="Your personal guidance"><p><strong>{assessment?.heading || 'Your assessment focus is unavailable'}</strong></p><p>{assessment?.explanation || 'Your saved schedule can still guide your day.'}</p>{opportunity && <><p>{opportunityLabel(opportunity, now, profile?.timeZone)}</p><a href="#today-coaching">Details: {opportunity.action} →</a></>}{assessment?.href && <p><a href={assessment.href}>{assessment.label} →</a></p>}</aside>;
  return <aside className="today-personal-cue" aria-label="Your personal guidance">
    <p><strong>Your focus: {focus}</strong></p>
    <p>{quiet ? 'See your guidance and optional check-ins. No new action is requested here.' : opportunity ? opportunityLabel(opportunity, now, profile?.timeZone) : 'No action suggested right now. Your selected focus stays in place.'}</p>
    <a href="#today-coaching">See my guidance →</a>
  </aside>;
}
