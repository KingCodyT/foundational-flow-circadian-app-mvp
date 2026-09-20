import { buildTodaysFlow } from "../flow-engine";
import { scheduleDateKey, scheduleTime, shiftDateKey } from "../schedule-time";
import type { DailyEventState, DailyProfile } from "@/types/circadian";
import type { ScheduledNotificationRecord } from "./notification-runtime";

export type FirstRunGuidance = {
  eventId: string; dateKey: string; start: string; end: string;
  action: string; reason: string; focus: string; profileKey: string;
};
export type FirstRunHandoff = { guidance: FirstRunGuidance | null };

export const guidanceProfileKey = (profile: DailyProfile) => JSON.stringify([
  profile.wakeTime, profile.targetBedtime, profile.timeZone,
  profile.locationPermissionGranted, profile.latitude, profile.longitude,
  profile.workStructure, profile.realityNotes,
]);
export const guidanceTime = (at: string | Date, zone?: string | null) =>
  new Intl.DateTimeFormat("en-US", { timeZone: zone || undefined, hour: "numeric", minute: "2-digit" }).format(new Date(at));

/** Schedule-based orientation, not a diagnosis or a new coaching target. */
export function selectFirstRunGuidance(profile: DailyProfile, now: Date,
  records: Record<string, DailyEventState> | null = null): FirstRunGuidance | null {
  if (!profile.wakeTime || !profile.targetBedtime) return null;
  const today = scheduleDateKey(now, profile.timeZone);
  const candidates: FirstRunGuidance[] = [];
  // Include yesterday's waking day for overnight schedules, then tomorrow.
  for (const offset of [-1, 0, 1]) {
    const key = shiftDateKey(today, offset);
    const date = scheduleTime(key, "12:00", profile.timeZone)!;
    const { events } = buildTodaysFlow({ date, now, profile: {
      ...profile, latitude: profile.locationPermissionGranted ? profile.latitude : null,
      longitude: profile.locationPermissionGranted ? profile.longitude : null,
    } });
    const bedtime = events.find(e => e.id === "sleep_window")!;
    const bedAt = new Date(bedtime.start.getTime() + 45 * 60000);
    for (const event of events) {
      if (!["morning_light", "dim_house", "digital_sunset", "sleep_window"].includes(event.id)) continue;
      if (event.start < now) continue; // never relabel a missed opportunity as upcoming
      const dateKey = scheduleDateKey(event.start, profile.timeZone);
      const record = records?.[dateKey]?.[event.id];
      if (record && ["completed", "skipped"].includes(record.status)) continue;
      if (["dim_house", "digital_sunset"].includes(event.id) &&
        ["dim_house", "digital_sunset", "sunset"].some(id => ["completed", "skipped"].includes(records?.[dateKey]?.[id]?.status ?? ""))) continue;
      const morning = event.id === "morning_light";
      const sleep = event.id === "sleep_window";
      const constrained = Boolean(profile.realityNotes?.trim()) || ["shift", "overnight"].includes(profile.workStructure ?? "");
      candidates.push({ eventId: event.id, dateKey, start: event.start.toISOString(), end: event.end!.toISOString(),
        action: morning ? "Get some daylight after waking, when it’s available" : sleep ? "Begin your usual bedtime routine" :
          constrained ? "Reduce unnecessary bright light and screens where your responsibilities allow" : "Begin reducing bright light and unnecessary screen exposure",
        reason: morning ? `This follows your ${guidanceTime(scheduleTime(key, profile.wakeTime, profile.timeZone)!, profile.timeZone)} wake time${profile.locationPermissionGranted ? " and local daylight" : ""}.` :
          `This supports your ${guidanceTime(bedAt, profile.timeZone)} bedtime.`,
        focus: morning ? "Light after your wake time" : "Preparing for your bedtime",
        profileKey: guidanceProfileKey(profile),
      });
    }
  }
  return candidates.sort((a, b) => Date.parse(a.start) - Date.parse(b.start))[0] ?? null;
}

export function firstRunNotification(guidance: FirstRunGuidance): ScheduledNotificationRecord {
  return { id: `first-run:${guidance.eventId}:${guidance.start}`, eventId: guidance.eventId,
    targetSignalId: null, channel: "NOTIFICATION", title: guidance.action,
    body: guidance.reason, scheduledFor: guidance.start, validUntil: guidance.end };
}
