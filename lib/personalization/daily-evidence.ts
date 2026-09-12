import { DailyEventState } from "@/types/circadian";
import { InitialPersonalizationState, InitialSignalState } from "./initial-state";
import { CoachingState, SignalSourceType } from "./types";

export type DailyEvidenceSummary = {
  signalId: string;
  completedDays: number;
  lastCompletedAt?: string;
  eventIds: string[];
};

const EVENT_SIGNAL_MAP: Record<string, string[]> = {
  morning_light: ["morning_light_timing"],
  midday_light: ["day_breaks_outside"],
  dim_house: ["evening_light_reduction"],
  digital_sunset: ["evening_screen_exposure"],
  last_meal: ["last_meal_timing"],
};

export function summarizeDailyEvidence(
  eventStateByDate?: Record<string, DailyEventState> | null,
): Record<string, DailyEvidenceSummary> {
  const summaries: Record<string, DailyEvidenceSummary> = {};

  if (!eventStateByDate) return summaries;

  for (const [date, dayState] of Object.entries(eventStateByDate)) {
    for (const [eventId, record] of Object.entries(dayState ?? {})) {
      if (record.status !== "completed") continue;

      const signalIds = EVENT_SIGNAL_MAP[eventId] ?? [];
      for (const signalId of signalIds) {
        const existing = summaries[signalId] ?? {
          signalId,
          completedDays: 0,
          eventIds: [],
        };

        existing.completedDays += 1;
        if (!existing.eventIds.includes(eventId)) existing.eventIds.push(eventId);

        if (
          !existing.lastCompletedAt ||
          new Date(record.at).getTime() > new Date(existing.lastCompletedAt).getTime()
        ) {
          existing.lastCompletedAt = record.at || `${date}T00:00:00`;
        }

        summaries[signalId] = existing;
      }
    }
  }

  return summaries;
}

function stateFromRepeatedEvidence(
  current: CoachingState | undefined,
  completedDays: number,
): CoachingState | undefined {
  if (!current) return current;

  if (current === CoachingState.NEEDS_ATTENTION) {
    if (completedDays >= 6) return CoachingState.ESTABLISHED;
    if (completedDays >= 2) return CoachingState.DEVELOPING;
    return current;
  }

  if (current === CoachingState.DEVELOPING) {
    if (completedDays >= 4) return CoachingState.ESTABLISHED;
    return current;
  }

  return current;
}

export function applyDailyEvidence(
  state: InitialPersonalizationState,
  eventStateByDate?: Record<string, DailyEventState> | null,
): InitialPersonalizationState {
  const summaries = summarizeDailyEvidence(eventStateByDate);
  if (Object.keys(summaries).length === 0) return state;

  const perSignal = { ...state.perSignal };

  for (const [signalId, summary] of Object.entries(summaries)) {
    const signal = perSignal[signalId];
    if (!signal) continue;

    const nextState = stateFromRepeatedEvidence(
      signal.coachingState,
      summary.completedDays,
    );

    const notes = [...(signal.notes ?? [])];
    const evidenceNote = `daily_evidence_${summary.completedDays}_completed_days`;
    if (!notes.includes(evidenceNote)) notes.push(evidenceNote);

    if (nextState !== signal.coachingState) {
      notes.push(
        `advanced_by_repeated_daily_evidence_${signal.coachingState}_to_${nextState}`,
      );
    }

    const dailyEvidence = Array.from({ length: summary.completedDays }, () => ({
      source: [SignalSourceType.USER_FEEDBACK],
    }));

    const updated: InitialSignalState = {
      ...signal,
      coachingState: nextState,
      evidence: [...signal.evidence, ...dailyEvidence],
      notes,
      confidence: signal.confidence
        ? {
            ...signal.confidence,
            lastEvidenceAt:
              summary.lastCompletedAt ?? signal.confidence.lastEvidenceAt,
          }
        : signal.confidence,
    };

    perSignal[signalId] = updated;
  }

  return {
    ...state,
    perSignal,
  };
}

export default applyDailyEvidence;
