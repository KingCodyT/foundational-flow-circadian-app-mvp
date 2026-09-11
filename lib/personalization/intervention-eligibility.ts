import { InterventionDecision } from "./intervention";
import { CoachingState } from "./types";

export type RecentInterventionMeta = {
  lastAt?: string;
  type?: string;
  // Caller may mark whether this recent intervention should be considered recent for redundancy checks
  isRecent?: boolean;
};

export type InterventionEligibilityInput = {
  decision: InterventionDecision;
  now?: Date;
  derivedEnvironment?: any;
  contextEvidence?: Record<string, any> | null;
  outcomeEvidence?: Record<string, any> | null;
  coachingState?: CoachingState | null;
  confidenceScore?: number | null;
  recentIntervention?: RecentInterventionMeta | null;
  actionabilityOverride?: boolean | null;
};

export type InterventionEligibilityResult = {
  status: "ALLOW" | "DOWNGRADE" | "SUPPRESS";
  originalLevel: number;
  finalLevel: 0 | 1 | 2 | 3 | 4;
  reason: string;
  suppressionReason?: string | null;
  downgradeReason?: string | null;
  interruptionEligible: boolean;
  actionableNow: boolean;
  redundant: boolean;
  biologicallyRelevantNow: boolean;
  contextLimited: boolean;
  noDeliveryReason?: string | null;
};

function inWindow(now: Date, window?: { start?: string | null; end?: string | null } | null) {
  if (!window) return false;
  const s = window.start ? new Date(window.start) : null;
  const e = window.end ? new Date(window.end) : null;
  if (s && e) return now >= s && now <= e;
  if (s && !e) return now >= s;
  if (!s && e) return now <= e;
  return false;
}

