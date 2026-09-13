"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  createClientId,
  LocalAuditState,
  normalizeDailyProfile,
  STORAGE_KEY,
} from "@/lib/audit-store";
import { getRuntimeTimeZone } from "@/lib/live-clock";
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

type CircadianState = {
  clientId: string;
  answers: AnswerMap;
  lastSavedAt: string | null;
  isHydrated: boolean;
  hasCompletedAudit: boolean;
  participationLevel: ParticipationLevel | null;
  dailyProfile: DailyProfile | null;
  eventStateByDate: Record<string, DailyEventState> | null;
  previousContextSnapshot: {
    timeZone?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    wakeTime?: string | null;
    targetBedtime?: string | null;
    dayLengthMinutes?: number | null;
    capturedAt?: string | null;
  } | null;
  currentContextSnapshot: {
    timeZone?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    wakeTime?: string | null;
    targetBedtime?: string | null;
    dayLengthMinutes?: number | null;
    capturedAt?: string | null;
  } | null;
  notificationState: NotificationPersistenceState;
  getEventStateForDate: (dateStr: string) => DailyEventState;
  setEventRecord: (
    dateStr: string,
    eventId: string,
    record: {
      status: "completed" | "skipped" | "missed";
      at?: string;
    },
  ) => void;
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
  const [clientId, setClientId] = useState("");
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [participationLevel, setParticipationLevelState] =
    useState<ParticipationLevel | null>(null);
  const [dailyProfile, setDailyProfileState] = useState<DailyProfile | null>(null);
  const [eventStateByDate, setEventStateByDate] = useState<Record<
    string,
    DailyEventState
  > | null>(null);
  const [previousContextSnapshot, setPreviousContextSnapshot] = useState<{
    timeZone?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    wakeTime?: string | null;
    targetBedtime?: string | null;
    dayLengthMinutes?: number | null;
    capturedAt?: string | null;
  } | null>(null);
  const [currentContextSnapshot, setCurrentContextSnapshot] = useState<{
    timeZone?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    wakeTime?: string | null;
    targetBedtime?: string | null;
    dayLengthMinutes?: number | null;
    capturedAt?: string | null;
  } | null>(null);
  const [notificationState, setNotificationState] =
    useState<NotificationPersistenceState>(DEFAULT_NOTIFICATION_PERSISTENCE_STATE);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [hasCompletedAudit, setHasCompletedAudit] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const rawState = window.localStorage.getItem(STORAGE_KEY);

    if (rawState) {
      try {
        const parsedState = JSON.parse(rawState) as LocalAuditState;
        const fallbackTimeZone = getRuntimeTimeZone();
        setClientId(parsedState.clientId ?? createClientId());
        setAnswers(parsedState.answers ?? {});
        setParticipationLevelState(parsedState.participationLevel ?? null);
        setDailyProfileState(normalizeDailyProfile(parsedState.dailyProfile ?? null, fallbackTimeZone));
        setEventStateByDate(parsedState.eventStateByDate ?? null);
        setPreviousContextSnapshot(parsedState.previousContextSnapshot ?? null);
        setCurrentContextSnapshot(parsedState.currentContextSnapshot ?? null);
        setNotificationState(
          pruneNotificationPersistenceState(parsedState.notificationState ?? null),
        );
        setLastSavedAt(parsedState.lastSavedAt ?? null);
        setHasCompletedAudit(parsedState.hasCompletedAudit ?? false);
      } catch {
        setClientId(createClientId());
        setNotificationState(DEFAULT_NOTIFICATION_PERSISTENCE_STATE);
      }
    } else {
      setClientId(createClientId());
      setNotificationState(DEFAULT_NOTIFICATION_PERSISTENCE_STATE);
    }

    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated || !clientId) return;

    const state: LocalAuditState = {
      clientId,
      answers,
      hasCompletedAudit,
      lastSavedAt,
      participationLevel,
      dailyProfile,
      eventStateByDate,
      previousContextSnapshot,
      currentContextSnapshot,
      notificationState: pruneNotificationPersistenceState(notificationState),
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [
    answers,
    clientId,
    dailyProfile,
    eventStateByDate,
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

  const setEventRecord = (
    dateStr: string,
    eventId: string,
    record: {
      status: "completed" | "skipped" | "missed";
      at?: string;
    },
  ) => {
    setEventStateByDate((current) => {
      const next = { ...(current ?? {}) };
      const dayState = { ...(next[dateStr] ?? {}) };
      dayState[eventId] = {
        status: record.status,
        at: record.at ?? new Date().toISOString(),
      };
      next[dateStr] = dayState;
      return next;
    });
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

  const setScheduledNotification = (record: ScheduledNotificationRecord | null) => {
    setNotificationState((current) => ({
      ...current,
      scheduledNotification: record,
    }));
  };

  const recordDeliveredNotification = (record: DeliveredNotificationRecord) => {
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
  };

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
    setHasCompletedAudit(true);
    setLastSavedAt(new Date().toISOString());
  };

  const resetAudit = () => {
    setClientId(createClientId());
    setAnswers({});
    setParticipationLevelState(null);
    setDailyProfileState(null);
    setEventStateByDate(null);
    setPreviousContextSnapshot(null);
    setCurrentContextSnapshot(null);
    setNotificationState(DEFAULT_NOTIFICATION_PERSISTENCE_STATE);
    setLastSavedAt(null);
    setHasCompletedAudit(false);
    window.localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <CircadianContext.Provider
      value={{
        clientId,
        answers,
        lastSavedAt,
        isHydrated,
        hasCompletedAudit,
        participationLevel,
        dailyProfile,
        eventStateByDate,
        previousContextSnapshot,
        currentContextSnapshot,
        notificationState,
        getEventStateForDate,
        setEventRecord,
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
