"use client";

import {
  createContext,
  useCallback,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  createClientId,
  LocalAuditState,
  normalizeDailyProfile,
} from "@/lib/audit-store";
import { createStorageSession, type StorageIssue } from "@/lib/personalization/storage-migration";
import { getRuntimeTimeZone, localDateKey } from "@/lib/live-clock";
import {
  FoodTimingAction,
  FoodTimingEvidence,
} from "@/lib/personalization/circadian-food-timing";
import { shouldIgnoreRapidMealSubmit } from "@/lib/personalization/food-timing-action";
import { captureHistoricalBiologicalContext } from "@/lib/personalization/biological-context";
import {
  DEFAULT_NOTIFICATION_PERSISTENCE_STATE,
  NotificationPersistenceState,
  pruneNotificationPersistenceState,
  setMaterialChangeKey,
  upsertDeliveredNotification,
} from "@/lib/personalization/notification-persistence";
import {
  DeliveredNotificationRecord,
  ScheduledNotificationRecord,
} from "@/lib/personalization/notification-runtime";
import {
  AnswerMap,
  ParticipationLevel,
  DailyProfile,
  DailyEventState,
} from "@/types/circadian";

import { defaultWearableConnection, normalizeWearableConnection, updateWearableConnection, type WearableConnection, type WearableAction } from "@/lib/wearables/connection";

type ContextSnapshot = {
  timeZone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  wakeTime?: string | null;
  targetBedtime?: string | null;
  dayLengthMinutes?: number | null;
  capturedAt?: string | null;
};

type DeliverySetup = { id: string; reason?: string; status: "setting_up" | "scheduled" | "unavailable" };

type CircadianState = {
  wearableConnection: WearableConnection;
  updateWearables: (action: WearableAction) => void;
  firstRunHandoff: import("@/lib/personalization/first-run-guidance").FirstRunHandoff | null;
  setFirstRunHandoff: (value: import("@/lib/personalization/first-run-guidance").FirstRunHandoff | null) => void;
  deliverySetup: DeliverySetup | null;
  setDeliverySetup: (value: DeliverySetup | null) => void;
  clientId: string;
  answers: AnswerMap;
  lastSavedAt: string | null;
  isHydrated: boolean;
  storageIssue: StorageIssue | null;
  retryStorage: () => void;
  hasCompletedAudit: boolean;
  participationLevel: ParticipationLevel | null;
  dailyProfile: DailyProfile | null;
  eventStateByDate: Record<string, DailyEventState> | null;
  foodTimingEvidenceByDate: Record<string, FoodTimingEvidence[]> | null;
  previousContextSnapshot: ContextSnapshot | null;
  currentContextSnapshot: ContextSnapshot | null;
  notificationState: NotificationPersistenceState;
  recordDeliveryStatus: (status: NonNullable<NotificationPersistenceState["deliveryStatus"]>) => void;
  getEventStateForDate: (dateStr: string) => DailyEventState;
  getFoodTimingEvidenceForDate: (dateStr: string) => FoodTimingEvidence[];
  setEventRecord: (
    dateStr: string,
    eventId: string,
    record: {
      status: "completed" | "skipped" | "missed" | "upcoming";
      remindAt?: string;
      at?: string;
      fromNotification?: boolean;
    },
  ) => void;
  recordFoodTimingAction: (
    dateStr: string,
    action: FoodTimingAction,
    at?: string,
  ) => string | null;
  updateFoodTimingAction: (evidenceId: string, at: string) => boolean;
  deleteFoodTimingAction: (evidenceId: string) => boolean;
  clearEventRecords: (eventId: string) => void;
  setScheduledNotification: (record: ScheduledNotificationRecord | null) => void;
  recordDeliveredNotification: (record: DeliveredNotificationRecord) => void;
  setNotificationMaterialChangeKey: (
    identity: string,
    materialChangeKey: string | null,
  ) => void;
  setAnswer: (questionId: string, value: string) => void;
  completeAudit: () => void;
  setParticipationLevel: (level: ParticipationLevel | null) => void;
  setDailyProfile: (profile: DailyProfile | null) => void;
  resetAudit: () => void;
};

const CircadianContext = createContext<CircadianState | null>(null);

