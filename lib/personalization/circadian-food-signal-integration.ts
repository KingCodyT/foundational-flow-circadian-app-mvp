import { buildTodaysFlow, DailyProfileInput } from "@/lib/flow-engine";
import { FoodTimingEvidence } from "./circadian-food-timing";
import { buildFoodJourneySnapshot } from "./circadian-food-journey";
import { interpretFoodTimingPattern } from "./circadian-food-coaching";
import { InitialPersonalizationState, InitialSignalState } from "./initial-state";
import { CoachingState, SignalSourceType } from "./types";

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

function coachingStateFromRepeatedMismatch(current?: CoachingState) {
  if (current === CoachingState.NEEDS_ATTENTION) return current;
  return CoachingState.DEVELOPING;
}

/**
 * Bridges Circadian Food Coaching v1 into the existing signal architecture.
 * It does not choose the primary target or intervention level. Repeated direct
 * food-timing evidence may reopen or strengthen an existing Meal Timing signal;
 * hierarchy, severity override, intervention eligibility, Voice, and delivery
 * remain owned by their existing modules.
 */
export function applyCircadianFoodCoachingEvidence(
  state: InitialPersonalizationState,
  input: ApplyFoodTimingEvidenceInput,
): InitialPersonalizationState {
  const interpretation = interpretFoodTimingPattern(buildObservedDays(input));
  if (!interpretation.shouldContributeEvidence || !interpretation.signalId) return state;

  const current = state.perSignal[interpretation.signalId];
  if (!current) return state;

  const nextState = coachingStateFromRepeatedMismatch(current.coachingState);
  const notes = [...(current.notes ?? [])];
  const patternNote = `circadian_food_${interpretation.pattern.toLowerCase()}_${interpretation.qualifyingDays}_days`;
  if (!notes.includes(patternNote)) notes.push(patternNote);

  if (current.coachingState !== nextState) {
    notes.push(
      `reopened_by_repeated_direct_food_timing_evidence_${current.coachingState ?? "unknown"}_to_${nextState}`,
    );
  }

  const directEvidence = Array.from({ length: interpretation.qualifyingDays }, () => ({
    source: [SignalSourceType.USER_FEEDBACK],
  }));

  const updated: InitialSignalState = {
    ...current,
    coachingState: nextState,
    evidence: [...current.evidence, ...directEvidence],
    notes,
    confidence: current.confidence
      ? {
          ...current.confidence,
          lastEvidenceAt: state.generatedAt,
        }
      : current.confidence,
  };

  return {
    ...state,
    perSignal: {
      ...state.perSignal,
      [interpretation.signalId]: updated,
    },
  };
}

export default applyCircadianFoodCoachingEvidence;
