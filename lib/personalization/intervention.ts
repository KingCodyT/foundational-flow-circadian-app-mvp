import { PrimaryCoachingTargetResult } from "./primary-target";
import { DerivedEnvironment } from "./derived-environment";
import { CoachingState } from "./types";

export type InterventionDecisionInput = {
  primary: PrimaryCoachingTargetResult | null;
  derivedEnvironment?: DerivedEnvironment | null;
  // context/constraint evidence and outcome evidence are passed through for traceability
  contextEvidence?: Record<string, any> | null;
  outcomeEvidence?: Record<string, any> | null;
  // optional explicit event window (ISO strings) indicating biologically relevant timing
  eventWindow?: { start?: string | null; end?: string | null } | null;
  // optional explicit flag indicating a material contextual disruption (caller must detect)
  materialDisruption?: boolean;
  // optional recent intervention metadata if available to support novelty checks
  recentIntervention?: { lastAt?: string; type?: string } | null;
  // optional explicit actionability override (true = actionable, false = infeasible)
  actionabilityOverride?: boolean | null;
};

export type InterventionDecision = {
  level: 0 | 1 | 2 | 3 | 4;
  targetSignalId: string | null;
  reason: string;
  biologicallyRelevantNow: boolean;
  actionableNow: boolean;
  interruptionEligible: boolean;
  supportingContext?: {
    derivedEnvironment?: DerivedEnvironment | null;
    contextEvidence?: Record<string, any> | null;
    outcomeEvidence?: Record<string, any> | null;
  };
  eventWindow?: { start?: string | null; end?: string | null } | null;
  noInterventionReason?: string | null;
};

