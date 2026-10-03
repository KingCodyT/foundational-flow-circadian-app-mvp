import type { DailyProfile } from "@/types/circadian";
import type { FlowEvent } from "../flow-engine";
import { scheduleDateKey, scheduleTime, shiftDateKey } from "../schedule-time";

export type FoodTimingPlan = {
  currentPattern: { lastMealAt: Date | null; source: "reported" | "unknown" };
  biologicalDirection: { lastMealAt: Date | null; reason: string };
  today: { kind: "OBSERVE" | "KEEP" | "SMALL_STEP"; at: Date | null; explanation: string };
};

/** Direction is internal context, never a ready-made prescription. Unknown
 * breakfast habits, goals, or constraints do not justify wake + 30 coaching.
 */
export function buildFoodTimingPlan(profile: DailyProfile | null, events: FlowEvent[], now: Date): FoodTimingPlan {
  const sleep = events.find(event => event.id === "sleep_window");
  const wake = scheduleTime(scheduleDateKey(now, profile?.timeZone), profile?.wakeTime, profile?.timeZone);
  let meal = scheduleTime(scheduleDateKey(now, profile?.timeZone), profile?.lastMealTime, profile?.timeZone);
  if (wake && meal && meal < wake) meal = scheduleTime(shiftDateKey(scheduleDateKey(now, profile?.timeZone), 1), profile?.lastMealTime, profile?.timeZone);
  const bed = sleep ? new Date(sleep.start.getTime() + 45 * 60000) : null;
  const sunset = events.find(event => event.id === "sunset")?.start;
  // Sunset is contextual direction only; never diagnose lateness from sunset alone.
  const direction = bed && wake ? new Date(Math.max(wake.getTime() + 6 * 3600000,
    Math.min(bed.getTime() - 180 * 60000, sunset?.getTime() ?? Infinity))) : null;
  const result: FoodTimingPlan = {
    currentPattern: { lastMealAt: meal, source: meal ? "reported" : "unknown" },
    biologicalDirection: { lastMealAt: direction, reason: "Internal daylight and sleep context; not today's instruction." },
    today: { kind: "OBSERVE", at: null, explanation: "Keep your usual routine while we learn your meal pattern. Waking early does not mean you need to eat early." },
  };
  const constrained = profile?.workStructure === "shift" || profile?.workStructure === "overnight" || profile?.workStructure === "flexible" || Boolean(profile?.realityNotes?.trim()) || profile?.upcomingTravel;
  if (constrained) {
    result.today.explanation = "Keep a workable meal time for your schedule. Constraints are context, not a missed target.";
    return result;
  }
  if (!meal || !wake || !bed || !direction || meal < wake || meal >= bed || profile?.foodTimingGoal !== "earlier_last_meal") return result;
  // Round upward to a human quarter-hour so the change never exceeds 30 minutes.
  const wanted = new Date(Math.max(meal.getTime() - 30 * 60000, direction.getTime()));
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: profile.timeZone || undefined, hourCycle: "h23", hour: "2-digit", minute: "2-digit" }).formatToParts(wanted);
  const minute = Number(parts.find(part => part.type === "minute")?.value);
  const rounded = new Date(wanted.getTime() + ((15 - minute % 15) % 15) * 60000);
  rounded.setSeconds(0, 0);
  result.today = rounded < meal
    ? { kind: "SMALL_STEP", at: rounded, explanation: "If it fits today, try your last meal up to 30 minutes earlier. A small change is enough." }
    : { kind: "KEEP", at: meal, explanation: "Keep your usual last-meal time today. There is no useful earlier step to add." };
  return result;
}
