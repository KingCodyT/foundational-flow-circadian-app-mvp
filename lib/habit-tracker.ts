import { DailyRhythmBlock } from "@/lib/daily-rhythm";
import { HabitHistoryEntry } from "@/types/circadian";

export type TrackableHabit = {
  id: string;
  phase: DailyRhythmBlock["phase"];
  timing: string;
  label: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getTodayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function buildTrackableHabits(blocks: DailyRhythmBlock[]): TrackableHabit[] {
  return blocks.flatMap((block) =>
    block.anchors.map((anchor, index) => ({
      id: `${slugify(block.phase)}-${index + 1}`,
      phase: block.phase,
      timing: block.timing,
      label: anchor,
    })),
  );
}

export function getHabitEntry(
  history: HabitHistoryEntry[],
  date = getTodayKey(),
) {
  return history.find((entry) => entry.date === date) ?? null;
}

export function getCompletedHabitIds(
  history: HabitHistoryEntry[],
  date = getTodayKey(),
) {
  return getHabitEntry(history, date)?.completedHabitIds ?? [];
}

export function toggleHabitCompletion(
  history: HabitHistoryEntry[],
  date: string,
  habitId: string,
) {
  const existing = getHabitEntry(history, date);

  if (!existing) {
    return [...history, { date, completedHabitIds: [habitId] }].sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  }

  const completedSet = new Set(existing.completedHabitIds);

  if (completedSet.has(habitId)) {
    completedSet.delete(habitId);
  } else {
    completedSet.add(habitId);
  }

  return history
    .map((entry) =>
      entry.date === date
        ? {
            ...entry,
            completedHabitIds: Array.from(completedSet),
          }
        : entry,
    )
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function getCompletionPercentage(
  totalHabits: number,
  completedHabits: number,
) {
  if (totalHabits === 0) {
    return 0;
  }

  return Math.round((completedHabits / totalHabits) * 100);
}

export function getRecentCompletionSeries(
  history: HabitHistoryEntry[],
  allHabits: TrackableHabit[],
) {
  const total = allHabits.length || 1;

  return history
    .slice(-7)
    .map((entry) => ({
      date: entry.date,
      completion: getCompletionPercentage(total, entry.completedHabitIds.length),
    }));
}

export function getCurrentStreak(history: HabitHistoryEntry[], allHabits: TrackableHabit[]) {
  if (history.length === 0 || allHabits.length === 0) {
    return 0;
  }

  const total = allHabits.length;
  const sorted = [...history].sort((a, b) => b.date.localeCompare(a.date));
  let streak = 0;
  let cursor = new Date(getTodayKey());

  for (const entry of sorted) {
    const entryDate = entry.date;
    const cursorKey = getTodayKey(cursor);

    if (entryDate !== cursorKey) {
      if (entry.completedHabitIds.length === 0) {
        continue;
      }

      break;
    }

    if (entry.completedHabitIds.length === 0) {
      break;
    }

    streak += 1;
    cursor.setDate(cursor.getDate() - 1);

    if (entry.completedHabitIds.length < total / 3) {
      break;
    }
  }

  return streak;
}
