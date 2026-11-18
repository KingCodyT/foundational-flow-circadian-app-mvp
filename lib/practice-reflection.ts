import { localDateKey } from './live-clock';
import { shiftDateKey } from './schedule-time';
export const fitChoices = { fits: 'Fits my life', mixed: 'Fits sometimes', difficult: 'Hard to fit', unsure: 'Not sure yet' } as const;
export const changeChoices = { helpful: 'A helpful change', none: 'No noticeable change', harder: 'Things feel harder', unsure: 'Too soon or not sure' } as const;
export type PracticeReflection = { version: 1; paused?: boolean; nextFrom?: string; response?: { at: string; fit: keyof typeof fitChoices; change: keyof typeof changeChoices; nextStep?: ReflectionNextStep } };
export function normalizeReflection(raw: unknown): PracticeReflection {
 const empty: PracticeReflection = {version:1};
 if (!raw || typeof raw !== 'object' || (raw as PracticeReflection).version !== 1) return empty;
 const r=raw as PracticeReflection, valid=(s: unknown): s is string=>typeof s==='string'&&Number.isFinite(Date.parse(s));
 return {...empty, ...(r.paused===true?{paused:true}:{}), ...(valid(r.nextFrom)?{nextFrom:r.nextFrom}:{}), ...(r.response && valid(r.response.at) && Object.hasOwn(fitChoices,r.response.fit) && Object.hasOwn(changeChoices,r.response.change)?{response:{at:r.response.at,fit:r.response.fit,change:r.response.change,...(['keep','smaller','leave'].includes(r.response.nextStep || '')?{nextStep:r.response.nextStep}:{})}}:{})};
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

export type ReflectionNextStep = 'keep' | 'smaller' | 'leave';
/** Practical options, not doses, treatment or new timing rules. */
export const manageablePractices: Record<string, string> = {
 morning_light_timing: 'Pair a brief, safe daylight visit with something you already do after waking, when daylight is available.',
 morning_light_duration: 'Use one brief, accessible daylight break rather than trying to meet a duration target.',
 day_brightness: 'At your next daytime break, use an accessible naturally lit area if comfortable. Avoid glare and keep the lighting you need for work.',
 day_breaks_outside: 'Attach a brief outdoor break to a break you already take, if weather, access and safety allow.',
 morning_movement: 'At a comfortable morning moment, change position or move gently for a moment. Skip this if movement is painful or unsafe.',
 evening_light_reduction: 'At your next wind-down, reduce just one unnecessary light you control. Keep enough light for safe movement and leave shared or work lighting alone.',
 evening_screen_exposure: 'At your next wind-down, put aside one nonessential screen. Keep screens needed for work, navigation or safety.',
 sleep_schedule: 'Choose one familiar first step of your wind-down routine. Keep enough opportunity for sleep; do not force sleep or shorten it to complete a step.',
 meal_timing_regularity: 'Choose one usual meal and plan a realistic opportunity to eat it in your next normal day. Do not skip food or override hunger, medical advice or work needs to match an app window.',
 last_meal_timing: 'Plan when your usual evening meal can realistically fit your next day. Do not delay or skip needed food to meet an app window or override medical advice.',
};
export function reflectionFeedback(fit: keyof typeof fitChoices, change: keyof typeof changeChoices, signalId: string) {
 const noticed = change === 'helpful' ? 'You have noticed something helpful. That does not show what caused it.' : change === 'none' ? 'You have not noticed a change. That is not a failure, and there is no need to increase the effort to prove this works.' : change === 'harder' ? 'Things feel harder. You do not have to push through this practice. You can leave it aside rather than make it more demanding.' : 'It is okay not to know yet. You can keep the approach comfortable, make it smaller, or leave it aside.';
 const fitText = fit === 'fits' ? 'It fits your life. If you want to continue, keep the same approach rather than adding more.' : fit === 'mixed' ? 'It only fits sometimes. Try attaching a smaller version to something already in your day.' : fit === 'difficult' ? 'The current approach is hard to fit. A smaller version is an option, not another requirement.' : 'You are still figuring out the fit. There is no need to commit to a bigger routine.';
 return {text:`${fitText} ${noticed}`, smaller: manageablePractices[signalId] || null};
}
