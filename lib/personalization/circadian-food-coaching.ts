import { CircadianFoodTimingSnapshot, FoodTimingEvidence } from "./circadian-food-timing";

export type FoodTimingDay = {
  date: string;
  snapshot: CircadianFoodTimingSnapshot;
};

export type FoodTimingPattern =
  | "INSUFFICIENT_EVIDENCE"
  | "ALIGNED_OR_VARIABLE"
  | "LATE_LAST_MEAL_PATTERN"
  | "LATE_EATING_DAY_PATTERN";

export type FoodTimingCoachingInterpretation = {
  pattern: FoodTimingPattern;
  observedDays: number;
  qualifyingDays: number;
  shouldContributeEvidence: boolean;
  signalId: "last_meal_timing" | null;
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

function eatingDayDriftsLate(snapshot: CircadianFoodTimingSnapshot) {
  const last = snapshot.lastMeal;
  if (!last) return false;
  const lastAfterSunset = last.minutesFromSunset != null && last.minutesFromSunset > 0;
  const closeToSleep = lateLastMeal(snapshot);
  // Sunset is contextual evidence only. It can describe the pattern when a meal
  // is also close to target sleep, but sunset alone never makes a meal "late."
  return lastAfterSunset && closeToSleep;
}

/**
 * Longitudinal interpretation only. This module does not select a primary target,
 * choose intervention level, write coaching copy, or prescribe a meal schedule.
 * It converts repeated direct meal evidence into a signal the existing coaching
 * architecture may consider. One unusual day is intentionally quiet.
 *
 * First-meal timing remains observational in v1. We do not infer that a delayed
 * first meal is a problem, a lack of regularity, or a reason to prescribe breakfast.
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