export function evaluateInterventionEligibility(input: InterventionEligibilityInput): InterventionEligibilityResult {
  const now = input.now ?? new Date();
  const decision = input.decision;
  const originalLevel = decision.level;
  let finalLevel = originalLevel as 0|1|2|3|4;
  let status: "ALLOW" | "DOWNGRADE" | "SUPPRESS" = "ALLOW";
  let reason = "allowed_by_default";
  let suppressionReason: string | null = null;
  let downgradeReason: string | null = null;
  let redundant = false;

  const biologicallyRelevantNow = decision.biologicallyRelevantNow ?? false;
  let actionableNow = decision.actionableNow ?? true;
  if (input.actionabilityOverride === false) actionableNow = false;
  if (input.contextEvidence && (input.contextEvidence as any).infeasible === true) actionableNow = false;

  const contextLimited = !actionableNow;

  // 1) No target -> suppress active coaching (Levels 2/3)
  if (!decision.targetSignalId) {
    if (originalLevel >= 2) {
      finalLevel = 0;
      status = "SUPPRESS";
      reason = "no_target_suppress_active_coaching";
      suppressionReason = "no_primary_target";
      return buildResult();
    }
    // allow Level1 / 0
    finalLevel = Math.min(originalLevel, 1) as 0|1;
    status = finalLevel === originalLevel ? "ALLOW" : "DOWNGRADE";
    reason = "no_target_context_level_adjust";
    if (status === "DOWNGRADE") downgradeReason = "no_primary_target";
    return buildResult();
  }

  // 2) Past/future timing: if event window exists, treat stale/future
  const window = decision.eventWindow ?? null;
  if (window) {
    const start = window.start ? new Date(window.start) : null;
    const end = window.end ? new Date(window.end) : null;
    if (end && now > end) {
      // Past window
      if (originalLevel === 3) {
        finalLevel = 2;
        status = "DOWNGRADE";
        downgradeReason = "event_window_passed";
        reason = "stale_event_downgrade";
        return buildResult();
      }
      if (originalLevel > 0) {
        finalLevel = Math.min(originalLevel, 1) as 0|1;
        status = finalLevel === originalLevel ? "ALLOW" : "DOWNGRADE";
        downgradeReason = "event_window_passed";
        reason = "stale_event_adjust";
        return buildResult();
      }
    }

    if (start && now < start) {
      // Future window
      if (originalLevel === 3) {
        finalLevel = 1;
        status = "DOWNGRADE";
        downgradeReason = "event_window_not_started";
        reason = "future_event_downgrade";
        return buildResult();
      }
      if (originalLevel > 1) {
        finalLevel = Math.min(originalLevel, 1) as 0|1;
        status = finalLevel === originalLevel ? "ALLOW" : "DOWNGRADE";
        downgradeReason = "event_window_not_started";
        reason = "future_event_adjust";
        return buildResult();
      }
    }
  }

  // 3) Not biologically relevant now
  if (!biologicallyRelevantNow) {
    if (originalLevel >= 3) {
      // downgrade to quiet guidance or context
      finalLevel = 1;
      status = "DOWNGRADE";
      downgradeReason = "not_biologically_relevant_now";
      reason = "no_biological_relevance";
      return buildResult();
    }
    // for Level2, downgrade to Level1
    if (originalLevel === 2) {
      finalLevel = 1;
      status = "DOWNGRADE";
      downgradeReason = "not_biologically_relevant_now";
      reason = "no_biological_relevance";
      return buildResult();
    }
  }

  // 4) Not actionable
  if (!actionableNow) {
    if (originalLevel === 3) {
      finalLevel = 2;
      status = "DOWNGRADE";
      downgradeReason = "not_actionable_now";
      reason = "infeasible_action";
      return buildResult();
    }
    if (originalLevel === 2) {
      finalLevel = 1;
      status = "DOWNGRADE";
      downgradeReason = "not_actionable_now";
      reason = "infeasible_action";
      return buildResult();
    }
  }

  // 5) Established signal -> suppress active coaching above Level1
  if (input.coachingState === CoachingState.ESTABLISHED) {
    if (originalLevel >= 2) {
      finalLevel = 1;
      status = originalLevel === finalLevel ? "ALLOW" : "SUPPRESS";
      reason = "established_signal_reduce_intensity";
      suppressionReason = "signal_established";
      // choose SUPPRESS when originalLevel >=2 and we lowered it
      if (originalLevel > finalLevel) status = "SUPPRESS";
      return buildResult();
    }
  }

  // 6) Developing signal: if Level3 proposed, require biologicallyRelevantNow && actionableNow
  if (input.coachingState === CoachingState.DEVELOPING && originalLevel === 3) {
    if (!(biologicallyRelevantNow && actionableNow)) {
      finalLevel = 2;
      status = "DOWNGRADE";
      downgradeReason = "developing_require_timing_actionability";
      reason = "developing_downrank";
      return buildResult();
    }
  }
  // 7) Low/unknown confidence: prefer downgrade for low confidence even for Level3 proposals
  if (input.confidenceScore != null && input.confidenceScore < 0.3 && originalLevel >= 3) {
    finalLevel = 2;
    status = "DOWNGRADE";
    downgradeReason = "low_confidence_prefer_downgrade";
    reason = "low_confidence";
    return buildResult();
  }

  // 8) Needs Attention: allow Level3 when biologicallyRelevantNow && actionableNow
  if (input.coachingState === CoachingState.NEEDS_ATTENTION && originalLevel === 3) {
    if (biologicallyRelevantNow && actionableNow) {
      // check redundancy
      if (input.recentIntervention && input.recentIntervention.isRecent === true) {
        // treat as redundant -> downgrade
        finalLevel = 2;
        status = "DOWNGRADE";
        downgradeReason = "redundant_recent_intervention";
        reason = "redundancy_detected";
        redundant = true;
        return buildResult();
      }
      // if no recentIntervention metadata, conservatively allow (history unknown)
      return buildResult();
    }
    // otherwise fallback to Level2
    finalLevel = 2;
    status = "DOWNGRADE";
    downgradeReason = "needs_attention_not_time_critical";
    reason = "needs_attention_not_time_critical";
    return buildResult();
  }

  // 9) Redundancy when history provided
  if (input.recentIntervention && input.recentIntervention.isRecent === true) {
    // for any proposed Level >=3, downgrade to 2
    if (originalLevel >= 3) {
      finalLevel = 2;
      status = "DOWNGRADE";
      redundant = true;
      downgradeReason = "recent_intervention_metadata";
      reason = "redundancy_based_on_history";
      return buildResult();
    }
  }

  // default: allow
  return buildResult();

  function buildResult(): InterventionEligibilityResult {
    return {
      status,
      originalLevel,
      finalLevel,
      reason,
      suppressionReason,
      downgradeReason,
      interruptionEligible: finalLevel >= 3,
      actionableNow,
      redundant,
      biologicallyRelevantNow,
      contextLimited,
      noDeliveryReason: status === "SUPPRESS" ? suppressionReason : undefined,
    };
  }
}

export default evaluateInterventionEligibility;
