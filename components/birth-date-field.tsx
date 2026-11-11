import { useId } from 'react';
const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
export function birthDateError(value?: string | null, today = new Date()): string | null {
 if (!value) return null;
 if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Choose a month and day, and enter a four-digit year. Or clear the date to skip it.';
 const [y,m,d]=value.split('-').map(Number);
 const leap=y%4===0&&(y%100!==0||y%400===0);
 const days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
 if(y<1||m<1||m>12||d<1||d>days[m-1]) return 'That date does not exist. Check the month, day and year.';
 const current=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
 return value>current ? 'Date of birth must be today or earlier.' : null;
}
export function BirthDateField({value,onChange}:{value?:string|null;onChange:(value:string)=>void}) {
 const id=useId();const [year='',month='',day='']=(value||'').split('-');
 const change=(index:number,part:string)=>{const parts=[year,month,day];parts[index]=part;onChange(parts.every(p=>!p)?'':parts.join('-'));};
 const error=birthDateError(value);
 return <fieldset className="journey-field"><legend>What’s your date of birth? <small>(optional)</small></legend>
 <p id={`${id}-hint`} className="journey-small">Choose the month and day, then type your birth year.</p>
 <div style={{display:'grid',gridTemplateColumns:'1.4fr .8fr 1fr',gap:8}}>
 <label htmlFor={`${id}-month`}><span>Month</span><select id={`${id}-month`} value={month} onChange={e=>change(1,e.target.value)} autoComplete="bday-month" aria-describedby={`${id}-hint`}><option value="">Month</option>{months.map((m,i)=><option key={m} value={String(i+1).padStart(2,'0')}>{m}</option>)}</select></label>
 <label htmlFor={`${id}-day`}><span>Day</span><select id={`${id}-day`} value={day} onChange={e=>change(2,e.target.value)} autoComplete="bday-day"><option value="">Day</option>{Array.from({length:31},(_,i)=><option key={i} value={String(i+1).padStart(2,'0')}>{i+1}</option>)}</select></label>
 <label htmlFor={`${id}-year`}><span>Year</span><input id={`${id}-year`} type="text" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} placeholder="YYYY" autoComplete="bday-year" value={year} onChange={e=>change(0,e.target.value.replace(/\D/g,'').slice(0,4))} aria-describedby={error?`${id}-error`:undefined}/></label>
 </div>{value&&<button type="button" className="journey-save" onClick={()=>onChange('')}>Clear date</button>}
 {error&&<p id={`${id}-error`} className="journey-small" role="status">{error}</p>}
 </fieldset>;
}
