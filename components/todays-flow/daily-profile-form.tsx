"use client";

import { useEffect, useState } from "react";
import { useCircadian } from "@/components/circadian-provider";

export default function DailyProfileForm() {
  const { dailyProfile, setDailyProfile } = useCircadian();
  const [wakeTime, setWakeTime] = useState(dailyProfile?.wakeTime ?? "07:00");
  const [targetBedtime, setTargetBedtime] = useState(dailyProfile?.targetBedtime ?? "22:30");
  const [permissionGranted, setPermissionGranted] = useState(dailyProfile?.locationPermissionGranted ?? false);
  const [saved, setSaved] = useState<boolean>(false);

  // Sync local fields when provider dailyProfile changes (e.g., on hydration or external updates)
  useEffect(() => {
    if (!dailyProfile) {
      setSaved(false);
      return;
    }

    setWakeTime(dailyProfile.wakeTime ?? "07:00");
    setTargetBedtime(dailyProfile.targetBedtime ?? "22:30");
    setPermissionGranted(Boolean(dailyProfile.locationPermissionGranted));
    setSaved(
      dailyProfile.wakeTime === (dailyProfile.wakeTime ?? wakeTime) &&
        dailyProfile.targetBedtime === (dailyProfile.targetBedtime ?? targetBedtime) &&
        Boolean(dailyProfile.locationPermissionGranted) === Boolean(dailyProfile.locationPermissionGranted),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dailyProfile]);

  // Compute equality vs persisted profile
  const matchesPersisted = () => {
    const p = dailyProfile;
    return Boolean(
      p &&
        p.wakeTime === wakeTime &&
        p.targetBedtime === targetBedtime &&
        Boolean(p.locationPermissionGranted) === Boolean(permissionGranted),
    );
  };

  useEffect(() => {
    setSaved(matchesPersisted());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wakeTime, targetBedtime, permissionGranted]);

  const save = () => {
    setDailyProfile({
      wakeTime,
      targetBedtime,
      locationPermissionGranted: permissionGranted,
      latitude: dailyProfile?.latitude ?? null,
      longitude: dailyProfile?.longitude ?? null,
    });
    setSaved(true);
  };

  const requestLocation = async () => {
    if (!navigator?.geolocation) {
      alert("Geolocation not available in this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition((pos) => {
      setPermissionGranted(true);
      setDailyProfile({
        wakeTime,
        targetBedtime,
        locationPermissionGranted: true,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      setSaved(true);
    }, () => {
      setPermissionGranted(false);
      alert("Location permission denied or unavailable.");
    });
  };

  return (
    <section className="space-y-4">
      <h3 className="text-lg font-semibold">Daily profile</h3>

      <label className="block">
        <span className="text-sm text-[var(--color-muted)]">Typical wake time</span>
        <input className="mt-2 rounded-md border px-3 py-2" type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} />
      </label>

      <label className="block">
        <span className="text-sm text-[var(--color-muted)]">Target bedtime</span>
        <input className="mt-2 rounded-md border px-3 py-2" type="time" value={targetBedtime} onChange={(e) => setTargetBedtime(e.target.value)} />
      </label>

      <div className="space-y-2">
        <p className="text-sm text-[var(--color-muted)]">Location (optional)</p>
        <div className="flex items-center gap-3">
          <button onClick={requestLocation} className="rounded-full border px-3 py-2 text-sm">Allow location</button>
          <span className="text-sm">{permissionGranted ? "Granted" : "Not granted"}</span>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={save} className="inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm">{saved ? "Saved ✓" : "Save profile"}</button>
      </div>
    </section>
  );
}
