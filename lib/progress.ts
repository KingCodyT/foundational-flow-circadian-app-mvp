import { PersistedAuditRecord, ScoreKey } from "@/types/circadian";

type TrendDirection = "up" | "down" | "flat";

export type TrendSummary = {
  current: number;
  previous: number | null;
  delta: number | null;
  direction: TrendDirection;
};

export type ProgressSignalSummary = {
  label: string;
  value: number;
  delta: number | null;
};

const scoreLabelMap: Record<ScoreKey, string> = {
  morningSignalScore: "Morning Signal",
  daylightStrengthScore: "Daylight Strength",
  darknessScore: "Darkness",
  sleepOutputScore: "Sleep Output",
  disruptionLoadScore: "Disruption Load",
};

export function buildOverallTrend(history: PersistedAuditRecord[]): TrendSummary {
  const current = history[0]?.scores.overallCircadianScore ?? 0;
  const previous = history[1]?.scores.overallCircadianScore ?? null;

  if (previous === null) {
    return {
      current,
      previous: null,
      delta: null,
      direction: "flat",
    };
  }

  const delta = Math.round((current - previous) * 10) / 10;

  return {
    current,
    previous,
    delta,
    direction: delta > 0 ? "up" : delta < 0 ? "down" : "flat",
  };
}

export function getOverallSeries(history: PersistedAuditRecord[]) {
  return [...history]
    .reverse()
    .map((record) => record.scores.overallCircadianScore);
}

export function buildSignalDeltaSummary(history: PersistedAuditRecord[]) {
  const current = history[0];
  const previous = history[1];

  if (!current) {
    return [];
  }

  const signalKeys: ScoreKey[] = [
    "morningSignalScore",
    "daylightStrengthScore",
    "darknessScore",
    "sleepOutputScore",
    "disruptionLoadScore",
  ];

  const summaries: ProgressSignalSummary[] = signalKeys.map((key) => {
    const currentValue = current.scores[key];
    const previousValue = previous ? previous.scores[key] : null;

    return {
      label: scoreLabelMap[key],
      value: currentValue,
      delta:
        previousValue === null
          ? null
          : Math.round((currentValue - previousValue) * 10) / 10,
    };
  });

  return summaries.sort((left, right) => {
    const leftDelta = left.delta ?? -999;
    const rightDelta = right.delta ?? -999;
    return rightDelta - leftDelta;
  });
}

export function describeTrend(history: PersistedAuditRecord[]) {
  const trend = buildOverallTrend(history);

  if (history.length < 2) {
    return "Run the audit again after several days of following the protocol to see whether the overall system is actually shifting.";
  }

  if (trend.direction === "up" && (trend.delta ?? 0) >= 5) {
    return "The overall score is moving in the right direction. Keep the current protocol steady long enough to see whether the weak signal continues to recover.";
  }

  if (trend.direction === "up") {
    return "The score is improving, but only modestly. That usually means the direction is right and the consistency still needs work.";
  }

  if (trend.direction === "down" && (trend.delta ?? 0) <= -5) {
    return "The latest check-in fell back. Revisit whether the protocol is being implemented consistently or whether a new disruption is diluting the signal.";
  }

  if (trend.direction === "down") {
    return "The profile softened slightly since the last audit. Look for small slips in timing, light, or evening structure before overhauling the whole plan.";
  }

  return "The score is essentially flat. That can mean the routine is stable, but it may also mean the main weak signal has not changed enough yet to move the broader system.";
}
