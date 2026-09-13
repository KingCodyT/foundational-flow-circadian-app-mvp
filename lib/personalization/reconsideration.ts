import { DailyProfile } from "@/types/circadian";
import { DerivedEnvironment } from "./derived-environment";

export type ReconsiderationReason =
  | "TIMEZONE_CHANGED"
  | "LOCATION_CHANGED"
  | "SCHEDULE_CHANGED"
  | "SEASONAL_CONTEXT_CHANGED"
  | "EVIDENCE_CONFLICT";

export type ContextSnapshot = {
  timeZone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  wakeTime?: string | null;
  targetBedtime?: string | null;
  dayLengthMinutes?: number | null;
  capturedAt: string;
};

export type SignalEvidenceFragment = {
  questionId?: string | null;
  answer?: string | null;
  status?: string | null;
  source?: string[];
};

export type SignalReconsideration = {
  signalId: string;
  shouldReconsider: boolean;
  reasons: ReconsiderationReason[];
  observedAt: string;
};

const SIGNAL_RELEVANCE: Record<string, ReconsiderationReason[]> = {
  morning_light_timing: ["TIMEZONE_CHANGED", "LOCATION_CHANGED", "SCHEDULE_CHANGED", "SEASONAL_CONTEXT_CHANGED", "EVIDENCE_CONFLICT"],
  morning_light_duration: ["TIMEZONE_CHANGED", "LOCATION_CHANGED", "SCHEDULE_CHANGED", "SEASONAL_CONTEXT_CHANGED", "EVIDENCE_CONFLICT"],
  morning_movement: ["SCHEDULE_CHANGED", "EVIDENCE_CONFLICT"],
  day_brightness: ["TIMEZONE_CHANGED", "LOCATION_CHANGED", "SCHEDULE_CHANGED", "SEASONAL_CONTEXT_CHANGED", "EVIDENCE_CONFLICT"],
  day_breaks_outside: ["TIMEZONE_CHANGED", "LOCATION_CHANGED", "SCHEDULE_CHANGED", "SEASONAL_CONTEXT_CHANGED", "EVIDENCE_CONFLICT"],
  meal_timing_regularity: ["SCHEDULE_CHANGED", "EVIDENCE_CONFLICT"],
  last_meal_timing: ["SCHEDULE_CHANGED", "EVIDENCE_CONFLICT"],
  evening_light_reduction: ["TIMEZONE_CHANGED", "LOCATION_CHANGED", "SCHEDULE_CHANGED", "SEASONAL_CONTEXT_CHANGED", "EVIDENCE_CONFLICT"],
  evening_screen_exposure: ["TIMEZONE_CHANGED", "LOCATION_CHANGED", "SCHEDULE_CHANGED", "SEASONAL_CONTEXT_CHANGED", "EVIDENCE_CONFLICT"],
  sleep_schedule: ["TIMEZONE_CHANGED", "SCHEDULE_CHANGED", "EVIDENCE_CONFLICT"],
};

const LOCATION_CHANGE_KM_THRESHOLD = 25;
const SCHEDULE_CHANGE_MINUTES_THRESHOLD = 60;
const SEASONAL_DAY_LENGTH_THRESHOLD_MINUTES = 60;

function parseClockMinutes(value?: string | null): number | null {
  if (!value || typeof value !== "string") return null;
  const match = /^\d{1,2}:\d{2}$/.exec(value.trim());
  if (!match) return null;
  const [hourText, minuteText] = value.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
}

