const test=require('node:test'),assert=require('node:assert/strict'),load=require('./load-typescript.cjs');
const {getSolarElevation,getSolarTimes}=load('lib/solar.ts');
const {spectrumAtElevation,getSolarSpectrum,SPECTRAL_BANDS,powerTrend}=load('lib/solar-spectrum.ts');
test('spectrum covers its declared range exactly and conserves energy',()=>{
 assert.equal(SPECTRAL_BANDS[0].low,300); assert.equal(SPECTRAL_BANDS.at(-1).high,4000);
 SPECTRAL_BANDS.slice(1).forEach((b,i)=>assert.equal(b.low,SPECTRAL_BANDS[i].high));
 for(const e of [5,5.2,15,30.7,60,90]){
  const s=spectrumAtElevation(e,200);
  assert.ok(s.total>0); assert.ok(Math.abs(s.bands.reduce((a,b)=>a+b.percent,0)-100)<1e-9);
  s.bands.forEach(b=>assert.ok(b.power>=0&&Number.isFinite(b.percent)));
 }
});
test('sun position follows sunrise, noon, and night in both hemispheres',()=>{
 for(const [lat,lon,zone] of [[33.54,-117.78,'America/Los_Angeles'],[-33.86,151.2,'Australia/Sydney']]){
  const s=getSolarTimes(new Date('2026-10-03T12:00:00Z'),lat,lon,zone);
  assert.ok(Math.abs(getSolarElevation(s.sunrise,lat,lon)+.833)<.1);
  assert.ok(getSolarElevation(s.solarNoon,lat,lon)>40);
  assert.equal(getSolarSpectrum(new Date(+s.solarNoon+12*3600000),lat,lon).status,'night');
  assert.equal(getSolarSpectrum(s.sunrise,lat,lon).spectrum,null);
 }
});
test('solar mix and strength change with elevation; no invented night or invalid values',()=>{
 const low=spectrumAtElevation(10,100),high=spectrumAtElevation(60,100);
 assert.ok(high.total>low.total);
 assert.ok(high.bands[0].power>low.bands[0].power);
 assert.notEqual(high.bands[0].percent,low.bands[0].percent);
 for(const e of [-20,0,4.99,NaN,91])assert.equal(spectrumAtElevation(e,100),null);
 assert.equal(getSolarSpectrum(new Date('bad'),0,0),null);
 assert.equal(getSolarSpectrum(new Date(),100,0),null);
 assert.equal(powerTrend(20,30),'Rising');assert.equal(powerTrend(30,20),'Falling');assert.equal(powerTrend(20,20.1),'Steady');
});
test('polar seasons retain geometry instead of inventing daylight',()=>{
 assert.equal(getSolarSpectrum(new Date('2026-12-21T12:00:00Z'),80,0).spectrum,null);
 assert.ok(getSolarSpectrum(new Date('2026-06-21T00:00:00Z'),80,0).spectrum.total>0);
});
// Direct pvlib 0.13.0 evaluations, including elevations between lookup nodes.
// Checks interpolation against reference outputs, not against our own table math.
test('lookup reproduces independent direct SPECTRL2 evaluations within 0.2 percent',()=>{
 const references=[
 [5,1,54.63291120475587,.002146560668763221,20.549113870382325],
 [23.27,100,372.0102524999858,.19033734849025452,131.38802953286435],
 [60,200,909.6523785886452,1.3580378056743863,309.06549928020155],
 [89.9,366,1144.4403234149836,2.020795645419494,387.010884946911]];
 for(const [e,d,total,uvb,nir] of references){
  const s=spectrumAtElevation(e,d);
  for(const [actual,expected] of [[s.total,total],[s.bands[0].power,uvb],[s.bands[8].power,nir]])assert.ok(Math.abs(actual/expected-1)<.002);
 }
});
