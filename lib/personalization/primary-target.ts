import { SIGNAL_REGISTRY } from "./signal-registry";
import {
  SignalClassification,
  HierarchyLayer,
  CoachingState,
} from "./types";
import { InitialPersonalizationState, InitialSignalState } from "./initial-state";
import { EvidenceSeverity, deriveSignalSeverity } from "./severity";

export type PrimaryCoachingTargetResult = {
  signalId: string | null;
  coachingState?: CoachingState;
  hierarchy?: HierarchyLayer | null;
  severity?: EvidenceSeverity | null;
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
  const eligible: { id: string; signal: InitialSignalState; registryOrder: number; hierarchy?: HierarchyLayer | null; severityBand: EvidenceSeverity | null; severityScore: number | null; }[] = [];

  const registryKeys = Object.keys(SIGNAL_REGISTRY);

  for (const [id, sig] of Object.entries(perSignal)) {
    const def = SIGNAL_REGISTRY[id];
    const registryOrder = registryKeys.indexOf(id);

    if (!def) continue; // unknown signal

    if (sig.classification !== SignalClassification.BEHAVIOR) continue;

    if (sig.coachingState === CoachingState.NEEDS_ATTENTION || sig.coachingState === CoachingState.DEVELOPING) {
      const derived = deriveSignalSeverity(sig);
      eligible.push({
        id,
        signal: sig,
        registryOrder,
        hierarchy: def.hierarchy ?? null,
        severityBand: derived.band,
        severityScore: derived.score,
      });
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

    const chosen = chooseBestCandidateInLayer(candidates);
    if (!chosen) continue;

    // v1 conservative override: a downstream SEVERE eligible behavioral target may leapfrog an upstream MILD eligible target.
    const currentSeverity = chosen.severityBand;
    if (currentSeverity === EvidenceSeverity.MILD) {
      const downstreamSevere = eligible.filter((candidate) => {
        if (candidate.id === chosen.id) return false;
        if (candidate.severityBand !== EvidenceSeverity.SEVERE) return false;
        const currentIndex = HIERARCHY_ORDER.indexOf(layer);
        const candidateIndex = candidate.hierarchy ? HIERARCHY_ORDER.indexOf(candidate.hierarchy) : -1;
        return candidateIndex > currentIndex;
      });

      if (downstreamSevere.length > 0) {
        const comparable = chooseBestCandidateInLayer(
          downstreamSevere.filter((c) => c.signal.coachingState === CoachingState.NEEDS_ATTENTION || c.signal.coachingState === CoachingState.DEVELOPING),
        );
        if (comparable) return buildResultForChosen(comparable, state);
      }
    }

    return buildResultForChosen(chosen, state);
  }

  // If none matched the hierarchy order (signals without hierarchy), fall back to registry order among eligible
  eligible.sort((a, b) => a.registryOrder - b.registryOrder);
  const chosen = eligible[0];
  return buildResultForChosen(chosen, state);
}

const SEVERITY_WEIGHT: Record<EvidenceSeverity, number> = {
  [EvidenceSeverity.SEVERE]: 3,
  [EvidenceSeverity.MODERATE]: 2,
  [EvidenceSeverity.MILD]: 1,
};

function chooseBestCandidateInLayer(candidates: { id: string; signal: InitialSignalState; registryOrder: number; hierarchy?: HierarchyLayer | null; severityBand: EvidenceSeverity | null; severityScore: number | null; }[]) {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  const ordered = [...candidates].sort((a, b) => {
    const aWeight = a.severityBand ? SEVERITY_WEIGHT[a.severityBand] ?? 0 : 0;
    const bWeight = b.severityBand ? SEVERITY_WEIGHT[b.severityBand] ?? 0 : 0;
    const bandDiff = bWeight - aWeight;
    if (bandDiff !== 0) return bandDiff;
    return a.registryOrder - b.registryOrder;
  });

  return ordered[0];
}

function computeMinAnswerScore(sig: InitialSignalState): number | null {
  const scores: number[] = [];
  for (const ev of sig.evidence ?? []) {
    if (ev.answerScore != null) scores.push(ev.answerScore);
  }
  if (scores.length === 0) return null;
  return Math.min(...scores);
}

function buildResultForChosen(chosen: { id: string; signal: InitialSignalState; registryOrder: number; hierarchy?: HierarchyLayer | null; severityBand: EvidenceSeverity | null; severityScore: number | null }, state: InitialPersonalizationState) {
  const { id, signal } = chosen;
  const severity = chosen.severityScore ?? computeMinAnswerScore(signal);
  const severityBand = chosen.severityBand ?? deriveSignalSeverity(signal).band ?? null;

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
    severity: severityBand,
    severityScore: severity ?? null,
    supportingOutcomeEvidence: Object.keys(supportingOutcomeEvidence).length > 0 ? supportingOutcomeEvidence : undefined,
    contextConstraintEvidence: Object.keys(contextConstraintEvidence).length > 0 ? contextConstraintEvidence : undefined,
    derivedEnvironmentEvidence: Object.keys(derivedEnvironmentEvidence).length > 0 ? derivedEnvironmentEvidence : undefined,
    reason: `chosen_by_hierarchy_layer_${chosen.hierarchy ?? 'none'}_and_state_${signal.coachingState}`,
  } as PrimaryCoachingTargetResult;
}

export default selectPrimaryCoachingTarget;
