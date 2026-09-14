import { buildTodaysFlow, DailyProfileInput } from "@/lib/flow-engine";
import { FoodTimingEvidence } from "./circadian-food-timing";
import { buildFoodJourneySnapshot } from "./circadian-food-journey";
import { interpretFoodTimingPattern } from "./circadian-food-coaching";
import { progressCircadianFoodTiming } from "./circadian-food-progression";
import { InitialPersonalizationState, InitialSignalState } from "./initial-state";
import { SignalSourceType } from "./types";

export type ApplyFoodTimingEvidenceInput = {
  evidenceByDate?: Record<string, FoodTimingEvidence[]> | null;
  profile?: DailyProfileInput | null;
  participationLevel?: string | null;
};

function dateAtNoon(dateKey: string) {
  const candidate = new Date(`${dateKey}T12:00:00`);
  return Number.isFinite(candidate.getTime()) ? candidate : null;
}

function buildObservedDays(input: ApplyFoodTimingEvidenceInput) {
  const evidenceByDate = input.evidenceByDate ?? {};
  const profile = input.profile ?? {};

  return Object.entries(evidenceByDate)
    .map(([date, evidence]) => {
      const day = dateAtNoon(date);
      if (!day) return null;
      const flow = buildTodaysFlow({
        date: day,
        now: day,
        profile,
        participationLevel: input.participationLevel,
      });
      return {
        date,
        snapshot: buildFoodJourneySnapshot({ evidence, events: flow.events }),
      };
    })
    .filter((day): day is NonNullable<typeof day> => Boolean(day))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Bridges Circadian Food evidence into the existing signal architecture.
 * Food progression may revise an existing Meal Timing coaching state, but it
 * never chooses the primary target, severity, intervention level, Voice, or
 * delivery. Those remain owned by the existing Foundational Flow architecture.
 */
export function applyCircadianFoodCoachingEvidence(
  state: InitialPersonalizationState,
  input: ApplyFoodTimingEvidenceInput,
): InitialPersonalizationState {
  const observedDays = buildObservedDays(input);
  const interpretation = interpretFoodTimingPattern(observedDays);

  const candidateSignalIds = new Set<string>();
  if (interpretation.signalId) candidateSignalIds.add(interpretation.signalId);
  candidateSignalIds.add("last_meal_timing");

  let nextState = state;

  for (const signalId of candidateSignalIds) {
    const current = nextState.perSignal[signalId];
    if (!current) continue;

    const progression = progressCircadianFoodTiming(current.coachingState, observedDays);
    const notes = [...(current.notes ?? [])];

    if (interpretation.shouldContributeEvidence && interpretation.signalId === signalId) {
      const patternNote = `circadian_food_${interpretation.pattern.toLowerCase()}_${interpretation.qualifyingDays}_days`;
      if (!notes.includes(patternNote)) notes.push(patternNote);
    }

    if (progression.changed) {
      notes.push(`circadian_food_progression_${progression.reason}_${current.coachingState ?? "unknown"}_to_${progression.nextState}`);
    }

    const directEvidence = interpretation.shouldContributeEvidence && interpretation.signalId === signalId
      ? Array.from({ length: interpretation.qualifyingDays }, () => ({
          source: [SignalSourceType.USER_FEEDBACK],
        }))
      : [];

    const updated: InitialSignalState = {
      ...current,
      coachingState: progression.nextState,
      evidence: [...current.evidence, ...directEvidence],
      notes: notes.length > 0 ? notes : current.notes,
      confidence: directEvidence.length > 0 && current.confidence
        ? { ...current.confidence, lastEvidenceAt: state.generatedAt }
        : current.confidence,
    };

    nextState = {
      ...nextState,
      perSignal: {
        ...nextState.perSignal,
        [signalId]: updated,
      },
    };
  }

  return nextState;
}

export default applyCircadianFoodCoachingEvidence;
