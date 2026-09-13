import { CircadianFoodTimingSnapshot, FoodTimingEvidence } from "./circadian-food-timing";

export type FoodTimingDay = {
  date: string;
  snapshot: CircadianFoodTimingSnapshot;
};

export type FoodTimingPattern =
  | "INSUFFICIENT_EVIDENCE"
  | "ALIGNED_OR_VARIABLE"
  | "LATE_LAST_MEAL_PATTERN"
  | "LATE_FIRST_MEAL_PATTERN"
  | "LATE_EATING_DAY_PATTERN";

export type FoodTimingCoachingInterpretation = {
  pattern: FoodTimingPattern;
  observedDays: number;
  qualifyingDays: number;
  shouldContributeEvidence: boolean;
  signalId: "last_meal_timing" | "meal_timing_regularity" | null;
  reason: string;
};

const MIN_OBSERVED_DAYS = 3;
const REPEATED_PATTERN_DAYS = 2;

function lateLastMeal(snapshot: CircadianFoodTimingSnapshot) {
  const minutesBeforeSleep = snapshot.lastMeal?.minutesBeforeTargetSleep;
  if (minutesBeforeSleep == null) return false;
  // Evidence-map v1 supports sleep proximity directionally; this is a conservative
  // interpretation threshold, not a universal client-facing meal cutoff.
  return minutesBeforeSleep >= 0 && minutesBeforeSleep < 120;
}

function lateFirstMeal(snapshot: CircadianFoodTimingSnapshot) {
  const minutesFromWake = snapshot.firstMeal?.minutesFromWake;
  if (minutesFromWake == null) return false;
  // A repeated first meal well into the biological day is interpreted as a pattern,
  // never as a command to eat breakfast or shorten a fasting window.
  return minutesFromWake > 360;
}

function eatingDayDriftsLate(snapshot: CircadianFoodTimingSnapshot) {
  const first = snapshot.firstMeal;
  const last = snapshot.lastMeal;
  if (!first || !last) return false;
  const lastAfterSunset = last.minutesFromSunset != null && last.minutesFromSunset > 0;
  const closeToSleep = lateLastMeal(snapshot);
  return lastAfterSunset && closeToSleep;
}

/**
 * Longitudinal interpretation only. This module does not select a primary target,
 * choose intervention level, write coaching copy, or prescribe a meal schedule.
 * It converts repeated direct meal evidence into a signal the existing coaching
 * architecture may consider. One unusual day is intentionally quiet.
 */
export function interpretFoodTimingPattern(days: FoodTimingDay[]): FoodTimingCoachingInterpretation {
  const observed = days.filter((day) => day.snapshot.mealCount > 0);
  if (observed.length < MIN_OBSERVED_DAYS) {
    return {
      pattern: "INSUFFICIENT_EVIDENCE",
      observedDays: observed.length,
      qualifyingDays: 0,
      shouldContributeEvidence: false,
      signalId: null,
      reason: "food_timing_requires_repeated_direct_observation",
    };
  }

  const lateLast = observed.filter((day) => lateLastMeal(day.snapshot)).length;
  const lateFirst = observed.filter((day) => lateFirstMeal(day.snapshot)).length;
  const lateDay = observed.filter((day) => eatingDayDriftsLate(day.snapshot)).length;

  if (lateDay >= REPEATED_PATTERN_DAYS) {
    return {
      pattern: "LATE_EATING_DAY_PATTERN",
      observedDays: observed.length,
      qualifyingDays: lateDay,
      shouldContributeEvidence: true,
      signalId: "last_meal_timing",
      reason: "repeated_last_meal_after_sunset_and_close_to_sleep",
    };
  }

  if (lateLast >= REPEATED_PATTERN_DAYS) {
    return {
      pattern: "LATE_LAST_MEAL_PATTERN",
      observedDays: observed.length,
      qualifyingDays: lateLast,
      shouldContributeEvidence: true,
      signalId: "last_meal_timing",
      reason: "repeated_last_meal_close_to_target_sleep",
    };
  }

  if (lateFirst >= REPEATED_PATTERN_DAYS) {
    return {
      pattern: "LATE_FIRST_MEAL_PATTERN",
      observedDays: observed.length,
      qualifyingDays: lateFirst,
      shouldContributeEvidence: true,
      signalId: "meal_timing_regularity",
      reason: "repeated_first_meal_late_in_biological_day",
    };
  }

  return {
    pattern: "ALIGNED_OR_VARIABLE",
    observedDays: observed.length,
    qualifyingDays: 0,
    shouldContributeEvidence: false,
    signalId: null,
    reason: "no_repeated_food_timing_mismatch_detected",
  };
}

export function countDirectMealDays(evidenceByDate: Record<string, FoodTimingEvidence[]> | null | undefined) {
  if (!evidenceByDate) return 0;
  return Object.values(evidenceByDate).filter((evidence) => evidence.some((item) => item.action === "MEAL_STARTED")).length;
}
