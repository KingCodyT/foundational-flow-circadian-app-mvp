"use client";

import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useCircadian } from "@/components/circadian-provider";
import { JourneyFrame, JourneyCard, JourneyNav, Segments } from "@/components/journey-design";
import { getRuntimeTimeZone, formatTimeInZone } from "@/lib/live-clock";
import { buildDerivedEnvironment } from "@/lib/personalization/derived-environment";
import type { DailyProfile } from "@/types/circadian";
import { ClockTimeField } from "@/components/clock-time-field";
import { assessSleepInterval, formatClockTime } from "@/lib/sleep-timing";

const stages = ["Basics", "Schedule", "Environment", "Your Reality", "Finish"] as const;
const copy = [
  ["Let’s personalize\nyour rhythm.", "A few details help Foundational Flow align with your environment and your life."],
  ["Tell us about\nyour schedule.", "Your daily rhythm helps us personalize timing, recommendations, and reminders that actually fit your life."],
  ["Let’s set\nyour environment.", "Your location and surroundings shape your light, temperature, and seasonal rhythms. This helps us give you the most relevant guidance."],
  ["Tell us about\nyour reality.", "Life isn’t lived in a lab. Help us understand your real-world constraints so we can give you practical, personalized guidance."],
  ["You’re all set.", "Thanks for sharing a few details. Foundational Flow now understands enough about you to create a personalized experience that fits your rhythm and your life."],
];
const emptyProfile = (): DailyProfile => ({ wakeTime: null, targetBedtime: null, timeZone: getRuntimeTimeZone(), locationPermissionGranted: false, lastMealTime: null });
const draftKey = "foundational-flow-onboarding-draft";
export default function ProfileSetupPage() {
  const router = useRouter();
  const { completeAudit, dailyProfile, isHydrated, setAnswer, setDailyProfile, setParticipationLevel } = useCircadian();
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState<DailyProfile>(emptyProfile);
  const [message, setMessage] = useState("");
  const [validation, setValidation] = useState(false);
  useEffect(() => { if (isHydrated) {
    let saved: { profile?: DailyProfile; index?: number } = {};
    try { saved = JSON.parse(localStorage.getItem(draftKey) || "{}"); } catch {}
    setDraft({ ...emptyProfile(), ...dailyProfile, ...saved.profile });
    setIndex(Math.min(4, Math.max(0, saved.index || 0)));
  } }, [isHydrated]);
  useEffect(() => { window.scrollTo(0, 0); }, [index]);
  const safeIndex = Math.min(Math.max(index, 0), stages.length - 1);
  const environment = buildDerivedEnvironment({ profile: draft });
  const sleepInterval = assessSleepInterval(draft.targetBedtime, draft.wakeTime);
  const set = (key: keyof DailyProfile, value: unknown) => setDraft(current => ({ ...current, [key]: value }));
  function save() { localStorage.setItem(draftKey, JSON.stringify({ profile: draft, index: safeIndex })); setMessage("Your details are saved on this device. Return here whenever you’re ready."); }
  function useLocation() {
    if (!navigator.geolocation) return setMessage("Location is unavailable. You can continue using your timezone.");
    setMessage("Requesting location…");
    navigator.geolocation.getCurrentPosition(position => {
      const latitude = Number(position.coords.latitude), longitude = Number(position.coords.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return setMessage("Location could not be read. You can add it later in Profile.");
      setDraft(current => ({ ...current, latitude, longitude, locationPermissionGranted: true }));
      setMessage("Location added. Solar times are calculated from your coordinates.");
    }, () => setMessage("Location was not added. You can continue and add it later in Profile."), { timeout: 10000 });
  }
  function finish() {
    setDailyProfile(draft);
    setParticipationLevel("GUIDED_FLOW");
    const darkness = { very_dark: "blackout", mostly_dark: "mostly_dark", some_light: "some_light", bright: "bright_room" } as const;
    const schedule = { daytime: "stable", flexible: "mostly_stable", shift: "shift_or_irregular", overnight: "shift_or_irregular" } as const;
    if (draft.sleepEnvironment) setAnswer("bedroom_darkness", darkness[draft.sleepEnvironment]);
    if (draft.workStructure) setAnswer("travel_schedule_variability", schedule[draft.workStructure]);
    completeAudit();
    localStorage.removeItem(draftKey);
    setIndex(4);
  }
  function next() {
    if (safeIndex === 1 && (!draft.wakeTime || !draft.targetBedtime || !draft.lastMealTime || Boolean(sleepInterval.error))) return setValidation(true);
    setValidation(false); setMessage("");
    if (safeIndex === 3) finish(); else setIndex(Math.min(safeIndex + 1, stages.length - 1));
  }
  const input = (key: keyof DailyProfile, label: string, type = "text", placeholder = "") => <label className="journey-field"><span>{label}</span><input type={type} value={String(draft[key] ?? "")} placeholder={placeholder} onChange={e => set(key, e.target.value)}/></label>;
  const segments = (key: keyof DailyProfile, label: string, options: readonly (readonly [string,string])[]) => <Segments label={label} value={String(draft[key] ?? "")} options={options} onChange={value => set(key,value)}/>;
  const location = <><div className="journey-card-heading"><h2>Your location</h2><p>Your location gives us real-time environmental context like sunrise, sunset, and seasonal changes.</p></div><div className="journey-location">{input("locationLabel", "Location name (optional)", "text", "City or region")}<button className="journey-outline" onClick={useLocation}>◎ Use my current location</button></div><p className="journey-small">{draft.timeZone}{draft.locationPermissionGranted ? ` · ${draft.latitude?.toFixed(2)}°, ${draft.longitude?.toFixed(2)}°` : " · Location is optional"}</p></>;
  if (!isHydrated) return <JourneyFrame onboarding><p role="status">Loading your profile…</p></JourneyFrame>;
  return <JourneyFrame image={safeIndex + 1} onboarding>
    <header className="journey-intro"><p className="journey-eyebrow">Get started</p><h1>{copy[safeIndex][0]}</h1><p>{copy[safeIndex][1]}</p></header>
    <ol className="journey-steps" aria-label="Setup progress">{stages.map((stage,i) => <li key={stage} aria-current={i === safeIndex ? "step" : undefined}><span>{i+1}</span><small>{stage}</small></li>)}</ol>
    <div className="journey-content">
    {safeIndex === 0 && <><JourneyCard><div className="journey-card-heading"><h2>Your basics</h2><p>This helps us understand your biological day.</p></div><div className="journey-grid">{input("displayName", "What’s your name?")}{input("dateOfBirth", "What’s your date of birth?", "date")}{segments("gender", "What’s your gender?", [["male","Male"],["female","Female"],["unspecified","Prefer not to say"]])}{segments("activityLevel", "What best describes your activity level?", [["low","Low"],["moderate","Moderate"],["high","High"]])}</div></JourneyCard><JourneyCard>{location}</JourneyCard><JourneyCard><div className="journey-card-heading"><h2>Units & time format</h2><p>Help us tailor the app to your preferences.</p></div><div className="journey-grid">{segments("temperatureUnit","Temperature",[["F","°F"],["C","°C"]])}{segments("timeFormat","Time Format",[["12","12-hour"],["24","24-hour"]])}</div></JourneyCard></>}
    {safeIndex === 1 && <><JourneyCard><div className="journey-card-heading"><h2>Your daily rhythm</h2><p>These times help us understand your biological day.</p></div><div className="journey-grid"><ClockTimeField required label="Typical wake time" value={draft.wakeTime} onChange={value => set("wakeTime", value)}/><ClockTimeField required label="Target bedtime" value={draft.targetBedtime} onChange={value => set("targetBedtime", value)}/>{input("firstCaffeineTime","When do you usually have your first caffeine?","time")}{input("lastMealTime","When do you usually have your last meal?","time")}</div>{sleepInterval.interpretation && <p role="status" className="journey-small">We’ll read this as <strong>{sleepInterval.interpretation}</strong>.</p>}{sleepInterval.warning && <p className="journey-small">{sleepInterval.warning}</p>}</JourneyCard><JourneyCard><div className="journey-card-heading"><h2>Do you take a regular mid-day nap?</h2><p>Naps can be a powerful tool when used well.</p></div>{segments("napPattern","Nap pattern",[["no","No, not usually"],["sometimes","Sometimes"],["regularly","Yes, regularly"]])}</JourneyCard><JourneyCard><h2>A quick note</h2><h3>There’s no perfect schedule.</h3><p>We’re not looking for “ideal.” We’re looking for what’s real so we can work with it.</p></JourneyCard></>}
    {safeIndex === 2 && <><JourneyCard>{location}<div className="journey-environment-strip"><img src="/approved-journey/landscape-1.png" alt="Approved sunrise landscape"/><div><h2>Current environment</h2><div className="journey-grid"><p>Sunrise<br/><strong>{environment.sunrise ? formatTimeInZone(new Date(environment.sunrise),draft.timeZone) : "Add location"}</strong></p><p>Sunset<br/><strong>{environment.sunset ? formatTimeInZone(new Date(environment.sunset),draft.timeZone) : "Add location"}</strong></p></div></div></div></JourneyCard><JourneyCard><div className="journey-card-heading"><h2>Your typical environment</h2><p>This helps us understand the light and temperature you’re usually exposed to.</p></div>{segments("typicalEnvironment","Surroundings",[["suburban","Suburban"],["urban","Urban"],["rural","Rural"],["coastal","Coastal"]])}</JourneyCard><JourneyCard>{input("elevation","Elevation in feet (optional)","number")}</JourneyCard><JourneyCard><label className="journey-toggle"><span><h2>Are you traveling soon?</h2><p>You can always update this later.</p></span><input type="checkbox" checked={Boolean(draft.upcomingTravel)} onChange={e => set("upcomingTravel",e.target.checked)}/>Yes, I have upcoming travel</label></JourneyCard></>}
    {safeIndex === 3 && <><JourneyCard><h2>Work & daily structure</h2><p>Help us understand your typical week.</p>{segments("workStructure","Work structure",[["daytime","Standard Day (9–5)"],["shift","Shift Work"],["flexible","Variable Schedule"],["overnight","Overnight"]])}</JourneyCard><div className="journey-grid"><JourneyCard><h2>Travel</h2>{segments("travelFrequency","Do you travel across time zones regularly?",[["rarely","No"],["monthly","Sometimes"],["frequent","Frequently"]])}</JourneyCard><JourneyCard><h2>Exercise & training</h2>{segments("exercisePattern","When do you typically exercise?",[["morning","Morning"],["midday","Midday"],["evening","Evening"],["variable","Varies"]])}</JourneyCard><JourneyCard><h2>Caffeine</h2>{segments("caffeineUse","Do you consume caffeine?",[["no","No"],["yes","Yes"],["occasionally","Occasionally"]])}</JourneyCard><JourneyCard><h2>Sleep environment</h2>{segments("sleepEnvironment","How would you describe your sleep environment?",[["very_dark","Dark & Quiet"],["some_light","Some Light / Noise"],["bright","Often Disrupted"]])}</JourneyCard><JourneyCard><h2>Anything else?</h2>{input("realityNotes","Other factors that may impact your rhythm","text","Travel, kids, caregiving, etc.")}</JourneyCard></div><JourneyCard><h2>Good to know</h2><h3>Constraints are not noncompliance.</h3><p>We’ll always adapt recommendations to what you can realistically control.</p></JourneyCard></>}
    {safeIndex === 4 && <><JourneyCard><div className="journey-card-top"><div><h2>Your profile at a glance</h2><p>You can update any of this later in Profile.</p></div><button className="journey-outline" onClick={() => setIndex(0)}>Edit Details</button></div><div className="journey-summary">{[["Location", draft.locationLabel || draft.timeZone],["Typical Wake",formatClockTime(draft.wakeTime)],["Target Sleep",formatClockTime(draft.targetBedtime)],["Last Meal",formatClockTime(draft.lastMealTime)],["Work Structure",draft.workStructure],["Travel",draft.travelFrequency],["Exercise",draft.exercisePattern],["Sleep Environment",draft.sleepEnvironment]].map(([label,value]) => <p key={label}>{label}<strong>{value?.replaceAll("_"," ") || "Not provided"}</strong></p>)}</div></JourneyCard><JourneyCard className="journey-success"><h2>✓ Your personalized experience is ready</h2><p>Foundational Flow will now focus on what matters most for you, right now.</p></JourneyCard><JourneyCard><h2>What happens next?</h2><p>We’ll take everything you’ve shared and create your personalized daily guidance. You’ll start on the Today screen, where you’ll see what matters right now in your biological day.</p></JourneyCard><button className="journey-primary" onClick={() => router.push("/today?view=overview")}>Continue to Today →</button><JourneyNav/></>}
    {validation && <p role="alert">{sleepInterval.error || "Add your wake time, target bedtime, and last meal time before continuing."}</p>}
    {safeIndex < 4 && <><div className="journey-actions">{safeIndex > 0 && <button className="journey-outline" onClick={() => {setIndex(i => i-1);setValidation(false);}}>← Back</button>}<button className="journey-primary" onClick={next}>Next: {stages[safeIndex+1] === "Schedule" ? "Your Schedule" : stages[safeIndex+1] === "Environment" ? "Your Environment" : stages[safeIndex+1]} <span>→</span></button></div><button className="journey-save" onClick={save}>Save and Finish Later</button></>}
    {message && <p role="status" className="journey-message">{message}</p>}
    </div>
  </JourneyFrame>;
}
