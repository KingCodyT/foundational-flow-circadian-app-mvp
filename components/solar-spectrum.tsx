'use client';

import { useState } from 'react';
import type { DailyProfile } from '@/types/circadian';
import { getSolarSpectrum, powerTrend } from '@/lib/solar-spectrum';
import { getLightCheckIn } from '@/lib/light-check-in';
import { formatTimeInZone } from '@/lib/live-clock';
import { getSolarTimes, hasValidCoordinates } from '@/lib/solar';

export function SolarSpectrum({profile,now}:{profile:DailyProfile|null;now:Date}) {
  const [offset,setOffset]=useState<number|null>(null);
  if(!profile?.locationPermissionGranted || !hasValidCoordinates(profile.latitude,profile.longitude)) return null;
  const latitude=profile.latitude!,longitude=profile.longitude!;
  const noon=getSolarTimes(now,latitude,longitude,profile.timeZone).solarNoon;
  if(!noon) return null;
  const at=offset===null?now:new Date(+noon+offset*60000);
  const state=getSolarSpectrum(at,latitude,longitude);
  if(!state) return null;
  const future=getSolarSpectrum(new Date(+at+15*60000),latitude,longitude);
  const checkIn=getLightCheckIn(profile,at);
  const {spectrum}=state;
  const percent=(value:number)=>value<.1?'<0.1':value.toFixed(1);
  const currentOffset=Math.max(-720,Math.min(720,Math.round((+now-+noon)/60000)));
  return <section className="meet-light solar-spectrum" aria-label="Meet the light">
    <h4>Meet the light</h4>
    <p>{offset===null?'Your changing sunlight':'Preview the changing sunlight'} for your saved location. Move through the day to see the expected mix.</p>
    <div className="spectrum-controls"><label htmlFor="spectrum-time">Explore today’s light</label><p className="spectrum-time">{offset===null?'Now':'Exploring today'} · {formatTimeInZone(at,profile.timeZone)} · {checkIn?.phase?.label || (state.status==='night'?'Extended darkness':'Extended daylight')}</p><input id="spectrum-time" type="range" min={-720} max={720} step={5} value={offset??currentOffset} onChange={event=>setOffset(Number(event.target.value))} aria-valuetext={formatTimeInZone(at,profile.timeZone)}/><div className="spectrum-range-labels"><span>Earlier</span><span>Solar noon</span><span>Later</span></div><button type="button" className="journey-outline" onClick={()=>setOffset(null)} disabled={offset===null}>Back to now</button></div>
    {spectrum ? <>
      <h5>Estimated clear-sky energy mix</h5>
      <p className="light-spectrum-note">Shares of modeled sunlight from 300–4,000 nm on open, level ground. Includes direct sunlight and scattered skylight. Fixed atmosphere—not today’s weather or your personal exposure.</p>
      <div className="spectrum-stack" aria-label="Solar energy proportions">{spectrum.bands.map(band=><span key={band.id} title={`${band.name}: ${percent(band.percent)}%`} style={{width:`${band.percent}%`,backgroundColor:band.color}} className={band.invisible?'light-band-invisible':''}/>)}</div>
      <p className="spectrum-total"><strong>{Math.round(spectrum.total)} W/m²</strong> total modeled strength · {powerTrend(spectrum.total,future?.spectrum?.total)} over the next 15 minutes</p>
      <p className="light-spectrum-note">Percent means share, not strength or biological effect. A larger share can still be weaker light. Rounded shares may not total exactly 100%.</p>
      <div className="light-band-grid">{spectrum.bands.map((band,i)=><article key={band.id} className="light-band">
        <div className="light-band-title"><span aria-hidden="true" className={`light-band-swatch ${band.invisible?'light-band-invisible':''}`} style={{backgroundColor:band.color}}/><h5>{band.name}</h5><strong className="spectrum-percent">{percent(band.percent)}%</strong></div>
        <span className="light-band-appearance">{band.low}–{band.high} nm · {band.invisible?'Invisible; illustrative color':'Visible color range'}</span>
        <p className="spectrum-power">{band.power<.1?'<0.1':band.power.toFixed(1)} W/m² · {powerTrend(band.power,future?.spectrum?.bands[i].power)}</p>
        <p>{band.meaning}</p>
      </article>)}</div>
    </>:<div className="spectrum-night"><h5>{state.status==='night'?'The solar spectrum has stepped aside':'The sun is near or below the horizon'}</h5><p>{state.status==='night'?'No daytime solar percentages here. Pay attention to the brightness of your surroundings; if sleep is approaching, soften indoor lights.':'Enjoy the changing sky without looking directly at the sun. Percentages are paused below 5° solar elevation: this model does not reliably describe twilight.'}</p><p>The full wavelength guide remains available under “Go deeper.”</p></div>}
    {offset!==null && checkIn?.phase && <div className="spectrum-preview-action"><strong>At this time: {checkIn.phase.action}</strong><p>{checkIn.phase.invitation}</p></div>}
    <details className="go-deeper spectrum-method"><summary>How these estimates work</summary><p>Bird SPECTRL2 via pvlib 0.13.0, using your latitude, longitude, date, and calculated solar elevation. The clear-sky lookup uses 0.5° steps from 5° to 90° with interpolation and an Earth–Sun distance correction.</p><p>Assumed atmosphere: sea-level pressure (101,300 Pa), water vapor 1.5 cm, ozone 0.3 atm-cm, aerosol optical depth 0.1 at 500 nm, and ground reflectance 0.2. Clouds, actual altitude, pollution, local ozone and humidity, buildings, windows, and shade are not measured.</p><p>These adjacent bands cover the model’s 300–4,000 nm range. The UVB number covers only 300–315 nm, not the entire 280–315 nm UVB band. Visible color boundaries are approximate; here near-infrared means 750–1,400 nm. Fractions represent energy, not photon counts, UV Index, vitamin D production, or a safe exposure time.</p><a href="https://pvlib-python.readthedocs.io/en/v0.13.0/reference/generated/pvlib.spectrum.spectrl2.html" target="_blank" rel="noopener noreferrer">Read the model documentation (opens in a new tab)</a></details>
  </section>;
}