function timeDifferenceMinutes(valueA?: string | null, valueB?: string | null): number | null {
  const a = parseClockMinutes(valueA);
  const b = parseClockMinutes(valueB);
  if (a == null || b == null) return null;
  const rawDifference = Math.abs(a - b);
  return Math.min(rawDifference, 24 * 60 - rawDifference);
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function haversineDistanceKm(lat1?: number | null, lon1?: number | null, lat2?: number | null, lon2?: number | null): number | null {
  if (
    lat1 == null || lon1 == null || lat2 == null || lon2 == null ||
    !Number.isFinite(lat1) || !Number.isFinite(lon1) || !Number.isFinite(lat2) || !Number.isFinite(lon2)
  ) {
    return null;
  }

  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

export function buildContextSnapshot(opts: {
  profile?: DailyProfile | null;
  derivedEnvironment?: DerivedEnvironment | null;
  capturedAt?: string;
}): ContextSnapshot {
  return {
    timeZone: opts.profile?.timeZone ?? opts.derivedEnvironment?.timezone ?? null,
    latitude: opts.derivedEnvironment?.latitude ?? opts.profile?.latitude ?? null,
    longitude: opts.derivedEnvironment?.longitude ?? opts.profile?.longitude ?? null,
    wakeTime: opts.profile?.wakeTime ?? null,
    targetBedtime: opts.profile?.targetBedtime ?? null,
    dayLengthMinutes: opts.derivedEnvironment?.dayLengthMinutes ?? null,
    capturedAt: opts.capturedAt ?? new Date().toISOString(),
  };
}

export function hasMeaningfulLocationChange(
  priorContext?: ContextSnapshot | null,
  currentContext?: ContextSnapshot | null,
): boolean {
  if (!priorContext || !currentContext) return false;
  if (priorContext.latitude == null || priorContext.longitude == null || currentContext.latitude == null || currentContext.longitude == null) return false;

  const deltaKm = haversineDistanceKm(
    priorContext.latitude,
    priorContext.longitude,
    currentContext.latitude,
    currentContext.longitude,
  );

  return deltaKm != null && deltaKm >= LOCATION_CHANGE_KM_THRESHOLD;
}

export function hasMeaningfulScheduleChange(
  priorContext?: ContextSnapshot | null,
  currentContext?: ContextSnapshot | null,
): boolean {
  if (!priorContext || !currentContext) return false;

  const wakeDiff = timeDifferenceMinutes(priorContext.wakeTime, currentContext.wakeTime);
  const bedtimeDiff = timeDifferenceMinutes(priorContext.targetBedtime, currentContext.targetBedtime);

  return (wakeDiff != null && wakeDiff >= SCHEDULE_CHANGE_MINUTES_THRESHOLD) ||
    (bedtimeDiff != null && bedtimeDiff >= SCHEDULE_CHANGE_MINUTES_THRESHOLD);
}

export function hasMeaningfulSeasonalContextChange(
  priorContext?: ContextSnapshot | null,
  currentContext?: ContextSnapshot | null,
): boolean {
  if (!priorContext || !currentContext) return false;
  if (priorContext.dayLengthMinutes == null || currentContext.dayLengthMinutes == null) return false;
  return Math.abs(currentContext.dayLengthMinutes - priorContext.dayLengthMinutes) >= SEASONAL_DAY_LENGTH_THRESHOLD_MINUTES;
}

function hasSemanticEvidenceConflict(evidence: SignalEvidenceFragment[] = []): boolean {
  const direct = evidence.filter((item) => {
    const answer = item.answer;
    return !!item.questionId && typeof answer === "string" && answer.trim().length > 0 && item.status == null;
  });

  if (direct.length < 2) return false;

  const byQuestion: Record<string, Set<string>> = {};
  for (const entry of direct) {
    if (!entry.questionId) continue;
    const normalized = String(entry.answer).trim();
    const bucket = byQuestion[entry.questionId] ?? new Set<string>();
    bucket.add(normalized);
    byQuestion[entry.questionId] = bucket;
  }

  return Object.values(byQuestion).some((answers) => answers.size > 1);
}

export function assessSignalReconsideration(opts: {
  signalId: string;
  priorContext?: ContextSnapshot | null;
  currentContext?: ContextSnapshot | null;
  evidence?: SignalEvidenceFragment[];
}): SignalReconsideration {
  const relevant = SIGNAL_RELEVANCE[opts.signalId] ?? [];
  const reasons: ReconsiderationReason[] = [];

  if (relevant.includes("TIMEZONE_CHANGED") && priorContextIsKnown(opts.priorContext) && priorContextIsKnown(opts.currentContext)) {
    const priorTimeZone = opts.priorContext?.timeZone ?? null;
    const currentTimeZone = opts.currentContext?.timeZone ?? null;
    if (priorTimeZone && currentTimeZone && priorTimeZone !== currentTimeZone) {
      reasons.push("TIMEZONE_CHANGED");
    }
  }

  if (relevant.includes("LOCATION_CHANGED") && hasMeaningfulLocationChange(opts.priorContext, opts.currentContext)) {
    reasons.push("LOCATION_CHANGED");
  }

  if (relevant.includes("SCHEDULE_CHANGED") && hasMeaningfulScheduleChange(opts.priorContext, opts.currentContext)) {
    reasons.push("SCHEDULE_CHANGED");
  }

  if (relevant.includes("SEASONAL_CONTEXT_CHANGED") && hasMeaningfulSeasonalContextChange(opts.priorContext, opts.currentContext)) {
    reasons.push("SEASONAL_CONTEXT_CHANGED");
  }

  if (relevant.includes("EVIDENCE_CONFLICT") && hasSemanticEvidenceConflict(opts.evidence)) {
    reasons.push("EVIDENCE_CONFLICT");
  }

  return {
    signalId: opts.signalId,
    shouldReconsider: reasons.length > 0,
    reasons: Array.from(new Set(reasons)),
    observedAt: new Date().toISOString(),
  };
}

export function assessReconsideration(opts: {
  priorContext?: ContextSnapshot | null;
  currentContext?: ContextSnapshot | null;
  signalEvidence?: Record<string, SignalEvidenceFragment[]>;
  signalIds?: string[];
}): Record<string, SignalReconsideration> {
  const signalIds = (opts.signalIds && opts.signalIds.length > 0 ? opts.signalIds : Object.keys(SIGNAL_RELEVANCE));
  const result: Record<string, SignalReconsideration> = {};

  for (const signalId of signalIds) {
    result[signalId] = assessSignalReconsideration({
      signalId,
      priorContext: opts.priorContext,
      currentContext: opts.currentContext,
      evidence: opts.signalEvidence?.[signalId] ?? [],
    });
  }

  return result;
}

function priorContextIsKnown(context?: ContextSnapshot | null): boolean {
  return Boolean(context && (context.timeZone || context.latitude != null || context.longitude != null || context.wakeTime || context.targetBedtime || context.dayLengthMinutes != null));
}

export default assessReconsideration;
