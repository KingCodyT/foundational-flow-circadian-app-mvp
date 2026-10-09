import type { DailyEventState } from "@/types/circadian";
import { scheduleDateKey, shiftDateKey } from "./schedule-time";

/** Display-only observations of explicit responses, never sleep outcomes or coaching scores. */
export function profileProgress(records: Record<string, DailyEventState> | null | undefined, now: Date, timeZone?: string | null): string[] {
  const today = scheduleDateKey(now, timeZone);
  const recentDates = Array.from({ length: 7 }, (_, index) => shiftDateKey(today, -index));
  const observations = [
    { ids: ["dim_house", "digital_sunset"], action: "reducing evening light" },
    { ids: ["morning_light"], action: "getting morning light" },
    { ids: ["sleep_window"], action: "starting your bedtime routine" },
    { ids: ["movement"], action: "taking a movement break" },
    { ids: ["midday_light"], action: "taking a daylight break" },
  ];
  return observations.flatMap(({ ids, action }) => {
    const days = recentDates.filter(date => ids.some(id => {
      const record = records?.[date]?.[id];
      const at = record ? Date.parse(record.at) : NaN;
      return record?.status === "completed" && Number.isFinite(at) && at <= now.getTime() &&
        scheduleDateKey(new Date(at), timeZone) === date;
    })).length;
    return days >= 5 ? [`You reported ${action} on ${days} of the past 7 days.`] : [];
  }).slice(0, 2);
}
