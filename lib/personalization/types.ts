export enum SignalClassification {
  BEHAVIOR = "BEHAVIOR",
  OUTCOME = "OUTCOME",
  CONTEXT_CONSTRAINT = "CONTEXT_CONSTRAINT",
  DERIVED_ENVIRONMENT = "DERIVED_ENVIRONMENT",
}

export enum SignalSourceType {
  QUESTIONNAIRE = "QUESTIONNAIRE",
  DERIVED = "DERIVED",
  USER_FEEDBACK = "USER_FEEDBACK",
  SYSTEM_CONTEXT = "SYSTEM_CONTEXT",
}

export enum CoachingState {
  NEEDS_ATTENTION = "NEEDS_ATTENTION",
  DEVELOPING = "DEVELOPING",
  ESTABLISHED = "ESTABLISHED",
  DISRUPTED = "DISRUPTED",
}

export enum HierarchyLayer {
  MORNING_LIGHT_CIRCADIAN_ANCHOR = "MORNING_LIGHT_CIRCADIAN_ANCHOR",
  DAYTIME_LIGHT_ENVIRONMENT = "DAYTIME_LIGHT_ENVIRONMENT",
  EVENING_LIGHT_DARKNESS = "EVENING_LIGHT_DARKNESS",
  SLEEP_OPPORTUNITY_TIMING = "SLEEP_OPPORTUNITY_TIMING",
  OPTIMIZATION = "OPTIMIZATION",
  MEAL_TIMING = "MEAL_TIMING",
  NONE = "NONE",
}

// Internal confidence representation. Score is a 0..1 value representing
// internal certainty. This file defines the shape only; calculation/decay
// are intentionally out of scope for Phase 1A.
export interface Confidence {
  // 0 = no confidence, 1 = maximal confidence
  score: number;
  // ISO timestamp of the last piece of evidence that contributed
  lastEvidenceAt?: string;
  // Optional provenance notes (questionId, eventId, freeform)
  sources?: string[];
}

export interface SignalDefinition {
  // Stable signal id used throughout the personalization surface
  id: string;
  // Human readable label
  label: string;
  // Primary classification (behavior/outcome/context/derived)
  classification: SignalClassification;
  // Biological hierarchy layer when the signal is a behavior; omit for non-behavioral signals
  hierarchy?: HierarchyLayer;
  // One or more source types describing where evidence may come from
  source: SignalSourceType[];
  // If the signal currently maps to an Audit question, record its questionId
  questionId?: string | null;
  // Whether this signal is eligible to receive a coaching state
  coachingEligible: boolean;
  // Whether this signal is primarily an outcome/evidence signal
  isOutcome?: boolean;
  // Whether this signal is a context/constraint modifier
  isContextConstraint?: boolean;
  // Whether this signal represents derived environment (solar/geo/season)
  isDerivedEnvironment?: boolean;
  // Optional short description (for authors/devs)
  description?: string;
  // Whether this registry entry maps to a legacy questionnaire item
  // and should be treated as a historical/provisional mapping only.
  legacyMapping?: boolean;
}

export type SignalRegistry = Record<string, SignalDefinition>;

export const isBehavioral = (s: SignalDefinition) =>
  s.classification === SignalClassification.BEHAVIOR;
