import { buildTodaysFlow, DailyProfileInput } from "@/lib/flow-engine";

export type HistoricalBiologicalContext = {
  capturedAt: string;
  timeZone: string | null;
  latitude: number | null;
  longitude: number | null;
  wakeAt: string | null;
  morningLightAt: string | null;
  sunriseAt: string | null;
  sunsetAt: string | null;
  targetSleepAt: string | null;
};

function iso(date?: Date | null) {
  return date && Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60000);
}

/**
 * Captures the biological context that existed when evidence was created.
 * This is a snapshot, not a second timing engine. Future interpretation should
 * prefer stored historical context over reconstructing the past from today's
 * profile. Missing values remain unknown rather than being invented.
 */
export function captureHistoricalBiologicalContext(input: {
  at: string | Date;
  profile?: DailyProfileInput | null;
}): HistoricalBiologicalContext {
  const at = input.at instanceof Date ? input.at : new Date(input.at);
  const capturedAt = Number.isFinite(at.getTime()) ? at : new Date();
  const profile = input.profile ?? {};
  const flow = buildTodaysFlow({ date: capturedAt, now: capturedAt, profile });
  const byId = new Map(flow.events.map((event) => [event.id, event]));
  const firstMeal = byId.get("first_meal");
  const morningLight = byId.get("morning_light");
  const sleepWindow = byId.get("sleep_window");

  return {
    capturedAt: capturedAt.toISOString(),
    timeZone: profile.timeZone ?? null,
    latitude: profile.latitude ?? null,
    longitude: profile.longitude ?? null,
    wakeAt: firstMeal ? iso(addMinutes(firstMeal.start, -30)) : null,
    morningLightAt: iso(morningLight?.start),
    sunriseAt: iso(flow.solar?.sunrise),
    sunsetAt: iso(flow.solar?.sunset),
    targetSleepAt: sleepWindow ? iso(addMinutes(sleepWindow.start, 45)) : null,
  };
}

export function historicalContextToFoodAnchors(context: HistoricalBiologicalContext) {
  return {
    wakeAt: context.wakeAt,
    morningLightAt: context.morningLightAt,
    sunsetAt: context.sunsetAt,
    darknessAt: null,
    targetSleepAt: context.targetSleepAt,
  };
}
