import Link from 'next/link';
import type { DailyProfile } from '@/types/circadian';
import { getSolarSpectrum, powerTrend } from '@/lib/solar-spectrum';
import { hasValidCoordinates } from '@/lib/solar';
import { formatTimeInZone } from '@/lib/live-clock';
import { SolarSpectrum } from './solar-spectrum';

const groups = [
  { name: 'UVB', range: '300–315 nm modeled', ids: ['uvb'], color: '#655591', meaning: 'Vitamin D production in skin; also sunburn and DNA damage. Effects depend on exposure.' },
  { name: 'UVA', range: '315–400 nm', ids: ['uva'], color: '#8a63a6', meaning: 'Pigmentation and skin signaling; also skin damage. Effects depend on exposure.' },
  { name: 'Visible light', range: '400–750 nm', ids: ['violet','blue','green','yellow','orange','red'], color: '#3765b1', meaning: 'Vision and body-clock timing through your eyes. Timing, brightness and duration matter.' },
  { name: 'Infrared', range: '750–4,000 nm modeled', ids: ['nir','ir'], color: '#a76045', meaning: 'Contributes to warmth. This estimate is not a red-light therapy dose or treatment claim.' },
];

export function SunlightNow({ profile, now }: { profile: DailyProfile | null; now: Date }) {
  const located = profile?.locationPermissionGranted && hasValidCoordinates(profile.latitude, profile.longitude);
  const state = located ? getSolarSpectrum(now, profile.latitude!, profile.longitude!) : null;
  const future = located ? getSolarSpectrum(new Date(+now + 15 * 60000), profile.latitude!, profile.longitude!) : null;
  const spectrum = state?.spectrum;
  return <section className="sunlight-now" aria-labelledby="sunlight-now-title">
    <header><div><p className="sunlight-eyebrow">Your outdoor day</p><h2 id="sunlight-now-title">Sunlight now</h2></div><span className="sunlight-mode">{state ? 'Live calculation' : 'Location needed'}</span></header>
    <p className="sunlight-intro">Wavelengths reaching the ground now, estimated for a clear sky.</p>
    {!state ? <div className="sunlight-empty"><p>Add your location to see the current solar position and estimated light mix. No location means no invented local readings.</p><Link href="/profile#profile-location">Set up my local light →</Link></div> : <>
      <div className="sunlight-reading"><strong>{formatTimeInZone(now, profile?.timeZone)}</strong><span>{Math.round(state.elevation)}° solar elevation</span><span>{spectrum ? `${powerTrend(spectrum.total, future?.spectrum?.total)} over the next 15 minutes` : state.status === 'night' ? 'Nighttime' : 'Near the horizon'}</span></div>
      {spectrum ? <><p className="sunlight-basis">Estimated clear-sky energy mix, not a sensor reading. Weather, shade and windows change the light reaching you.</p><div className="sunlight-strip" role="img" aria-label="Modeled energy shares: ultraviolet, visible and infrared. Colors for invisible bands are illustrative.">{groups.map(group => { const share = spectrum.bands.filter(b => group.ids.includes(b.id)).reduce((sum,b) => sum + b.percent, 0); return <span key={group.name} style={{ flexGrow: share, backgroundColor: group.color }} />; })}</div></> : <p className="sunlight-basis">{state.status === 'night' ? 'The sun is below the horizon. No daytime spectrum is shown. Your indoor lighting still matters to your body clock.' : 'The sun is near or below the horizon. This clear-sky model pauses below 5° elevation rather than inventing twilight readings.'}</p>}
      <div className="sunlight-bands">{groups.map(group => {
        const share = spectrum?.bands.filter(b => group.ids.includes(b.id)).reduce((sum,b) => sum + b.percent, 0);
        return <article key={group.name}><div className="sunlight-band-heading"><h3><span aria-hidden="true" style={{backgroundColor:group.color}} />{group.name}</h3>{share === undefined && <strong className="sunlight-unavailable">—<small>not modeled now</small></strong>}{share !== undefined && <strong>{share < 0.1 ? '<0.1' : share.toFixed(1)}%<small>energy share</small></strong>}</div><p className="sunlight-range">{group.range}</p><p>{group.meaning}</p></article>;
      })}</div>
      <p className="sunlight-footnote">Energy share is not biological effect, UV Index, or a personal exposure dose. UVB below 300 nm is outside this model. Updates with Today’s clock and when you return.</p>
      <details className="sunlight-explore"><summary>Explore wavelengths and the rest of today</summary><SolarSpectrum profile={profile} now={now} /><p className="sunlight-footnote">Biology sources: <a href="https://www.nigms.nih.gov/education/fact-sheets/Pages/circadian-rhythms" target="_blank" rel="noopener noreferrer">NIH: body-clock timing</a> · <a href="https://www.who.int/news-room/fact-sheets/detail/ultraviolet-radiation" target="_blank" rel="noopener noreferrer">WHO: ultraviolet light</a> · <a href="https://pubmed.ncbi.nlm.nih.gov/24445737/" target="_blank" rel="noopener noreferrer">Liu et al.: controlled UVA study</a>. These sources explain mechanisms, not a personal exposure prescription.</p></details>
    </>}
  </section>;
}
