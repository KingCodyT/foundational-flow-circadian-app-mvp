import { InitialSignalState } from "./initial-state";

export enum EvidenceSeverity {
  MILD = "MILD",
  MODERATE = "MODERATE",
  SEVERE = "SEVERE",
}

// Boundaries intentionally mirror the current questionnaire semantics:
// lower numeric scores indicate greater mismatch / severity.
// The full option distribution naturally clusters into three bands:
// >=70 = mild, 40-69 = moderate, <40 = severe.
export function classifyEvidenceSeverity(score?: number | null): EvidenceSeverity | null {
  if (score == null) return null;
  if (score >= 70) return EvidenceSeverity.MILD;
  if (score >= 40) return EvidenceSeverity.MODERATE;
  return EvidenceSeverity.SEVERE;
}

export type DerivedSignalSeverity = {
  band: EvidenceSeverity | null;
  score: number | null;
  strongestEvidenceScore: number | null;
};

export function deriveSignalSeverity(signal: InitialSignalState): DerivedSignalSeverity {
  const scores: number[] = [];

  for (const ev of signal.evidence ?? []) {
    if (typeof ev.answerScore === "number" && ev.answerScore != null) {
      scores.push(ev.answerScore);
    }
  }

  if (scores.length === 0) {
    return {
      band: null,
      score: null,
      strongestEvidenceScore: null,
    };
  }

  const strongestEvidenceScore = Math.min(...scores);
  return {
    band: classifyEvidenceSeverity(strongestEvidenceScore),
    score: strongestEvidenceScore,
    strongestEvidenceScore,
  };
}

export default {
  EvidenceSeverity,
  classifyEvidenceSeverity,
  deriveSignalSeverity,
};
