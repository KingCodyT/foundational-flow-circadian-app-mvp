import { getSolarTimes, SolarTimes } from "./solar";

export type FlowEvent = {
  id: string;
  name: string;
  start: Date;
  end?: Date;
  status: "upcoming" | "current" | "completed" | "missed" | "skipped";
  guidance: string;
  why?: string;
};

export type DailyProfileInput = {
  wakeTime?: string | null; // 'HH:MM'
  targetBedtime?: string | null; // 'HH:MM'
  latitude?: number | null;
  longitude?: number | null;
};

function parseTimeToDate(baseDate: Date, time?: string | null) {
  if (!time || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const [hh, mm] = time.split(":").map(Number);
  const d = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), hh, mm, 0);
  return d;
}

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

export function buildTodaysFlow(opts: { date?: Date; now?: Date; profile?: DailyProfileInput; participationLevel?: string | null; eventStateForDate?: Record<string, { status: string; at: string }>; }): { events: FlowEvent[]; next?: FlowEvent; solar: SolarTimes | null; locationAvailable: boolean; activeEvent?: FlowEvent | undefined; progress: { completed: number; total: number; percent: number } } {
  const now = opts.now ?? new Date();
  const date = opts.date ?? now;
  const profile = opts.profile ?? {};

  const solar = getSolarTimes(date, profile.latitude ?? null, profile.longitude ?? null);
  const locationAvailable = solar.solarNoon != null;

  // derive wake/bedtime
  const wake = parseTimeToDate(date, profile.wakeTime) ?? new Date(date.getFullYear(), date.getMonth(), date.getDate(), 7); // default 7:00
  const bedtime = parseTimeToDate(date, profile.targetBedtime) ?? addMinutes(wake, 15 * 60); // default 22:00-ish

  // rules
  const events: FlowEvent[] = [];

  // Morning Light: shortly after wake or sunrise
  let morningStart = wake;
  if (locationAvailable && solar.sunrise && solar.sunrise > wake) {
    // if sunrise is after wake, prefer sunrise within 90 minutes
    const candidate = solar.sunrise;
    morningStart = candidate < addMinutes(wake, 90) ? candidate : wake;
  }
  const morningEnd = addMinutes(morningStart, 90);
  events.push({
    id: "morning_light",
    name: "Morning Light",
    start: morningStart,
    end: morningEnd,
    status: statusFor(now, morningStart, morningEnd),
    guidance: "Expose yourself to bright light soon after waking to anchor circadian rhythms.",
    why: "Strong morning light helps set your internal clock for the day.",
  });

  // First Meal: 30-180 minutes after wake
  const firstMealStart = addMinutes(wake, 30);
  const firstMealEnd = addMinutes(wake, 180);
  events.push({
    id: "first_meal",
    name: "First Meal",
    start: firstMealStart,
    end: firstMealEnd,
    status: statusFor(now, firstMealStart, firstMealEnd),
    guidance: "Aim for your first meal in the morning window to support metabolic timing.",
    why: "Timing meals consistently helps stabilize energy and circadian signals.",
  });

  // Midday Light: centered around solar noon if available, else midday after wake
  let middayCenter = addMinutes(wake, 6 * 60);
  if (locationAvailable && solar.solarNoon) middayCenter = solar.solarNoon;
  const middayStart = addMinutes(middayCenter, -45);
  const middayEnd = addMinutes(middayCenter, 45);
  events.push({
    id: "midday_light",
    name: "Midday Light",
    start: middayStart,
    end: middayEnd,
    status: statusFor(now, middayStart, middayEnd),
    guidance: "Get bright light around solar noon to maintain daytime signaling.",
    why: "Daytime light reinforces alertness and strengthens day/night contrast.",
  });

  // Movement: mid-morning or after a meal
  const movementStart = addMinutes(firstMealStart, 90);
  const movementEnd = addMinutes(movementStart, 60);
  events.push({
    id: "movement",
    name: "Movement",
    start: movementStart,
    end: movementEnd,
    status: statusFor(now, movementStart, movementEnd),
    guidance: "Short bout of movement or light exercise during daytime.",
    why: "Activity supports metabolism and daytime alertness.",
  });

  // Last Meal: approx 3 hours before bedtime
  const lastMealTime = addMinutes(bedtime, -180);
  const lastMealEnd = addMinutes(lastMealTime, 60);
  events.push({
    id: "last_meal",
    name: "Last Meal",
    start: lastMealTime,
    end: lastMealEnd,
    status: statusFor(now, lastMealTime, lastMealEnd),
    guidance: "Finish meals a few hours before bed to improve sleep quality.",
    why: "Allowing digestion before sleep supports sleep onset and metabolic health.",
  });

  // Sunset: actual
  if (locationAvailable && solar.sunset) {
    const s = solar.sunset;
    events.push({
      id: "sunset",
      name: "Sunset",
      start: s,
      status: statusFor(now, s),
      guidance: "Note the time of sunset and begin evening simplification.",
      why: "Evening darkness signals the body to prepare for sleep.",
    });
  }

  // Dim the House: ~2 hours before bedtime
  const dimStart = addMinutes(bedtime, -120);
  events.push({
    id: "dim_house",
    name: "Dim the House",
    start: dimStart,
    end: addMinutes(dimStart, 30),
    status: statusFor(now, dimStart, addMinutes(dimStart, 30)),
    guidance: "Reduce bright lights and switch to warm lighting.",
    why: "Lower light in the evening reduces circadian disruption.",
  });

  // Digital Sunset: ~1 hour before bedtime
  const digitalStart = addMinutes(bedtime, -60);
  events.push({
    id: "digital_sunset",
    name: "Digital Sunset",
    start: digitalStart,
    end: addMinutes(digitalStart, 60),
    status: statusFor(now, digitalStart, addMinutes(digitalStart, 60)),
    guidance: "Limit screens and bright devices one hour before bed.",
    why: "Reducing blue light helps melatonin onset and sleep quality.",
  });

  // Sleep Window: centered on bedtime (±45 minutes)
  const sleepStart = addMinutes(bedtime, -45);
  const sleepEnd = addMinutes(bedtime, 45);
  events.push({
    id: "sleep_window",
    name: "Sleep Window",
    start: sleepStart,
    end: sleepEnd,
    status: statusFor(now, sleepStart, sleepEnd),
    guidance: "Aim to be asleep within this window for best alignment.",
    why: "Consistent sleep timing supports circadian stability.",
  });

  // sort events by start time
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
    next: nextEvent ?? undefined,
    solar,
    locationAvailable,
    activeEvent: activeEvent ?? undefined,
    progress: { completed: terminalCount, total, percent },
  };
}
