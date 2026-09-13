export type FoodTimingAction = "MEAL_STARTED" | "NOT_YET" | "EATING_LATER";

export type FoodTimingEvidence = {
  id: string;
  action: FoodTimingAction;
  at: string;
  source: "USER";
};

export type FoodTimingAnchors = {
  wakeAt: string | null;
  morningLightAt?: string | null;
  sunsetAt?: string | null;
  darknessAt?: string | null;
  targetSleepAt: string | null;
};

export type MealTimingRelationship = {
  evidenceId: string;
  at: string;
  minutesFromWake: number | null;
  minutesFromMorningLight: number | null;
  minutesFromSunset: number | null;
  minutesFromDarkness: number | null;
  minutesBeforeTargetSleep: number | null;
};

export type CircadianFoodTimingSnapshot = {
  mealCount: number;
  firstMeal: MealTimingRelationship | null;
  lastMeal: MealTimingRelationship | null;
  eatingSpanMinutes: number | null;
  meals: MealTimingRelationship[];
  intentSignals: Array<{
    evidenceId: string;
    action: Exclude<FoodTimingAction, "MEAL_STARTED">;
    at: string;
  }>;
};

function parsed(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function minutesBetween(later: Date | null, earlier: Date | null) {
  if (!later || !earlier) return null;
  return Math.round((later.getTime() - earlier.getTime()) / 60000);
}

function buildRelationship(
  evidence: FoodTimingEvidence,
  anchors: FoodTimingAnchors,
): MealTimingRelationship | null {
  const mealAt = parsed(evidence.at);
  if (!mealAt) return null;

  const wakeAt = parsed(anchors.wakeAt);
  const morningLightAt = parsed(anchors.morningLightAt);
  const sunsetAt = parsed(anchors.sunsetAt);
  const darknessAt = parsed(anchors.darknessAt);
  const targetSleepAt = parsed(anchors.targetSleepAt);

  return {
    evidenceId: evidence.id,
    at: mealAt.toISOString(),
    minutesFromWake: minutesBetween(mealAt, wakeAt),
    minutesFromMorningLight: minutesBetween(mealAt, morningLightAt),
    minutesFromSunset: minutesBetween(mealAt, sunsetAt),
    minutesFromDarkness: minutesBetween(mealAt, darknessAt),
    minutesBeforeTargetSleep: minutesBetween(targetSleepAt, mealAt),
  };
}

/**
 * Circadian Food Timing v1 is an interpretation layer, not a second coaching engine.
 * It converts direct meal-timing evidence into relationships with known biological
 * anchors. It deliberately makes no good/bad score, fasting rule, calorie estimate,
 * composition inference, or universal meal-time prescription.
 */
export function buildCircadianFoodTimingSnapshot(input: {
  evidence: FoodTimingEvidence[];
  anchors: FoodTimingAnchors;
}): CircadianFoodTimingSnapshot {
  const evidence = [...input.evidence].sort((a, b) => {
    const aTime = parsed(a.at)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const bTime = parsed(b.at)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return aTime - bTime;
  });

  const meals = evidence
    .filter((item) => item.action === "MEAL_STARTED")
    .map((item) => buildRelationship(item, input.anchors))
    .filter((item): item is MealTimingRelationship => Boolean(item));

  const firstMeal = meals[0] ?? null;
  const lastMeal = meals[meals.length - 1] ?? null;
  const eatingSpanMinutes =
    firstMeal && lastMeal && firstMeal !== lastMeal
      ? minutesBetween(parsed(lastMeal.at), parsed(firstMeal.at))
      : null;

  const intentSignals = evidence
    .filter((item) => item.action !== "MEAL_STARTED" && parsed(item.at))
    .map((item) => ({
      evidenceId: item.id,
      action: item.action as Exclude<FoodTimingAction, "MEAL_STARTED">,
      at: parsed(item.at)!.toISOString(),
    }));

  return {
    mealCount: meals.length,
    firstMeal,
    lastMeal,
    eatingSpanMinutes,
    meals,
    intentSignals,
  };
}
