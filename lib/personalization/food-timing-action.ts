import { CircadianFoodTimingSnapshot, FoodTimingEvidence } from "./circadian-food-timing";

export const FOOD_LOG_CONFIRMATION_WINDOW_MS = 2 * 60 * 1000;
export const FOOD_LOG_DEDUP_WINDOW_MS = 10 * 1000;
export const FOOD_LOG_CLICK_GUARD_WINDOW_MS = 1500;

function parseIso(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function msBetween(later: Date, earlier: Date) {
  return later.getTime() - earlier.getTime();
}

export function getRecentMealLogAt(input: {
  snapshot: CircadianFoodTimingSnapshot;
  now?: Date;
  confirmationWindowMs?: number;
}): Date | null {
  const now = input.now ?? new Date();
  const confirmationWindowMs =
    input.confirmationWindowMs ?? FOOD_LOG_CONFIRMATION_WINDOW_MS;
  const lastMealAt = parseIso(input.snapshot.lastMeal?.at ?? null);
  if (!lastMealAt) return null;
  return msBetween(now, lastMealAt) <= confirmationWindowMs ? lastMealAt : null;
}

export function shouldIgnoreRapidMealSubmit(input: {
  currentEvidence: FoodTimingEvidence[];
  nextAtIso: string;
  dedupWindowMs?: number;
}): boolean {
  const dedupWindowMs = input.dedupWindowMs ?? FOOD_LOG_DEDUP_WINDOW_MS;
  const nextAt = parseIso(input.nextAtIso);
  if (!nextAt) return false;

  const lastMeal = [...input.currentEvidence]
    .reverse()
    .find((item) => item.action === "MEAL_STARTED");
  const lastMealAt = parseIso(lastMeal?.at ?? null);
  if (!lastMealAt) return false;

  return Math.abs(msBetween(nextAt, lastMealAt)) <= dedupWindowMs;
}