// Pure, deterministic intervention decision function per Phase 3A rules.
export function decideIntervention(input: InterventionDecisionInput): InterventionDecision {
  const now = new Date();
  const primary = input.primary;

  // Helper: determine if now is within provided eventWindow
  const inEventWindow = (() => {
    if (!input.eventWindow) return false;
    const s = input.eventWindow.start ? new Date(input.eventWindow.start) : null;
    const e = input.eventWindow.end ? new Date(input.eventWindow.end) : null;
    if (s && e) return now >= s && now <= e;
    if (s && !e) return now >= s;
    if (!s && e) return now <= e;
    return false;
  })();

  // If explicit material disruption -> Level 4 capability
  if (input.materialDisruption) {
    return {
      level: 4,
      targetSignalId: primary?.signalId ?? null,
      reason: "material_contextual_disruption",
      biologicallyRelevantNow: false,
      actionableNow: false,
      interruptionEligible: true,
      supportingContext: {
        derivedEnvironment: input.derivedEnvironment ?? null,
        contextEvidence: input.contextEvidence ?? null,
        outcomeEvidence: input.outcomeEvidence ?? null,
      },
      eventWindow: input.eventWindow ?? null,
    };
  }

  // No primary coaching target -> consider Level 1 if environmental context present, otherwise Level 0
  if (!primary || !primary.signalId) {
    // If derived environment has relevant solar times, emit Level 1 (quiet context)
    const hasSolar = Boolean(input.derivedEnvironment && (input.derivedEnvironment.sunrise || input.derivedEnvironment.sunset || input.derivedEnvironment.civilDawn || input.derivedEnvironment.civilDusk));
    if (hasSolar) {
      return {
        level: 1,
        targetSignalId: null,
        reason: "context_only_solar_present",
        biologicallyRelevantNow: false,
        actionableNow: false,
        interruptionEligible: false,
        supportingContext: {
          derivedEnvironment: input.derivedEnvironment ?? null,
          contextEvidence: input.contextEvidence ?? null,
          outcomeEvidence: input.outcomeEvidence ?? null,
        },
        eventWindow: input.eventWindow ?? null,
      };
    }

    return {
      level: 0,
      targetSignalId: null,
      reason: "no_target_no_context",
      biologicallyRelevantNow: false,
      actionableNow: false,
      interruptionEligible: false,
      supportingContext: {
        derivedEnvironment: input.derivedEnvironment ?? null,
        contextEvidence: input.contextEvidence ?? null,
        outcomeEvidence: input.outcomeEvidence ?? null,
      },
      eventWindow: input.eventWindow ?? null,
      noInterventionReason: "no_primary_target",
    };
  }

  // We have a primary target
  const coachingState = primary.coachingState;
  const confidence = primary && (primary as any).confidence ? (primary as any).confidence : null; // optional

  // Determine biological relevance conservatively: only mark true when an eventWindow is provided and now is inside it.
  const biologicallyRelevantNow = inEventWindow;

  // Determine actionability: override if explicit provided; otherwise assume actionable unless contextEvidence indicates infeasible (caller-detected)
  let actionableNow = true;
  if (input.actionabilityOverride === false) actionableNow = false;
  // If context evidence contains explicit 'infeasible' flag, consider not actionable
  if (input.contextEvidence && (input.contextEvidence as any).infeasible === true) actionableNow = false;

  // If coaching state is ESTABLISHED, prefer silence or quiet context
  if (coachingState === CoachingState.ESTABLISHED) {
    const hasSolar = Boolean(input.derivedEnvironment && (input.derivedEnvironment.sunrise || input.derivedEnvironment.sunset || input.derivedEnvironment.civilDawn || input.derivedEnvironment.civilDusk));
    return {
      level: hasSolar ? 1 : 0,
      targetSignalId: primary.signalId,
      reason: "established_signal_no_intervention",
      biologicallyRelevantNow: biologicallyRelevantNow,
      actionableNow: actionableNow,
      interruptionEligible: false,
      supportingContext: {
        derivedEnvironment: input.derivedEnvironment ?? null,
        contextEvidence: input.contextEvidence ?? null,
        outcomeEvidence: input.outcomeEvidence ?? null,
      },
      eventWindow: input.eventWindow ?? null,
      noInterventionReason: "signal_established",
    };
  }

  // For DEVELOPING or NEEDS_ATTENTION
  // If not actionable, avoid Level 3; prefer Level 1 or 2
  if (!actionableNow) {
    return {
      level: 2,
      targetSignalId: primary.signalId,
      reason: "not_actionable_now_fallback_guidance",
      biologicallyRelevantNow: biologicallyRelevantNow,
      actionableNow: false,
      interruptionEligible: false,
      supportingContext: {
        derivedEnvironment: input.derivedEnvironment ?? null,
        contextEvidence: input.contextEvidence ?? null,
        outcomeEvidence: input.outcomeEvidence ?? null,
      },
      eventWindow: input.eventWindow ?? null,
      noInterventionReason: "infeasible_action",
    };
  }

  // If biologically relevant now and actionable, consider Level 3 for NEEDS_ATTENTION, Level 2 for DEVELOPING
  if (biologicallyRelevantNow) {
    if (coachingState === CoachingState.NEEDS_ATTENTION) {
      // When biologically relevant and actionable, Phase 3A MAY propose Level 3 even if novelty/recency is unknown.
      // Product decision: proposal intensity reflects biology; Phase 3B may later downgrade/suppress.
      return {
        level: 3,
        targetSignalId: primary.signalId,
        reason: "needs_attention_biologically_relevant_actionable",
        biologicallyRelevantNow: true,
        actionableNow: true,
        interruptionEligible: true,
        supportingContext: {
          derivedEnvironment: input.derivedEnvironment ?? null,
          contextEvidence: input.contextEvidence ?? null,
          outcomeEvidence: input.outcomeEvidence ?? null,
        },
        eventWindow: input.eventWindow ?? null,
      };
    }

    if (coachingState === CoachingState.DEVELOPING) {
      return {
        level: 2,
        targetSignalId: primary.signalId,
        reason: "developing_biologically_relevant_guidance",
        biologicallyRelevantNow: true,
        actionableNow: true,
        interruptionEligible: false,
        supportingContext: {
          derivedEnvironment: input.derivedEnvironment ?? null,
          contextEvidence: input.contextEvidence ?? null,
          outcomeEvidence: input.outcomeEvidence ?? null,
        },
        eventWindow: input.eventWindow ?? null,
      };
    }
  }

  // If not biologically relevant now but actionable and coaching state indicates need, provide Level 2 guidance
  if (coachingState === CoachingState.NEEDS_ATTENTION) {
    return {
      level: 2,
      targetSignalId: primary.signalId,
      reason: "needs_attention_not_time_critical_guidance",
      biologicallyRelevantNow: false,
      actionableNow: true,
      interruptionEligible: false,
      supportingContext: {
        derivedEnvironment: input.derivedEnvironment ?? null,
        contextEvidence: input.contextEvidence ?? null,
        outcomeEvidence: input.outcomeEvidence ?? null,
      },
      eventWindow: input.eventWindow ?? null,
    };
  }

  // Default fallback: Level 1 contextual info
  return {
    level: 1,
    targetSignalId: primary.signalId,
    reason: "fallback_quiet_context",
    biologicallyRelevantNow: biologicallyRelevantNow,
    actionableNow: actionableNow,
    interruptionEligible: false,
    supportingContext: {
      derivedEnvironment: input.derivedEnvironment ?? null,
      contextEvidence: input.contextEvidence ?? null,
      outcomeEvidence: input.outcomeEvidence ?? null,
    },
    eventWindow: input.eventWindow ?? null,
  };
}

export default decideIntervention;
