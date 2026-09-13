import { FoodTimingDay } from "./circadian-food-coaching";
import { CoachingState } from "./types";

export type FoodProgressionResult = {
  nextState: CoachingState | undefined;
  changed: boolean;
  alignedDays: number;
  recentMismatchDays: number;
  reason: string;
};

const DEVELOPING_MIN_ALIGNED_DAYS = 3;
const ESTABLISHED_MIN_ALIGNED_DAYS = 7;
const REOPEN_MIN_RECENT_MISMATCH_DAYS = 2;
const RECENT_WINDOW_DAYS = 4;

function isAlignedMealDay(day: FoodTimingDay) {
  const last = day.snapshot.lastMeal;
  if (!last) return false;

  const sleepSeparation = last.minutesBeforeTargetSleep;

  // v1 progression uses separation from target sleep as its narrow observable.
  // Sunset remains context. It is not a binary dinner cutoff because season and
  // latitude can move sunset dramatically without making a meal intrinsically bad.
  return sleepSeparation != null && sleepSeparation >= 120;
}

function isMismatchMealDay(day: FoodTimingDay) {
  const last = day.snapshot.lastMeal;
  if (!last) return false;
  const sleepSeparation = last.minutesBeforeTargetSleep;
  return sleepSeparation != null && sleepSeparation >= 0 && sleepSeparation < 120;
}

/**
 * Food progression is evidence restraint, not a streak system.
 * Missing days are unknown. One aligned day cannot establish a signal. One
 * unusual late meal cannot regress an established pattern. Progression remains
 * NEEDS_ATTENTION -> DEVELOPING -> ESTABLISHED and reopening requires repeated
 * recent mismatch evidence.
 */
export function progressCircadianFoodTiming(
  current: CoachingState | undefined,
  observedDays: FoodTimingDay[],
): FoodProgressionResult {
  const chronological = [...observedDays]
    .filter((day) => day.snapshot.mealCount > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  const alignedDays = chronological.filter(isAlignedMealDay).length;
  const recent = chronological.slice(-RECENT_WINDOW_DAYS);
  const recentMismatchDays = recent.filter(isMismatchMealDay).length;

  if (recentMismatchDays >= REOPEN_MIN_RECENT_MISMATCH_DAYS) {
    const nextState = current === CoachingState.NEEDS_ATTENTION
      ? current
      : CoachingState.DEVELOPING;
    return {
      nextState,
      changed: nextState !== current,
      alignedDays,
      recentMismatchDays,
      reason: "repeated_recent_food_timing_mismatch_reopens_coaching",
    };
  }

  if (current === CoachingState.NEEDS_ATTENTION && alignedDays >= DEVELOPING_MIN_ALIGNED_DAYS) {
    return {
      nextState: CoachingState.DEVELOPING,
      changed: true,
      alignedDays,
      recentMismatchDays,
      reason: "repeated_aligned_food_timing_supports_developing",
    };
  }

  if (current === CoachingState.DEVELOPING && alignedDays >= ESTABLISHED_MIN_ALIGNED_DAYS) {
    return {
      nextState: CoachingState.ESTABLISHED,
      changed: true,
      alignedDays,
      recentMismatchDays,
      reason: "sustained_aligned_food_timing_supports_established",
    };
  }

  return {
    nextState: current,
    changed: false,
    alignedDays,
    recentMismatchDays,
    reason: "food_timing_state_held_pending_more_evidence",
  };
}
