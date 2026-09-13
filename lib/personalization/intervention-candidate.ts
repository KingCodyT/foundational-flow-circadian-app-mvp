import { Day1PersonalizationResult } from "./day1";
import { InterventionDecisionInput, decideIntervention, InterventionDecision } from "./intervention";
import evaluateInterventionEligibility, { InterventionEligibilityInput, InterventionEligibilityResult } from "./intervention-eligibility";
import { DerivedEnvironment } from "./derived-environment";
import { Confidence, CoachingState } from "./types";
import { SignalReconsideration } from "./reconsideration";
import { EvidenceSeverity } from "./severity";

export type InterventionCandidateDisposition =
  | "SILENT"
  | "PASSIVE_CONTEXT"
  | "IN_APP_GUIDANCE"
  | "NOTIFICATION_ELIGIBLE"
  | "CONTEXTUAL_ALERT_ELIGIBLE";

export type InterventionCandidateInput = {
  day1: Day1PersonalizationResult;
  // Phase 3A inputs (caller may provide or omit; if omitted, we build minimal input from day1)
  phase3aInput?: InterventionDecisionInput | null;
  // Optional current derivedEnvironment (day1 may include one)
  derivedEnvironment?: DerivedEnvironment | null;
  // Optional explicit now. One resolved moment is passed through decision + eligibility.
  now?: Date | null;
  // Optional recent intervention metadata to be forwarded
  recentIntervention?: { lastAt?: string; type?: string; isRecent?: boolean } | null;
  // Optional explicit actionability override
  actionabilityOverride?: boolean | null;
  // Optional context / outcome evidence
  contextEvidence?: Record<string, any> | null;
  outcomeEvidence?: Record<string, any> | null;
  // Reconsideration is metadata only. It must not mutate target, confidence, severity, state, or intensity.
  reconsideration?: Record<string, SignalReconsideration> | null;
};

export type InterventionCandidate = {
  generatedAt: string;
  disposition: InterventionCandidateDisposition;
  targetSignalId: string | null;
  primaryCoachingTarget: Day1PersonalizationResult["primaryCoachingTarget"] | null;
  coachingState?: CoachingState | null;
  confidence?: Confidence | null;
  severity?: EvidenceSeverity | null;
  severityScore?: number | null;
  reconsideration?: SignalReconsideration | null;
  originalDecision: InterventionDecision;
  eligibility: InterventionEligibilityResult;
  finalLevel: 0 | 1 | 2 | 3 | 4;
  originalLevel: 0 | 1 | 2 | 3 | 4;
  reason: string;
  suppressionReason?: string | null;
  downgradeReason?: string | null;
  biologicallyRelevantNow: boolean;
  actionableNow: boolean;
  interruptionEligible: boolean;
  adaptedAction?: string | null;
  supportingContext?: {
    derivedEnvironment?: DerivedEnvironment | null;
    contextEvidence?: Record<string, any> | null;
    outcomeEvidence?: Record<string, any> | null;
  } | null;
  eventWindow?: { start?: string | null; end?: string | null } | null;
  noInterventionReason?: string | null;
  legacyTrace?: {
    legacyMappingsUsed: string[];
  } | null;
};

function mapLevelToDisposition(level: number): InterventionCandidateDisposition {
  switch (level) {
    case 0:
      return "SILENT";
    case 1:
      return "PASSIVE_CONTEXT";
    case 2:
      return "IN_APP_GUIDANCE";
    case 3:
      return "NOTIFICATION_ELIGIBLE";
    case 4:
      return "CONTEXTUAL_ALERT_ELIGIBLE";
    default:
      return "SILENT";
  }
}

