"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  createAuditRecord,
  createClientId,
  getLatestAudit,
  LocalAuditState,
  mergeAuditHistory,
  STORAGE_KEY,
} from "@/lib/audit-store";
import { calculateScores, generateInsights } from "@/lib/scoring";
import { generateProtocol } from "@/lib/protocol";
import {
  AnswerMap,
  CircadianInsight,
  CircadianScores,
  HabitHistoryEntry,
  PersistedAuditRecord,
  PersistenceMode,
  ProtocolPlan,
  SaveStatus,
} from "@/types/circadian";
import { toggleHabitCompletion } from "@/lib/habit-tracker";

type CircadianState = {
  clientId: string;
  answers: AnswerMap;
  scores: CircadianScores | null;
  insight: CircadianInsight | null;
  protocol: ProtocolPlan | null;
  auditHistory: PersistedAuditRecord[];
  habitHistory: HabitHistoryEntry[];
  protocolLeadEmail: string | null;
  protocolLeadCapturedAt: string | null;
  persistenceMode: PersistenceMode;
  saveStatus: SaveStatus;
  lastSavedAt: string | null;
  isHydrated: boolean;
  hasCompletedAudit: boolean;
  setAnswer: (questionId: string, value: string) => void;
  completeAudit: () => void;
  toggleHabit: (date: string, habitId: string) => void;
  recordProtocolLead: (email: string) => void;
  resetAudit: () => void;
};

const CircadianContext = createContext<CircadianState | null>(null);

