import { localDateKey } from './live-clock';
import { shiftDateKey } from './schedule-time';
export const fitChoices = { fits: 'Fits my life', mixed: 'Fits sometimes', difficult: 'Hard to fit', unsure: 'Not sure yet' } as const;
export const changeChoices = { helpful: 'A helpful change', none: 'No noticeable change', harder: 'Things feel harder', unsure: 'Too soon or not sure' } as const;
export type PracticeReflection = { version: 1; paused?: boolean; nextFrom?: string; response?: { at: string; fit: keyof typeof fitChoices; change: keyof typeof changeChoices } };
export function normalizeReflection(raw: unknown): PracticeReflection {
 const empty: PracticeReflection = {version:1};
 if (!raw || typeof raw !== 'object' || (raw as PracticeReflection).version !== 1) return empty;
 const r=raw as PracticeReflection, valid=(s: unknown): s is string=>typeof s==='string'&&Number.isFinite(Date.parse(s));
 return {...empty, ...(r.paused===true?{paused:true}:{}), ...(valid(r.nextFrom)?{nextFrom:r.nextFrom}:{}), ...(r.response && valid(r.response.at) && Object.hasOwn(fitChoices,r.response.fit) && Object.hasOwn(changeChoices,r.response.change)?{response:{at:r.response.at,fit:r.response.fit,change:r.response.change}}:{})};
}
export function reflectionDue(entry: PracticeReflection, acceptedAt: string | null | undefined, now: Date, zone?: string | null) {
 const anchor=entry.nextFrom || acceptedAt;
 if(entry.paused || !anchor || !Number.isFinite(Date.parse(anchor)))return false;
 return localDateKey(now,zone)>=shiftDateKey(localDateKey(new Date(anchor),zone),entry.nextFrom?14:7);
}
export function reflectionResponse(fit: keyof typeof fitChoices, change: keyof typeof changeChoices) {
 const practical=fit==='difficult'?'It is okay to leave a practice that does not fit, or use Smaller step when it is offered.':fit==='mixed'?'Keep only the parts that fit your day. There is no catch-up requirement.':'You can keep what feels useful and leave what does not.';
 const noticed=change==='helpful'?'You noticed something helpful; this does not tell us what caused it.':change==='none'?'Not noticing a change is useful information, not a failure.':change==='harder'?'You do not have to push through a practice when things feel harder.':'It is okay not to know yet.';
 return `${practical} ${noticed} This reflection does not change your focus or guidance automatically.`;
}
