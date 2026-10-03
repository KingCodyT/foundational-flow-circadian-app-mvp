import type { DailyProfile } from "@/types/circadian";
import { scheduleDateKey, scheduleTime, shiftDateKey } from "@/lib/schedule-time";

// A planning cue around the user's own meal time, not an optimal biological window.
export function mealNudge(profile: DailyProfile | null, now: Date) {
  if (!profile?.timeZone || profile.workStructure === "shift" || profile.workStructure === "overnight") return null;
  try {
    const today = scheduleDateKey(now, profile.timeZone);
    for (const date of [shiftDateKey(today, -1), today]) {
      const wake = scheduleTime(date, profile.wakeTime, profile.timeZone);
      let bed = scheduleTime(date, profile.targetBedtime, profile.timeZone);
      let meal = scheduleTime(date, profile.lastMealTime, profile.timeZone);
      if (!wake || !bed || !meal || +wake === +bed) continue;
      if (bed <= wake) bed = scheduleTime(shiftDateKey(date, 1), profile.targetBedtime, profile.timeZone)!;
      if (meal < wake) meal = scheduleTime(shiftDateKey(date, 1), profile.lastMealTime, profile.timeZone)!;
      if (meal >= bed) continue;
      const start = Math.max(+wake, +meal - 30 * 60000);
      const end = Math.min(+bed, +meal + 60 * 60000);
      if (+now < start || +now >= end) continue;
      return { start, id: `${profile.timeZone}:${date}`, end, time: new Intl.DateTimeFormat("en-US", {timeZone: profile.timeZone, hour: "numeric", minute: "2-digit"}).format(meal) };
    }
  } catch { /* Missing or invalid schedule: retain general meal ideas. */ }
  return null;
}
