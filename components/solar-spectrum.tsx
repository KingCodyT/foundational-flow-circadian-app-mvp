'use client';

import { useRef, useState } from 'react';
import type { DailyProfile } from '@/types/circadian';
import { getSolarSpectrum, powerTrend } from '@/lib/solar-spectrum';
import { getLightCheckIn } from '@/lib/light-check-in';
import { formatTimeInZone, localDateKey } from '@/lib/live-clock';
import { solarDayRange, solarMixGradient } from '@/lib/solar-day-display';
import { getSolarTimes, hasValidCoordinates } from '@/lib/solar';

export function SolarSpectrum({profile,now}:{profile:DailyProfile|null;now:Date}) {
  const [offset,setOffset]=useState<number|null>(null);
  const sliderRef=useRef<HTMLInputElement>(null);
  if(!profile?.locationPermissionGranted || !hasValidCoordinates(profile.latitude,profile.longitude)) return null;
  const latitude=profile.latitude!,longitude=profile.longitude!;
  const solar=getSolarTimes(now,latitude,longitude,profile.timeZone);
  const noon=solar.solarNoon;
  const range=solarDayRange(solar);
  if(!noon || !range) return null;
  const at=offset===null?now:new Date(offset);
  const state=getSolarSpectrum(at,latitude,longitude);
  if(!state) return null;
  const future=getSolarSpectrum(new Date(+at+15*60000),latitude,longitude);
  const checkIn=getLightCheckIn(profile,at);
  const {spectrum}=state;
  const percent=(value:number)=>value<.1?'<0.1':value.toFixed(1);
  const currentOffset=Math.max(range.start,Math.min(range.end,+now));
  const shownOffset=offset??currentOffset;
  const outside=offset===null && (+now<range.start || +now>range.end);
  const time=(date:Date)=>formatTimeInZone(date,profile.timeZone);
  const datedTime=(date:Date)=>localDateKey(date,profile.timeZone)===localDateKey(now,profile.timeZone)?time(date):`${new Intl.DateTimeFormat('en-US',{timeZone:profile.timeZone || undefined,month:'short',day:'numeric'}).format(date)} · ${time(date)}`;
  const mix=spectrum ? solarMixGradient(spectrum.bands) : null;
  return <section className="meet-light solar-spectrum solar-day-explorer" aria-label="Today’s light explorer">
    <div className="solar-day-controls">
      <p className="solar-section-label">01 / Solar day</p>
      <h3>Where you are in the day</h3>
      <label htmlFor="spectrum-time" className="sr-only">Explore today’s light</label>
      <div className="solar-time-label" aria-live="polite">{offset===null?'Now':'Exploring'} · {time(at)}{outside ? range.daylight ? +now<range.start?' · Before sunrise':' · After sunset' : ' · Outside this 24-hour rail' : ''}</div>
      <div className="solar-rail" style={{'--solar-noon':`${range.position(noon)}%`} as React.CSSProperties}>
        <input ref={sliderRef} id="spectrum-time" type="range" min={range.start} max={range.end} step="any" value={shownOffset} onChange={event=>setOffset(Number(event.target.value))} aria-valuetext={`${time(at)}${outside?range.daylight?' · Outside the daylight rail':' · Outside the displayed 24-hour rail':''}`} aria-describedby="solar-rail-help" />
      </div>
      <div className="solar-event-labels">
        <div><strong>{range.daylight?'Sunrise':'Start'}</strong><span>{datedTime(new Date(range.start))}</span></div>
        <div><strong>Solar noon</strong><span>{time(noon)}</span></div>
        <div><strong>{range.daylight?'Sunset':'End'}</strong><span>{datedTime(new Date(range.end))}</span></div>
      </div>
      {!range.daylight && <p className="light-spectrum-note">No sunrise or sunset crossing today. Explore the 24 hours around solar noon.</p>}
      {outside && <p className="light-spectrum-note">The current time is outside {range.daylight?'this daylight rail':'the displayed 24-hour rail'}. Its handle rests at the nearest edge; the light mix still shows now.</p>}
      <p id="solar-rail-help" className="solar-rail-help">Drag the dot to explore another time. Arrow keys work too.</p>
      {offset===null?<span className="spectrum-live-status" role="status">Now</span>:<button type="button" className="journey-outline" onClick={()=>{setOffset(null);sliderRef.current?.focus();}}>Back to now</button>}
    </div>
    <div className="solar-mix-summary">
      <p className="solar-section-label">02 / Light mix at {time(at)}</p>
      <h3>{offset===null?'What’s in the light right now':'What’s in the light at this time'}</h3>
      <p>Modeled clear-sky mix · {Math.round(state.elevation)}° solar elevation{state.status==='night'?' · Nighttime':''}</p>
      {mix && <><div className="solar-glowing-mix" role="img" aria-label="Smooth illustrative spectrum positioned by modeled band energy shares; ultraviolet and infrared use false colors" style={{backgroundImage:mix}} /><div className="solar-mix-labels"><span>Ultraviolet</span><span>Visible light</span><span>Infrared</span></div><p className="light-spectrum-note">UV and infrared use illustrative colors. The blend follows modeled energy shares, not a wavelength scale or measured color boundaries.</p></>}
    </div>
    {spectrum ? <>
      <details className="solar-band-details"><summary>Explore the light bands and modeled strength</summary><h4>Estimated clear-sky energy mix</h4>
      <p className="light-spectrum-note">Shares of modeled sunlight from 300–4,000 nm on open, level ground. Includes direct sunlight and scattered skylight. Not a sensor reading. Fixed atmosphere—not today’s weather or your personal exposure.</p>
      <p className="spectrum-total"><strong>{Math.round(spectrum.total)} W/m²</strong> total modeled strength · {powerTrend(spectrum.total,future?.spectrum?.total)} over the next 15 minutes</p>
      <p className="light-spectrum-note">Energy share is not biological effect, UV Index, or a personal exposure dose. UVB below 300 nm is outside this model. A larger share can still be weaker light. Rounded shares may not total exactly 100%.</p>
      <div className="light-band-grid">{spectrum.bands.map((band,i)=><article key={band.id} className="light-band">
        <div className="light-band-title"><span aria-hidden="true" className={`light-band-swatch ${band.invisible?'light-band-invisible':''}`} style={{backgroundColor:band.color}}/><h5>{band.name}</h5><strong className="spectrum-percent">{percent(band.percent)}%<small> energy share</small></strong></div>
        <span className="light-band-appearance">{band.low}–{band.high} nm · {band.invisible?'Invisible; illustrative color':'Visible color range'}</span>
        <p className="spectrum-power">{band.power<.1?'<0.1':band.power.toFixed(1)} W/m² · {powerTrend(band.power,future?.spectrum?.bands[i].power)}</p>
        <p>{band.meaning}</p>
      </article>)}</div></details>
    </>:<div className="spectrum-night"><h5>{state.status==='night'?'The solar spectrum has stepped aside':'The sun is near or below the horizon'}</h5><p>{state.status==='night'?'No daytime solar percentages here. Pay attention to the brightness of your surroundings; if sleep is approaching, soften indoor lights.':'This model pauses below 5° solar elevation: this model does not reliably describe twilight.'}</p><p>Read “How these estimates work” below for the model’s scope.</p></div>}
    <p className="light-spectrum-note">Estimated clear-sky energy mix, not a sensor reading. Weather, shade and windows change the light reaching you. Live calculation updates with Today’s clock and when you return.</p>
    {offset!==null && checkIn?.phase && <div className="spectrum-preview-action"><strong>At this time: {checkIn.phase.action}</strong><p>{checkIn.phase.invitation}</p></div>}
    <details className="go-deeper spectrum-method"><summary>How these estimates work</summary><p>Bird SPECTRL2 via pvlib 0.13.0, using your latitude, longitude, date, and calculated solar elevation. The clear-sky lookup uses 0.5° steps from 5° to 90° with interpolation and an Earth–Sun distance correction.</p><p>Assumed atmosphere: sea-level pressure (101,300 Pa), water vapor 1.5 cm, ozone 0.3 atm-cm, aerosol optical depth 0.1 at 500 nm, and ground reflectance 0.2. Clouds, actual altitude, pollution, local ozone and humidity, buildings, windows, and shade are not measured.</p><p>These adjacent bands cover the model’s 300–4,000 nm range. The UVB number covers only 300–315 nm, not the entire 280–315 nm UVB band. Visible color boundaries are approximate; here near-infrared means 750–1,400 nm. Fractions represent energy, not photon counts, UV Index, vitamin D production, or a personal exposure time.</p><a href="https://pvlib-python.readthedocs.io/en/v0.13.0/reference/generated/pvlib.spectrum.spectrl2.html" target="_blank" rel="noopener noreferrer">Read the model documentation (opens in a new tab)</a><p>Biology sources: <a href="https://www.nigms.nih.gov/education/fact-sheets/Pages/circadian-rhythms" target="_blank" rel="noopener noreferrer">NIH: body-clock timing</a> · <a href="https://www.who.int/news-room/fact-sheets/detail/ultraviolet-radiation" target="_blank" rel="noopener noreferrer">WHO: ultraviolet light</a> · <a href="https://pubmed.ncbi.nlm.nih.gov/24445737/" target="_blank" rel="noopener noreferrer">Liu et al.: controlled UVA study</a>. These sources explain mechanisms, not a personal exposure prescription.</p></details>
  </section>;
}
