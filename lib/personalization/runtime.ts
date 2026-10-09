import type { AnswerMap, DailyEventState, DailyProfile } from "@/types/circadian";
import type { DerivedEnvironment } from "./derived-environment";
import { buildInitialPersonalizationState, type InitialPersonalizationState, type InitialSignalState } from "./initial-state";
import { assignInitialConfidence } from "./initial-confidence";
import { applyDailyEvidence, summarizeDailyEvidence } from "./daily-evidence";
import { applyReconsideration, type AssessmentEvidenceHistory, recordAssessmentAnswerChange } from "./reconsideration-application";
import type { ContextSnapshot } from "./reconsideration";
import { SignalClassification, CoachingState } from "./types";
import { SIGNAL_REGISTRY } from "./signal-registry";
import { applyCircadianFoodCoachingEvidence } from "./circadian-food-signal-integration";
import { historicalFoodContextIsApplicable, type FoodTimingEvidence } from "./circadian-food-timing";
import type { AcceptedFocus } from "./storage-migration";
import { selectPrimaryCoachingTarget, resolveCoachingFocus } from "./primary-target";
import type { Day1PersonalizationResult } from "./day1";

type Pending = NonNullable<InitialSignalState["reconsideration"]>;
type MealContext = { at: string; context: unknown };
export type PersonalizationRuntime = {
  version: 1;
  combinedRevision?: 1;
  state: InitialPersonalizationState;
  baselines: Record<string, ContextSnapshot>;
  observedAnswers: AnswerMap;
  acceptedAnswers: AnswerMap;
  history: AssessmentEvidenceHistory;
  acknowledgedHistory: Record<string, string>;
  evidenceKeys: Record<string, string>;
  foodContexts?: Record<string, MealContext>;
  acceptedFoodEvidence?: Record<string, FoodTimingEvidence[]> | null;
  resolutions: Array<{ status: "resolved"; signalId: string; resolvedAt: string; review: Pending; priorSignal: InitialSignalState; priorFoodEvidence?: Record<string, FoodTimingEvidence[]> | null }>;
  inputKey: string;
};
export type RuntimeInput = {
  answers: AnswerMap;
  eventStateByDate?: Record<string, DailyEventState> | null;
  foodTimingEvidenceByDate?: Record<string, FoodTimingEvidence[]> | null;
  profile?: DailyProfile | null;
  participationLevel?: string | null;
  environment: DerivedEnvironment;
  context: ContextSnapshot;
  now?: Date;
  legacyHistory?: AssessmentEvidenceHistory;
  legacyBaseline?: ContextSnapshot | null;
};

/** Stable ordering prevents object insertion order or display sorting becoming new evidence. */
export function canonical(value: unknown): string {
  return JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
}
function foodInputs(input: RuntimeInput) {
  const records = Object.entries(input.foodTimingEvidenceByDate ?? {}).flatMap(([date, items]) =>
    items.map(item => ({ date, ...item }))).sort((a, b) => a.id.localeCompare(b.id) || a.date.localeCompare(b.date));
  const meals = records.filter(item => item.action === "MEAL_STARTED");
  const contexts = Object.fromEntries(meals.map(item => {
    const { capturedAt: _capturedAt, ...historical } = item.historicalContext ?? {};
    const fallback = { timeZone: input.profile?.timeZone ?? null, wakeTime: input.profile?.wakeTime ?? null,
      targetBedtime: input.profile?.targetBedtime ?? null };
    return [item.id, { at: item.at, context: item.historicalContextOccurrenceAt && !historicalFoodContextIsApplicable(item)
      ? { unavailable: true, originalOccurrenceAt: item.historicalContextOccurrenceAt }
      : item.historicalContext ? historical : fallback }];
  }));
  return {
    records, contexts,
    // Receipt/edit metadata and biological anchors are not new meal behavior.
    behavior: meals.map(({ date, id, action, at, source }) => ({ date, id, action, at, source })),
  };
}
function mergeReview(previous: Pending | undefined, next: Pending | undefined): Pending | undefined {
  if (!previous) return next;
  if (!next) return previous;
  const merged = { ...previous,
    reasons: Array.from(new Set([...previous.reasons, ...next.reasons])),
    evidence: Array.from(new Map([...previous.evidence, ...next.evidence].map(item => [canonical(item), item])).values()),
  };
  return canonical(merged) === canonical(previous) ? previous : merged;
}
function stableSummary(summary: ReturnType<typeof summarizeDailyEvidence>[string] | undefined) {
  return summary ? { ...summary, eventIds: [...summary.eventIds].sort(), completedDates: [...summary.completedDates].sort() } : null;
}

