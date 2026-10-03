import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useCircadian } from "./circadian-provider";
import { registerNotificationServiceWorker, requestBrowserNotificationPermission } from "@/lib/personalization/background-notification-transport";
import { ensureWebPushSubscription } from "@/lib/personalization/web-push-client";
import { mealNudge } from "@/lib/personalization/meal-nudge";
import { planMealNotifications } from "@/lib/personalization/meal-notifications";

const Context = createContext({status:"", busy:false, enabled:false, enable:async()=>{}, disable:async()=>{}});
const knownKey="ff-meal-push-connected";
async function request(body: unknown, method="POST") {
  const response=await fetch("/api/push/meals",{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
  const result=await response.json();
  if(!response.ok) throw new Error(result.missing ? "Background delivery is not configured for this app yet." : result.reason || result.error || "Meal notification setup failed");
  return result;
}
export function MealNotificationsProvider({children}:{children:ReactNode}) {
  const ctx=useCircadian();const latest=useRef(ctx);latest.current=ctx;
  const [status,setStatus]=useState("");const [busy,setBusy]=useState(false);const running=useRef(false);
  const replayed=useRef(false);
  const enabled=ctx.dailyProfile?.mealRemindersEnabled===true;
  async function sync() {
    if(running.current || !latest.current.isHydrated) return;
    running.current=true;setBusy(true);
    const startedProfile=latest.current.dailyProfile;
    try {
      const {clientId,dailyProfile}=latest.current;
      if(!dailyProfile?.mealRemindersEnabled) {
        if(localStorage.getItem(knownKey)) {
          await request({clientId},"DELETE");localStorage.removeItem(knownKey);
        }
        setStatus("Meal notifications are off.");return;
      }
      if(!planMealNotifications(dailyProfile,new Date()).length) {
        if(localStorage.getItem(knownKey))await request({clientId},"DELETE");
        throw new Error("Add valid wake, bedtime, last-meal and timezone settings. Shift schedules use in-app suggestions.");
      }
      if(typeof Notification==="undefined" || Notification.permission!=="granted") throw new Error("Allow notifications on this device, then try again.");
      const registration=await registerNotificationServiceWorker();
      if(!registration.ok) throw new Error("Background notifications aren’t supported in this browser.");
      await ensureWebPushSubscription(clientId);
      if(!replayed.current){(await navigator.serviceWorker.ready).active?.postMessage({type:"FF_GET_REMINDER_STATE"});replayed.current=true;}
      localStorage.setItem(knownKey,"1");
      const result=await request({clientId,profile:{wakeTime:dailyProfile.wakeTime,targetBedtime:dailyProfile.targetBedtime,lastMealTime:dailyProfile.lastMealTime,timeZone:dailyProfile.timeZone,workStructure:dailyProfile.workStructure}});
      // Apply the same daily dismissal/snooze to the background queue.
      const response=JSON.parse(localStorage.getItem("foundational-flow-meal-nudge-response") || "null");
      if(response?.id?.startsWith(`${dailyProfile.timeZone}:`) && (response.dismissed || response.until>Date.now())) {
        await request({clientId,action:response.dismissed?"skip":"later",dateKey:response.id.slice(response.id.lastIndexOf(":")+1),remindAt:new Date(response.until).toISOString()});
      }
      setStatus(`Meal reminders scheduled through ${new Intl.DateTimeFormat("en-US",{timeZone:dailyProfile.timeZone || undefined,month:"short",day:"numeric"}).format(new Date(result.through))}. This refreshes when you use the app.`);
    } catch(error) {setStatus(`${latest.current.dailyProfile?.mealRemindersEnabled ? "Not connected" : "Cancellation not confirmed; pending reminders may still arrive"}: ${error instanceof Error?error.message:"Please try again."}`);}
    finally{running.current=false;setBusy(false);if(startedProfile!==latest.current.dailyProfile)void syncRef.current();}
  }
  const syncRef=useRef(sync);syncRef.current=sync;
  useEffect(()=>{
    if(!ctx.isHydrated)return;
    void syncRef.current();
    const refresh=()=>{void syncRef.current();};
    const onMessage=(event:MessageEvent)=>{
      const r=event.data?.record;
      if(event.data?.type!=="FF_REMINDER_STATE" || r?.eventId!=="meal_suggestion" || !r.dateKey || !r.timeZone)return;
      if(!["suppressed","completed","deferred"].includes(r.state))return;
      if(mealNudge(latest.current.dailyProfile,new Date())?.id!==`${r.timeZone}:${r.dateKey}`)return;
      try{localStorage.setItem("foundational-flow-meal-nudge-response",JSON.stringify({id:`${r.timeZone}:${r.dateKey}`,dismissed:r.state!=="deferred",until:Date.parse(r.scheduledFor)}));window.dispatchEvent(new Event("meal-response-updated"));}catch{}
    };
    window.addEventListener("focus",refresh);window.addEventListener("online",refresh);window.addEventListener("meal-response-updated",refresh);
    navigator.serviceWorker?.addEventListener("message",onMessage);
    const timer=window.setInterval(refresh,60000);
    return()=>{window.clearInterval(timer);window.removeEventListener("focus",refresh);window.removeEventListener("online",refresh);window.removeEventListener("meal-response-updated",refresh);navigator.serviceWorker?.removeEventListener("message",onMessage);};
  },[ctx.isHydrated,enabled,ctx.dailyProfile?.wakeTime,ctx.dailyProfile?.targetBedtime,ctx.dailyProfile?.lastMealTime,ctx.dailyProfile?.timeZone,ctx.dailyProfile?.workStructure]);
  const enable=async()=>{
    setBusy(true);
    try{
      if(!planMealNotifications(latest.current.dailyProfile,new Date()).length)throw new Error("Save valid wake, bedtime, last-meal and timezone settings first. Shift schedules use in-app suggestions.");
      if(await requestBrowserNotificationPermission()!=="GRANTED")throw new Error("Notification permission wasn’t granted. You can still use in-app suggestions.");
      const current=latest.current;
      if(!current.dailyProfile)throw new Error("Save your schedule first.");
      current.setDailyProfile({...current.dailyProfile,mealRemindersEnabled:true});
      if(current.dailyProfile.mealRemindersEnabled)await syncRef.current();
    }catch(error){setStatus(String(error instanceof Error?error.message:error));}finally{setBusy(false);}
  };
  const disable=async()=>{const current=latest.current;if(current.dailyProfile)current.setDailyProfile({...current.dailyProfile,mealRemindersEnabled:false});};
  return <Context.Provider value={{status,busy,enabled,enable,disable}}>{children}</Context.Provider>;
}
export function MealNotificationSettings(){
  const {status,busy,enabled,enable,disable}=useContext(Context);
  return <section className="journey-card" aria-label="Meal notifications">
    <h2>Friendly meal reminders</h2>
    <p>Get a notification before your usual last meal, even when the app is closed. Uses your saved schedule; no meal logging needed.</p>
    <p className="food-idea-note">We schedule the next seven days and refresh them when you use the app. Delivery needs an internet connection and browser permission.</p>
    <div className="flex flex-wrap gap-3 mt-4">
      <button type="button" className="journey-outline" disabled={busy} onClick={enable}>{enabled?"Reconnect meal notifications":"Enable meal notifications"}</button>
      {enabled && <button type="button" className="journey-outline" disabled={busy} onClick={disable}>Turn off meal notifications</button>}
    </div>
    <p role="status" className="food-idea-note">{busy?"Updating meal notifications…":status || "Meal notifications are off."}</p>
  </section>;
}
