const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),load=require('./load-typescript.cjs');
const {solarMixGradient}=load('lib/solar-day-display.ts'),{getSolarSpectrum}=load('lib/solar-spectrum.ts');
const src=fs.readFileSync('components/solar-spectrum.tsx','utf8'),css=fs.readFileSync('app/coastal-theme.css','utf8');
test('smooth spectrum includes visible colors and data-positioned invisible false colors',()=>{
 const a=getSolarSpectrum(new Date('2026-11-18T18:00:00Z'),33.54,-117.78).spectrum;
 const b=getSolarSpectrum(new Date('2026-11-18T22:00:00Z'),33.54,-117.78).spectrum;
 assert.match(solarMixGradient(a.bands),/^linear-gradient/);assert.notEqual(solarMixGradient(a.bands),solarMixGradient(b.bands));
 for(const color of ['#8264e8','#557ef5','#53d1c5','#dced91','#ffd28a','#f57d5e'])assert.ok(solarMixGradient(a.bands).includes(color));
 assert.match(src,/UV and infrared use illustrative colors/);assert.match(src,/not a wavelength scale/);assert.match(src,/\{mix &&/);
});
test('glow is static and scoped; single slider replaces separate compact/explorer controls',()=>{
 assert.match(css,/\.journey \.solar-glowing-mix/);assert.doesNotMatch(css.split('/* Approved solar-day')[1],/animation|@keyframes/);
 const wrapper=fs.readFileSync('components/sunlight-now.tsx','utf8');assert.match(wrapper,/localDateKey/);assert.equal((src.match(/type="range"/g)||[]).length,1);assert.doesNotMatch(wrapper,/type="range"|sunlight-strip/);
});
