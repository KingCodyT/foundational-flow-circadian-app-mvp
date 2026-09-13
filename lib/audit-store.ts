import {
  AnswerMap,
  ParticipationLevel,
  DailyProfile,
  DailyEventState,
} from "@/types/circadian";
import { NotificationPersistenceState } from "@/lib/personalization/notification-persistence";
import { FoodTimingEvidence } from "@/lib/personalization/circadian-food-timing";

export const STORAGE_KEY = "foundational-flow-circadian-app-state";

export type ContextSnapshotState = {
  timeZone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  wakeTime?: string | null;
  targetBedtime?: string | null;
  dayLengthMinutes?: number | null;
  capturedAt?: string | null;
};

export type LocalAuditState = {
  clientId: string;
  answers: AnswerMap;
  hasCompletedAudit: boolean;
  lastSavedAt: string | null;
  participationLevel?: ParticipationLevel | null;
  dailyProfile?: DailyProfile | null;
  eventStateByDate?: Record<string, DailyEventState> | null;
  foodTimingEvidenceByDate?: Record<string, FoodTimingEvidence[]> | null;
  previousContextSnapshot?: ContextSnapshotState | null;
  currentContextSnapshot?: ContextSnapshotState | null;
  notificationState?: NotificationPersistenceState | null;
};

export function createClientId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `client-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeDailyProfile(profile?: DailyProfile | null, fallbackTimeZone?: string | null): DailyProfile | null {
  if (!profile) return profile ?? null;

  return {
    ...profile,
    timeZone: profile.timeZone || fallbackTimeZone || null,
  };
}
