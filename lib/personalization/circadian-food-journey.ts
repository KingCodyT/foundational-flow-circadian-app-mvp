import { FlowEvent } from "@/lib/flow-engine";
import {
  buildCircadianFoodTimingSnapshot,
  CircadianFoodTimingSnapshot,
  FoodTimingAnchors,
  FoodTimingEvidence,
} from "@/lib/personalization/circadian-food-timing";

function iso(date?: Date | null) {
  return date && Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60000);
}

/**
 * Bridges the existing daily circadian flow into Food Timing v1 without creating
 * another biological or coaching engine. Existing events provide known anchors;
 * missing anchors remain unknown rather than being invented.
 */
export function buildFoodTimingAnchorsFromFlow(events: FlowEvent[]): FoodTimingAnchors {
  const byId = new Map(events.map((event) => [event.id, event]));
  const firstMeal = byId.get("first_meal");
  const morningLight = byId.get("morning_light");
  const sunset = byId.get("sunset");
  const sleepWindow = byId.get("sleep_window");

  // The current flow engine defines first_meal.start as wake + 30 minutes and
  // sleep_window.start as target bedtime - 45 minutes. We reverse those existing
  // derivations here; Food Timing v1 does not introduce new timing prescriptions.
  const wakeAt = firstMeal ? iso(addMinutes(firstMeal.start, -30)) : null;
  const targetSleepAt = sleepWindow ? iso(addMinutes(sleepWindow.start, 45)) : null;

  return {
    wakeAt,
    morningLightAt: iso(morningLight?.start),
    sunsetAt: iso(sunset?.start),
    // No dedicated Darkness event exists yet. Do not substitute Dim House.
    darknessAt: null,
    targetSleepAt,
  };
}

export function buildFoodJourneySnapshot(input: {
  evidence: FoodTimingEvidence[];
  events: FlowEvent[];
}): CircadianFoodTimingSnapshot {
  return buildCircadianFoodTimingSnapshot({
    evidence: input.evidence,
    anchors: buildFoodTimingAnchorsFromFlow(input.events),
  });
}

export type FoodJourneyPrompt = {
  headline: string;
  guidance: string;
  secondaryAction: "NOT_YET" | "EATING_LATER";
  secondaryLabel: string;
};

/**
 * Communication-only framing for the evidence capture surface. This does not
 * classify timing as good/bad, choose a coaching target, or alter intervention
 * level. It simply asks for the smallest useful intentional signal.
 */
export function buildFoodJourneyPrompt(
  snapshot: CircadianFoodTimingSnapshot,
): FoodJourneyPrompt {
  if (snapshot.mealCount === 0) {
    return {
      headline: "When food enters your day, tell Foundational Flow.",
      guidance: "Timing is enough for now. No calories, macros, photos, or food score.",
      secondaryAction: "NOT_YET",
      secondaryLabel: "Not yet",
    };
  }

  return {
    headline: "Your eating day is underway.",
    guidance: "If you eat again, one tap is enough. Foundational Flow will learn the timing pattern over time.",
    secondaryAction: "EATING_LATER",
    secondaryLabel: "Eating later",
  };
}
