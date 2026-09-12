import { SIGNAL_REGISTRY } from "./signal-registry";
import {
  SignalClassification,
  HierarchyLayer,
  CoachingState,
} from "./types";
import { InitialPersonalizationState, InitialSignalState } from "./initial-state";

export type PrimaryCoachingTargetResult = {
  signalId: string | null;
  coachingState?: CoachingState;
  hierarchy?: HierarchyLayer | null;
  // assessment severity metadata when available (min score among evidence)
  severityScore?: number | null;
  // Supporting evidence arrays (shallow copies of evidence entries)
  supportingOutcomeEvidence?: Record<string, InitialSignalState>;
  contextConstraintEvidence?: Record<string, InitialSignalState>;
  derivedEnvironmentEvidence?: Record<string, InitialSignalState>;
  // Deterministic selection reason or noTargetReason
  reason: string;
  noTargetReason?: string | null;
};

// Current implemented biological hierarchy priority (highest first).
// Earth, Water, and nnEMF are intentionally not represented here yet because
// those domains do not yet exist in the circadian MVP signal registry.
// Meal timing (Food) must outrank downstream optimization signals.
const HIERARCHY_ORDER: HierarchyLayer[] = [
  HierarchyLayer.MORNING_LIGHT_CIRCADIAN_ANCHOR,
  HierarchyLayer.DAYTIME_LIGHT_ENVIRONMENT,
  HierarchyLayer.EVENING_LIGHT_DARKNESS,
  HierarchyLayer.SLEEP_OPPORTUNITY_TIMING,
  HierarchyLayer.MEAL_TIMING,
  HierarchyLayer.OPTIMIZATION,
];

export function selectPrimaryCoachingTarget(state: InitialPersonalizationState): PrimaryCoachingTargetResult {
  const perSignal = state.perSignal ?? {};

  // Collect eligible behavioral signals (NEEDS_ATTENTION or DEVELOPING)
  const eligible: { id: string; signal: InitialSignalState; registryOrder: number; hierarchy?: HierarchyLayer | null; }[] = [];

  const registryKeys = Object.keys(SIGNAL_REGISTRY);

  for (const [id, sig] of Object.entries(perSignal)) {
    const def = SIGNAL_REGISTRY[id];
    const registryOrder = registryKeys.indexOf(id);

    if (!def) continue; // unknown signal

    if (sig.classification !== SignalClassification.BEHAVIOR) continue;

    if (sig.coachingState === CoachingState.NEEDS_ATTENTION || sig.coachingState === CoachingState.DEVELOPING) {
      eligible.push({ id, signal: sig, registryOrder, hierarchy: def.hierarchy ?? null });
    }
  }

  if (eligible.length === 0) {
    return {
      signalId: null,
      reason: "no eligible behavioral signals",
      noTargetReason: "no_behavioral_weakness",
    };
  }

  // Group eligible by hierarchy priority
  for (const layer of HIERARCHY_ORDER) {
    const inLayer = eligible.filter((e) => e.hierarchy === layer);
    if (inLayer.length === 0) continue;

    // Within same layer, prefer NEEDS_ATTENTION over DEVELOPING
    const needs = inLayer.filter((e) => e.signal.coachingState === CoachingState.NEEDS_ATTENTION);
    const candidates = needs.length > 0 ? needs : inLayer.filter((e) => e.signal.coachingState === CoachingState.DEVELOPING);

    // If single candidate, pick it
    if (candidates.length === 1) {
      const chosen = candidates[0];
      return buildResultForChosen(chosen, state);
    }

    // Multiple candidates in same layer and same coachingState: use severity/answer-band metadata when available.
    // Compute a severity score per candidate: prefer lower numeric answerScore (worse) -> select the worst one.
    const withSeverity = candidates.map((c) => ({
      ...c,
      severity: computeMinAnswerScore(c.signal),
    }));

    // Filter those that have numeric severity
    const haveSeverity = withSeverity.filter((w) => w.severity != null);
    if (haveSeverity.length > 0) {
      // choose the one with smallest severity (most severe)
      haveSeverity.sort((a, b) => (a.severity! - b.severity!));
      const chosen = haveSeverity[0];
      return buildResultForChosen(chosen, state);
    }

    // No severity to break tie: deterministic registry order
    candidates.sort((a, b) => a.registryOrder - b.registryOrder);
    return buildResultForChosen(candidates[0], state);
  }

  // If none matched the hierarchy order (signals without hierarchy), fall back to registry order among eligible
  eligible.sort((a, b) => a.registryOrder - b.registryOrder);
  const chosen = eligible[0];
  return buildResultForChosen(chosen, state);
}

function computeMinAnswerScore(sig: InitialSignalState): number | null {
  const scores: number[] = [];
  for (const ev of sig.evidence ?? []) {
    if (ev.answerScore != null) scores.push(ev.answerScore);
  }
  if (scores.length === 0) return null;
  // severity: lower score means worse (e.g., 10 is worse than 80), so return min
  return Math.min(...scores);
}

function buildResultForChosen(chosen: { id: string; signal: InitialSignalState; registryOrder: number; hierarchy?: HierarchyLayer | null }, state: InitialPersonalizationState) {
  const { id, signal } = chosen;
  const severity = computeMinAnswerScore(signal);

  // Collect supporting outcome/context/derived evidence (shallow selections)
  const supportingOutcomeEvidence: Record<string, InitialSignalState> = {};
  const contextConstraintEvidence: Record<string, InitialSignalState> = {};
  const derivedEnvironmentEvidence: Record<string, InitialSignalState> = {};

  for (const [sid, s] of Object.entries(state.perSignal)) {
    if (s.classification === SignalClassification.OUTCOME) supportingOutcomeEvidence[sid] = s;
    if (s.classification === SignalClassification.CONTEXT_CONSTRAINT) contextConstraintEvidence[sid] = s;
    if (s.classification === SignalClassification.DERIVED_ENVIRONMENT) derivedEnvironmentEvidence[sid] = s;
  }

  return {
    signalId: id,
    coachingState: signal.coachingState,
    hierarchy: chosen.hierarchy ?? null,
    severityScore: severity ?? null,
    supportingOutcomeEvidence: Object.keys(supportingOutcomeEvidence).length > 0 ? supportingOutcomeEvidence : undefined,
    contextConstraintEvidence: Object.keys(contextConstraintEvidence).length > 0 ? contextConstraintEvidence : undefined,
    derivedEnvironmentEvidence: Object.keys(derivedEnvironmentEvidence).length > 0 ? derivedEnvironmentEvidence : undefined,
    reason: `chosen_by_hierarchy_layer_${chosen.hierarchy ?? 'none'}_and_state_${signal.coachingState}`,
  } as PrimaryCoachingTargetResult;
}

export default selectPrimaryCoachingTarget;