export function assembleInterventionCandidate(input: InterventionCandidateInput): InterventionCandidate {
  const now = input.now ?? new Date();
  const day1 = input.day1;
  const derivedEnvironment = input.derivedEnvironment ?? day1.derivedEnvironment ?? null;

  const defaultDecisionInput: InterventionDecisionInput = {
    primary: day1.primaryCoachingTarget ?? null,
    derivedEnvironment,
    contextEvidence: input.contextEvidence ?? null,
    outcomeEvidence: input.outcomeEvidence ?? null,
    eventWindow: null,
    materialDisruption: false,
    recentIntervention: input.recentIntervention ?? null,
    actionabilityOverride: input.actionabilityOverride ?? null,
    now,
  };

  // Prefer caller-provided Phase 3A detail, but force one authoritative moment through the full pipeline.
  const phase3aInput: InterventionDecisionInput = {
    ...defaultDecisionInput,
    ...(input.phase3aInput ?? {}),
    now,
  };

  // 1) Run Phase 3A decision function (pure)
  const decision = decideIntervention(phase3aInput);

  // 2) Resolve selected signal metadata from the signal state, not from raw score or target shape.
  const targetSignalId = decision.targetSignalId ?? day1.primaryCoachingTarget?.signalId ?? null;
  const targetSignalState = targetSignalId ? day1.signalStates[targetSignalId] ?? null : null;
  const coachingState = targetSignalState?.coachingState ?? day1.primaryCoachingTarget?.coachingState ?? null;
  const confidence = targetSignalState?.confidence ?? null;
  const confidenceScore = confidence?.score ?? null;
  const reconsideration = targetSignalId ? input.reconsideration?.[targetSignalId] ?? null : null;

  const eligibilityInput: InterventionEligibilityInput = {
    decision,
    now,
    derivedEnvironment,
    contextEvidence: input.contextEvidence ?? null,
    outcomeEvidence: input.outcomeEvidence ?? null,
    coachingState,
    confidenceScore,
    recentIntervention: input.recentIntervention ?? null,
    actionabilityOverride: input.actionabilityOverride ?? null,
  };

  // 3) Run Phase 3B eligibility (pure)
  const eligibility = evaluateInterventionEligibility(eligibilityInput);

  // 4) Normalize final level and disposition following locked rules
  const originalLevel = eligibility.originalLevel as 0 | 1 | 2 | 3 | 4;
  let finalLevel = eligibility.finalLevel as 0 | 1 | 2 | 3 | 4;
  let disposition = mapLevelToDisposition(finalLevel);

  // If SUPPRESS, enforce finalLevel=0 and disposition SILENT, preserve suppression reason
  if (eligibility.status === "SUPPRESS") {
    finalLevel = 0;
    disposition = "SILENT";
  }

  return {
    generatedAt: now.toISOString(),
    disposition,
    targetSignalId,
    primaryCoachingTarget: day1.primaryCoachingTarget ?? null,
    coachingState,
    confidence,
    severity: day1.primaryCoachingTarget?.severity ?? null,
    severityScore: day1.primaryCoachingTarget?.severityScore ?? null,
    reconsideration,
    originalDecision: decision,
    eligibility,
    finalLevel,
    originalLevel,
    reason: eligibility.reason ?? decision.reason ?? "no_reason_provided",
    suppressionReason: eligibility.suppressionReason ?? null,
    downgradeReason: eligibility.downgradeReason ?? null,
    biologicallyRelevantNow: eligibility.biologicallyRelevantNow,
    actionableNow: eligibility.actionableNow,
    interruptionEligible: eligibility.interruptionEligible,
    adaptedAction: decision.adaptedAction ?? null,
    supportingContext: {
      derivedEnvironment,
      contextEvidence: input.contextEvidence ?? null,
      outcomeEvidence: input.outcomeEvidence ?? null,
    },
    eventWindow: decision.eventWindow ?? null,
    noInterventionReason: decision.noInterventionReason ?? null,
    legacyTrace: {
      legacyMappingsUsed: day1.source?.legacyMappingsUsed ?? [],
    },
  };
}

export default assembleInterventionCandidate;
