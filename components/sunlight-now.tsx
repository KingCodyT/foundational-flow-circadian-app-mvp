import { LocationSetupLink, useLocationReturnSection } from './location-setup-link';
import type { DailyProfile } from '@/types/circadian';
import { hasValidCoordinates } from '@/lib/solar';
import { localDateKey } from '@/lib/live-clock';
import { SolarSpectrum } from './solar-spectrum';

export function SunlightNow({ profile, now }: { profile: DailyProfile | null; now: Date }) {
  useLocationReturnSection('sunlight-now');
  const located = profile?.locationPermissionGranted && hasValidCoordinates(profile.latitude, profile.longitude);
  return <section id="sunlight-now" className="sunlight-now solar-day-card" aria-labelledby="sunlight-now-title">
    <header><div><h2 id="sunlight-now-title">Today’s light</h2><p>{profile?.locationLabel || 'Your local solar day'} · {new Intl.DateTimeFormat('en-US',{timeZone:profile?.timeZone || undefined,weekday:'long',month:'long',day:'numeric'}).format(now)}</p></div></header>
    {!located ? <div className="sunlight-empty"><h3>Location needed</h3><p>Add your location to see sunrise, solar noon, sunset, and the estimated light mix. No location means no invented local readings.</p><LocationSetupLink section="sunlight-now">Set up my local light →</LocationSetupLink></div> : <SolarSpectrum key={`${localDateKey(now,profile?.timeZone)}:${profile?.latitude}:${profile?.longitude}:${profile?.timeZone}`} profile={profile} now={now} />}
  </section>;
}
