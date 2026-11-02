import type { DailyProfile } from '@/types/circadian';
import type { MealSlot } from './food-recipes';
const minutes = (v?: string | null) => v && /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? Number(v.slice(0,2))*60+Number(v.slice(3)) : null;
export function recipeWindow(profile: DailyProfile | null, now: Date): {slot:MealSlot|null; reason:string; schedule:string|null} {
  const fallback={slot:null,reason:'Choose the meal you’re planning. We don’t have a usable waking schedule for this moment.',schedule:null};
  const wake=minutes(profile?.wakeTime), bed=minutes(profile?.targetBedtime);
  if(wake===null || bed===null || !profile?.timeZone) return fallback;
  try {
    const parts=new Intl.DateTimeFormat('en-GB',{timeZone:profile.timeZone,hourCycle:'h23',hour:'2-digit',minute:'2-digit'}).formatToParts(now);
    const current=Number(parts.find(p=>p.type==='hour')?.value)*60+Number(parts.find(p=>p.type==='minute')?.value);
    const span=(bed-wake+1440)%1440, elapsed=(current-wake+1440)%1440;
    const label=(n:number)=>`${n%720<60 ? 12 : Math.floor(n%720/60)}:${String(n%60).padStart(2,'0')} ${n<720?'AM':'PM'}`;
    const schedule=`Wake ${label(wake)} · sleep ${label(bed)} · ${profile.timeZone}`;
    if(!span || elapsed>=span) return {...fallback,schedule,reason:'You’re outside your saved waking hours. Browse the meal you’re planning; nothing is overdue.'};
    const last=minutes(profile.lastMealTime), lastElapsed=last===null?null:(last-wake+1440)%1440;
    if(lastElapsed!==null && lastElapsed<span && elapsed>=Math.max(0,lastElapsed-30) && elapsed<Math.min(span,lastElapsed+60)) return {slot:'last',schedule,reason:`Your saved last-meal time is ${label(last!)}. These are options if you’re planning food, not a requirement to eat.`};
    // Reuse existing Food presentation bands, including fixed overnight schedules.
    // These labels do not change reminders, completion windows or biological-phase estimates.
    if(span-elapsed<=180) return {slot:'last',schedule,reason:'Your planned sleep is within three hours. Choose an amount that feels comfortable; you don’t need to skip food.'};
    if(elapsed<240) return {slot:'first',schedule,reason:'You’re in the first four hours of your saved waking day. These first-meal recipes work even when your day starts at night.'};
    return {slot:'middle',schedule,reason:'You’re in the middle of your saved waking day. These full-meal options fit a meal break, whatever the clock says.'};
  } catch { return fallback; }
}
