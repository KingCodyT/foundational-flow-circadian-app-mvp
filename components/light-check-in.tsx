import Link from 'next/link';
import { SolarSpectrum } from './solar-spectrum';
import { LightBandDetails } from './light-spectrum';
import { CodyDiscovery } from './cody-discovery';
import type { DailyProfile } from '@/types/circadian';
import { getLightCheckIn, LIGHT_PHASES } from '@/lib/light-check-in';
import { formatTimeInZone } from '@/lib/live-clock';
import { JourneyCard, RhythmIcon } from './journey-design';

const visible = { name: 'Visible blue–cyan → body-clock timing', text: 'Light-sensitive retinal cells convey daytime information to the brain’s central clock, helping coordinate daily rhythms across the body.' };
const uva = { name: 'UVA → skin and blood-vessel signaling', text: 'UVA influences pigmentation and can release nitric oxide from stores in skin. Nitric oxide helps blood vessels relax.' };
const uvb = { name: 'UVB → vitamin D production', text: 'UVB can initiate vitamin D production in skin. Availability depends on solar elevation, season, ozone, and other atmospheric conditions.' };
const red = { name: 'Red and near-infrared → tissue interactions', text: 'Both are part of sunlight. Controlled studies investigate cellular energy and signaling effects; those findings do not establish a sunlight treatment dose.' };
const lightToKnow = {
  dawn: [visible, { name: 'Red and near-infrared → part of the morning spectrum', text: 'Low-angle sunlight travels through more atmosphere and direct light can look warmer. Red and near-infrared interact with tissue, but sky color cannot tell you the dose reaching your cells.' }],
  morning: [visible, uva, { ...uvb, text: 'As the sun rises, UVB availability can increase. Where sufficient UVB reaches skin, it can initiate vitamin D production; clock time alone cannot tell us how much is available.' }, red],
  midday: [uvb, uva, visible, red],
  afternoon: [visible, { ...uva, text: 'UVA can still affect pigmentation and nitric oxide stores as the sun lowers. Its intensity changes with the atmosphere and solar elevation.' }, { ...uvb, text: 'UVB availability generally falls as the sun lowers, changing the potential for vitamin D production in skin. The timing varies with latitude and season.' }, red],
  sunset: [{ name: 'Fading visible light → the transition toward night', text: 'Less light reaching the eyes reduces daytime stimulation of the body clock. Continuing with dimmer indoor light helps preserve that transition as bedtime approaches.' }, { name: 'Red and near-infrared → understand the warmer sky', text: 'Direct sunlight may look redder near the horizon. Near-infrared is invisible, and a red sunset does not tell you its strength or establish a cellular treatment dose.' }],
  night: [{ name: 'Artificial visible light → timing and melatonin', text: 'Bright light near bedtime can suppress melatonin and delay the body clock. Blue–cyan wavelengths strongly engage melanopsin, but total brightness, duration, and timing all matter.' }],
} as const;