function acceptedEvidenceKey(previous: PersonalizationRuntime | null, id: string): string | undefined {
  const key = previous?.evidenceKeys[id];
  if (!key || previous?.combinedRevision === 1) return key;
  // Donor v1 keys use the same assessment/daily tuple but have no food slot.
  // Preserve that accepted evidence boundary through migration, including newer
  // observed daily records that were deliberately held while review was pending.
  try {
    const parts = JSON.parse(key);
    if (!Array.isArray(parts) || parts.length !== 2) return undefined;
    return canonical([parts[0], stableSummary(parts[1]), ...(id === "last_meal_timing" ? [[]] : [])]);
  } catch { return undefined; }
}

/** Donor transition adapted to one assessment -> daily -> food rebuild. */
export function advancePersonalization(previous: PersonalizationRuntime | null, input: RuntimeInput, resetFoodInterpretation = false): PersonalizationRuntime {
  const { capturedAt: _capturedAt, ...context } = input.context;
  const food = foodInputs(input);
  const key = canonical([input.answers, input.eventStateByDate ?? null, food.records, food.contexts, context, input.environment.localDate, input.environment.locationAvailable]);
  if (previous?.combinedRevision === 1 && previous.inputKey === key) return previous;
  const observedAt = (input.now ?? new Date()).toISOString();
  const upgrading = Boolean(previous && previous.combinedRevision !== 1);
  let history = previous?.history ?? input.legacyHistory ?? {};
  const acceptedAnswers = { ...(previous?.acceptedAnswers ?? input.answers) };
  for (const [id, definition] of Object.entries(SIGNAL_REGISTRY)) {
    const q = definition.questionId;
    if (!q) continue;
    const answer = input.answers[q];
    if (answer) history = recordAssessmentAnswerChange(history, id, q, previous?.observedAnswers[q], answer);
    if (definition.classification !== SignalClassification.BEHAVIOR) {
      if (answer !== undefined) acceptedAnswers[q] = answer;
    } else if (!previous && history[id]?.length) {
      const initialAnswer = history[id].find(item => item.questionId === q && item.answer)?.answer ?? answer;
      if (initialAnswer !== undefined) acceptedAnswers[q] = initialAnswer;
    } else if (!acceptedAnswers[q] && answer) acceptedAnswers[q] = answer;
  }
  let fresh = applyDailyEvidence(assignInitialConfidence(buildInitialPersonalizationState({
    answers: acceptedAnswers, derivedEnvironment: input.environment,
  })), input.eventStateByDate);
  fresh = { ...fresh, generatedAt: observedAt };
  // Carry the accepted food progression stage, not its accumulated evidence arrays,
  // into exactly one food application. A changed accepted assessment rebuilds afresh.
  const oldFood = previous?.state.perSignal.last_meal_timing;
  const foodQuestion = SIGNAL_REGISTRY.last_meal_timing?.questionId;
  if (!resetFoodInterpretation && oldFood?.coachingState && (!foodQuestion || acceptedAnswers[foodQuestion] === previous?.acceptedAnswers[foodQuestion])) {
    const dailyState = fresh.perSignal.last_meal_timing.coachingState;
    const priorState = oldFood.coachingState;
    // Do not undo advancement already earned by the daily-evidence step.
    const stage = dailyState === CoachingState.ESTABLISHED || priorState === CoachingState.ESTABLISHED
      ? CoachingState.ESTABLISHED : dailyState === CoachingState.DEVELOPING || priorState === CoachingState.DEVELOPING
        ? CoachingState.DEVELOPING : priorState;
    fresh = { ...fresh, perSignal: { ...fresh.perSignal,
      last_meal_timing: { ...fresh.perSignal.last_meal_timing, coachingState: stage } } };
  }
  fresh = applyCircadianFoodCoachingEvidence(fresh, {
    evidenceByDate: input.foodTimingEvidenceByDate, profile: input.profile, participationLevel: input.participationLevel,
  });
  const summaries = summarizeDailyEvidence(input.eventStateByDate);
  const baselines = { ...previous?.baselines };
  const evidenceKeys: Record<string, string> = { ...previous?.evidenceKeys };
  const perSignal = { ...previous?.state.perSignal };
  let acceptedFoodEvidence = previous?.acceptedFoodEvidence;
  for (const [id, candidate] of Object.entries(fresh.perSignal)) {
    const old = previous?.state.perSignal[id];
    const q = SIGNAL_REGISTRY[id]?.questionId;
    const evidenceKey = canonical([q ? acceptedAnswers[q] ?? null : null, stableSummary(summaries[id]),
      ...(id === "last_meal_timing" ? [food.behavior] : [])]);
    const priorKey = acceptedEvidenceKey(previous, id);
    const unchangedEvidence = priorKey === evidenceKey;
    const baseline = { ...(baselines[id] ?? input.legacyBaseline ?? input.context) };
    for (const field of ["timeZone", "latitude", "longitude", "wakeTime", "targetBedtime", "dayLengthMinutes"] as const) {
      if (baseline[field] == null) Object.assign(baseline, { [field]: input.context[field] });
    }
    baselines[id] = baseline;
    const historyKey = JSON.stringify(history[id] ?? []);
    const conflictUnresolved = previous?.acknowledgedHistory[id] !== historyKey || Boolean(q && input.answers[q] !== acceptedAnswers[q]);
    const applied = applyReconsideration({ state: { ...fresh, perSignal: { [id]: candidate } },
      priorContext: baseline, currentContext: input.context,
      evidenceHistory: conflictUnresolved ? { [id]: history[id] ?? [] } : {},
    }).state.perSignal[id];
    let nextReview = applied.reconsideration;
    const changedContexts = id === "last_meal_timing" ? Object.keys(food.contexts).filter(mealId => {
      const oldContext = previous?.foodContexts?.[mealId], nextContext = food.contexts[mealId];
      // An edit to actual meal time is behavioral; a correction of anchors for the
      // same recorded instant is contextual. New observations have no false conflict.
      return oldContext && oldContext.at === nextContext.at && canonical(oldContext.context) !== canonical(nextContext.context);
    }) : [];
    if (changedContexts.length) nextReview = mergeReview(nextReview, {
      status: "pending", signalId: id, shouldReconsider: true, reasons: ["HISTORICAL_FOOD_CONTEXT_CHANGED"],
      observedAt, evidence: changedContexts.map(mealId => ({ source: ["SYSTEM_CONTEXT"], status: `historical_context_corrected:${mealId}` })),
    });
    const previousReview = old?.reconsideration;
    const normalizedReview = previousReview && (!previousReview.signalId || previousReview.shouldReconsider !== true)
      ? { ...previousReview, status: "pending" as const, signalId: id, shouldReconsider: true as const } : previousReview;
    const review = mergeReview(normalizedReview, nextReview);
    const preserveAccepted = Boolean(old?.coachingState && (review || upgrading));
    const signal = old && (preserveAccepted || unchangedEvidence) ? old : candidate;
    if (id === "last_meal_timing" && signal !== old) {
      // Keep the actual accepted meal/context provenance as well as derived signal
      // evidence. Incoming edits remain in provider storage while a review is pending.
      acceptedFoodEvidence = input.foodTimingEvidenceByDate ?? null;
    }
    const reviewed = review === signal.reconsideration ? signal : review ? { ...signal, reconsideration: review } : signal;
    // Preserve extension fields when a real evidence rebuild replaces known fields.
    perSignal[id] = old && reviewed !== old ? { ...old, ...reviewed } : reviewed;
    evidenceKeys[id] = preserveAccepted ? priorKey ?? evidenceKey : evidenceKey;
    if (!preserveAccepted && !unchangedEvidence && perSignal[id].confidence && !summaries[id]) {
      perSignal[id] = { ...perSignal[id], confidence: { ...perSignal[id].confidence!, lastEvidenceAt: observedAt } };
    }
  }
  return { ...previous, version: 1, combinedRevision: 1, state: { ...previous?.state, ...fresh, perSignal }, baselines,
    observedAnswers: { ...input.answers }, acceptedAnswers, history, acknowledgedHistory: { ...previous?.acknowledgedHistory },
    evidenceKeys, foodContexts: food.contexts, acceptedFoodEvidence, resolutions: previous?.resolutions ?? [], inputKey: key };
}

