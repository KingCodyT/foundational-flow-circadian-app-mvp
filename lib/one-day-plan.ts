import type { DailyProfile } from '@/types/circadian';
import { oneDayPreview } from './one-day-preview';
import { scheduleTime, scheduleDateKey, shiftDateKey } from './schedule-time';
export const ONE_DAY_KEY='circadian-one-day-light-plan-v1';
export type OneDayPlan={version:1;date:string;wake:string;bed:string;zone:string;base:string};
export const planBase=(p:DailyProfile)=>JSON.stringify([p.wakeTime,p.targetBedtime,p.timeZone,p.workStructure,p.latitude,p.longitude,p.locationPermissionGranted]);
const ordinary=(p:DailyProfile)=>!!p.wakeTime&&!!p.targetBedtime&&p.wakeTime>='04:00'&&p.wakeTime<='12:00'&&p.workStructure!=='shift'&&p.workStructure!=='overnight';
function exactTime(key:string,time:string,zone:string){
 const d=scheduleTime(key,time,zone);if(!d)return false;
 const f=new Intl.DateTimeFormat('en-CA',{timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 // Reject both nonexistent and repeated wall times rather than silently choosing a DST occurrence.
 return scheduleDateKey(d,zone)===key&&f.format(d)===time&&!Array.from({length:361},(_,i)=>(i-180)*60000).filter(n=>n!==0).some(n=>f.format(new Date(+d+n))===time&&scheduleDateKey(new Date(+d+n),zone)===key);
}
export function createOneDayPlan(p:DailyProfile|null,now:Date,day:'today'|'tomorrow',wake:string,bed:string):OneDayPlan|null {
 try {if(!p||!ordinary(p)||!p.timeZone||wake<'04:00'||wake>'12:00'||!(bed>='18:00'||bed<='03:00'))return null;
 const date=shiftDateKey(scheduleDateKey(now,p.timeZone),day==='tomorrow'?1:0),bedDate=bed<=wake?date:shiftDateKey(date,-1);
 if(!exactTime(date,wake,p.timeZone)||!exactTime(bedDate,bed,p.timeZone))return null;
 const plan:OneDayPlan={version:1,date,wake,bed,zone:p.timeZone,base:planBase(p)};
 const resolved=resolveOneDayPlan(plan,p,now);return resolved&&+resolved.expires>+now?plan:null;
 }catch{return null;}
}
export function resolveOneDayPlan(value:unknown,p:DailyProfile|null,now:Date){
 try {const v=value as OneDayPlan;if(!p||!v||v.version!==1||v.base!==planBase(p)||v.zone!==p.timeZone||v.wake<'04:00'||v.wake>'12:00'||!(v.bed>='18:00'||v.bed<='03:00')||!/^\d{4}-\d{2}-\d{2}$/.test(v.date)||!ordinary(p))return null;
 const today=scheduleDateKey(now,v.zone);if(v.date<today||v.date>shiftDateKey(today,1))return null;
 const bedDate=v.bed<=v.wake?v.date:shiftDateKey(v.date,-1);
 if(!exactTime(v.date,v.wake,v.zone)||!exactTime(bedDate,v.bed,v.zone))return null;
 const noon=scheduleTime(v.date,'12:00',v.zone)!;
 const r=oneDayPreview(p,noon,'today',v.wake,v.bed);if(!r)return null;
 const usual=oneDayPreview(p,noon,'today',p.wakeTime!,p.targetBedtime!);
 // Include both original and changed morning windows so an old step cannot resurface after the override ends.
 const expires=new Date(Math.max(+(r.morning?.end||r.wakeAt),+(usual?.morning?.end||usual?.wakeAt||r.wakeAt)));
 if(now>=expires)return null;
 const evening={start:r.evening.start,end:r.bedAt,action:'Begin reducing bright light and unnecessary screen exposure.',reason:`This follows your one-day bedtime, not an instant change to your body clock.`};
 const morning=r.morning?{start:r.morning.start,end:r.morning.end||new Date(+r.morning.start+90*60000),action:'Get some daylight after waking, when it’s available.',reason:r.morning.guidance}:null;
 const step=[evening,morning].find(s=>s&&s.end>now)||null;
 const starts=new Date(Math.min(+r.evening.start,+(usual?.evening.start||r.evening.start)));
 return {...r,starts,expires,step,plan:v};
 }catch{return null;}
}
