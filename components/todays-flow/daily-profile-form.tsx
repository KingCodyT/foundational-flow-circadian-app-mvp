"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useCircadian } from "@/components/circadian-provider";
import { getRuntimeTimeZone } from "@/lib/live-clock";
import { hasValidCoordinates } from "@/lib/solar";

export default function DailyProfileForm() {
  const { dailyProfile, setDailyProfile } = useCircadian();
  const savedWakeTime = dailyProfile?.wakeTime ?? "07:00";
  const savedBedtime = dailyProfile?.targetBedtime ?? "22:00";
  const savedTimeZone = dailyProfile?.timeZone ?? getRuntimeTimeZone() ?? "UTC";
  const [wakeTime, setWakeTime] = useState(savedWakeTime);
  const [targetBedtime, setTargetBedtime] = useState(savedBedtime);
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const requestId = useRef(0);

  // Location-only updates must not discard unsaved time edits.
  useEffect(() => {
    setWakeTime(savedWakeTime);
    setTargetBedtime(savedBedtime);
  }, [savedWakeTime, savedBedtime]);
  useEffect(() => () => { requestId.current += 1; }, []);

  const hasLocation = Boolean(dailyProfile?.locationPermissionGranted &&
    hasValidCoordinates(dailyProfile.latitude, dailyProfile.longitude));
  const saved = dailyProfile?.wakeTime === wakeTime &&
    dailyProfile?.targetBedtime === targetBedtime;

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(wakeTime) ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(targetBedtime)) return;
    setDailyProfile({
      ...dailyProfile,
      wakeTime,
      targetBedtime,
      locationPermissionGranted: hasLocation,
    });
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationMessage("Location is unavailable in this browser. You can still save your times.");
      return;
    }
    const id = ++requestId.current;
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
        wakeTime: dailyProfile?.wakeTime ?? null,
        targetBedtime: dailyProfile?.targetBedtime ?? null,
        timeZone: dailyProfile?.timeZone ?? savedTimeZone,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        locationPermissionGranted: true,
      });
      setLocationMessage("Location saved for your solar timing.");
    }, (error) => {
      if (id !== requestId.current) return;
      setLocating(false);
      const reason = error.code === 1 ? "Location access was denied."
        : error.code === 3 ? "The location request timed out." : "Your location could not be found.";
      setLocationMessage(`${reason} ${hasLocation ? "Your saved location is unchanged." : "You can still save your times and use the app."}`);
    }, { timeout: 10000, maximumAge: 300000, enableHighAccuracy: false });
  };

  const removeLocation = () => {
    requestId.current += 1;
    setDailyProfile({
      wakeTime: dailyProfile?.wakeTime ?? null,
      targetBedtime: dailyProfile?.targetBedtime ?? null,
      timeZone: dailyProfile?.timeZone ?? savedTimeZone,
      latitude: null,
      longitude: null,
      locationPermissionGranted: false,
    });
    setLocationMessage("Saved location removed. Your times and assessment are unchanged.");
  };

  return (
    <form onSubmit={save} className="space-y-5">
      <h3 className="text-lg font-semibold">Daily profile</h3>
      <fieldset disabled={locating} className="space-y-5 disabled:opacity-70">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm text-[var(--color-muted)]">Typical wake time</span>
            <input required className="mt-2 block w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2" type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} />
          </label>
          <label className="block">
            <span className="text-sm text-[var(--color-muted)]">Target bedtime</span>
            <input required className="mt-2 block w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2" type="time" value={targetBedtime} onChange={(e) => setTargetBedtime(e.target.value)} />
          </label>
        </div>
        <button type="submit" disabled={saved} className="rounded-full border border-[var(--color-line)] bg-white px-5 py-2.5 text-sm font-semibold disabled:opacity-60">{saved ? "Profile saved ✓" : "Save profile"}</button>
        <div className="space-y-3">
          <p className="text-sm font-semibold">Profile timezone</p>
          <p className="text-sm leading-6 text-[var(--color-muted)]">{savedTimeZone}</p>
          <p className="text-sm font-semibold">Location (optional)</p>
          <p className="text-sm leading-6 text-[var(--color-muted)]">{hasLocation ? "A location is saved for sunrise and sunset timing." : "Use your location to personalize sunrise and sunset timing. It stays in this browser."}</p>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={requestLocation} className="rounded-full border border-[var(--color-line)] bg-white px-4 py-2 text-sm">{locating ? "Finding location…" : hasLocation ? "Update location" : "Use my location"}</button>
            {hasLocation ? <button type="button" onClick={removeLocation} className="rounded-full border border-[var(--color-line)] px-4 py-2 text-sm">Remove location</button> : null}
          </div>
        </div>
      </fieldset>
      <p role="status" className="text-sm leading-6 text-[var(--color-muted)]">{locationMessage}</p>
    </form>
  );
}
