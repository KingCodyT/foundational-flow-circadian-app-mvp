import buildInitialPersonalizationState from "./initial-state";
import assignInitialConfidence from "./initial-confidence";
import selectPrimaryCoachingTarget from "./primary-target";
import { DerivedEnvironment } from "./derived-environment";
import { AnswerMap } from "@/types/circadian";

export type Day1PersonalizationResult = {
  generatedAt: string;
  signalStates: ReturnType<typeof buildInitialPersonalizationState>["perSignal"];
  derivedEnvironment?: DerivedEnvironment | null;
  primaryCoachingTarget: ReturnType<typeof selectPrimaryCoachingTarget>;
  source: {
    answersPresent: boolean;
    legacyMappingsUsed: string[]; // questionIds used that were legacy/provisional
  };
};

export function assembleDay1Personalization(opts: { answers: AnswerMap; derivedEnvironment?: DerivedEnvironment | null; }) : Day1PersonalizationResult {
  const { answers, derivedEnvironment = null } = opts;
  // 1) Build initial signal states from assessment
  const initial = buildInitialPersonalizationState({ answers, derivedEnvironment });

  // 2) Assign initial confidence (mutates perSignal in returned object immutably)
  const withConfidence = assignInitialConfidence(initial);

  // 3) Select primary coaching target using Phase 2B selector
  const primary = selectPrimaryCoachingTarget(withConfidence);

  // 4) Collect legacy mappings used for traceability
  const legacyMappingsUsed: string[] = [];
  for (const s of Object.values(withConfidence.perSignal)) {
    (s.evidence ?? []).forEach((ev) => {
      if (ev.legacyMapping && ev.questionId) legacyMappingsUsed.push(ev.questionId);
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    signalStates: withConfidence.perSignal,
    derivedEnvironment: withConfidence.derivedEnvironment ?? derivedEnvironment ?? null,
    primaryCoachingTarget: primary,
    source: {
      answersPresent: Object.keys(answers ?? {}).length > 0,
      legacyMappingsUsed: Array.from(new Set(legacyMappingsUsed)),
    },
  };
}

export default assembleDay1Personalization;
