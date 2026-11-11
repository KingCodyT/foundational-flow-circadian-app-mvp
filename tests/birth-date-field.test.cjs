const test=require('node:test'),assert=require('node:assert/strict'),React=require('react');
const {renderToStaticMarkup}=require('react-dom/server'),load=require('./load-typescript.cjs');
const {BirthDateField,birthDateError}=load('components/birth-date-field.tsx');
test('birth date handles leap days, incomplete entries, impossible dates and future dates',()=>{
 const now=new Date(2026,10,11);
 for(const s of ['',null,'1967-01-02','2000-02-29','2026-11-11']) assert.equal(birthDateError(s,now),null);
 for(const s of ['1967--','-01-02','1900-02-29','2025-02-29','2026-04-31','2026-13-01','2026-11-12','0000-01-01']) assert.ok(birthDateError(s,now),s);
});
test('birth entry shows explicit fields and preserves the saved ISO birthday',()=>{
 const html=renderToStaticMarkup(React.createElement(BirthDateField,{value:'1967-01-02',onChange(){}}));
 for(const s of ['Month','Day','Year','inputMode="numeric"','value="1967"','Clear date','optional']) assert.ok(html.includes(s),s);
 assert.doesNotMatch(html,/type="date"/);
 assert.match(require('node:fs').readFileSync('views/profile-setup-page.tsx','utf8'),/if \(birthDateError\(draft.dateOfBirth\)\)/);
});