export function CircadianProvider({ children }: { children: ReactNode }) {
  const [clientId, setClientId] = useState("");
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [scores, setScores] = useState<CircadianScores | null>(null);
  const [insight, setInsight] = useState<CircadianInsight | null>(null);
  const [protocol, setProtocol] = useState<ProtocolPlan | null>(null);
  const [auditHistory, setAuditHistory] = useState<PersistedAuditRecord[]>([]);
  const [habitHistory, setHabitHistory] = useState<HabitHistoryEntry[]>([]);
  const [protocolLeadEmail, setProtocolLeadEmail] = useState<string | null>(null);
  const [protocolLeadCapturedAt, setProtocolLeadCapturedAt] = useState<string | null>(null);
  const [persistenceMode, setPersistenceMode] =
    useState<PersistenceMode>("local");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [hasCompletedAudit, setHasCompletedAudit] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const applyAuditRecord = (record: PersistedAuditRecord) => {
    setAnswers(record.answers);
    setScores(record.scores);
    setInsight(record.insight);
    setProtocol(record.protocol);
    setHasCompletedAudit(true);
    setLastSavedAt(record.createdAt);
  };

  useEffect(() => {
    const rawState = window.localStorage.getItem(STORAGE_KEY);

    if (rawState) {
      const parsedState = JSON.parse(rawState) as LocalAuditState;
      setClientId(parsedState.clientId ?? createClientId());
      setAnswers(parsedState.answers ?? {});
      setScores(parsedState.scores ?? null);
      setInsight(parsedState.insight ?? null);
      setProtocol(parsedState.protocol ?? null);
      setAuditHistory(parsedState.auditHistory ?? []);
      setHabitHistory(parsedState.habitHistory ?? []);
      setProtocolLeadEmail(parsedState.protocolLeadEmail ?? null);
      setProtocolLeadCapturedAt(parsedState.protocolLeadCapturedAt ?? null);
      setLastSavedAt(parsedState.lastSavedAt ?? null);
      setHasCompletedAudit(parsedState.hasCompletedAudit ?? false);
    } else {
      setClientId(createClientId());
    }

    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated || !clientId) {
      return;
    }

    const state: LocalAuditState = {
      clientId,
      answers,
      scores,
      insight,
      protocol,
      hasCompletedAudit,
      auditHistory,
      habitHistory,
      protocolLeadEmail,
      protocolLeadCapturedAt,
      lastSavedAt,
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [answers, auditHistory, clientId, habitHistory, hasCompletedAudit, insight, isHydrated, lastSavedAt, protocol, protocolLeadCapturedAt, protocolLeadEmail, scores]);

  useEffect(() => {
    if (!isHydrated || !clientId) {
      return;
    }

    let isCancelled = false;

    async function syncRemoteAudits() {
      try {
        const response = await fetch(
          `/api/audits?clientId=${encodeURIComponent(clientId)}&limit=6`,
        );

        if (!response.ok) {
          throw new Error("Unable to load saved audits.");
        }

        const data = (await response.json()) as {
          configured: boolean;
          audits?: PersistedAuditRecord[];
        };

        if (!data.configured || isCancelled) {
          return;
        }

        const remoteHistory = data.audits ?? [];
        const mergedHistory = mergeAuditHistory(auditHistory, remoteHistory);
        const latestRemote = getLatestAudit(mergedHistory);
        const latestLocal = getLatestAudit(auditHistory);
        const shouldApplyRemote = Boolean(
          latestRemote &&
            (((!hasCompletedAudit && Object.keys(answers).length === 0) ||
              !latestLocal ||
              new Date(latestRemote.createdAt).getTime() >
                new Date(latestLocal.createdAt).getTime())),
        );

        setPersistenceMode("supabase");
        setAuditHistory(mergedHistory);

        if (latestRemote && shouldApplyRemote) {
          applyAuditRecord(latestRemote);
        }
      } catch {
        setPersistenceMode("local");
      }
    }

    void syncRemoteAudits();

    return () => {
      isCancelled = true;
    };
  }, [answers, auditHistory, clientId, hasCompletedAudit, isHydrated]);

  const persistAuditRecord = async (record: PersistedAuditRecord) => {
    try {
      const response = await fetch("/api/audits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ record }),
      });

      if (!response.ok) {
        throw new Error("Unable to save audit.");
      }

      const data = (await response.json()) as {
        configured: boolean;
        audit?: PersistedAuditRecord;
      };

      if (!data.configured) {
        setPersistenceMode("local");
        setSaveStatus("saved");
        return;
      }

      setPersistenceMode("supabase");
      setSaveStatus("saved");

      if (data.audit) {
        setLastSavedAt(data.audit.createdAt);
        setAuditHistory((currentHistory) =>
          mergeAuditHistory(currentHistory, [data.audit!]),
        );
      }
    } catch {
      setPersistenceMode("local");
      setSaveStatus("error");
    }
  };

  const setAnswer = (questionId: string, value: string) => {
    setAnswers((current) => ({
      ...current,
      [questionId]: value,
    }));
  };

  const completeAudit = () => {
    const activeClientId = clientId || createClientId();

    if (!clientId) {
      setClientId(activeClientId);
    }

    const computedScores = calculateScores(answers);
    const computedInsight = generateInsights(computedScores, answers);
    const generatedProtocol = generateProtocol(
      computedScores,
      computedInsight,
      answers,
    );
    const record = createAuditRecord({
      clientId: activeClientId,
      answers,
      scores: computedScores,
      insight: computedInsight,
      protocol: generatedProtocol,
    });

    applyAuditRecord(record);
    setAuditHistory((currentHistory) => mergeAuditHistory(currentHistory, [record]));
    setSaveStatus("saving");

    void persistAuditRecord(record);
  };

  const toggleHabit = (date: string, habitId: string) => {
    setHabitHistory((current) => toggleHabitCompletion(current, date, habitId));
  };

  const recordProtocolLead = (email: string) => {
    setProtocolLeadEmail(email.trim());
    setProtocolLeadCapturedAt(new Date().toISOString());
  };

  const resetAudit = () => {
    const nextClientId = createClientId();
    setClientId(nextClientId);
    setAnswers({});
    setScores(null);
    setInsight(null);
    setProtocol(null);
    setAuditHistory([]);
    setHabitHistory([]);
    setProtocolLeadEmail(null);
    setProtocolLeadCapturedAt(null);
    setLastSavedAt(null);
    setHasCompletedAudit(false);
    setPersistenceMode("local");
    setSaveStatus("idle");
    window.localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <CircadianContext.Provider
      value={{
        clientId,
        answers,
        scores,
        insight,
        protocol,
        auditHistory,
        habitHistory,
        protocolLeadEmail,
        protocolLeadCapturedAt,
        persistenceMode,
        saveStatus,
        lastSavedAt,
        isHydrated,
        hasCompletedAudit,
        setAnswer,
        completeAudit,
        toggleHabit,
        recordProtocolLead,
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
