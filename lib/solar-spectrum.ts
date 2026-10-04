import table from './solar-spectrum-table.json';
import { getSolarElevation } from './solar';

// Adjacent, non-overlapping integration bins. UVB below 300 nm is outside SPECTRL2.
export const SPECTRAL_BANDS = [
  {id:'uvb',name:'UVB',low:300,high:315,color:'#55538c',invisible:true,meaning:'Can initiate vitamin D production in skin; also causes sunburn and DNA damage. Energy share is not a safe exposure guide.'},
  {id:'uva',name:'UVA',low:315,high:400,color:'#73528f',invisible:true,meaning:'Interacts with skin pigments and light-sensitive nitric oxide stores. Its effects depend on exposure, not its share alone.'},
  {id:'violet',name:'Violet',low:400,high:450,color:'#7753aa',invisible:false,meaning:'Part of visible daylight, absorbed by visual pigments in the eyes. Color bands overlap in their biological effects.'},
  {id:'blue',name:'Blue–cyan',low:450,high:500,color:'#24758d',invisible:false,meaning:'Includes wavelengths to which melanopsin is especially sensitive, helping the eyes convey timing information to the body clock.'},
  {id:'green',name:'Green',low:500,high:570,color:'#557a42',invisible:false,meaning:'Contributes to vision and perceived brightness. Retinal signals combine information across visible wavelengths.'},
  {id:'yellow',name:'Yellow',low:570,high:590,color:'#aa7e14',invisible:false,meaning:'Contributes to color vision and the daylight your eyes receive; it is not a separate cellular instruction.'},
  {id:'orange',name:'Orange',low:590,high:620,color:'#b96925',invisible:false,meaning:'Part of the visible mix sensed by cone cells. A warmer-looking sky does not measure UV or infrared exposure.'},
  {id:'red',name:'Red',low:620,high:750,color:'#a94335',invisible:false,meaning:'Supports vision. Controlled red-light studies investigate cellular responses, but sunlight percentages do not establish a treatment dose.'},
  {id:'nir',name:'Near-infrared',low:750,high:1400,color:'#805548',invisible:true,meaning:'Absorbed by tissue components. Controlled studies explore energy and signaling pathways; outdoor effects depend on wavelength and dose.'},
  {id:'ir',name:'Longer infrared',low:1400,high:4000,color:'#625753',invisible:true,meaning:'Water absorption becomes important in this range, contributing to tissue heating. It is not visible red light.'},
] as const;

export function spectrumAtElevation(elevation: number, day: number) {
  if (!Number.isFinite(elevation) || elevation < 5 || elevation > 90 || !Number.isFinite(day) || day < 1 || day > 366) return null;
  const position=(elevation-5)*2, lower=Math.floor(position), upper=Math.min(table.length-1,lower+1), f=position-lower;
  const b=2*Math.PI*(day-1)/365;
  const distance=1.00011+.034221*Math.cos(b)+.00128*Math.sin(b)+.000719*Math.cos(2*b)+.000077*Math.sin(2*b);
  const powers=table[lower].map((p,i)=>(p+(table[upper][i]-p)*f)*distance);
  const total=powers.reduce((a,b)=>a+b,0);
  return {total, bands:SPECTRAL_BANDS.map((band,i)=>({...band,power:powers[i],percent:100*powers[i]/total}))};
}

export function getSolarSpectrum(at: Date, latitude: number, longitude: number) {
  const elevation=getSolarElevation(at,latitude,longitude);
  if(elevation===null) return null;
  const day=Math.floor((Date.UTC(at.getUTCFullYear(),at.getUTCMonth(),at.getUTCDate())-Date.UTC(at.getUTCFullYear(),0,1))/86400000)+1;
  return {elevation, status:elevation<=-6?'night':elevation<5?'horizon':'day', spectrum:spectrumAtElevation(elevation,day)} as const;
}

export function powerTrend(current: number, future: number | undefined) {
  if(future===undefined) return 'Near horizon';
  const change=future-current;
  return Math.abs(change)<Math.max(.001,current*.015)?'Steady':change>0?'Rising':'Falling';
}
