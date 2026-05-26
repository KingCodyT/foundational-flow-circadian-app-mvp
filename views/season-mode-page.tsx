"use client";

import { AppShell } from "@/components/app-shell";
import { GuardedState } from "@/components/guarded-state";
import { NavActions } from "@/components/nav-actions";
import { SectionHeading } from "@/components/section-heading";
import { useCircadian } from "@/components/circadian-provider";
import { buildSeasonMode } from "@/lib/season-mode";

export default function SeasonModePage() {
  const { answers, hasCompletedAudit, insight, isHydrated, protocol } = useCircadian();

  if (!isHydrated) {
    return (
      <AppShell>
        <div className="py-20 text-[var(--color-muted)]">Loading your season mode...</div>
      </AppShell>
    );
  }

  if (!hasCompletedAudit || !insight || !protocol) {
    return (
      <AppShell eyebrow="Season Mode">
        <div className="py-10">
          <GuardedState
            title="Season Mode appears after the audit is complete."
            description="Complete the audit so the app can adapt your rhythm to your current season and daylight environment."
          />
        </div>
      </AppShell>
    );
  }

  const seasonMode = buildSeasonMode(answers, insight, protocol);

  return (
    <AppShell eyebrow="Season Mode">
      <section className="space-y-10 py-6 lg:py-10">
        <SectionHeading
          eyebrow="Season mode"
          title={seasonMode.title}
          description="This layer adjusts the circadian plan to the kind of daylight environment you are actually living in right now."
        />

        <div className="rounded-[2.25rem] border border-[var(--color-line)] bg-[linear-gradient(145deg,rgba(255,255,255,0.88),rgba(239,231,214,0.92))] p-6">
          <div className="grid gap-5 lg:grid-cols-[0.62fr_0.38fr]">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">
                Current mode
              </p>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl leading-tight">
                {seasonMode.label}
              </h2>
              <p className="mt-4 text-sm leading-7 text-[var(--color-muted)]">
                {seasonMode.summary}
              </p>
            </div>
            <div className="rounded-[1.75rem] border border-[var(--color-line)] bg-white/78 px-5 py-5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-muted)]">
                Primary signal to protect
              </p>
              <h3 className="mt-3 text-2xl font-medium">{insight.primaryBrokenSignal.label}</h3>
              <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
                {insight.primaryReason}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <article className="rounded-[2rem] border border-[var(--color-line)] bg-white/78 p-6">
            <p className="text-sm uppercase tracking-[0.24em] text-[var(--color-muted)]">
              Rhythm adjustments
            </p>
            <div className="mt-4 space-y-3">
              {seasonMode.rhythmAdjustments.map((item) => (
                <div
                  key={item}
                  className="rounded-[1.25rem] bg-[var(--color-cream)]/72 px-4 py-3"
                >
                  <p className="text-sm leading-6 text-[var(--color-muted)]">{item}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[2rem] border border-[var(--color-line)] bg-[var(--color-charcoal)] p-6 text-[var(--color-cream)]">
            <p className="text-sm uppercase tracking-[0.24em] text-[var(--color-gold-soft)]">
              Tracker emphasis
            </p>
            <div className="mt-4 space-y-3">
              {seasonMode.trackerFocus.map((item) => (
                <div
                  key={item}
                  className="rounded-[1.25rem] bg-[rgba(248,244,236,0.08)] px-4 py-3"
                >
                  <p className="text-sm leading-6 text-[rgba(248,244,236,0.82)]">{item}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[2rem] border border-[var(--color-line)] bg-white/78 p-6">
            <p className="text-sm uppercase tracking-[0.24em] text-[var(--color-muted)]">
              Food timing notes
            </p>
            <div className="mt-4 space-y-3">
              {seasonMode.foodTimingNotes.map((item) => (
                <div
                  key={item}
                  className="rounded-[1.25rem] bg-[var(--color-cream)]/72 px-4 py-3"
                >
                  <p className="text-sm leading-6 text-[var(--color-muted)]">{item}</p>
                </div>
              ))}
            </div>
          </article>
        </div>

        <NavActions previousHref="/tracker" nextHref="/dashboard" nextLabel="Open dashboard" />
      </section>
    </AppShell>
  );
}
