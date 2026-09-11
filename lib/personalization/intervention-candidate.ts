import { Day1PersonalizationResult } from "./day1";
import { InterventionDecisionInput, decideIntervention, InterventionDecision } from "./intervention";
import evaluateInterventionEligibility, { InterventionEligibilityInput, InterventionEligibilityResult } from "./intervention-eligibility";
import { DerivedEnvironment } from "./derived-environment";

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
  // Optional explicit now
  now?: Date | null;
  // Optional recent intervention metadata to be forwarded
  recentIntervention?: { lastAt?: string; type?: string; isRecent?: boolean } | null;
  // Optional explicit actionability override
  actionabilityOverride?: boolean | null;
  // Optional context / outcome evidence
  contextEvidence?: Record<string, any> | null;
  outcomeEvidence?: Record<string, any> | null;
};

export type InterventionCandidate = {
  generatedAt: string;
  disposition: InterventionCandidateDisposition;
  targetSignalId: string | null;
  primaryCoachingTarget: Day1PersonalizationResult["primaryCoachingTarget"] | null;
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

  // Build Phase 3A input: prefer provided, otherwise create minimal one using day1 primary target and derivedEnvironment
  const phase3aInput: InterventionDecisionInput = input.phase3aInput ?? {
    primary: day1.primaryCoachingTarget as any ?? null,
    derivedEnvironment: input.derivedEnvironment ?? day1.derivedEnvironment ?? null,
    contextEvidence: input.contextEvidence ?? null,
    outcomeEvidence: input.outcomeEvidence ?? null,
    eventWindow: null,
    materialDisruption: false,
    recentIntervention: input.recentIntervention ?? null,
    actionabilityOverride: input.actionabilityOverride ?? null,
  };

  // 1) Run Phase 3A decision function (pure)
  const decision = decideIntervention(phase3aInput);

  // 2) Prepare Phase 3B input: include coachingState and confidence when available for traceability
  const coachingState = (day1.primaryCoachingTarget && (day1.primaryCoachingTarget as any).coachingState) ?? null;
  const confidenceScore = (day1.primaryCoachingTarget && (day1.primaryCoachingTarget as any).confidence && (day1.primaryCoachingTarget as any).confidence.score) ?? null;

  const eligibilityInput: InterventionEligibilityInput = {
    decision,
    now,
    derivedEnvironment: input.derivedEnvironment ?? day1.derivedEnvironment ?? null,
    contextEvidence: input.contextEvidence ?? null,
    outcomeEvidence: input.outcomeEvidence ?? null,
    coachingState: coachingState ?? null,
    confidenceScore: confidenceScore ?? null,
    recentIntervention: input.recentIntervention ?? null,
    actionabilityOverride: input.actionabilityOverride ?? null,
  };

  // 3) Run Phase 3B eligibility (pure)
  const eligibility = evaluateInterventionEligibility(eligibilityInput);

  // 4) Normalize final level and disposition following locked rules
  const originalLevel = eligibility.originalLevel as 0|1|2|3|4;
  let finalLevel = eligibility.finalLevel as 0|1|2|3|4;
  let disposition = mapLevelToDisposition(finalLevel);

  // If SUPPRESS, enforce finalLevel=0 and disposition SILENT, preserve suppression reason
  if (eligibility.status === "SUPPRESS") {
    finalLevel = 0;
    disposition = "SILENT";
  }

  const candidate: InterventionCandidate = {
    generatedAt: new Date().toISOString(),
    disposition,
    targetSignalId: decision.targetSignalId ?? null,
    primaryCoachingTarget: day1.primaryCoachingTarget ?? null,
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
    supportingContext: {
      derivedEnvironment: input.derivedEnvironment ?? day1.derivedEnvironment ?? null,
      contextEvidence: input.contextEvidence ?? null,
      outcomeEvidence: input.outcomeEvidence ?? null,
    },
    eventWindow: decision.eventWindow ?? null,
    noInterventionReason: decision.noInterventionReason ?? null,
    legacyTrace: {
      legacyMappingsUsed: day1.source?.legacyMappingsUsed ?? [],
    },
  };

  return candidate;
}

export default assembleInterventionCandidate;