/** Accept evidence/context for just one pending signal; never changes accepted focus. */
export function resolvePersonalizationReview(runtime: PersonalizationRuntime, input: RuntimeInput, signalId: string, resolvedAt: string): PersonalizationRuntime {
  const current = advancePersonalization(runtime, input);
  const priorSignal = current.state.perSignal[signalId];
  const review = priorSignal?.reconsideration;
  if (!review) return current;
  const acceptedAnswers = { ...current.acceptedAnswers };
  const q = SIGNAL_REGISTRY[signalId]?.questionId;
  if (q && input.answers[q] !== undefined) acceptedAnswers[q] = input.answers[q];
  const { reconsideration: _review, ...signal } = priorSignal;
  const seed = { ...current, inputKey: "", acceptedAnswers,
    baselines: { ...current.baselines, [signalId]: input.context },
    acknowledgedHistory: { ...current.acknowledgedHistory, [signalId]: JSON.stringify(current.history[signalId] ?? []) },
    state: { ...current.state, perSignal: { ...current.state.perSignal, [signalId]: signal } },
    resolutions: [...current.resolutions, { status: "resolved" as const, signalId, resolvedAt, review, priorSignal, ...(signalId === "last_meal_timing" ? { priorFoodEvidence: current.acceptedFoodEvidence } : {}) }],
  };
  const resetFood = signalId === "last_meal_timing" && Boolean(q && current.acceptedAnswers[q] !== acceptedAnswers[q]);
  const rebuilt = advancePersonalization(seed, input, resetFood);
  return { ...rebuilt, state: { ...rebuilt.state, perSignal: { ...current.state.perSignal, [signalId]: rebuilt.state.perSignal[signalId] } },
    evidenceKeys: { ...current.evidenceKeys, [signalId]: rebuilt.evidenceKeys[signalId] },
    baselines: { ...current.baselines, [signalId]: rebuilt.baselines[signalId] } };
}

