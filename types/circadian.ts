export type QuestionCategory =
  | "Morning Light"
  | "Daytime Environment"
  | "Evening Light"
  | "Sleep Timing"
  | "Disruption Load"
  | "Location / Season";

export type InputType = "segmented";

export type QuestionOption = {
  value: string;
  label: string;
  detail: string;
  score: number;
};

export type Question = {
  id: string;
  category: QuestionCategory;
  prompt: string;
  description?: string;
  inputType: InputType;
  weight: number;
  options: QuestionOption[];
};

export type AnswerMap = Record<string, string>;

export type CategoryDefinition = {
  title: QuestionCategory;
  subtitle: string;
  intention: string;
  scoreKey?: keyof CircadianScores;
};

export type ScoreKey =
  | "morningSignalScore"
  | "daylightStrengthScore"
  | "darknessScore"
  | "sleepOutputScore"
  | "disruptionLoadScore";

export type CircadianScores = {
  morningSignalScore: number;
  daylightStrengthScore: number;
  darknessScore: number;
  sleepOutputScore: number;
  disruptionLoadScore: number;
  locationSeasonScore: number;
  overallCircadianScore: number;
};

export type ScoreSummary = {
  label: string;
  value: number;
  description: string;
  key: ScoreKey;
  band: "strong" | "stable" | "fragile" | "broken";
};

export type CircadianInsight = {
  primaryBrokenSignal: ScoreSummary;
  rankedSignals: ScoreSummary[];
  summary: string;
  primaryReason: string;
  strengths: string[];
  contextualNotes: string[];
};

export type ProtocolStep = {
  title: string;
  window: string;
  actions: string[];
};

export type ProtocolPlan = {
  headline: string;
  rationale: string;
  focusArea: string;
  steps: ProtocolStep[];
  supportNotes: string[];
};

export type PersistedAuditRecord = {
  id: string;
  clientId: string;
  createdAt: string;
  answers: AnswerMap;
  scores: CircadianScores;
  insight: CircadianInsight;
  protocol: ProtocolPlan;
};

export type PersistenceMode = "local" | "supabase";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export type HabitHistoryEntry = {
  date: string;
  completedHabitIds: string[];
};

export type EmailDeliveryStatus =
  | "idle"
  | "sending"
  | "sent"
  | "not_configured"
  | "error";

export type ParticipationLevel = "BASELINE" | "GUIDED_FLOW" | "FULL_FLOW";

export type DailyProfile = {
  wakeTime: string | null; // HH:MM local
  targetBedtime: string | null; // HH:MM local
  locationPermissionGranted: boolean;
  latitude?: number | null;
  longitude?: number | null;
};

export type EventStatus =
  | "upcoming"
  | "active"
  | "current"
  | "completed"
  | "skipped"
  | "missed";

export type EventRecord = {
  status: EventStatus;
  at: string; // ISO timestamp when action occurred (completed/skipped)
};

export type DailyEventState = Record<string, EventRecord>; // eventId -> EventRecord
