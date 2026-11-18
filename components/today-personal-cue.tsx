import type { DailyProfile } from '@/types/circadian';
import { SIGNAL_REGISTRY } from '@/lib/personalization/signal-registry';
import { opportunityLabel, type CueOpportunity } from '@/lib/journey-value';

/** Read-only orientation using the opportunity already selected by Today. */
export function TodayPersonalCue({ signalId, profile, now, opportunity, quiet = false }: {
  signalId: string; profile: DailyProfile | null; now: Date; opportunity?: CueOpportunity | null; quiet?: boolean;
}) {
  const focus = (SIGNAL_REGISTRY[signalId]?.label || 'Your saved daily rhythm').replace(/ Priority$/, '');
  return <aside className="today-personal-cue" aria-label="Your personal guidance">
    <p><strong>Your focus: {focus}</strong></p>
    <p>{quiet ? 'See your guidance and optional check-ins. No new action is requested here.' : opportunity ? opportunityLabel(opportunity, now, profile?.timeZone) : 'Your focus stays in place. See your guidance for the next useful opportunity.'}</p>
    <a href="#today-coaching">See my guidance →</a>
  </aside>;
}
