import { InitialPersonalizationState, InitialSignalState } from "./initial-state";
import { SIGNAL_REGISTRY } from "./signal-registry";
import { SignalClassification } from "./types";

// Confidence score helpers
const HIGH = 0.9;
const MODERATE = 0.6;
const REDUCED = 0.4;
const LOW = 0.15;

function mapScoreToBand(score: number) {
  if (score >= 85) return "ESTABLISHED";
  if (score >= 65) return "DEVELOPING";
  return "NEEDS_ATTENTION";
}

export function assignInitialConfidence(state: InitialPersonalizationState): InitialPersonalizationState {
  const now = new Date().toISOString();
  const perSignal = { ...(state.perSignal ?? {}) };

  for (const [id, s] of Object.entries(perSignal)) {
    // Only assign confidence for behavioral signals
    const def = SIGNAL_REGISTRY[id];
    if (!def) continue;
    if (def.classification !== SignalClassification.BEHAVIOR) continue;

    const evidence = s.evidence ?? [];
    const answered = evidence.filter((e) => e.answerScore != null);

    let confidenceScore = LOW;
    const sources: string[] = [];

    if (answered.length === 0) {
      confidenceScore = LOW; // missing evidence
      if (evidence.length > 0) evidence.forEach((ev) => ev.questionId && sources.push(`${ev.questionId}`));
    } else if (answered.length === 1) {
      const ev = answered[0];
      if (ev.legacyMapping) {
        confidenceScore = MODERATE;
      } else {
        confidenceScore = HIGH;
      }
      ev.questionId && sources.push(ev.questionId);
    } else {
      // multiple answers
      const bands = answered.map((a) => mapScoreToBand(a.answerScore!));
      const allSame = bands.every((b) => b === bands[0]);
      const anyLegacy = answered.some((a) => a.legacyMapping);

      if (allSame && !anyLegacy) {
        confidenceScore = HIGH; // multiple clean agreeing inputs
      } else if (allSame && anyLegacy) {
        confidenceScore = MODERATE; // agree but some legacy/provisional
      } else {
        confidenceScore = REDUCED; // conflicting evidence
      }

      answered.forEach((ev) => ev.questionId && sources.push(ev.questionId));
    }

    const updated: InitialSignalState = {
      ...s,
      confidence: {
        score: confidenceScore,
        lastEvidenceAt: now,
        sources: sources.length > 0 ? sources : undefined,
      },
    };

    perSignal[id] = updated;
  }

  return {
    ...state,
    perSignal,
  };
}

export default assignInitialConfidence;
