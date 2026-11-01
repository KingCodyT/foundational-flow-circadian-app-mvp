import { useState } from 'react';
import type { DailyProfile } from '@/types/circadian';
import { getLightCheckIn } from '@/lib/light-check-in';
import { LightCheckIn } from './light-check-in';

export function LightGuidePreview({profile, now}: {profile: DailyProfile | null; now: Date}) {
  const [open, setOpen] = useState(false);
  const state = getLightCheckIn(profile, now);
  const phase = state?.phase;
  const label = phase?.label || (state?.polar === 'day' ? 'Extended daylight' : state?.polar === 'night' ? 'Extended darkness' : 'Local light timing unavailable');
  return <section className="light-guide-preview" aria-label="Explore your light">
    <h2>What’s your light doing right now?</h2>
    <p className="light-guide-phase"><strong>{label}</strong>{state && ' · Based on your saved location'}</p>
    <p>{phase?.light || (state ? 'Sunrise and sunset may not occur every day here. Let your planned sleep schedule guide your light choices.' : 'Add your location for local daylight timing. You can still explore how light interacts with your body.')}</p>
    <p>{state ? 'Explore today’s light spectrum, what changes next, and how light interacts with your body.' : 'Explore light wavelengths, your body clock, and the science behind them.'}</p>
    <p className="light-guide-basis">{state ? 'Local timing is calculated; the spectrum is estimated, not measured.' : 'Local timing and an estimated spectrum need a saved location; light exposure is not measured.'}</p>
    <details onToggle={event => setOpen(event.currentTarget.open)}>
      <summary>{open ? 'Close light guide' : 'Explore light, timing & your body'}</summary>
      <LightCheckIn profile={profile} now={now} />
    </details>
  </section>;
}
