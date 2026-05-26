"use client";

import { AppShell } from "@/components/app-shell";
import { GuardedState } from "@/components/guarded-state";
import { NavActions } from "@/components/nav-actions";
import { SectionHeading } from "@/components/section-heading";
import { useCircadian } from "@/components/circadian-provider";
import { buildContextualExperience } from "@/lib/contextual-guidance";
import { buildDailyRhythm } from "@/lib/daily-rhythm";

export default function DailyRhythmPage() {
  const { answers, hasCompletedAudit, insight, isHydrated, protocol } = useCircadian();

  if (!isHydrated) {
    return (
      <AppShell>
        <div className="py-20 text-[var(--color-muted)]">Loading your daily rhythm...</div>
      </AppShell>
    );
  }

  if (!hasCompletedAudit || !insight || !protocol) {
    return (
      <AppShell eyebrow="Daily Rhythm">
        <div className="py-10">
          <GuardedState
            title="Your daily rhythm appears after the audit is complete."
            description="Complete the audit so the app can translate your results into a lived morning-to-night rhythm."
          />
        </div>
      </AppShell>
    );
  }

  const rhythm = buildDailyRhythm(answers, insight, protocol);
  const contextualExperience = buildContextualExperience({
    answers,
    insight,
    protocol,
  });

  return (
    <AppShell eyebrow="Daily Rhythm">
      <section className="space-y-10 py-6 lg:py-10">
        <SectionHeading
          eyebrow="Daily rhythm"
          title="A lived circadian schedule for the day you are trying to build."
          description="This turns your current protocol into a clearer day structure so the app feels less like a report and more like a rhythm you can actually inhabit."
        />

        <div className="ff-glass-card rounded-[2.5rem] p-6 lg:p-8">
          <p className="ff-section-eyebrow text-xs uppercase text-[var(--color-muted)]">
            Rhythm orientation
          </p>
          <div className="mt-4 grid gap-5 lg:grid-cols-[0.58fr_0.42fr]">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-4xl leading-tight lg:text-5xl">
                Build around {insight.primaryBrokenSignal.label.toLowerCase()} first.
              </h2>
              <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--color-muted)]">
                {insight.summary}
              </p>
            </div>
            <div className="ff-soft-panel rounded-[1.9rem] px-5 py-5">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--color-muted)]">
                Environment layer
              </p>
              <h3 className="mt-3 text-2xl font-medium">{contextualExperience.environmentTitle}</h3>
              <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
                {contextualExperience.environmentSummary}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-5">
          {rhythm.map((block, index) => (
            <article
              key={block.phase}
              className="ff-glass-card grid gap-4 rounded-[2.2rem] p-6 lg:grid-cols-[0.22fr_0.78fr] lg:p-7"
            >
              <div className="space-y-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(179,145,80,0.26)] bg-[rgba(179,145,80,0.12)] text-sm">
                  {index + 1}
                </div>
                <div>
                  <p className="ff-section-eyebrow text-xs uppercase text-[var(--color-muted)]">
                    {block.timing}
                  </p>
                  <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl lg:text-4xl">
                    {block.phase}
                  </h2>
                </div>
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.22em] text-[var(--color-muted)]">
                  Goal
                </p>
                <p className="mt-3 text-base leading-8 text-[var(--color-charcoal)]">
                  {block.goal}
                </p>
                <div className="mt-6 grid gap-3 md:grid-cols-2">
                  {block.anchors.map((anchor) => (
                    <div
                      key={anchor}
                      className="ff-soft-panel rounded-[1.6rem] px-4 py-4"
                    >
                      <p className="text-sm leading-7 text-[var(--color-muted)]">{anchor}</p>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <article className="ff-glass-card rounded-[2.2rem] p-6">
            <p className="text-sm uppercase tracking-[0.24em] text-[var(--color-muted)]">
              Seasonal food rhythm
            </p>
            <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
              {contextualExperience.seasonalNutrition.description}
            </p>
            <div className="mt-4 space-y-3">
              {contextualExperience.seasonalNutrition.items.map((item) => (
                <div
                  key={item}
                  className="ff-soft-panel flex items-start gap-3 rounded-[1.35rem] px-4 py-3"
                >
                  <span className="mt-2 h-2 w-2 rounded-full bg-[var(--color-gold)]" />
                  <p className="text-sm leading-7 text-[var(--color-muted)]">{item}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="ff-dark-card rounded-[2.2rem] p-6 text-[var(--color-cream)]">
            <p className="text-sm uppercase tracking-[0.24em] text-[var(--color-gold-soft)]">
              Habits to install this week
            </p>
            <p className="mt-3 text-sm leading-7 text-[rgba(248,244,236,0.78)]">
              {contextualExperience.habitStack.description}
            </p>
            <div className="mt-4 space-y-3">
              {contextualExperience.habitStack.items.map((item) => (
                <div
                  key={item}
                  className="rounded-[1.35rem] bg-[rgba(248,244,236,0.08)] px-4 py-3"
                >
                  <p className="text-sm leading-7 text-[rgba(248,244,236,0.82)]">{item}</p>
                </div>
              ))}
            </div>
          </article>
        </div>

        <NavActions previousHref="/protocol" nextHref="/tracker" nextLabel="Open habit tracker" />
      </section>
    </AppShell>
  );
}
