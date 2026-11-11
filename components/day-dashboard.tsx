import Link from 'next/link';
import type { ReactNode } from 'react';
import type { DailyProfile } from '@/types/circadian';
import { getLightCheckIn } from '@/lib/light-check-in';
import { foodGuidancePhase } from '@/lib/personalization/food-guidance';
import { formatTimeInZone } from '@/lib/live-clock';
import { savedClockTime } from '@/lib/today-coaching';

export function DayDashboard({profile, now, children}: {profile: DailyProfile | null; now: Date; children?: ReactNode}) {
  const light = getLightCheckIn(profile, now);
  const phase = foodGuidancePhase(profile, now);
  const shift = profile?.workStructure === 'shift' || profile?.workStructure === 'overnight';
  const lightAction = shift ? 'Match light to your planned waking and sleeping hours, not sunrise alone. Keep the light needed for safe work.'
    : phase === 'evening' ? 'Your saved bedtime is approaching. Soften unnecessary light while keeping enough to move safely.'
    : phase === 'general' ? 'Use your planned sleep and wake times to guide light choices. The sun’s position alone does not tell us your body-clock phase.'
    : light?.phase?.id === 'night' ? 'It is dark outdoors. Use the lighting you need for your waking activities; dim unnecessary light as sleep approaches.'
    : light ? 'If safe and accessible, take a daylight break. Look around naturally, never directly at the sun. Protect your skin from UV.'
    : 'Add a location for local daylight guidance. Your saved schedule still applies.';
  const food = phase === 'evening' ? 'Hungry near bedtime? Choose something satisfying without an overly heavy meal.' : phase === 'early' ? 'For your first meal, pair protein with fiber-rich food and some unsaturated fat.' : 'Let hunger and activity guide your next meal. Include protein, fiber-rich food and some unsaturated fat.';
  return <section className="day-dashboard" aria-label="Your day at a glance">
    <div className="day-dashboard-clock"><div><p>RIGHT NOW · {profile?.locationLabel || 'Your saved day'}</p><strong>{formatTimeInZone(now, profile?.timeZone)}</strong></div><span>{light?.phase?.label || (light?.polar === 'day' ? 'Extended daylight' : light?.polar === 'night' ? 'Extended darkness' : 'Location not set')}<small>{profile?.timeZone || 'Device timezone'}</small></span></div>
    <dl className="day-dashboard-times">
      <div><dt>Sunrise</dt><dd>{light?.solar.sunrise ? formatTimeInZone(light.solar.sunrise,profile?.timeZone) : light ? 'No crossing today' : 'Location needed'}</dd></div>
      <div><dt>Sunset</dt><dd>{light?.solar.sunset ? formatTimeInZone(light.solar.sunset,profile?.timeZone) : light ? 'No crossing today' : 'Location needed'}</dd></div>
      <div><dt>Usual wake</dt><dd>{profile?.wakeTime ? savedClockTime(profile.wakeTime) : 'Not set'}</dd></div>
      <div><dt>Planned bed</dt><dd>{profile?.targetBedtime ? savedClockTime(profile.targetBedtime) : 'Not set'}</dd></div>
    </dl>
    {children}
    <div className="day-dashboard-actions"><article><h2>Light for this moment</h2><p>{lightAction}</p></article><article><h2>Food & movement</h2><p>{food} {phase === 'evening' ? 'Keep movement comfortable as you wind down.' : 'If comfortable, take a short movement break when your day allows.'}</p><Link href="/food">Meal ideas →</Link></article></div>
    <p className="day-dashboard-note">Solar times are calculated; wake and bed are your saved plans, not measured sleep. These options do not change your selected focus or require logging. <Link href="/profile#your-schedule">Edit my day</Link></p>
  </section>;
}
