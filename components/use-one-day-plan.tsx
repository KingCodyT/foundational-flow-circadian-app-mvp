'use client';
import { useState,useEffect } from 'react';
import type { DailyProfile } from '@/types/circadian';
import { ONE_DAY_KEY,createOneDayPlan,resolveOneDayPlan, type OneDayPlan } from '@/lib/one-day-plan';
export function useOneDayPlan(profile:DailyProfile|null,now:Date,blocked:boolean){
 const [stored,setStored]=useState<OneDayPlan|null>(null),[ready,setReady]=useState(false),[error,setError]=useState('');
 useEffect(()=>{try{setStored(JSON.parse(localStorage.getItem(ONE_DAY_KEY)||'null'));}catch{setError('One-day storage is unavailable. Nothing was applied.');}setReady(true);
 const refresh=(e:StorageEvent)=>{if(e.key===ONE_DAY_KEY||e.key===null){try{setStored(JSON.parse(e.newValue||'null'));}catch{setStored(null);}}};window.addEventListener('storage',refresh);return()=>window.removeEventListener('storage',refresh);},[]);
 const resolved=ready?resolveOneDayPlan(stored,profile,now):null;
 const active=!blocked?resolved:null;
 useEffect(()=>{if(ready&&stored&&(!resolved||blocked)){try{localStorage.removeItem(ONE_DAY_KEY);setStored(null);}catch{setError('Inactive plan could not be cleared. Usual guidance applies; retry clearing it.');}}},[ready,stored,!!resolved,blocked]);
 const undo=()=>{try{localStorage.removeItem(ONE_DAY_KEY);setStored(null);setError('');}catch{setError('Could not remove the saved plan. Please retry before leaving.');}};
 const apply=(day:'today'|'tomorrow',wake:string,bed:string)=>{const plan=createOneDayPlan(profile,now,day,wake,bed);if(blocked||!plan){setError('Use a complete daytime schedule and saved timezone. Choose a wake from 4 AM–noon and prior bedtime from 6 PM–3 AM. Ambiguous or nonexistent clock-change times are not supported.');return;}try{localStorage.setItem(ONE_DAY_KEY,JSON.stringify(plan));setStored(plan);setError('');}catch{setError('Could not save this one-day plan. Nothing was applied.');}};
 return {active,apply,undo,error,ready,stored};
}
