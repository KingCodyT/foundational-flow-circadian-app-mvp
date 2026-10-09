import { InitialPersonalizationState } from "./initial-state";
import {
  assessReconsideration,
  ContextSnapshot,
  SignalEvidenceFragment,
  SignalReconsideration,
} from "./reconsideration";

export type AssessmentEvidenceHistory = Record<string, SignalEvidenceFragment[]>;

export type ReconsiderationApplicationResult = {
  state: InitialPersonalizationState;
  reconsiderations: Record<string, SignalReconsideration>;
};

function evidenceKey(evidence: SignalEvidenceFragment) {
  return JSON.stringify({
    questionId: evidence.questionId ?? null,
    answer: evidence.answer ?? null,
    status: evidence.status ?? null,
    source: [...(evidence.source ?? [])].sort(),
  });
}

export function recordAssessmentAnswerChange(
  history: AssessmentEvidenceHistory | null | undefined,
  signalId: string,
  questionId: string,
  previousAnswer: string | null | undefined,
  nextAnswer: string,
): AssessmentEvidenceHistory {
  if (!previousAnswer || previousAnswer === nextAnswer) return history ?? {};

  const nextHistory = { ...(history ?? {}) };
  const existing = [...(nextHistory[signalId] ?? [])];
  const additions = [previousAnswer, nextAnswer].map((answer) => ({
    questionId,
    answer,
    source: ["QUESTIONNAIRE"],
  }));
  const seen = new Set(existing.map(evidenceKey));

  for (const evidence of additions) {
    const key = evidenceKey(evidence);
    if (!seen.has(key)) {
      existing.push(evidence);
      seen.add(key);
    }
  }

  nextHistory[signalId] = existing;
  return nextHistory;
}

export function applyReconsideration(opts: {
  state: InitialPersonalizationState;
  priorContext?: ContextSnapshot | null;
  currentContext?: ContextSnapshot | null;
  evidenceHistory?: AssessmentEvidenceHistory | null;
}): ReconsiderationApplicationResult {
  const signalIds = Object.keys(opts.state.perSignal ?? {});
  const signalEvidence: Record<string, SignalEvidenceFragment[]> = {};

  for (const [signalId, signal] of Object.entries(opts.state.perSignal ?? {})) {
    signalEvidence[signalId] = [
      ...(signal.evidence ?? []).map((evidence) => ({
        questionId: evidence.questionId,
        answer: evidence.answer,
        source: evidence.source,
      })),
      ...(opts.evidenceHistory?.[signalId] ?? []),
    ];
  }

  const reconsiderations = assessReconsideration({
    priorContext: opts.priorContext,
    currentContext: opts.currentContext,
    signalEvidence,
    signalIds,
  });

  const perSignal = { ...opts.state.perSignal };
  for (const [signalId, reconsideration] of Object.entries(reconsiderations)) {
    if (!reconsideration.shouldReconsider) continue;

    const signal = perSignal[signalId];
    if (!signal) continue;

    const evidence = signalEvidence[signalId] ?? [];
    const uniqueEvidence = Array.from(new Map(evidence.map((item) => [evidenceKey(item), item])).values());
    perSignal[signalId] = {
      ...signal,
      reconsideration: {
        ...reconsideration,
        status: "pending",
        shouldReconsider: true,
        evidence: uniqueEvidence,
      },
    };
  }

  return {
    state: {
      ...opts.state,
      perSignal,
    },
    reconsiderations,
  };
}
