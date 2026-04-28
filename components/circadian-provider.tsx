"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { calculateScores, generateInsights } from "@/lib/scoring";
import { generateProtocol } from "@/lib/protocol";
import {
  AnswerMap,
  CircadianInsight,
  CircadianScores,
  ProtocolPlan,
} from "@/types/circadian";

type CircadianState = {
  answers: AnswerMap;
  scores: CircadianScores | null;
  insight: CircadianInsight | null;
  protocol: ProtocolPlan | null;
  isHydrated: boolean;
  hasCompletedAudit: boolean;
  setAnswer: (questionId: string, value: string) => void;
  completeAudit: () => void;
  resetAudit: () => void;
};

const STORAGE_KEY = "foundational-flow-circadian-app-state";

const CircadianContext = createContext<CircadianState | null>(null);

type PersistedState = {
  answers: AnswerMap;
  scores: CircadianScores | null;
  insight: CircadianInsight | null;
  protocol: ProtocolPlan | null;
  hasCompletedAudit: boolean;
};

export function CircadianProvider({ children }: { children: ReactNode }) {
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [scores, setScores] = useState<CircadianScores | null>(null);
  const [insight, setInsight] = useState<CircadianInsight | null>(null);
  const [protocol, setProtocol] = useState<ProtocolPlan | null>(null);
  const [hasCompletedAudit, setHasCompletedAudit] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const rawState = window.localStorage.getItem(STORAGE_KEY);

    if (rawState) {
      const parsedState = JSON.parse(rawState) as PersistedState;
      setAnswers(parsedState.answers ?? {});
      setScores(parsedState.scores ?? null);
      setInsight(parsedState.insight ?? null);
      setProtocol(parsedState.protocol ?? null);
      setHasCompletedAudit(parsedState.hasCompletedAudit ?? false);
    }

    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const state: PersistedState = {
      answers,
      scores,
      insight,
      protocol,
      hasCompletedAudit,
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [answers, hasCompletedAudit, insight, isHydrated, protocol, scores]);

  const setAnswer = (questionId: string, value: string) => {
    setAnswers((current) => ({
      ...current,
      [questionId]: value,
    }));
  };

  const completeAudit = () => {
    const computedScores = calculateScores(answers);
    const computedInsight = generateInsights(computedScores, answers);
    const generatedProtocol = generateProtocol(
      computedScores,
      computedInsight,
      answers,
    );

    setScores(computedScores);
    setInsight(computedInsight);
    setProtocol(generatedProtocol);
    setHasCompletedAudit(true);
  };

  const resetAudit = () => {
    setAnswers({});
    setScores(null);
    setInsight(null);
    setProtocol(null);
    setHasCompletedAudit(false);
    window.localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <CircadianContext.Provider
      value={{
        answers,
        scores,
        insight,
        protocol,
        isHydrated,
        hasCompletedAudit,
        setAnswer,
        completeAudit,
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