export function CircadianProvider({ children }: { children: ReactNode }) {
  const [firstRunHandoff, setFirstRunHandoff] = useState<CircadianState["firstRunHandoff"]>(null);
  const [deliverySetup, setDeliverySetup] = useState<DeliverySetup | null>(null);
  const [wearableConnection, setWearableConnection] = useState(defaultWearableConnection);
  const updateWearables = useCallback((action: WearableAction) => {
    setWearableConnection(current => updateWearableConnection(current, action));
  }, []);
  const [clientId, setClientId] = useState("");
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [participationLevel, setParticipationLevelState] =
    useState<ParticipationLevel | null>(null);
  const [dailyProfile, setDailyProfileState] = useState<DailyProfile | null>(null);
  const [eventStateByDate, setEventStateByDate] = useState<Record<
    string,
    DailyEventState
  > | null>(null);
  const [foodTimingEvidenceByDate, setFoodTimingEvidenceByDate] = useState<Record<
    string,
    FoodTimingEvidence[]
  > | null>(null);
  const [previousContextSnapshot, setPreviousContextSnapshot] = useState<ContextSnapshot | null>(null);
  const [currentContextSnapshot, setCurrentContextSnapshot] = useState<ContextSnapshot | null>(null);
  const [notificationState, setNotificationState] =
    useState<NotificationPersistenceState>(DEFAULT_NOTIFICATION_PERSISTENCE_STATE);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [hasCompletedAudit, setHasCompletedAudit] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [storageIssue, setStorageIssue] = useState<StorageIssue | null>(null);
  const [hydrationAttempt, setHydrationAttempt] = useState(0);
  const [saveAttempt, setSaveAttempt] = useState(0);
  const storageSession = useRef<ReturnType<typeof createStorageSession> | null>(null);
  const retryStorage = () => {
    if (isHydrated) setSaveAttempt(value => value + 1);
    else setHydrationAttempt(value => value + 1);
  };

  function parseIso(value?: string | null) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date : null;
  }

  function createFoodTimingEvidenceId() {
    return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `food-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function sortFoodTimingEvidence(a: FoodTimingEvidence, b: FoodTimingEvidence) {
    const aTime = parseIso(a.at)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const bTime = parseIso(b.at)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    if (aTime !== bTime) return aTime - bTime;

    const aRecorded = parseIso(a.recordedAt ?? a.updatedAt ?? a.at)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const bRecorded = parseIso(b.recordedAt ?? b.updatedAt ?? b.at)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    if (aRecorded !== bRecorded) return aRecorded - bRecorded;

    return a.id.localeCompare(b.id);
  }

  function normalizeFoodTimingEvidence(evidence: FoodTimingEvidence): FoodTimingEvidence {
    const recordedAt = evidence.recordedAt ?? evidence.at;
    return {
      ...evidence,
      recordedAt,
      updatedAt: evidence.updatedAt ?? recordedAt,
    };
  }

  function normalizeFoodTimingEvidenceByDate(
    state: Record<string, FoodTimingEvidence[]> | null,
  ): Record<string, FoodTimingEvidence[]> | null {
    if (!state) return state;

    const next: Record<string, FoodTimingEvidence[]> = {};
    for (const [date, evidence] of Object.entries(state)) {
      const normalized = evidence.map(normalizeFoodTimingEvidence).sort(sortFoodTimingEvidence);
      if (normalized.length > 0) next[date] = normalized;
    }

    return Object.keys(next).length > 0 ? next : null;
  }

  function findFoodTimingEvidenceLocation(
    state: Record<string, FoodTimingEvidence[]> | null,
    evidenceId: string,
  ) {
    if (!state) return null;

    for (const [date, evidence] of Object.entries(state)) {
      const index = evidence.findIndex((item) => item.id === evidenceId);
      if (index >= 0) {
        return { date, index, evidence: evidence[index] };
      }
    }

    return null;
  }

  useEffect(() => {
    const session = storageSession.current ?? createStorageSession(() => window.localStorage);
    storageSession.current = session;
    const result = session.hydrate();
    if (result.status !== "ready") {
      setStorageIssue(result.issue);
      return; // Never turn unreadable/unsupported storage into a new empty account.
    }
    const parsedState = result.state;
    setClientId(parsedState.clientId || createClientId());
    setAnswers(parsedState.answers);
    setParticipationLevelState(parsedState.participationLevel ?? null);
    setDailyProfileState(normalizeDailyProfile(parsedState.dailyProfile ?? null, getRuntimeTimeZone()));
    setEventStateByDate(parsedState.eventStateByDate ?? null);
    setFoodTimingEvidenceByDate(parsedState.foodTimingEvidenceByDate ?? null);
    setPreviousContextSnapshot(parsedState.previousContextSnapshot ?? null);
    setCurrentContextSnapshot(parsedState.currentContextSnapshot ?? null);
    setNotificationState(pruneNotificationPersistenceState(parsedState.notificationState ?? null));
    setLastSavedAt(parsedState.lastSavedAt);
    setWearableConnection(normalizeWearableConnection(parsedState.wearableConnection));
    setFirstRunHandoff(parsedState.firstRunHandoff ?? null);
    setHasCompletedAudit(parsedState.hasCompletedAudit);
    setStorageIssue(null);
    setIsHydrated(true);
  }, [hydrationAttempt]);

  useEffect(() => {
    if (!isHydrated || !clientId) return;

    const state: LocalAuditState = {
      firstRunHandoff,
      wearableConnection,
      clientId,
      answers,
      hasCompletedAudit,
      lastSavedAt,
      participationLevel,
      dailyProfile,
      eventStateByDate,
      foodTimingEvidenceByDate,
      previousContextSnapshot,
      currentContextSnapshot,
      notificationState: pruneNotificationPersistenceState(notificationState),
    };

    const result = storageSession.current?.save(state);
    setStorageIssue(result?.status === "blocked" ? result.issue : null);
  }, [
    saveAttempt,
    firstRunHandoff,
    wearableConnection,
    answers,
    clientId,
    dailyProfile,
    eventStateByDate,
    foodTimingEvidenceByDate,
    hasCompletedAudit,
    isHydrated,
    lastSavedAt,
    notificationState,
    participationLevel,
    previousContextSnapshot,
    currentContextSnapshot,
  ]);

  const setAnswer = (questionId: string, value: string) => {
    setAnswers((current) => ({
      ...current,
      [questionId]: value,
    }));
  };

  const setParticipationLevel = (level: ParticipationLevel | null) => {
    setParticipationLevelState(level);
  };

  const setDailyProfile = (profile: DailyProfile | null) => {
    const runtimeTimeZone = getRuntimeTimeZone();
    const normalized = normalizeDailyProfile(profile, runtimeTimeZone);
    const nextCurrentContextSnapshot = {
      timeZone: normalized?.timeZone ?? null,
      latitude: normalized?.latitude ?? null,
      longitude: normalized?.longitude ?? null,
      wakeTime: normalized?.wakeTime ?? null,
      targetBedtime: normalized?.targetBedtime ?? null,
      dayLengthMinutes: null,
      capturedAt: new Date().toISOString(),
    };
    setPreviousContextSnapshot((current) => current ?? nextCurrentContextSnapshot);
    setCurrentContextSnapshot(nextCurrentContextSnapshot);
    setDailyProfileState(normalized);
  };

  const getEventStateForDate = (dateStr: string) => {
    return eventStateByDate?.[dateStr] ?? {};
  };

  const getFoodTimingEvidenceForDate = (dateStr: string) => {
    return [...(foodTimingEvidenceByDate?.[dateStr] ?? [])].sort(sortFoodTimingEvidence);
  };

  const setEventRecord = useCallback((
    dateStr: string,
    eventId: string,
    record: {
      status: "completed" | "skipped" | "missed" | "upcoming";
      remindAt?: string;
      at?: string;
      fromNotification?: boolean;
    },
  ) => {
    const notification = notificationState.lastNotification;
    if (!record.fromNotification && notification?.actionToken && notification.dateKey === dateStr && notification.eventId === eventId && typeof navigator !== "undefined") {
      const action = record.status === "completed" ? "done" : record.status === "skipped" ? "skip" : record.remindAt ? "later" : null;
      if (action) navigator.serviceWorker?.controller?.postMessage({ type: "FF_REMINDER_ACTION", notification, action, remindAt: record.remindAt });
    }
    setEventStateByDate((current) => {
      const next = { ...(current ?? {}) };
      const dayState = { ...(next[dateStr] ?? {}) };
      dayState[eventId] = {
        status: record.status,
        remindAt: record.status === "upcoming" ? record.remindAt : undefined,
        at: record.at ?? new Date().toISOString(),
      };
      next[dateStr] = dayState;
      return next;
    });
  }, [notificationState.lastNotification]);

  const recordFoodTimingAction = (
    dateStr: string,
    action: FoodTimingAction,
    at?: string,
  ) => {
    const timestamp = at ?? new Date().toISOString();
    const eventAt = parseIso(timestamp);
    if (!eventAt || eventAt.getTime() > Date.now()) return null;

    const id = createFoodTimingEvidenceId();
    const historicalContext = captureHistoricalBiologicalContext({
      at: timestamp,
      profile: {
        wakeTime: dailyProfile?.wakeTime ?? null,
        targetBedtime: dailyProfile?.targetBedtime ?? null,
        lastMealTime: dailyProfile?.lastMealTime ?? null,
        timeZone: dailyProfile?.timeZone ?? getRuntimeTimeZone(),
        latitude: dailyProfile?.locationPermissionGranted ? dailyProfile.latitude ?? null : null,
        longitude: dailyProfile?.locationPermissionGranted ? dailyProfile.longitude ?? null : null,
      },
    });
    const bucketDate = localDateKey(
      eventAt,
      dailyProfile?.timeZone ?? getRuntimeTimeZone(),
    );
    const recordedAt = new Date().toISOString();
    const nextEvidence = normalizeFoodTimingEvidence({
      id,
      action,
      at: eventAt.toISOString(),
      recordedAt,
      updatedAt: recordedAt,
      source: "USER",
      historicalContext,
    });

    setFoodTimingEvidenceByDate((current) => {
      const next = { ...(current ?? {}) };
      const dayEvidence = [...(next[bucketDate] ?? [])].map(normalizeFoodTimingEvidence).sort(sortFoodTimingEvidence);
      if (
        action === "MEAL_STARTED" &&
        shouldIgnoreRapidMealSubmit({
          currentEvidence: dayEvidence,
          nextAtIso: nextEvidence.at,
        })
      ) {
        return current;
      }
      next[bucketDate] = [...dayEvidence, nextEvidence].sort(sortFoodTimingEvidence);
      return next;
    });

    return id;
  };

  const updateFoodTimingAction = (evidenceId: string, at: string) => {
    const nextAt = parseIso(at);
    if (!nextAt || nextAt.getTime() > Date.now()) return false;

    const updatedAt = new Date().toISOString();
    let didUpdate = false;

    setFoodTimingEvidenceByDate((current) => {
      const location = findFoodTimingEvidenceLocation(current, evidenceId);
      if (!location) return current;

      const next = { ...(current ?? {}) };
      const nextDate = localDateKey(
        nextAt,
        dailyProfile?.timeZone ?? getRuntimeTimeZone(),
      );
      const preserved = normalizeFoodTimingEvidence(location.evidence);
      const updated = normalizeFoodTimingEvidence({
        ...preserved,
        at: nextAt.toISOString(),
        updatedAt,
        historicalContext: {
          ...preserved.historicalContext,
          ...captureHistoricalBiologicalContext({
            at: nextAt,
            profile: {
              wakeTime: dailyProfile?.wakeTime ?? null,
              targetBedtime: dailyProfile?.targetBedtime ?? null,
              lastMealTime: dailyProfile?.lastMealTime ?? null,
              timeZone: dailyProfile?.timeZone ?? getRuntimeTimeZone(),
              latitude: dailyProfile?.locationPermissionGranted ? dailyProfile.latitude ?? null : null,
              longitude: dailyProfile?.locationPermissionGranted ? dailyProfile.longitude ?? null : null,
            },
          }),
        },
      });

      const sourceBucket = [...(next[location.date] ?? [])];
      sourceBucket.splice(location.index, 1);
      if (sourceBucket.length > 0) {
        next[location.date] = sourceBucket.sort(sortFoodTimingEvidence);
      } else {
        delete next[location.date];
      }

      next[nextDate] = [...(next[nextDate] ?? []), updated].sort(sortFoodTimingEvidence);
      didUpdate = true;
      return next;
    });

    return didUpdate;
  };

  const deleteFoodTimingAction = (evidenceId: string) => {
    let didDelete = false;

    setFoodTimingEvidenceByDate((current) => {
      const location = findFoodTimingEvidenceLocation(current, evidenceId);
      if (!location) return current;

      const next = { ...(current ?? {}) };
      const sourceBucket = [...(next[location.date] ?? [])];
      sourceBucket.splice(location.index, 1);
      if (sourceBucket.length > 0) {
        next[location.date] = sourceBucket.sort(sortFoodTimingEvidence);
      } else {
        delete next[location.date];
      }
      didDelete = true;
      return Object.keys(next).length > 0 ? next : null;
    });

    return didDelete;
  };

  const clearEventRecords = (eventId: string) => {
    setEventStateByDate((current) => {
      if (!current) return current;

      const next: Record<string, DailyEventState> = {};
      for (const [date, dayState] of Object.entries(current)) {
        const nextDay = { ...dayState };
        delete nextDay[eventId];
        if (Object.keys(nextDay).length > 0) next[date] = nextDay;
      }

      return Object.keys(next).length > 0 ? next : null;
    });
  };

  const setScheduledNotification = useCallback((record: ScheduledNotificationRecord | null) => {
    setNotificationState((current) => ({
      ...current,
      scheduledNotification: record,
      lastNotification: record?.actionToken ? record : current.lastNotification ?? record,
    }));
  }, []);

  const recordDeliveryStatus = useCallback((status: NonNullable<NotificationPersistenceState["deliveryStatus"]>) => {
    setNotificationState(current => ({ ...current, deliveryStatus: status }));
  }, []);

  const recordDeliveredNotification = useCallback((record: DeliveredNotificationRecord) => {
    setNotificationState((current) => ({
      ...current,
      scheduledNotification:
        current.scheduledNotification?.id === record.id
          ? null
          : current.scheduledNotification,
      deliveredNotifications: upsertDeliveredNotification(
        current.deliveredNotifications,
        record,
      ),
    }));
  }, []);

  const setNotificationMaterialChangeKey = (
    identity: string,
    materialChangeKey: string | null,
  ) => {
    setNotificationState((current) => ({
      ...current,
      materialChangeKeys: setMaterialChangeKey(
        current.materialChangeKeys,
        identity,
        materialChangeKey,
      ),
    }));
  };

  const completeAudit = () => {
    if (!clientId) setClientId(createClientId());
    setFirstRunHandoff({ guidance: null });
    setHasCompletedAudit(true);
    setLastSavedAt(new Date().toISOString());
  };

  const resetAudit = () => {
    // Recovery-blocked data must not be erased by a reset or an early interaction.
    if (!isHydrated || storageIssue) return;
    // Persist an explicit reset only after retaining a recovery copy of the old account.
    storageSession.current?.requestReset();
    setClientId(createClientId());
    setFirstRunHandoff(null);
    setDeliverySetup(null);
    setWearableConnection(defaultWearableConnection());
    setAnswers({});
    setParticipationLevelState(null);
    setDailyProfileState(null);
    setEventStateByDate(null);
    setFoodTimingEvidenceByDate(null);
    setPreviousContextSnapshot(null);
    setCurrentContextSnapshot(null);
    setNotificationState(DEFAULT_NOTIFICATION_PERSISTENCE_STATE);
    setLastSavedAt(null);
    setHasCompletedAudit(false);
  };

  return (
    <CircadianContext.Provider
      value={{
        firstRunHandoff, setFirstRunHandoff, deliverySetup, setDeliverySetup,
        wearableConnection, updateWearables,
        clientId,
        answers,
        lastSavedAt,
        isHydrated,
        storageIssue,
        retryStorage,
        hasCompletedAudit,
        participationLevel,
        dailyProfile,
        eventStateByDate,
        foodTimingEvidenceByDate,
        previousContextSnapshot,
        currentContextSnapshot,
        notificationState,
        recordDeliveryStatus,
        getEventStateForDate,
        getFoodTimingEvidenceForDate,
        setEventRecord,
        recordFoodTimingAction,
        updateFoodTimingAction,
        deleteFoodTimingAction,
        clearEventRecords,
        setScheduledNotification,
        recordDeliveredNotification,
        setNotificationMaterialChangeKey,
        setAnswer,
        completeAudit,
        setParticipationLevel,
        setDailyProfile,
        resetAudit,
      }}
    >
      {children}
    </CircadianContext.Provider>
  );
}

export function useCircadian() {
  const context = useContext(CircadianContext);

  if (!context) {
    throw new Error("useCircadian must be used within a CircadianProvider.");
  }

  return context;
}
