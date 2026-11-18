"use client";

import { assessmentContext } from '@/lib/journey-value';
import { focusReason } from "@/lib/coaching-explanations";
import { selectFirstRunGuidance } from "@/lib/personalization/first-run-guidance";
import { firstStepExplanation } from "@/lib/personalization/first-step-explanation";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import { useCircadian } from "@/components/circadian-provider";
import { JourneyFrame, JourneyCard, JourneyNav, Segments } from "@/components/journey-design";
import { hasValidCoordinates } from "@/lib/solar";
import { getRuntimeTimeZone, formatTimeInZone } from "@/lib/live-clock";
import { buildDerivedEnvironment } from "@/lib/personalization/derived-environment";
import type { DailyProfile } from "@/types/circadian";
import { OptionalMealTimeField } from "@/components/optional-meal-time-field";
import { BirthDateField, birthDateError } from "@/components/birth-date-field";
import { ClockTimeField } from "@/components/clock-time-field";
import { assessSleepInterval, formatClockTime, parseClockTime } from "@/lib/sleep-timing";

const stages = ["Basics", "Schedule", "Environment", "Your Reality", "Finish"] as const;
const copy = [
  ["Let’s personalize\nyour rhythm.", "Your assessment chooses a starting focus. Wake time and bedtime set your schedule; optional coordinates add local daylight."],
  ["Tell us about\nyour schedule.", "Wake time and bedtime set your daily opportunities. They are saved plans, not measured sleep; reminder delivery is a separate choice."],
  ["Let’s set\nyour environment.", "Coordinates let us calculate local daylight. Location is optional; without it, guidance uses your saved schedule."],
  ["Tell us about\nyour reality.", "Tell us which schedule constraints apply. You can choose smaller steps on Today when a suggestion does not fit."],
  ["You’re all set.", "Your answers choose a starting focus, and your saved times shape when its next step appears."],
];
const emptyProfile = (): DailyProfile => ({ wakeTime: null, targetBedtime: null, timeZone: getRuntimeTimeZone(), locationPermissionGranted: false, lastMealTime: null });
type SetupDraft = { profile?: DailyProfile; index?: number; intent?: "profile-edit" };
const draftKey = "foundational-flow-onboarding-draft";
export default function ProfileSetupPage() {
  const router = useRouter();
  const { now, eventStateByDate, currentPersonalization, candidateTarget, answers, completeAudit, dailyProfile, hasCompletedAudit, isHydrated, setAnswer, setDailyProfile, setParticipationLevel } = useCircadian();
  const darknessLabels: Record<string, string> = { blackout: "Very dark", mostly_dark: "Mostly dark", some_light: "Some light", bright_room: "Bright room" };
  const assessedDarkness = darknessLabels[answers?.bedroom_darkness];
  const [index, setIndex] = useState(0);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const finishing = useRef(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [recovery, setRecovery] = useState<SetupDraft | null>(null);
  const [reviewOriginal, setReviewOriginal] = useState<SetupDraft | null>(null);
  const [draft, setDraft] = useState<DailyProfile>(emptyProfile);
  const [message, setMessage] = useState("");
  const [validation, setValidation] = useState(false);
  const [locationEditing, setLocationEditing] = useState(false);
  const [referenceDetailsOpen, setReferenceDetailsOpen] = useState(false);
  const [locationBeforeEdit, setLocationBeforeEdit] = useState<DailyProfile | null>(null);
  const locationRequest = useRef(0);
  useEffect(() => () => { locationRequest.current += 1; }, []);
  useEffect(() => { if (isHydrated) {
    let saved: SetupDraft = {};
    try {
      const value = JSON.parse(localStorage.getItem(draftKey) || "{}");
      if (value && typeof value === "object" && !Array.isArray(value)) saved = value;
    } catch {}
    const savedProfile = saved.profile && typeof saved.profile === "object" && !Array.isArray(saved.profile) ? saved.profile : {};
    const activeEdit = hasCompletedAudit && saved.intent === "profile-edit" && Object.keys(savedProfile).length > 0;
    const restored = { ...emptyProfile(), ...dailyProfile, ...(!hasCompletedAudit || activeEdit ? savedProfile : {}) };
    const resume = !hasCompletedAudit || activeEdit;
    setEditingProfile(Boolean(activeEdit));
    if (hasCompletedAudit && !activeEdit && Object.keys(savedProfile).length > 0) setRecovery(saved);
    setDraft(restored);
    setIndex(resume ? resumeIndex(saved.index, restored) : 4);
    setDraftLoaded(true);
  } }, [isHydrated]);
  function resumeIndex(value: unknown, profile: DailyProfile) {
    const step = Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 3 ? Number(value) : 0;
    return step > 1 && !validSchedule(profile) ? 1 : step;
  }
  function reviewDraft() {
    if (!recovery) return;
    const restored = { ...emptyProfile(), ...dailyProfile, ...recovery.profile };
    setReviewOriginal(recovery); setRecovery(null); setDraft(restored);
    setEditingProfile(true); finishing.current = false; setIndex(resumeIndex(recovery.index, restored));
  }
  function cancelReview() {
    if (!reviewOriginal) return;
    finishing.current = true;
    try { localStorage.setItem(draftKey, JSON.stringify(reviewOriginal)); }
    catch { setMessage("The original draft could not be restored. Keep this page open and try again."); finishing.current = false; return; }
    setRecovery(reviewOriginal); setReviewOriginal(null); setEditingProfile(false);
    setDraft({ ...emptyProfile(), ...dailyProfile }); setIndex(4);
  }
  function validSchedule(profile: DailyProfile) {
    return typeof profile.wakeTime === "string" && typeof profile.targetBedtime === "string" && parseClockTime(profile.wakeTime) !== null && parseClockTime(profile.targetBedtime) !== null &&
      !assessSleepInterval(profile.targetBedtime, profile.wakeTime).error;
  }
  useEffect(() => {
    if (!draftLoaded || finishing.current || index >= 4) return;
    try { localStorage.setItem(draftKey, JSON.stringify({ profile: draft, index, ...(editingProfile ? { intent: "profile-edit" } : {}) })); }
    catch { setMessage("Your place could not be saved on this device. Keep this page open and try Save and Finish Later again."); }
  }, [draftLoaded, draft, index, editingProfile]);
  useEffect(() => { window.scrollTo(0, 0); }, [index]);
  const safeIndex = Math.min(Math.max(index, 0), stages.length - 1);
  const environment = buildDerivedEnvironment({ profile: draft });
  const selectedSignal = currentPersonalization?.primaryCoachingTarget.signalId || '';
  const startingStep = safeIndex === 4 && now ? selectFirstRunGuidance(draft, now, eventStateByDate) : null;
  const focusStep = safeIndex === 4 && now ? selectFirstRunGuidance(draft, now, eventStateByDate, selectedSignal) : null;
  const startingExplanation = startingStep && selectedSignal ? firstStepExplanation(draft, now, selectedSignal, startingStep, focusStep || undefined) : null;
  const sleepInterval = assessSleepInterval(draft.targetBedtime, draft.wakeTime);
  const set = (key: keyof DailyProfile, value: unknown) => setDraft(current => ({ ...current, [key]: value }));
  function save() {
    try { localStorage.setItem(draftKey, JSON.stringify({ profile: draft, index: safeIndex, ...(editingProfile ? { intent: "profile-edit" } : {}) })); setMessage("Your details and place are saved on this device. Return here whenever you’re ready."); }
    catch { setMessage("Your place could not be saved on this device. Keep this page open and try again."); }
  }
  const hasLocation = Boolean(draft.locationPermissionGranted && hasValidCoordinates(draft.latitude, draft.longitude));
  function editLocation() { setLocationBeforeEdit(draft); setLocationEditing(true); setMessage(""); }
  function cancelLocation() {
    locationRequest.current += 1;
    if (locationBeforeEdit) setDraft(current => ({ ...current,
      locationLabel: locationBeforeEdit.locationLabel, latitude: locationBeforeEdit.latitude,
      longitude: locationBeforeEdit.longitude, locationPermissionGranted: locationBeforeEdit.locationPermissionGranted }));
    setLocationEditing(false); setLocationBeforeEdit(null); setMessage("");
  }
  function keepLocation() { locationRequest.current += 1; setLocationEditing(false); setLocationBeforeEdit(null); setMessage(""); }
  function useLocation() {
    const request = ++locationRequest.current;
    if (!navigator.geolocation) return setMessage("Location is unavailable. You can continue using your timezone.");
    setMessage("Requesting location…");
    navigator.geolocation.getCurrentPosition(position => {
      if (request !== locationRequest.current) return;
      const latitude = Number(position.coords.latitude), longitude = Number(position.coords.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !hasValidCoordinates(latitude, longitude)) return setMessage("Location could not be read. You can add it later in Profile.");
      setDraft(current => ({ ...current, latitude, longitude, locationLabel: undefined, locationPermissionGranted: true }));
      setMessage("Location added. Solar times are calculated from your coordinates.");
    }, () => { if (request === locationRequest.current) setMessage("Location was not added. You can continue and add it later in Profile."); }, { timeout: 10000 });
  }
  function finish() {
    finishing.current = true;
    setReviewOriginal(null); setRecovery(null); setEditingProfile(false);
    setDailyProfile(draft);
    setParticipationLevel("GUIDED_FLOW");
    const darkness = { very_dark: "blackout", mostly_dark: "mostly_dark", some_light: "some_light", bright: "bright_room" } as const;
    if (!assessedDarkness && draft.sleepEnvironment) setAnswer("bedroom_darkness", darkness[draft.sleepEnvironment]);
    completeAudit();
    try { localStorage.removeItem(draftKey); } catch {}
    setIndex(4);
  }
  function next() {
    if (birthDateError(draft.dateOfBirth)) { setReferenceDetailsOpen(true); setIndex(0); return setMessage(birthDateError(draft.dateOfBirth)!); }
    if (safeIndex >= 1 && safeIndex < 4 && !validSchedule(draft)) { setIndex(1); return setValidation(true); }
    setValidation(false); setMessage("");
    if (safeIndex === 3) finish(); else setIndex(Math.min(safeIndex + 1, stages.length - 1));
  }
  const input = (key: keyof DailyProfile, label: string, type = "text", placeholder = "") => <label className="journey-field"><span>{label}</span><input type={type} value={String(draft[key] ?? "")} placeholder={placeholder} onChange={e => set(key, e.target.value)}/></label>;
  const segments = (key: keyof DailyProfile, label: string, options: readonly (readonly [string,string])[]) => <Segments label={label} value={String(draft[key] ?? "")} options={options} onChange={value => set(key,value)}/>;
  const solarSummary = <div className="journey-grid"><p>Sunrise<br/><strong>{environment.sunrise ? formatTimeInZone(new Date(environment.sunrise), draft.timeZone) : "Unavailable"}</strong></p><p>Sunset<br/><strong>{environment.sunset ? formatTimeInZone(new Date(environment.sunset), draft.timeZone) : "Unavailable"}</strong></p></div>;
  const environmentLocation = <>
    <div className="journey-card-heading"><h2>{hasLocation ? "Using your saved location" : "No location added"}</h2>
      <p>{hasLocation ? draft.locationLabel?.trim() || `${draft.latitude!.toFixed(2)}°, ${draft.longitude!.toFixed(2)}°` : "You can continue without a location. Add one in Basics or later in Profile for local daylight times."}</p>
    </div>
    <p className="journey-small">{draft.timeZone}</p>
    {hasLocation && solarSummary}
    {hasLocation && <p className="journey-small">To change your location, return to Basics or edit it later in Profile.</p>}
  </>;
  const location = hasLocation && !locationEditing ? <>
    <div className="journey-card-heading"><h2>Using your saved location</h2><p>{draft.locationLabel?.trim() || `${draft.latitude!.toFixed(2)}°, ${draft.longitude!.toFixed(2)}°`}</p></div>
    <p className="journey-small">{draft.timeZone}</p>{solarSummary}
    <button className="journey-outline" onClick={editLocation}>Change location</button>
  </> : <>
    <div className="journey-card-heading"><h2>Your location</h2><p>Optional coordinates let us calculate local sunrise and sunset. A location label alone does not set daylight timing.</p></div>
    <div className="journey-location">{input("locationLabel", "Location label (optional)", "text", "City or region")}<button className="journey-outline" onClick={useLocation}>◎ Use my current location</button></div>
    <p className="journey-small">{draft.timeZone}{hasLocation ? ` · ${draft.latitude!.toFixed(2)}°, ${draft.longitude!.toFixed(2)}°` : " · Location is optional; a label alone does not set daylight coordinates"}</p>
    {locationEditing && <div className="journey-actions"><button className="journey-outline" onClick={cancelLocation}>Cancel location changes</button><button className="journey-outline" onClick={keepLocation}>Done editing location</button></div>}
  </>;
  if (!isHydrated || !draftLoaded) return <JourneyFrame onboarding><p role="status">Loading your profile…</p></JourneyFrame>;
  if (recovery) return <JourneyFrame onboarding><JourneyCard>
    <h1>Review an unfinished setup draft?</h1>
    <p>Your saved profile is unchanged. An older unfinished draft is also on this device. Review it before deciding whether to save those changes.</p>
    <button className="journey-primary" onClick={reviewDraft}>Review saved draft</button>
    <button className="journey-outline" onClick={() => router.push("/today?view=overview")}>Continue with saved profile</button>
    <p className="journey-small">Continuing keeps the draft on this device for later review.</p>
  </JourneyCard>{message && <p role="status">{message}</p>}</JourneyFrame>;
  return <JourneyFrame image={safeIndex + 1} onboarding>
    {reviewOriginal && <button className="journey-outline" onClick={cancelReview}>Cancel draft review</button>}
    <header className="journey-intro"><p className="journey-eyebrow">Get started</p><h1>{copy[safeIndex][0]}</h1><p>{copy[safeIndex][1]}</p></header>
    <ol className="journey-steps" aria-label="Setup progress">{stages.map((stage,i) => <li key={stage} aria-current={i === safeIndex ? "step" : undefined}><span>{i+1}</span><small>{stage}</small></li>)}</ol>
    <div className="journey-content">
    {safeIndex === 0 && <>
      <JourneyCard><div className="journey-card-heading"><h2>Your basics</h2><p>Your name is optional. Wake time and bedtime are the only required schedule fields.</p></div>{input("displayName", "What’s your name? (optional)")}</JourneyCard>
      <JourneyCard>{location}</JourneyCard>
      <JourneyCard><details open={referenceDetailsOpen} onToggle={event => setReferenceDetailsOpen(event.currentTarget.open)}><summary>Optional profile details · saved for reference only</summary>
        <p>These details do not currently change your focus, suggested actions, or timing. You can skip this section without losing guidance.</p>
        <div className="journey-grid"><BirthDateField value={draft.dateOfBirth} onChange={value => set("dateOfBirth", value)}/>{segments("gender", "Gender (optional)", [["male","Male"],["female","Female"]])}{segments("activityLevel", "Activity level (optional)", [["low","Low"],["moderate","Moderate"],["high","High"]])}</div>
        <h3>Saved display preferences</h3><p>Schedule entry and Today currently use AM/PM; the saved time-format preference does not change those displays. Temperature preference is stored for reference.</p>
        <div className="journey-grid">{segments("temperatureUnit","Temperature",[["F","°F"],["C","°C"]])}{segments("timeFormat","Time Format",[["12","12-hour"],["24","24-hour"]])}</div>
      </details></JourneyCard>
    </>}
    {safeIndex === 1 && <><JourneyCard><div className="journey-card-heading"><h2>Your daily rhythm</h2><p>Wake time places your morning-light opportunity. Bedtime places dim-light and screen wind-down opportunities. Enter AM/PM times in your saved timezone.</p></div><div className="journey-grid"><ClockTimeField required label="Typical wake time" value={draft.wakeTime} onChange={value => set("wakeTime", value)}/><ClockTimeField required label="Target bedtime" value={draft.targetBedtime} onChange={value => set("targetBedtime", value)}/><p>Timezone: {draft.timeZone}</p><OptionalMealTimeField value={draft.lastMealTime} onChange={value => set("lastMealTime", value)}/></div><p className="journey-small">Add your last meal time for personalized meal timing. You can skip this and add it later in Profile; general food guidance is still available.</p>{sleepInterval.interpretation && <p role="status" className="journey-small">We’ll read this as <strong>{sleepInterval.interpretation}</strong>.</p>}{sleepInterval.warning && <p className="journey-small">{sleepInterval.warning}</p>}</JourneyCard><JourneyCard><h2>A quick note</h2><h3>There’s no perfect schedule.</h3><p>We’re not looking for “ideal.” We’re looking for what’s real so we can work with it.</p></JourneyCard></>}
    {safeIndex === 2 && <>
      <JourneyCard>{environmentLocation}</JourneyCard>
      <JourneyCard><details><summary>Optional surroundings · saved for reference only</summary><p>Surroundings and elevation do not currently change the light calculation or your guidance. The sunlight model does not measure local weather, altitude or your exposure.</p>{segments("typicalEnvironment","Surroundings",[["suburban","Suburban"],["urban","Urban"],["rural","Rural"],["coastal","Coastal"]])}{input("elevation","Elevation in feet (optional)","number")}</details></JourneyCard>
      <JourneyCard><label className="journey-toggle"><span><h2>Are you traveling soon?</h2><p>Upcoming travel pauses suggestions to move your last meal earlier. Update your saved times and location when your routine changes.</p></span><input type="checkbox" checked={Boolean(draft.upcomingTravel)} onChange={e => set("upcomingTravel",e.target.checked)}/>Yes, I have upcoming travel</label></JourneyCard>
    </>}
    {safeIndex === 3 && <><JourneyCard><h2>Work & daily structure</h2><p>Shift, overnight or variable schedules pause suggestions to move your last meal earlier. Your saved wake time and bedtime still set your daily opportunities.</p>{segments("workStructure","Work structure",[["daytime","Standard Day (9–5)"],["shift","Shift Work"],["flexible","Variable Schedule"],["overnight","Overnight"]])}</JourneyCard><div className="journey-grid"><JourneyCard><details><summary>Optional travel history · reference only</summary><p>Travel frequency is saved but does not change guidance. Use upcoming travel above when your routine is about to change.</p>{segments("travelFrequency","Travel frequency (optional)",[["rarely","No"],["monthly","Sometimes"],["frequent","Frequently"]])}</details></JourneyCard><JourneyCard><h2>Exercise & training</h2><p>Optional. This adds a food reminder to adapt meals to training and hunger; it does not calculate portions or a training plan.</p>{segments("exercisePattern","When do you typically exercise?",[["morning","Morning"],["midday","Midday"],["evening","Evening"],["variable","Varies"]])}</JourneyCard><JourneyCard><h2>Sleep environment</h2>{assessedDarkness ? <p>Bedroom darkness: <strong>{assessedDarkness}</strong> · from your assessment.</p> : segments("sleepEnvironment","How dark is your bedroom?",[["very_dark","Very dark"],["mostly_dark","Mostly dark"],["some_light","Some light"],["bright","Bright room"]])}</JourneyCard><JourneyCard><h2>Anything else?</h2>{input("realityNotes","Notes for your reference (optional)","text","Travel, kids, caregiving, etc.")}</JourneyCard></div><JourneyCard><h2>Good to know</h2><h3>Constraints are not noncompliance.</h3><p>Your notes are saved for reference; their meaning is not automatically interpreted. Adding any note pauses suggestions to move your last meal earlier until you choose what fits. Use Smaller step on Today to choose practical support, or skip a step that does not fit.</p></JourneyCard></>}
    {safeIndex === 4 && <><JourneyCard className="journey-success"><h2>Your starting point</h2><p>{selectedSignal ? focusReason(answers, selectedSignal).replace("The next step below follows that focus and your saved schedule.", "Your saved schedule sets the timing below.") : assessmentContext(answers, hasCompletedAudit, candidateTarget?.noTargetReason).explanation}</p>{startingStep && startingExplanation ? <><h3>{startingExplanation.heading}</h3><p>{startingStep.action}</p><p>{startingStep.reason} {startingExplanation.why}</p>{startingExplanation.next && <p>{startingExplanation.next.label} at {startingExplanation.next.clock}: {startingExplanation.next.action}.</p>}<p>Times use {draft.timeZone}. Today confirms the current opportunity when you arrive; no background reminder is promised here.</p></> : startingStep ? <><h3>Your next schedule-based step</h3><p>{startingStep.action}</p><p>{startingStep.reason}</p><p>Today confirms the current opportunity when you arrive; no background reminder is promised here.</p></> : <p>No timed opportunity is available from this setup right now. You can review your saved schedule in Profile.</p>}</JourneyCard><JourneyCard><div className="journey-card-top"><div><h2>Your profile at a glance</h2><p>You can update any of this later in Profile.</p></div><button className="journey-outline" onClick={() => { finishing.current = false; setEditingProfile(true); setIndex(0); }}>Edit Details</button></div><div className="journey-summary">{[["Location", hasLocation ? draft.locationLabel || "Coordinates saved" : "Not added (optional)"],["Timezone", draft.timeZone],["Typical Wake",formatClockTime(draft.wakeTime)],["Target Sleep",formatClockTime(draft.targetBedtime)],["Last Meal",formatClockTime(draft.lastMealTime)],["Work Structure",draft.workStructure],["Travel history (reference only)",draft.travelFrequency],["Exercise",draft.exercisePattern],["Sleep Environment",assessedDarkness || draft.sleepEnvironment]].map(([label,value]) => <p key={label}>{label}<strong>{value?.replaceAll("_"," ") || "Not provided"}</strong></p>)}</div></JourneyCard><JourneyCard><h2>What happens next?</h2><p>Today will show your chosen focus, a first step, and why it fits your schedule. If that step is for later, you’ll see when to come back. You don’t need to do anything before then.</p></JourneyCard><button className="journey-primary" onClick={() => router.push("/today?view=overview")}>Continue to Today →</button><JourneyNav/></>}
    {validation && <p role="alert">{sleepInterval.error || "Add your wake time and target bedtime before continuing."}</p>}
    {safeIndex < 4 && <><div className="journey-actions">{safeIndex > 0 && <button className="journey-outline" onClick={() => {setIndex(i => i-1);setValidation(false);}}>← Back</button>}<button className="journey-primary" onClick={next}>Next: {stages[safeIndex+1] === "Schedule" ? "Your Schedule" : stages[safeIndex+1] === "Environment" ? "Your Environment" : stages[safeIndex+1]} <span>→</span></button></div><button className="journey-save" onClick={save}>Save and Finish Later</button></>}
    {message && <p role="status" className="journey-message">{message}</p>}
    </div>
  </JourneyFrame>;
}
