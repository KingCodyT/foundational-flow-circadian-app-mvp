"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
  useMemo,
} from "react";
import {
  createClientId,
  LocalAuditState,
  normalizeDailyProfile,
  STORAGE_KEY,
} from "@/lib/audit-store";
import { getRuntimeTimeZone, localDateKey } from "@/lib/live-clock";
import { useLiveClock } from "@/hooks/use-live-clock";
import { buildDerivedEnvironment } from "@/lib/personalization/derived-environment";
import { buildContextSnapshot } from "@/lib/personalization/reconsideration";
import { advancePersonalization, resolvePersonalizationReview, PersonalizationRuntime } from "@/lib/personalization/runtime";
import { selectPrimaryCoachingTarget } from "@/lib/personalization/primary-target";
import {
  AssessmentEvidenceHistory,
} from "@/lib/personalization/reconsideration-application";
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
  personalization: PersonalizationRuntime["state"];
  environment: ReturnType<typeof buildDerivedEnvironment>;
  primaryTarget: ReturnType<typeof selectPrimaryCoachingTarget>;
  resolveReconsideration: (signalId: string) => void;
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
  const [runtimeCheckpoint, setRuntimeCheckpoint] = useState<PersonalizationRuntime | null>(null);
  const [legacyBaseline, setLegacyBaseline] = useState<LocalAuditState["previousContextSnapshot"]>(null);
  const [legacyHistory, setLegacyHistory] = useState<AssessmentEvidenceHistory>({});
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
        setRuntimeCheckpoint(parsedState.personalizationRuntime?.version === 1 ? parsedState.personalizationRuntime : null);
        setLegacyBaseline(parsedState.previousContextSnapshot ?? parsedState.currentContextSnapshot ?? null);
        setLegacyHistory(parsedState.assessmentEvidenceHistory ?? {});
        setLastSavedAt(parsedState.lastSavedAt ?? null);
        setHasCompletedAudit(parsedState.hasCompletedAudit ?? false);
      } catch {
        setClientId(createClientId());
      }
    } else {
      setClientId(createClientId());
    }

    setIsHydrated(true);
  }, []);

  // The provider is mounted by pages/_app, independent of the selected route.
  const now = useLiveClock();
  const todayKey = localDateKey(now, dailyProfile?.timeZone);
  const environment = useMemo(() => buildDerivedEnvironment({
    profile: dailyProfile, date: new Date(`${todayKey}T12:00:00`),
  }), [dailyProfile, todayKey]);
  const currentContext = useMemo(() => buildContextSnapshot({
    profile: dailyProfile, derivedEnvironment: environment,
  }), [dailyProfile, environment]);
  const runtimeInput = useMemo(() => ({
    answers, eventStateByDate, environment, context: currentContext,
    legacyHistory,
    legacyBaseline: legacyBaseline ? { ...legacyBaseline, capturedAt: legacyBaseline.capturedAt ?? currentContext.capturedAt } : null,
  }), [answers, eventStateByDate, environment, currentContext, legacyHistory, legacyBaseline]);
  const runtime = useMemo(() => advancePersonalization(
    isHydrated ? runtimeCheckpoint : null, runtimeInput,
  ), [isHydrated, runtimeCheckpoint, runtimeInput]);
  useEffect(() => {
    if (isHydrated && runtime !== runtimeCheckpoint) setRuntimeCheckpoint(runtime);
  }, [isHydrated, runtime, runtimeCheckpoint]);
  const primaryTarget = useMemo(() => selectPrimaryCoachingTarget(runtime.state), [runtime.state]);
  const resolveReconsideration = (signalId: string) => {
    if (!isHydrated) return;
    setRuntimeCheckpoint(current => resolvePersonalizationReview(
      current ?? runtime, runtimeInput, signalId, new Date().toISOString(),
    ));
  };

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
      personalizationRuntime: runtime,
      assessmentEvidenceHistory: runtime.history,
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
    participationLevel,
    runtime,
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
    setRuntimeCheckpoint(null);
    setLegacyBaseline(null);
    setLegacyHistory({});
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
        personalization: runtime.state,
        environment,
        primaryTarget,
        resolveReconsideration,
        getEventStateForDate,
        setEventRecord,
        clearEventRecords,
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
