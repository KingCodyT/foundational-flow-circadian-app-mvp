import { AnswerMap, DailyEventState } from "@/types/circadian";
import { DerivedEnvironment } from "./derived-environment";
import { buildInitialPersonalizationState, InitialPersonalizationState, InitialSignalState } from "./initial-state";
import { assignInitialConfidence } from "./initial-confidence";
import { applyDailyEvidence, summarizeDailyEvidence } from "./daily-evidence";
import { applyReconsideration, AssessmentEvidenceHistory, recordAssessmentAnswerChange } from "./reconsideration-application";
import { ContextSnapshot } from "./reconsideration";
import { SignalClassification } from "./types";
import { SIGNAL_REGISTRY } from "./signal-registry";

type Pending = NonNullable<InitialSignalState["reconsideration"]>;
export type PersonalizationRuntime = {
  version: 1;
  state: InitialPersonalizationState;
  baselines: Record<string, ContextSnapshot>;
  observedAnswers: AnswerMap;
  acceptedAnswers: AnswerMap;
  history: AssessmentEvidenceHistory;
  acknowledgedHistory: Record<string, string>;
  evidenceKeys: Record<string, string>;
  resolutions: Array<{ status: "resolved"; signalId: string; resolvedAt: string; review: Pending; priorSignal: InitialSignalState }>;
  inputKey: string;
};

export type RuntimeInput = {
  answers: AnswerMap;
  eventStateByDate?: Record<string, DailyEventState> | null;
  environment: DerivedEnvironment;
  context: ContextSnapshot;
  // Read only for migration from the earlier local-storage format.
  legacyHistory?: AssessmentEvidenceHistory;
  legacyBaseline?: ContextSnapshot | null;
};

function inputKey(input: RuntimeInput) {
  const { capturedAt, ...context } = input.context;
  return JSON.stringify([input.answers, input.eventStateByDate ?? null, context, input.environment.localDate]);
}

function mergeReview(previous: Pending | undefined, next: Pending | undefined): Pending | undefined {
  if (!previous) return next;
  if (!next) return previous;
  return {
    ...previous,
    reasons: Array.from(new Set([...previous.reasons, ...next.reasons])),
    evidence: Array.from(new Map([...previous.evidence, ...next.evidence].map(item => [JSON.stringify(item), item])).values()),
  };
}

/** Shared, persisted transition. Rebuilding never treats context as behavioral evidence. */
export function advancePersonalization(previous: PersonalizationRuntime | null, input: RuntimeInput): PersonalizationRuntime {
  const key = inputKey(input);
  const observedAt = new Date().toISOString();
  if (previous?.inputKey === key) return previous;
  let history = previous?.history ?? input.legacyHistory ?? {};
  const acceptedAnswers = { ...(previous?.acceptedAnswers ?? input.answers) };
  for (const [id, definition] of Object.entries(SIGNAL_REGISTRY)) {
    const q = definition.questionId;
    if (!q) continue;
    const answer = input.answers[q];
    const oldAnswer = previous?.observedAnswers[q];
    if (answer) history = recordAssessmentAnswerChange(history, id, q, oldAnswer, answer);
    if (definition.classification !== SignalClassification.BEHAVIOR) {
      acceptedAnswers[q] = answer;
    } else if (!previous && history[id]?.length) {
      // Legacy storage has no saved interpretation. Reconstruct from the oldest retained answer.
      acceptedAnswers[q] = history[id].find(item => item.questionId === q && item.answer)?.answer ?? answer;
    } else if (!acceptedAnswers[q] && answer) acceptedAnswers[q] = answer;
  }

  const fresh = applyDailyEvidence(assignInitialConfidence(buildInitialPersonalizationState({
    answers: acceptedAnswers, derivedEnvironment: input.environment,
  })), input.eventStateByDate);
  const summaries = summarizeDailyEvidence(input.eventStateByDate);
  const baselines = { ...previous?.baselines };
  const evidenceKeys: Record<string, string> = {};
  const perSignal: InitialPersonalizationState["perSignal"] = {};
  for (const [id, candidate] of Object.entries(fresh.perSignal)) {
    const old = previous?.state.perSignal[id];
    const q = SIGNAL_REGISTRY[id]?.questionId;
    evidenceKeys[id] = JSON.stringify([q ? acceptedAnswers[q] ?? null : null, summaries[id] ?? null]);
    const unchangedEvidence = previous?.evidenceKeys[id] === evidenceKeys[id];
    const baseline = { ...(baselines[id] ?? input.legacyBaseline ?? input.context) };
    // An unknown field is not a baseline; seed it on first observation without a trigger.
    for (const field of ["timeZone", "latitude", "longitude", "wakeTime", "targetBedtime", "dayLengthMinutes"] as const) {
      if (baseline[field] == null) Object.assign(baseline, { [field]: input.context[field] });
    }
    baselines[id] = baseline;
    const historyKey = JSON.stringify(history[id] ?? []);
    const conflictUnresolved = previous?.acknowledgedHistory[id] !== historyKey ||
      Boolean(q && input.answers[q] !== acceptedAnswers[q]);
    const applied = applyReconsideration({
      state: { ...fresh, perSignal: { [id]: candidate } },
      priorContext: baseline, currentContext: input.context,
      evidenceHistory: conflictUnresolved ? { [id]: history[id] ?? [] } : {},
    }).state.perSignal[id];
    const review = mergeReview(old?.reconsideration, applied.reconsideration);
    // Preserve an existing interpretation during review, not an unassessed placeholder.
    // First behavioral evidence can initialize the signal without resolving its context review.
    const preservePendingInterpretation = Boolean(old?.coachingState && review);
    const signal = old && (preservePendingInterpretation || unchangedEvidence) ? old : candidate;
    perSignal[id] = review ? { ...signal, reconsideration: review } : signal;
    if (preservePendingInterpretation) evidenceKeys[id] = previous!.evidenceKeys[id];
    else if (!unchangedEvidence && perSignal[id].confidence && !summaries[id]) {
      perSignal[id] = { ...perSignal[id], confidence: { ...perSignal[id].confidence!, lastEvidenceAt: observedAt } };
    }
  }
  return {
    version: 1, state: { ...fresh, generatedAt: observedAt, perSignal }, baselines,
    observedAnswers: { ...input.answers }, acceptedAnswers, history,
    acknowledgedHistory: { ...previous?.acknowledgedHistory }, evidenceKeys,
    resolutions: previous?.resolutions ?? [], inputKey: key,
  };
}

/** Explicitly accept current behavioral evidence and acknowledge current context for one signal. */
export function resolvePersonalizationReview(runtime: PersonalizationRuntime, input: RuntimeInput, signalId: string, resolvedAt: string): PersonalizationRuntime {
  const current = advancePersonalization(runtime, input);
  const priorSignal = current.state.perSignal[signalId];
  const review = priorSignal?.reconsideration;
  if (!review) return current;
  const acceptedAnswers = { ...current.acceptedAnswers };
  const q = SIGNAL_REGISTRY[signalId]?.questionId;
  if (q) acceptedAnswers[q] = input.answers[q];
  const { reconsideration, ...signal } = priorSignal;
  return advancePersonalization({
    ...current, inputKey: "", acceptedAnswers,
    baselines: { ...current.baselines, [signalId]: input.context },
    acknowledgedHistory: { ...current.acknowledgedHistory, [signalId]: JSON.stringify(current.history[signalId] ?? []) },
    state: { ...current.state, perSignal: { ...current.state.perSignal, [signalId]: signal } },
    resolutions: [...current.resolutions, { status: "resolved", signalId, resolvedAt, review, priorSignal }],
  }, input);
}
