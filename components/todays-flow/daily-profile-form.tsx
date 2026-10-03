"use client";

import Link from "next/link";
import type { ZipLocation } from "@/lib/location/zip-location";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useCircadian } from "@/components/circadian-provider";
import { getRuntimeTimeZone } from "@/lib/live-clock";
import { ReminderDeliveryStatus } from "@/components/reminder-delivery-status";
import { requestBrowserNotificationPermission, registerNotificationServiceWorker } from "@/lib/personalization/background-notification-transport";
import { hasValidCoordinates } from "@/lib/solar";

export default function DailyProfileForm({ section = "all" }: { section?: "all" | "schedule" | "preferences" } = {}) {
  const { dailyProfile, setDailyProfile, storageIssue } = useCircadian();
  const savedWakeTime = dailyProfile?.wakeTime ?? "07:00";
  const savedBedtime = dailyProfile?.targetBedtime ?? "22:00";
  const savedTimeZone = dailyProfile?.timeZone ?? getRuntimeTimeZone() ?? "UTC";
  const savedLastMeal = dailyProfile?.lastMealTime ?? "";
  const [lastMealTime, setLastMealTime] = useState(savedLastMeal);
  const [timeZone, setTimeZone] = useState(savedTimeZone);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [error, setError] = useState("");
  const [wakeTime, setWakeTime] = useState(savedWakeTime);
  const [targetBedtime, setTargetBedtime] = useState(savedBedtime);
  const [zip, setZip] = useState("");
  const [zipResults, setZipResults] = useState<ZipLocation[]>([]);
  const [searching, setSearching] = useState(false);
  const [locationSaved, setLocationSaved] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const requestId = useRef(0);

  // Location-only updates must not discard unsaved time edits.
  useEffect(() => {
    setWakeTime(savedWakeTime);
    setTargetBedtime(savedBedtime);
  }, [savedWakeTime, savedBedtime]);
  useEffect(() => { setLastMealTime(savedLastMeal); setTimeZone(savedTimeZone); }, [savedLastMeal, savedTimeZone]);
  useEffect(() => () => { requestId.current += 1; }, []);

  const hasLocation = Boolean(dailyProfile?.locationPermissionGranted &&
    hasValidCoordinates(dailyProfile.latitude, dailyProfile.longitude));
  const saved = dailyProfile?.wakeTime === wakeTime &&
    dailyProfile?.targetBedtime === targetBedtime && savedLastMeal === lastMealTime && savedTimeZone === timeZone;

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(wakeTime) ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(targetBedtime)) return;
    if (lastMealTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(lastMealTime)) return;
    try { new Intl.DateTimeFormat(undefined, { timeZone }).format(); } catch { setError("Enter a valid timezone, such as America/Los_Angeles."); return; }
    setError("");
    setDailyProfile({
      ...dailyProfile,
      lastMealTime: lastMealTime || null,
      timeZone,
      wakeTime,
      targetBedtime,
      locationPermissionGranted: hasLocation,
    });
  };

  const searchZip = async () => {
    const id = ++requestId.current;
    setLocating(false); setZipResults([]); setLocationSaved(false);
    if (!/^\d{5}$/.test(zip.trim())) { setLocationMessage("Enter a five-digit U.S. ZIP code."); return; }
    setSearching(true); setLocationMessage("Looking up your area…");
    try {
      const response = await fetch(`/api/location?zip=${encodeURIComponent(zip.trim())}`);
      const data = await response.json();
      if (id !== requestId.current) return;
      if (!response.ok) throw new Error(data.error || "Please try again.");
      setZipResults(data.locations); setLocationMessage("Choose your area below to save it.");
    } catch (error) { if (id === requestId.current) setLocationMessage(error instanceof Error ? error.message : "Please try again."); }
    finally { if (id === requestId.current) setSearching(false); }
  };
  const saveZipLocation = (place: ZipLocation) => {
    requestId.current += 1;
    setLocationSaved(false); setLocating(false); setSearching(false); setZipResults([]);
    setDailyProfile({...dailyProfile, wakeTime: dailyProfile?.wakeTime ?? null, targetBedtime: dailyProfile?.targetBedtime ?? null,
      timeZone: dailyProfile?.timeZone ?? savedTimeZone, latitude:place.latitude, longitude:place.longitude,
      locationLabel: `${place.label} (ZIP area)`, locationPermissionGranted:true});
    setZipResults([]); setLocationSaved(true); setLocationMessage("Your location is saved. ZIP codes use an approximate area center. Check your timezone above, then see your personalized day.");
  };
  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationMessage("Browser location is unavailable. Enter your ZIP code below instead.");
      return;
    }
    const id = ++requestId.current;
    setLocationSaved(false); setZipResults([]); setSearching(false);
    setLocating(true);
    setLocationMessage("Finding your location…");
    navigator.geolocation.getCurrentPosition((position) => {
      if (id !== requestId.current) return;
      setLocating(false);
      if (!hasValidCoordinates(position.coords.latitude, position.coords.longitude)) {
        setLocationMessage("The browser returned an invalid location. Please try again.");
        return;
      }
      setDailyProfile({
        ...dailyProfile,
        wakeTime: dailyProfile?.wakeTime ?? null,
        targetBedtime: dailyProfile?.targetBedtime ?? null,
        timeZone: dailyProfile?.timeZone ?? savedTimeZone,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        locationPermissionGranted: true,
        locationLabel: "Browser location",
      });
      setLocationSaved(true);
      setLocationMessage("Your location is saved. You’re ready to see your personalized day.");
    }, (error) => {
      if (id !== requestId.current) return;
      setLocating(false);
      const reason = error.code === 1 ? "Location access was denied."
        : error.code === 3 ? "The location request timed out." : "Your location could not be found.";
      setLocationMessage(`${reason} ${hasLocation ? "Your saved location is unchanged." : "Enter your ZIP code below instead—no browser location permission needed."}`);
    }, { timeout: 10000, maximumAge: 300000, enableHighAccuracy: false });
  };

  const removeLocation = () => {
    requestId.current += 1;
    setLocationSaved(false); setLocating(false); setSearching(false); setZipResults([]);
    setDailyProfile({
      ...dailyProfile,
      wakeTime: dailyProfile?.wakeTime ?? null,
      targetBedtime: dailyProfile?.targetBedtime ?? null,
      timeZone: dailyProfile?.timeZone ?? savedTimeZone,
      locationLabel: undefined,
      latitude: null,
      longitude: null,
      locationPermissionGranted: false,
    });
    setLocationMessage("Saved location removed. Your times and assessment are unchanged.");
  };

  return (
    <form onSubmit={section === "preferences" ? event => event.preventDefault() : save} className="space-y-5">
      <h3 className="text-lg font-semibold">{section === "preferences" ? "Reminder and food preferences" : "Schedule details"}</h3>
      <fieldset disabled={locating} className="space-y-5 disabled:opacity-70">
        {section !== "preferences" && <><div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm text-[var(--color-muted)]">Typical wake time</span>
            <input required className="mt-2 block w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2" type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} />
          </label>
          <label className="block">
            <span className="text-sm text-[var(--color-muted)]">Target bedtime</span>
            <input required className="mt-2 block w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2" type="time" value={targetBedtime} onChange={(e) => setTargetBedtime(e.target.value)} />
          </label>
          <label className="block"><span>Usual last meal</span><input className="mt-2 block w-full rounded-xl border p-3" type="time" value={lastMealTime} onChange={event => setLastMealTime(event.target.value)} /></label>
          <label className="block"><span>Your timezone</span><input required className="mt-2 block w-full rounded-xl border p-3" value={timeZone} onChange={event => setTimeZone(event.target.value)} /></label>
        </div>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={saved} className="rounded-full border border-[var(--color-line)] bg-white px-5 py-2.5 text-sm font-semibold disabled:opacity-60">{saved ? "Schedule saved ✓" : "Save schedule"}</button></>}
        {section !== "schedule" && dailyProfile && <div className="space-y-3">
          <label className="block"><input type="checkbox" checked={dailyProfile.remindersEnabled === true} onChange={event => setDailyProfile({ ...dailyProfile, remindersEnabled: event.target.checked })}/> Allow notifications for useful reminders</label>
          <p>In-app reminders still work when notifications are off. Browser notification permission is also required.</p>
          {dailyProfile.remindersEnabled && <button type="button" onClick={async () => {
            try {
              const permission = await requestBrowserNotificationPermission();
              if (permission === "GRANTED") await registerNotificationServiceWorker();
              setNotificationMessage(permission === "GRANTED" ? "Browser reminders are allowed on this device." : "Browser reminders aren’t allowed. In-app reminders still work.");
            } catch { setNotificationMessage("Browser reminders aren’t available here. In-app reminders still work."); }
          }}>Allow reminders on this device</button>}
          {notificationMessage && <p role="status">{notificationMessage}</p>}
          <ReminderDeliveryStatus />
          <label className="block">Food-timing goal <select value={dailyProfile.foodTimingGoal ?? "observe"} onChange={event => setDailyProfile({ ...dailyProfile, foodTimingGoal: event.target.value as "observe" | "earlier_last_meal" })}><option value="observe">Learn my pattern</option><option value="earlier_last_meal">Try an earlier last meal</option></select></label>
        </div>}
        {section !== "preferences" && <div className="space-y-3">
          <p className="text-sm font-semibold">Profile timezone</p>
          <p className="text-sm leading-6 text-[var(--color-muted)]">{savedTimeZone}</p>
          <p id="profile-location" className="text-sm font-semibold">Location — essential for personalized guidance</p>
          <p className="text-sm leading-6 text-[var(--color-muted)]">{hasLocation ? "A location is saved for sunrise and sunset timing." : "Save your location so Circadian Flow can calculate your local sunrise, sunset, and day length and identify your growing region. Without it, daylight guidance cannot be personalized. It stays in this browser."}</p>
          <p className="text-sm">Tap “Use my location,” then choose Allow if your browser asks. Prefer not to share device location? Use a ZIP code below.</p>
          <div className="flex flex-wrap gap-3">
            <button type="button" disabled={locating || searching} onClick={requestLocation} className="rounded-full border border-[var(--color-line)] bg-white px-4 py-2 text-sm">{locating ? "Finding location…" : hasLocation ? "Update location" : "Use my location"}</button>
            {hasLocation ? <button type="button" onClick={removeLocation} className="rounded-full border border-[var(--color-line)] px-4 py-2 text-sm">Remove location</button> : null}
          </div>
          <div className="space-y-3">
            <label htmlFor="location-zip" className="block">Or enter your U.S. ZIP code</label>
            <p className="text-sm">We send only the ZIP code to Zippopotam.us to find the area. Your saved location stays in this browser.</p>
            <input id="location-zip" className="rounded-xl border p-3" inputMode="numeric" autoComplete="postal-code" maxLength={5} value={zip} onChange={event => { requestId.current += 1; setSearching(false); setLocating(false); setZip(event.target.value); setZipResults([]); }} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); void searchZip(); } }} />
            <button type="button" disabled={searching || locating} onClick={() => void searchZip()} className="journey-outline">{searching ? "Finding your area…" : "Find my area"}</button>
            {zipResults.map(place => <button className="journey-outline" type="button" key={`${place.label}:${place.latitude}:${place.longitude}`} onClick={() => saveZipLocation(place)}>Save {place.label} as my location</button>)}
          </div>
          {hasLocation && <p className="text-sm">Saved location: {dailyProfile?.locationLabel || "Your saved coordinates"}. Check that your timezone above matches this location.</p>}
          {hasLocation && !storageIssue && <Link href="/today" className="journey-primary inline-flex">See my personalized day</Link>}
        </div>}
      </fieldset>
      <p role="status" className="text-sm leading-6 text-[var(--color-muted)]">{storageIssue && locationSaved ? "Your location could not be saved in this browser. Please use the storage recovery message before continuing." : locationMessage}</p>
    </form>
  );
}
