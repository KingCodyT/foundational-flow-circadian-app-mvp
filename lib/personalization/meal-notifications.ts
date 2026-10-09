import type { DailyProfile } from "@/types/circadian";
import type { ScheduledNotificationRecord } from "./notification-runtime";
import { scheduleDateKey, scheduleTime, shiftDateKey } from "../schedule-time";
import { mealNudge } from "./meal-nudge";

export function planMealNotifications(profile: DailyProfile | null, now: Date): ScheduledNotificationRecord[] {
  if (!profile?.timeZone) return [];
  try {
    const today = scheduleDateKey(now, profile.timeZone);
    const result: ScheduledNotificationRecord[] = [];
    for (let offset = -1; offset <= 7 && result.length < 7; offset++) {
      const date = shiftDateKey(today, offset);
      const meal = scheduleTime(date, profile.lastMealTime, profile.timeZone);
      if (!meal) continue;
      const cue = mealNudge(profile, meal);
      if (!cue || cue.end <= +now) continue;
      const dateKey = cue.id.slice(cue.id.lastIndexOf(":") + 1);
      result.push({id:`meal:${profile.timeZone}:${cue.start}`, eventId:"meal_suggestion", targetSignalId:null, channel:"NOTIFICATION",
        title:"Thinking about your next meal?", body:`Your usual last meal is around ${cue.time}. Explore meal ideas when it suits you. No logging needed.`,
        scheduledFor:new Date(cue.start).toISOString(), validUntil:new Date(cue.end).toISOString(), timeZone:profile.timeZone, dateKey});
    }
    return result;
  } catch { return []; }
}
