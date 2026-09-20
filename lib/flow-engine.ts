import { getSolarTimes, SolarTimes } from "./solar";
import { scheduleTime, scheduleDateKey, shiftDateKey } from "./schedule-time";

export type FlowEvent = {
  id: string;
  name: string;
  start: Date;
  end?: Date;
  status: "upcoming" | "current" | "completed" | "missed" | "skipped";
  guidance: string;
  why?: string;
  source?: "schedule" | "suggestion" | "solar";
};

export type DailyProfileInput = {
  wakeTime?: string | null; // 'HH:MM'
  lastMealTime?: string | null;
  targetBedtime?: string | null; // 'HH:MM'
  timeZone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

function addMinutes(d: Date, mins: number) {
  return new Date(d.getTime() + mins * 60000);
}

function statusFor(now: Date, start: Date, end?: Date) {
  if (end) {
    if (now < start) return "upcoming";
    if (now >= start && now <= end) return "current";
    return "completed";
  }
  // instantaneous: consider 60-minute window
  const windowEnd = addMinutes(start, 60);
  if (now < start) return "upcoming";
  if (now >= start && now <= windowEnd) return "current";
  return "completed";
}

export function buildTodaysFlow(opts: { date?: Date; now?: Date; profile?: DailyProfileInput; participationLevel?: string | null; eventStateForDate?: Record<string, { status: string; at: string }>; }): { events: FlowEvent[]; next?: FlowEvent; solar: SolarTimes | null; locationAvailable: boolean; activeEvent?: FlowEvent | undefined; warnings: string[]; progress: { completed: number; total: number; percent: number } } {
  const now = opts.now ?? new Date();
  const date = opts.date ?? now;
  const profile = opts.profile ?? {};

  const key = scheduleDateKey(date, profile.timeZone);
  const wake = scheduleTime(key, profile.wakeTime, profile.timeZone) ?? scheduleTime(key, "07:00", profile.timeZone)!;
  let bedtime = scheduleTime(key, profile.targetBedtime, profile.timeZone) ?? addMinutes(wake, 15 * 60);
  if (bedtime <= wake) bedtime = scheduleTime(shiftDateKey(key, 1), profile.targetBedtime, profile.timeZone)!;
  const warnings: string[] = [];
  const awakeMinutes = (bedtime.getTime() - wake.getTime()) / 60000;
  if (awakeMinutes < 8 * 60 || awakeMinutes > 20 * 60) {
    warnings.push("Your wake time and bedtime leave an unusually short or long waking day. Review your schedule; your entered times have been kept.");
  }
  const solar = getSolarTimes(wake, profile.latitude, profile.longitude, profile.timeZone);
  const locationAvailable = solar.solarNoon != null;
  const events: FlowEvent[] = [];
  const add = (id: string, name: string, start: Date, end: Date | undefined, guidance: string, source: FlowEvent["source"] = "suggestion") => {
    events.push({ id, name, start, end, guidance, why: guidance, source, status: statusFor(now, start, end) });
  };
  const earlier = (a: Date, b: Date) => a < b ? a : b;
  const later = (a: Date, b: Date) => a > b ? a : b;
  const sleepStart = addMinutes(bedtime, -45);
  const dimStart = later(wake, addMinutes(bedtime, -120));

  // Daylight is an environmental constraint, never a replacement for sleep or meals.
  // Consider both calendar dates for schedules that cross midnight.
  const daylight = [solar, getSolarTimes(scheduleTime(shiftDateKey(key, 1), "12:00", profile.timeZone)!, profile.latitude, profile.longitude, profile.timeZone)]
    .flatMap(day => {
      if (!day.sunrise || !day.sunset) return [];
      const start = later(wake, day.sunrise);
      const end = earlier(dimStart, day.sunset);
      return start < end ? [{ start, end, noon: day.solarNoon! }] : [];
    });
  const firstDaylight = daylight[0];
  if (firstDaylight || !locationAvailable || solar.dayLengthMinutes === 1440) {
    const start = firstDaylight?.start ?? wake;
    const end = earlier(addMinutes(start, 90), firstDaylight?.end ?? dimStart);
    if (end > start) add("morning_light", "Morning Light", start, end,
      firstDaylight && start > wake ? "Your day begins before sunrise. Outdoor light is scheduled when daylight is available." : "Get light after waking to support your daily rhythm.");
  }

  let enteredMeal = scheduleTime(key, profile.lastMealTime, profile.timeZone);
  if (enteredMeal && enteredMeal < wake) enteredMeal = scheduleTime(shiftDateKey(key, 1), profile.lastMealTime, profile.timeZone);
  const lastMeal = enteredMeal ?? later(wake, addMinutes(bedtime, -180));
  const mealConflict = lastMeal < wake || lastMeal >= bedtime;
  if (mealConflict) warnings.push("Your entered last meal falls outside your waking window. Review the meal or sleep time; neither has been moved.");
  const firstMealStart = addMinutes(wake, 30);
  const firstMealEnd = earlier(addMinutes(wake, 180), earlier(lastMeal, sleepStart));
  if (firstMealEnd > firstMealStart) add("first_meal", "First-meal reference", firstMealStart, firstMealEnd,
    "Internal reference only. Wake time alone does not justify a first-meal recommendation; habits, morning light, goals, and constraints are still needed.");

  const movementStart = addMinutes(wake, 120);
  const movementEnd = earlier(addMinutes(movementStart, 60), dimStart);
  if (movementEnd > movementStart) add("movement", "Movement", movementStart, movementEnd,
    "An optional movement window during your waking day.");

  const lightDay = daylight.find(day => day.noon >= day.start && day.noon < day.end) ?? firstDaylight;
  if (lightDay || !locationAvailable || solar.dayLengthMinutes === 1440) {
    const lower = later(addMinutes(wake, 180), lightDay?.start ?? wake);
    const upper = earlier(dimStart, lightDay?.end ?? dimStart);
    const center = lightDay?.noon ?? addMinutes(wake, 360);
    const start = later(lower, addMinutes(center, -45));
    const end = earlier(upper, addMinutes(center, 45));
    if (end > start) add("midday_light", "Midday Light", start, end,
      lightDay ? "Daylight near solar noon, within your waking schedule." : "A daytime light window based on your wake time; solar timing is unavailable.");
  }

  add("last_meal", enteredMeal ? "Your usual last meal" : "Suggested last meal", lastMeal, undefined,
    enteredMeal
      ? "Uses the last-meal time you entered on Schedule." + (mealConflict ? " This falls outside your waking window; review your schedule." : "")
      : "No last-meal time is saved. This suggestion is three hours before your bedtime.",
    enteredMeal ? "schedule" : "suggestion");

  if (solar.sunset) add("sunset", "Sunset", solar.sunset, undefined,
    "Local sunset calculated from your location. Your bedtime stays anchored to your schedule.", "solar");
  if (dimStart < sleepStart) add("dim_house", "Dim the House", dimStart, earlier(addMinutes(dimStart, 30), sleepStart),
    "Reduce bright lighting about two hours before your entered bedtime.");
  const digitalStart = later(wake, addMinutes(bedtime, -60));
  if (digitalStart < bedtime) add("digital_sunset", "Digital Sunset", digitalStart, bedtime,
    "Wind down screen use in the hour before your entered bedtime.");
  add("sleep_window", "Sleep Window", sleepStart, addMinutes(bedtime, 45),
    profile.targetBedtime ? "A 90-minute window centered on your entered bedtime. Sunrise and sunset do not move your sleep schedule." : "No bedtime is saved. This suggested sleep window is based on 15 hours after waking.",
    profile.targetBedtime ? "schedule" : "suggestion");

  events.sort((a, b) => a.start.getTime() - b.start.getTime());

  // Apply persisted event state for the date if provided and compute final statuses
  const persisted = opts.eventStateForDate ?? {};

  let completedCount = 0;
  let skippedCount = 0;
  let missedCount = 0;

  const finalized = events.map((ev) => {
    const rec = persisted[ev.id];
    let finalStatus: "upcoming" | "current" | "completed" | "missed" | "skipped" = ev.status as any;

    if (rec) {
      if (rec.status === "completed") {
        finalStatus = "completed";
      } else if (rec.status === "skipped") {
        finalStatus = "skipped";
      } else if (rec.status === "missed") {
        finalStatus = "missed";
      } else {
        finalStatus = ev.status as any;
      }
    } else {
      // if the computed status is 'completed' (i.e. now is past the event window)
      // but there's no persisted record, mark as 'missed'
      if (ev.status === "completed") {
        finalStatus = "missed";
      } else {
        finalStatus = ev.status as any;
      }
    }

    if (finalStatus === "completed") completedCount++;
    if (finalStatus === "skipped") skippedCount++;
    if (finalStatus === "missed") missedCount++;

    return { ...ev, status: finalStatus };
  });

  // Determine active event: only an event that is truly actionable now should be active (i.e. status === 'current')
  // Exclude any events that are in terminal states (completed, skipped, missed) by relying on finalized.status.
  const activeEvent = finalized.find((e) => e.status === "current");

  // Determine next event: the next valid future event (status === 'upcoming'), excluding terminal states
  const nextEvent = finalized.find((e) => e.status === "upcoming");

  const total = finalized.length;
  const terminalCount = completedCount + skippedCount + missedCount;
  const percent = total === 0 ? 100 : Math.round((terminalCount / total) * 100);

  return {
    events: finalized,
    warnings,
    next: nextEvent ?? undefined,
    solar,
    locationAvailable,
    activeEvent: activeEvent ?? undefined,
    progress: { completed: terminalCount, total, percent },
  };
}
