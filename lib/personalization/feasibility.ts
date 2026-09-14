export enum ActionFeasibility {
  FEASIBLE = "FEASIBLE",
  INFEASIBLE = "INFEASIBLE",
}

export type FeasibilityCheckInput = {
  infeasible?: boolean | null;
  reason?: string | null;
  fallbackAction?: string | null;
};

export type FeasibilityCheckResult = {
  status: ActionFeasibility;
  reason?: string | null;
  fallbackAction?: string | null;
};

export function evaluateActionFeasibility(
  context: FeasibilityCheckInput | null | undefined,
  action?: string | null,
): FeasibilityCheckResult {
  const normalizedAction = action ?? null;
  const infeasible = Boolean(context && context.infeasible === true);

  if (!infeasible) {
    return {
      status: ActionFeasibility.FEASIBLE,
      reason: context?.reason ?? null,
      fallbackAction: context?.fallbackAction ?? null,
    };
  }

  return {
    status: ActionFeasibility.INFEASIBLE,
    reason: context?.reason ?? (normalizedAction ? "action_infeasible" : "unknown_action_infeasible"),
    fallbackAction: context?.fallbackAction ?? null,
  };
}

export default evaluateActionFeasibility;
