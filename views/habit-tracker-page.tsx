"use client";

import { AppShell } from "@/components/app-shell";
import { GuardedState } from "@/components/guarded-state";
import { NavActions } from "@/components/nav-actions";
import { ProgressSparkline } from "@/components/progress-sparkline";
import { SectionHeading } from "@/components/section-heading";
import { useCircadian } from "@/components/circadian-provider";
import { buildDailyRhythm } from "@/lib/daily-rhythm";
import {
  buildTrackableHabits,
  getCompletedHabitIds,
  getCompletionPercentage,
  getCurrentStreak,
  getRecentCompletionSeries,
  getTodayKey,
} from "@/lib/habit-tracker";

export default function HabitTrackerPage() {
  const {
    answers,
    habitHistory,
    hasCompletedAudit,
    insight,
    isHydrated,
    protocol,
    toggleHabit,
  } = useCircadian();

  if (!isHydrated) {
    return (
      <AppShell>
        <div className="py-20 text-[var(--color-muted)]">Loading your habit tracker...</div>
      </AppShell>
    );
  }

  if (!hasCompletedAudit || !insight || !protocol) {
    return (
      <AppShell eyebrow="Habit Tracker">
        <div className="py-10">
          <GuardedState
            title="Your tracker appears after the audit is complete."
            description="Complete the audit so the app can turn your rhythm plan into daily checkoffs."
          />
        </div>
      </AppShell>
    );
  }

  const todayKey = getTodayKey();
  const rhythm = buildDailyRhythm(answers, insight, protocol);
  const habits = buildTrackableHabits(rhythm);
  const completedIds = new Set(getCompletedHabitIds(habitHistory, todayKey));
  const completionPercentage = getCompletionPercentage(habits.length, completedIds.size);
  const completionSeries = getRecentCompletionSeries(habitHistory, habits).map(
    (item) => item.completion,
  );
  const streak = getCurrentStreak(habitHistory, habits);

  return (
    <AppShell eyebrow="Habit Tracker">
      <section className="space-y-10 py-6 lg:py-10">
        <SectionHeading
          eyebrow="Habit tracker"
          title="Daily circadian checkoffs built from your current rhythm plan."
          description="Instead of re-reading the protocol every day, use this tracker to practice the behaviors that actually move the signal."
        />

        <div className="grid gap-6 lg:grid-cols-[0.58fr_0.42fr]">
          <article className="rounded-[2rem] border border-[var(--color-line)] bg-[var(--color-charcoal)] p-6 text-[var(--color-cream)]">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-gold-soft)]">
              Today
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="rounded-[1.5rem] bg-[rgba(248,244,236,0.08)] px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-gold-soft)]">
                  Completion
                </p>
                <p className="mt-2 font-[family-name:var(--font-display)] text-4xl">
                  {completionPercentage}%
                </p>
              </div>
              <div className="rounded-[1.5rem] bg-[rgba(248,244,236,0.08)] px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-gold-soft)]">
                  Checked off
                </p>
                <p className="mt-2 font-[family-name:var(--font-display)] text-4xl">
                  {completedIds.size}/{habits.length}
                </p>
              </div>
              <div className="rounded-[1.5rem] bg-[rgba(248,244,236,0.08)] px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-gold-soft)]">
                  Streak
                </p>
                <p className="mt-2 font-[family-name:var(--font-display)] text-4xl">
                  {streak}d
                </p>
              </div>
            </div>
            <p className="mt-5 text-sm leading-6 text-[rgba(248,244,236,0.76)]">
              The goal is not perfect logging. The goal is enough repetition that your biology starts to trust the timing.
            </p>
          </article>

          <article className="rounded-[2rem] border border-[var(--color-line)] bg-white/80 p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">
              Last 7 days
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl">
              Consistency trend
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
              Use this as a rhythm signal, not a productivity score. Even partial completion on the right habits is more useful than random perfect days.
            </p>
            <div className="mt-5">
              <ProgressSparkline values={completionSeries} stroke="var(--color-charcoal)" />
            </div>
          </article>
        </div>

        <div className="grid gap-5">
          {rhythm.map((block) => {
            const blockHabits = habits.filter((habit) => habit.phase === block.phase);

            return (
              <article
                key={block.phase}
                className="rounded-[2rem] border border-[var(--color-line)] bg-white/78 p-6"
              >
                <div className="grid gap-4 lg:grid-cols-[0.24fr_0.76fr]">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">
                      {block.timing}
                    </p>
                    <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl">
                      {block.phase}
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
                      {block.goal}
                    </p>
                  </div>
                  <div className="grid gap-3">
                    {blockHabits.map((habit) => {
                      const isComplete = completedIds.has(habit.id);

                      return (
                        <button
                          key={habit.id}
                          type="button"
                          onClick={() => toggleHabit(todayKey, habit.id)}
                          className={`flex items-start gap-4 rounded-[1.5rem] border px-4 py-4 text-left transition ${
                            isComplete
                              ? "border-[var(--color-gold)] bg-[rgba(179,145,80,0.12)]"
                              : "border-[var(--color-line)] bg-[var(--color-cream)]/68 hover:bg-white"
                          }`}
                        >
                          <span
                            className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs ${
                              isComplete
                                ? "border-[var(--color-gold)] bg-[var(--color-gold)] text-[var(--color-charcoal)]"
                                : "border-[var(--color-line)] text-[var(--color-muted)]"
                            }`}
                          >
                            {isComplete ? "✓" : ""}
                          </span>
                          <div>
                            <p className="text-sm leading-6 text-[var(--color-charcoal)]">
                              {habit.label}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <NavActions previousHref="/rhythm" nextHref="/dashboard" nextLabel="Back to dashboard" />
      </section>
    </AppShell>
  );
}
