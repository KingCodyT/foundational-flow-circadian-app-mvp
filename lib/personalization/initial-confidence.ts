import { InitialPersonalizationState, InitialSignalState } from "./initial-state";
import { SIGNAL_REGISTRY } from "./signal-registry";
import { SignalClassification, SignalSourceType } from "./types";

// Confidence score helpers
const HIGH = 0.9;
const MODERATE = 0.6;
const REDUCED = 0.4;
const LOW = 0.15;

type EvidenceInfo = {
  key: string;
  directBehavior: boolean;
  legacy: boolean;
  answer: string | null;
  questionId: string | null;
  source: SignalSourceType[];
};

function evidenceIdentity(ev: { questionId?: string | null; answer?: string | null; source?: SignalSourceType[]; optionLabel?: string | null; legacyMapping?: boolean }) {
  return JSON.stringify({
    questionId: ev.questionId ?? null,
    answer: ev.answer ?? null,
    optionLabel: ev.optionLabel ?? null,
    source: [...(ev.source ?? [])].sort(),
    legacy: Boolean(ev.legacyMapping),
  });
}

function normalizedEvidenceInfo(signalClass: SignalClassification, ev: any): EvidenceInfo | null {
  if (!ev) return null;
  const source = Array.isArray(ev.source) ? ev.source : [];
  const isDirectBehavior = signalClass === SignalClassification.BEHAVIOR && Boolean(ev.questionId) && ev.answer != null && ev.answer !== "";
  return {
    key: evidenceIdentity(ev),
    directBehavior: isDirectBehavior,
    legacy: Boolean(ev.legacyMapping),
    answer: ev.answer ?? null,
    questionId: ev.questionId ?? null,
    source,
  };
}

function semanticConflictExists(items: EvidenceInfo[]) {
  const direct = items.filter((item) => item.directBehavior);
  if (direct.length < 2) return false;

  const grouped: Record<string, EvidenceInfo[]> = {};
  for (const item of direct) {
    const key = item.questionId ?? item.key;
    grouped[key] = grouped[key] ?? [];
    grouped[key].push(item);
  }

  for (const group of Object.values(grouped)) {
    const answers = new Set(group.filter((item) => item.answer).map((item) => item.answer));
    if (answers.size > 1) return true;
  }

  return false;
}

export function assignInitialConfidence(state: InitialPersonalizationState): InitialPersonalizationState {
  const now = new Date().toISOString();
  const perSignal = { ...(state.perSignal ?? {}) };

  for (const [id, s] of Object.entries(perSignal)) {
    const def = SIGNAL_REGISTRY[id];
    if (!def) continue;
    if (def.classification !== SignalClassification.BEHAVIOR) continue;

    const evidence = s.evidence ?? [];
    const validEvidence = evidence.filter((ev) => ev && typeof ev === "object");
    const uniqueEvidence = Array.from(new Map(validEvidence.map((ev) => [evidenceIdentity(ev), ev])).values());
    const directEvidence = uniqueEvidence
      .map((ev) => normalizedEvidenceInfo(def.classification, ev))
      .filter((ev): ev is EvidenceInfo => ev !== null && ev.directBehavior);

    const sources: string[] = [];
    let confidenceScore = LOW;

    if (directEvidence.length === 0) {
      confidenceScore = LOW;
      validEvidence.forEach((ev) => {
        if (ev.questionId) sources.push(ev.questionId);
      });
    } else if (directEvidence.length === 1) {
      confidenceScore = directEvidence[0].legacy ? MODERATE : HIGH;
      if (directEvidence[0].questionId) sources.push(directEvidence[0].questionId);
    } else {
      const hasConflict = semanticConflictExists(directEvidence);
      if (hasConflict) {
        confidenceScore = REDUCED;
      } else {
        const anyLegacy = directEvidence.some((item) => item.legacy);
        confidenceScore = anyLegacy ? MODERATE : HIGH;
      }
      directEvidence.forEach((item) => {
        if (item.questionId) sources.push(item.questionId);
      });
    }

    const updated: InitialSignalState = {
      ...s,
      confidence: {
        score: confidenceScore,
        lastEvidenceAt: now,
        sources: sources.length > 0 ? Array.from(new Set(sources)) : undefined,
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
