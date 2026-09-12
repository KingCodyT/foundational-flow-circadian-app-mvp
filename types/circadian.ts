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
  // Used by initial personalization to map answers to coaching states.
  score: number;
};

export type Question = {
  id: string;
  category: QuestionCategory;
  prompt: string;
  description?: string;
  inputType: InputType;
  options: QuestionOption[];
};

export type AnswerMap = Record<string, string>;

export type CategoryDefinition = {
  title: QuestionCategory;
  subtitle: string;
  intention: string;
};

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
