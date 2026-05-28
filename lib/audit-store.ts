import {
  AnswerMap,
  HabitHistoryEntry,
  CircadianInsight,
  CircadianScores,
  PersistedAuditRecord,
  ProtocolPlan,
} from "@/types/circadian";

export const STORAGE_KEY = "foundational-flow-circadian-app-state";
export const HISTORY_LIMIT = 6;

export type LocalAuditState = {
  clientId: string;
  answers: AnswerMap;
  scores: CircadianScores | null;
  insight: CircadianInsight | null;
  protocol: ProtocolPlan | null;
  hasCompletedAudit: boolean;
  auditHistory: PersistedAuditRecord[];
  habitHistory: HabitHistoryEntry[];
  protocolLeadFirstName: string | null;
  protocolLeadEmail: string | null;
  protocolLeadCapturedAt: string | null;
  lastSavedAt: string | null;
};

export function createClientId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `client-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createAuditRecord(args: {
  clientId: string;
  answers: AnswerMap;
  scores: CircadianScores;
  insight: CircadianInsight;
  protocol: ProtocolPlan;
}): PersistedAuditRecord {
  return {
    id:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `audit-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    clientId: args.clientId,
    createdAt: new Date().toISOString(),
    answers: args.answers,
    scores: args.scores,
    insight: args.insight,
    protocol: args.protocol,
  };
}

export function mergeAuditHistory(
  current: PersistedAuditRecord[],
  incoming: PersistedAuditRecord[],
) {
  const byId = new Map<string, PersistedAuditRecord>();

  for (const record of [...incoming, ...current]) {
    byId.set(record.id, record);
  }

  return Array.from(byId.values())
    .sort((left, right) => {
      return (
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      );
    })
    .slice(0, HISTORY_LIMIT);
}

export function getLatestAudit(history: PersistedAuditRecord[]) {
  return history[0] ?? null;
}
