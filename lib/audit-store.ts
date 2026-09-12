import {
  AnswerMap,
  ParticipationLevel,
  DailyProfile,
  DailyEventState,
} from "@/types/circadian";

export const STORAGE_KEY = "foundational-flow-circadian-app-state";

export type LocalAuditState = {
  clientId: string;
  answers: AnswerMap;
  hasCompletedAudit: boolean;
  lastSavedAt: string | null;
  participationLevel?: ParticipationLevel | null;
  dailyProfile?: DailyProfile | null;
  eventStateByDate?: Record<string, DailyEventState> | null;
};

export function createClientId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `client-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