export const UNSET_FOCUS: AcceptedFocus = { version: 1, status: "unset", signalId: null, acceptedAt: null, source: "uninitialized" };
export function initializeAcceptedFocus(focus: AcceptedFocus, runtime: PersonalizationRuntime, at: string): AcceptedFocus {
  if (focus.status !== "unset") return focus;
  const candidate = selectPrimaryCoachingTarget(runtime.state);
  return candidate.signalId ? { ...focus, status: "accepted", signalId: candidate.signalId, acceptedAt: at, source: "system-initialization" } : focus;
}
export function runtimeSelectors(runtime: PersonalizationRuntime, focus: AcceptedFocus): {
  day1: Day1PersonalizationResult; candidateTarget: ReturnType<typeof selectPrimaryCoachingTarget>;
  reconsideration: Record<string, Pending>;
} {
  const candidateTarget = selectPrimaryCoachingTarget(runtime.state);
  const primary = resolveCoachingFocus(runtime.state, candidateTarget, focus.status === "accepted" ? focus.signalId : null);
  const signals = runtime.state.perSignal;
  return { candidateTarget, day1: { generatedAt: runtime.state.generatedAt, signalStates: signals,
    derivedEnvironment: runtime.state.derivedEnvironment, primaryCoachingTarget: primary,
    source: { answersPresent: Object.keys(runtime.observedAnswers).length > 0,
      legacyMappingsUsed: [...new Set(Object.values(signals).flatMap(s => s.evidence.filter(e => e.legacyMapping && e.questionId).map(e => e.questionId!)))] } },
    reconsideration: Object.fromEntries(Object.entries(signals).flatMap(([id, s]) => s.reconsideration ? [[id, s.reconsideration]] : [])) };
}
