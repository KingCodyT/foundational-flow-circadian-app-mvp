import type { SolarTimes } from './solar';

/** Display coordinates only. Solar event times and spectral values are not changed. */
export function solarDayRange(solar: SolarTimes) {
  if (!solar.solarNoon) return null;
  const daylight = Boolean(solar.sunrise && solar.sunset && solar.sunset > solar.sunrise);
  const start = daylight ? +solar.sunrise! : +solar.solarNoon - 12 * 3600000;
  const end = daylight ? +solar.sunset! : +solar.solarNoon + 12 * 3600000;
  return {start, end, daylight, position:(at: Date)=>Math.max(0,Math.min(100,(+at-start)/(end-start)*100))};
}

const colors: Record<string,string> = {uvb:'#bc81d7',uva:'#a46dcc',violet:'#8264e8',blue:'#557ef5',green:'#53d1c5',yellow:'#dced91',orange:'#ffd28a',red:'#f57d5e',nir:'#c95068',ir:'#773e68'};
/** Smooth illustrative colors positioned by modeled band energy shares, not wavelength. */
export function solarMixGradient(bands: {id:string;percent:number}[]) {
  let sum=0;
  const stops=bands.map(b=>{const midpoint=sum+b.percent/2;sum+=b.percent;return `${colors[b.id] || '#cbd8df'} ${midpoint.toFixed(3)}%`;});
  return `linear-gradient(90deg, ${stops.join(', ')})`;
}