export function LightCheckIn({ profile, now }: { profile: DailyProfile | null; now: Date }) {
  const state = getLightCheckIn(profile, now);
  const phase = state?.phase;
  const shifted = profile?.workStructure === 'shift' || profile?.workStructure === 'overnight';
  return <JourneyCard className={`light-check-in ${phase?.id === 'night' ? 'light-check-in-night' : ''}`}>
    <div className="light-check-in-heading"><div><h2>LIGHT AROUND YOU NOW</h2><p className="light-check-in-kicker">A moment to reconnect with your day</p></div><div className="light-check-in-icon"><RhythmIcon kind={phase?.id === 'night' ? 'moon' : 'sunset'}/></div></div>
    {!state ? <><h3>Your local light starts with your location</h3><p>Save your location to see what’s changing in the daylight, a gentle suggestion for right now, and what comes next.</p><Link className="journey-outline" href="/profile" scroll={true}>Set up my local light</Link></> : <>
      <p className="light-check-in-status">{phase?.label || (state.polar === 'day' ? 'Extended daylight' : state.polar === 'night' ? 'Extended darkness' : 'Solar timing unavailable')} · {formatTimeInZone(now, profile?.timeZone)}</p>
      <h3>{phase?.action || 'Let your sleep schedule guide your light'}</h3>
      <p>{shifted ? 'Working nights or changing shifts? This card describes the outdoor day. Fit light exposure to your planned sleep; local sunrise may be your wind-down time.' : phase?.invitation || 'At this latitude, sunrise and sunset may not occur every day. Keep your planned sleep hours in mind when choosing brighter or dimmer surroundings.'}</p>
      {phase && <div className="light-check-in-explanation"><h4>Why now</h4><p>{phase.why}</p><h4>Light and your body</h4><dl className="light-physiology">{lightToKnow[phase.id].map(item => <div key={item.name}><dt>{item.name}</dt><dd>{item.text}</dd></div>)}</dl>{['morning','midday','afternoon'].includes(phase.id) && <p className="light-check-in-note">UV also damages skin. These explanations are not a tanning or exposure-time prescription; avoid burning and use sun protection.</p>}</div>}
      <div className="light-check-in-next"><strong>{state.next ? 'Coming next' : 'Your next check-in'}</strong><span>{state.next ? `${state.next.label} · around ${formatTimeInZone(state.next.at, profile?.timeZone)}` : 'Come back as your local day unfolds.'}</span></div>
      <p className="light-check-in-note">Updates while Today is open and when you return. Based on your saved location—not a wearable or a measurement of the light reaching you.</p>
    </>}
    {state && <details className="light-check-in-deeper go-deeper"><summary>Explore the light spectrum</summary><SolarSpectrum profile={profile} now={now} /></details>}
    <details className="light-check-in-deeper go-deeper"><summary>Go deeper: light, your body clock, and your cells</summary>
      <LightBandDetails />
      <h4>How light becomes a timing signal</h4><p>Light-sensitive cells in the retina send information to the brain’s central clock. That clock helps coordinate daily rhythms across the body, including the timing of sleep and hormone release. The response depends on brightness, wavelength, duration, and your biological timing.</p>
      <a href="https://www.nigms.nih.gov/education/fact-sheets/Pages/circadian-rhythms" target="_blank" rel="noopener noreferrer">Explore the body clock · NIH (opens a new tab)</a>
      <h4>What researchers observed</h4><p>In a controlled crossover study, evening reading on a light-emitting device suppressed melatonin and delayed circadian timing compared with reading a printed book. This supports paying attention to evening light; it does not establish a special sunset exposure dose.</p><a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC4313820/" target="_blank" rel="noopener noreferrer">Read the evening-light experiment · Chang et al. (opens a new tab)</a>
      <h4>Visible light, UVA, and UVB</h4><p>Sunlight contains overlapping bands of wavelengths. Visible light supports vision and circadian signaling through the eyes. UVA and UVB affect the skin; UVB can initiate vitamin D production. These are different processes, not separate switches that turn on at a universal hour.</p><p>Clouds, ozone, altitude, shade, and windows change exposure. This card does not measure UVA or UVB, predict vitamin D or melanin production, or prescribe an exposure time. Outdoor daylight can be enjoyed in shade with sun protection.</p>
      <a href="https://www.who.int/news-room/fact-sheets/detail/ultraviolet-radiation" target="_blank" rel="noopener noreferrer">Explore ultraviolet light · WHO (opens a new tab)</a>
      <h4>Follow the day</h4><ol className="light-check-in-phases">{LIGHT_PHASES.map(item => <li key={item.id} aria-current={phase?.id === item.id ? 'step' : undefined}><strong>{item.label}</strong><span>{item.action}</span></li>)}</ol>
      <p>These are approximate check-in windows around calculated sunrise, solar noon, and sunset, not measured frequency changes. Weather and your surroundings can make the actual light different.</p>
      <CodyDiscovery />
    </details>
  </JourneyCard>;
}
