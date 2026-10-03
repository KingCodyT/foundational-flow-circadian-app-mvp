import type { DailyProfile } from "@/types/circadian";

export type FoodGuidancePhase = "early" | "daytime" | "evening" | "general";
const minutes = (value?: string | null) => {
  if (!value || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
};

// These are presentation bands around a saved schedule, not estimates of circadian phase.
export function foodGuidancePhase(profile: DailyProfile | null, now: Date): FoodGuidancePhase {
  if (!profile?.timeZone || profile.workStructure === "shift" || profile.workStructure === "overnight") return "general";
  const wake = minutes(profile.wakeTime), bed = minutes(profile.targetBedtime);
  if (wake === null || bed === null) return "general";
  let parts: Intl.DateTimeFormatPart[];
  try { parts = new Intl.DateTimeFormat("en-GB", { timeZone: profile.timeZone, hourCycle: "h23", hour: "2-digit", minute: "2-digit" }).formatToParts(now); }
  catch { return "general"; }
  const current = Number(parts.find(p => p.type === "hour")?.value) * 60 + Number(parts.find(p => p.type === "minute")?.value);
  const awakeSpan = (bed - wake + 1440) % 1440;
  const sinceWake = (current - wake + 1440) % 1440;
  if (!awakeSpan || sinceWake >= awakeSpan) return "general";
  if (awakeSpan - sinceWake <= 180) return "evening";
  return sinceWake < 240 ? "early" : "daytime";
}
