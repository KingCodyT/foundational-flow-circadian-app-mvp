import { SIGNAL_REGISTRY } from "./signal-registry";
import {
  SignalClassification,
  SignalDefinition,
  SignalSourceType,
  CoachingState,
} from "./types";
import { AnswerMap } from "@/types/circadian";
import { questionnaire } from "@/lib/questionnaire";
import { DerivedEnvironment } from "./derived-environment";

export type InitialSignalEvidence = {
  source: SignalSourceType[];
  questionId?: string | null;
  answer?: string | null;
  answerScore?: number | null;
  optionLabel?: string | null;
  legacyMapping?: boolean;
};

export type InitialSignalState = {
  id: string;
  classification: SignalClassification;
  coachingState?: CoachingState; // only for BEHAVIOR signals
  // Internal confidence in the coachingState estimate (Phase 2C)
  confidence?: import("./types").Confidence;
  evidence: InitialSignalEvidence[]; // one or more pieces of evidence
  notes?: string[];
};

export type InitialPersonalizationState = {
  generatedAt: string;
  perSignal: Record<string, InitialSignalState>;
  derivedEnvironment?: DerivedEnvironment | null;
};

function findQuestionOptionScore(questionId: string, answer?: string | null) {
  if (!answer) return { score: null as number | null, label: null as string | null };
  const q = questionnaire.find((qq) => qq.id === questionId);
  if (!q) return { score: null as number | null, label: null as string | null };
  const opt = q.options.find((o) => o.value === answer);
  if (!opt) return { score: null as number | null, label: null as string | null };
  return { score: opt.score, label: opt.label };
}

function mapScoreToCoachingState(score?: number | null): CoachingState | undefined {
  if (score == null) return undefined;
  // conservative mapping aligned with scoring bands:
  // >=85 -> ESTABLISHED, >=65 -> DEVELOPING, else -> NEEDS_ATTENTION
  if (score >= 85) return CoachingState.ESTABLISHED;
  if (score >= 65) return CoachingState.DEVELOPING;
  return CoachingState.NEEDS_ATTENTION;
}

export function buildInitialPersonalizationState(opts: { answers: AnswerMap; derivedEnvironment?: DerivedEnvironment | null; }) : InitialPersonalizationState {
  const { answers, derivedEnvironment = null } = opts;
  const perSignal: Record<string, InitialSignalState> = {};

  for (const [id, def] of Object.entries(SIGNAL_REGISTRY)) {
    const evidence: InitialSignalEvidence[] = [];
    const notes: string[] = [];

    // gather questionnaire evidence if mapped
    if (def.questionId) {
      const ans = answers[def.questionId] ?? null;
      const { score, label } = findQuestionOptionScore(def.questionId, ans);
      evidence.push({
        source: def.source,
        questionId: def.questionId,
        answer: ans,
        answerScore: score,
        optionLabel: label ?? undefined,
        legacyMapping: def.legacyMapping ?? false,
      });
      if (def.legacyMapping) {
        notes.push("legacyMapping");
      }
    }

    // Derived environment evidence is referenced but does not assign coaching state
    if (def.isDerivedEnvironment && derivedEnvironment) {
      evidence.push({
        source: def.source,
      });
    }

    let coachingState: CoachingState | undefined = undefined;

    if (def.classification === SignalClassification.BEHAVIOR) {
      // Attempt to assign initial coaching state from questionnaire evidence only.
      // If multiple evidence items exist, combine conservatively: prefer the lowest (most actionable) state.
      const candidateStates: CoachingState[] = [];
      for (const ev of evidence) {
        if (ev.answerScore != null) {
          const mapped = mapScoreToCoachingState(ev.answerScore);
          if (mapped) candidateStates.push(mapped);
        }
      }

      if (candidateStates.length === 0) {
        // No direct questionnaire evidence available; leave undefined rather than guessing.
        coachingState = undefined;
        if (!def.questionId) {
          notes.push("no_question_mapping");
        } else {
          notes.push("no_answer");
        }
      } else {
        // Conservative combine: if any evidence is NEEDS_ATTENTION, prefer that; else if any DEVELOPING, else ESTABLISHED
        if (candidateStates.includes(CoachingState.NEEDS_ATTENTION)) coachingState = CoachingState.NEEDS_ATTENTION;
        else if (candidateStates.includes(CoachingState.DEVELOPING)) coachingState = CoachingState.DEVELOPING;
        else coachingState = CoachingState.ESTABLISHED;
      }
    }

    perSignal[id] = {
      id,
      classification: def.classification,
      coachingState,
      evidence,
      notes: notes.length > 0 ? notes : undefined,
    };
  }

  return {
    generatedAt: new Date().toISOString(),
    perSignal,
    derivedEnvironment: derivedEnvironment ?? undefined,
  };
}

export default buildInitialPersonalizationState;
