import {
  SignalClassification,
  SignalDefinition,
  SignalSourceType,
  HierarchyLayer,
} from "./types";

// Canonical signal registry (Phase 1A)
// This registry maps the current Audit question IDs (where applicable)
// and the locked personalization signals described in
// docs/personalization/light-domain-spec.md

export const SIGNAL_REGISTRY: Record<string, SignalDefinition> = {
  // Morning / Anchor
  morning_light_timing: {
    id: "morning_light_timing",
    label: "Morning Light Timing Priority",
    classification: SignalClassification.BEHAVIOR,
    hierarchy: HierarchyLayer.MORNING_LIGHT_CIRCADIAN_ANCHOR,
    source: [SignalSourceType.QUESTIONNAIRE],
    questionId: "morning_light_timing",
    coachingEligible: true,
    isOutcome: false,
    isContextConstraint: false,
    isDerivedEnvironment: false,
    description:
      "How soon after waking the user gets outside or into bright natural light (audit-derived).",
  },

  morning_light_duration: {
    id: "morning_light_duration",
    label: "Morning Light Exposure / Dose",
    classification: SignalClassification.BEHAVIOR,
    hierarchy: HierarchyLayer.MORNING_LIGHT_CIRCADIAN_ANCHOR,
    source: [SignalSourceType.QUESTIONNAIRE],
    questionId: "morning_light_duration",
    coachingEligible: true,
    isOutcome: false,
    isContextConstraint: false,
    isDerivedEnvironment: false,
    description: "Approximate morning light dose (audit-derived).",
  },

  morning_movement: {
    id: "morning_movement",
    label: "Morning Movement Optimization",
    classification: SignalClassification.BEHAVIOR,
    hierarchy: HierarchyLayer.OPTIMIZATION,
    source: [SignalSourceType.QUESTIONNAIRE],
    questionId: "morning_movement",
    coachingEligible: true,
    isOutcome: false,
    isContextConstraint: false,
    isDerivedEnvironment: false,
    description:
      "Pairing movement with morning light — an optimization layer (audit-derived).",
  },

  // Daytime
  day_brightness: {
    id: "day_brightness",
    label: "Daytime Light Strength Priority",
    classification: SignalClassification.BEHAVIOR,
    hierarchy: HierarchyLayer.DAYTIME_LIGHT_ENVIRONMENT,
    source: [SignalSourceType.QUESTIONNAIRE],
    questionId: "day_brightness",
    coachingEligible: true,
    isOutcome: false,
    isContextConstraint: false,
    isDerivedEnvironment: false,
    description: "Subjective daytime environment brightness (audit-derived).",
  },

  day_breaks_outside: {
    id: "day_breaks_outside",
    label: "Daytime Outdoor Exposure",
    classification: SignalClassification.BEHAVIOR,
    hierarchy: HierarchyLayer.DAYTIME_LIGHT_ENVIRONMENT,
    source: [SignalSourceType.QUESTIONNAIRE],
    questionId: "day_breaks_outside",
    coachingEligible: true,
    isOutcome: false,
    isContextConstraint: false,
    isDerivedEnvironment: false,
    description: "Midday daylight breaks / outdoor exposure (audit-derived).",
  },

  // Meal timing (note: questionnaire currently conflates meal/activity; map to meal timing)
  meal_timing_regularity: {
    id: "meal_timing_regularity",
    label: "Meal Timing Regularity",
    classification: SignalClassification.BEHAVIOR,
    hierarchy: HierarchyLayer.MEAL_TIMING,
    source: [SignalSourceType.QUESTIONNAIRE],
    // Legacy/provisional mapping to the historically conflated questionnaire item
    questionId: "day_meal_regular",
    coachingEligible: true,
    isOutcome: false,
    isContextConstraint: false,
    isDerivedEnvironment: false,
    legacyMapping: true,
    description:
      "Canonical MEAL_TIMING_REGULARITY. The questionnaire item historically conflates meal timing and activity; the activity portion is NOT part of this canonical signal.",
  },

  // Evening / Night
  evening_light_reduction: {
    id: "evening_light_reduction",
    label: "Evening Light Transition Priority",
    classification: SignalClassification.BEHAVIOR,
    hierarchy: HierarchyLayer.EVENING_LIGHT_DARKNESS,
    source: [SignalSourceType.QUESTIONNAIRE],
    questionId: "evening_light_reduction",
    coachingEligible: true,
    isOutcome: false,
    isContextConstraint: false,
    isDerivedEnvironment: false,
    description:
      "Degree to which lights are dimmed in the 2–3 hours before bed (audit-derived).",
  },

  evening_screen_exposure: {
    id: "evening_screen_exposure",
    label: "Evening Artificial Light / Screen Exposure",
    classification: SignalClassification.BEHAVIOR,
    hierarchy: HierarchyLayer.OPTIMIZATION,
    source: [SignalSourceType.QUESTIONNAIRE],
    questionId: "evening_screen_exposure",
    coachingEligible: true,
    isOutcome: false,
    isContextConstraint: false,
    isDerivedEnvironment: false,
    description:
      "Screen and close-range device exposure after sunset (audit-derived); treated as an optimization.",
  },

  bedroom_darkness: {
    id: "bedroom_darkness",
    label: "Sleep Environment / Bedroom Darkness",
    classification: SignalClassification.CONTEXT_CONSTRAINT,
    source: [SignalSourceType.QUESTIONNAIRE],
    questionId: "bedroom_darkness",
    coachingEligible: false,
    isOutcome: false,
    isContextConstraint: true,
    isDerivedEnvironment: false,
    description:
      "Darkness of the bedroom while sleeping — primarily an environmental correction / context signal.",
  },

  // Sleep timing / outcomes
  sleep_schedule: {
    id: "sleep_schedule",
    label: "Sleep-Wake Timing Stability",
    classification: SignalClassification.BEHAVIOR,
    hierarchy: HierarchyLayer.SLEEP_OPPORTUNITY_TIMING,
    source: [SignalSourceType.QUESTIONNAIRE],
    questionId: "sleep_schedule",
    coachingEligible: true,
    isOutcome: false,
    isContextConstraint: false,
    isDerivedEnvironment: false,
    description: "Consistency of bedtime and wake time (audit-derived).",
  },

  sleep_duration: {
    id: "sleep_duration",
    label: "Sleep Sufficiency",
    classification: SignalClassification.OUTCOME,
    source: [SignalSourceType.QUESTIONNAIRE],
    questionId: "sleep_duration",
    coachingEligible: false,
    isOutcome: true,
    isContextConstraint: false,
    isDerivedEnvironment: false,
    description:
      "Self-reported sufficiency of total sleep — treated as an outcome/diagnostic amplifier.",
  },

  sleep_latency: {
    id: "sleep_latency",
    label: "Sleep Initiation Signal",
    classification: SignalClassification.OUTCOME,
    source: [SignalSourceType.QUESTIONNAIRE],
    questionId: "sleep_latency",
    coachingEligible: false,
    isOutcome: true,
    isContextConstraint: false,
    isDerivedEnvironment: false,
    description: "How easily the user falls asleep once intending to sleep (audit-derived).",
  },

  // Disruption / constraints
  travel_schedule_variability: {
    id: "travel_schedule_variability",
    label: "Schedule Constraint Profile (frequency)",
    classification: SignalClassification.CONTEXT_CONSTRAINT,
    source: [SignalSourceType.QUESTIONNAIRE],
    questionId: "travel_schedule_variability",
    coachingEligible: false,
    isOutcome: false,
    isContextConstraint: true,
    isDerivedEnvironment: false,
    legacyMapping: true,
    description:
      "Legacy/provisional frequency score. Future architecture will use a richer Schedule Constraint Profile (travel, shift work, variable schedules). This questionnaire item is NOT behavioral performance.",
  },

  // Canonical Last Meal Timing — legacy questionnaire slot maps here provisionally
  last_meal_timing: {
    id: "last_meal_timing",
    label: "Last Meal Timing",
    classification: SignalClassification.BEHAVIOR,
    hierarchy: HierarchyLayer.MEAL_TIMING,
    source: [SignalSourceType.QUESTIONNAIRE],
    // Legacy/provisional mapping from the conflated questionnaire item
    questionId: "late_meals_stimulants",
    coachingEligible: true,
    isOutcome: false,
    isContextConstraint: false,
    isDerivedEnvironment: false,
    legacyMapping: true,
    description:
      "Canonical LAST_MEAL_TIMING. The live questionnaire currently conflates alcohol/stimulants with late meals; alcohol and stimulants are NOT part of this canonical signal and their future role is UNRESOLVED.",
  },

  stress_winddown: {
    id: "stress_winddown",
    label: "Pre-Sleep Activation Signal",
    classification: SignalClassification.OUTCOME,
    source: [SignalSourceType.QUESTIONNAIRE],
    questionId: "stress_winddown",
    coachingEligible: false,
    isOutcome: true,
    isContextConstraint: false,
    isDerivedEnvironment: false,
    description:
      "Self-reported wind-down / pre-sleep activation — used as diagnostic outcome information.",
  },

  // Location / season (spec indicates these should be derived; keep questionId for now)
  season_daylight: {
    id: "season_daylight",
    label: "Seasonal Daylight Context",
    classification: SignalClassification.DERIVED_ENVIRONMENT,
    source: [SignalSourceType.DERIVED, SignalSourceType.QUESTIONNAIRE],
    questionId: "season_daylight",
    coachingEligible: false,
    isOutcome: false,
    isContextConstraint: true,
    isDerivedEnvironment: true,
    legacyMapping: true,
    description:
      "DERIVED_ENVIRONMENT canonical signal. The questionnaire entry is legacy-only for historical compatibility; future personalization must derive this from location/date/solar context.",
  },

  location_latitude: {
    id: "location_latitude",
    label: "Latitude / Seasonal Variability Context",
    classification: SignalClassification.DERIVED_ENVIRONMENT,
    source: [SignalSourceType.DERIVED, SignalSourceType.QUESTIONNAIRE],
    questionId: "location_latitude",
    coachingEligible: false,
    isOutcome: false,
    isContextConstraint: true,
    isDerivedEnvironment: true,
    legacyMapping: true,
    description:
      "DERIVED_ENVIRONMENT canonical signal. The questionnaire entry is legacy-only for historical compatibility; future personalization must derive latitude/context from location.",
  },

  home_environment_support: {
    id: "home_environment_support",
    label: "Environmental Control / Constraint Profile",
    classification: SignalClassification.CONTEXT_CONSTRAINT,
    source: [SignalSourceType.QUESTIONNAIRE],
    questionId: "home_environment_support",
    coachingEligible: false,
    isOutcome: false,
    isContextConstraint: true,
    isDerivedEnvironment: false,
    description:
      "User-reported environmental control (ability to shape home light for mornings/evenings).",
  },
};

export function getSignalByQuestionId(questionId?: string | null) {
  if (!questionId) return undefined;
  return Object.values(SIGNAL_REGISTRY).find((s) => s.questionId === questionId);
}

export const SIGNAL_IDS = Object.keys(SIGNAL_REGISTRY) as string[];
