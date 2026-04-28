"use client";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { GuardedState } from "@/components/guarded-state";
import { ScoreCard } from "@/components/score-card";
import { SectionHeading } from "@/components/section-heading";
import { useCircadian } from "@/components/circadian-provider";

export default function DashboardPage() {
  const { hasCompletedAudit, insight, isHydrated, protocol, resetAudit, scores } =
    useCircadian();

  if (!isHydrated) {
    return (
      <AppShell>
        <div className="py-20 text-[var(--color-muted)]">Loading your dashboard...</div>
      </AppShell>
    );
  }

  if (!hasCompletedAudit || !scores || !insight || !protocol) {
    return (
      <AppShell eyebrow="Dashboard">
        <div className="py-10">
          <GuardedState
            title="Your dashboard becomes useful after the first audit."
            description="Once the questionnaire is complete, this page becomes the lightweight home base for your latest score profile and protocol focus."
          />
        </div>
      </AppShell>
    );
  }

  const rankedScores = insight.rankedSignals;

  return (
    <AppShell eyebrow="Dashboard">
      <section className="space-y-10 py-6 lg:py-10">
        <SectionHeading
          eyebrow="Current state"
          title="A simple command view for your current circadian profile."
          description="This dashboard keeps the latest client-side results visible so a future persisted version can slot in without changing the user experience."
        />

        <div className="grid gap-6 lg:grid-cols-[0.7fr_0.3fr]">
          <div className="grid gap-4 md:grid-cols-2">
            <article className="rounded-[2rem] border border-[var(--color-line)] bg-[var(--color-charcoal)] p-6 text-[var(--color-cream)] md:col-span-2">
              <div className="grid gap-5 md:grid-cols-[0.38fr_0.62fr] md:items-end">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-gold-soft)]">
                    Current overall score
                  </p>
                  <p className="mt-4 font-[family-name:var(--font-display)] text-6xl">
                    {scores.overallCircadianScore}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-gold-soft)]">
                    Focus now
                  </p>
                  <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl">
                    {insight.primaryBrokenSignal.label}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-[rgba(248,244,236,0.74)]">
                    {insight.primaryReason}
                  </p>
                </div>
              </div>
            </article>
            {rankedScores.map((score, index) => (
              <ScoreCard
                key={score.label}
                label={score.label}
                value={score.value}
                description={score.description}
                highlight={index === 0}
              />
            ))}
            <article className="rounded-[2rem] border border-[var(--color-line)] bg-[linear-gradient(140deg,rgba(179,145,80,0.14),rgba(255,255,255,0.9))] p-5">
              <p className="text-sm uppercase tracking-[0.24em] text-[var(--color-muted)]">
                Next priority
              </p>
              <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl">
                {insight.primaryBrokenSignal.label}
              </h2>
              <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
                {insight.summary}
              </p>
            </article>
          </div>

          <aside className="rounded-[2rem] border border-[var(--color-line)] bg-[var(--color-charcoal)] p-6 text-[var(--color-cream)]">
            <p className="text-xs uppercase tracking-[0.34em] text-[var(--color-gold-soft)]">
              Quick actions
            </p>
            <div className="mt-6 grid gap-3">
              <Link
                href="/results"
                className="rounded-full bg-[rgba(248,244,236,0.08)] px-4 py-3 text-sm transition hover:bg-[rgba(248,244,236,0.14)]"
              >
                Review results
              </Link>
              <Link
                href="/protocol"
                className="rounded-full bg-[rgba(248,244,236,0.08)] px-4 py-3 text-sm transition hover:bg-[rgba(248,244,236,0.14)]"
              >
                Open protocol
              </Link>
              <Link
                href="/audit"
                className="rounded-full bg-[rgba(248,244,236,0.08)] px-4 py-3 text-sm transition hover:bg-[rgba(248,244,236,0.14)]"
              >
                Re-run audit
              </Link>
              <button
                type="button"
                onClick={resetAudit}
                className="rounded-full border border-[rgba(248,244,236,0.16)] px-4 py-3 text-left text-sm transition hover:bg-[rgba(248,244,236,0.08)]"
              >
                Reset local session
              </button>
            </div>
            <div className="mt-8 border-t border-[rgba(248,244,236,0.12)] pt-6">
              <p className="text-sm uppercase tracking-[0.24em] text-[var(--color-gold-soft)]">
                Overall score
              </p>
              <p className="mt-3 font-[family-name:var(--font-display)] text-5xl">
                {scores.overallCircadianScore}
              </p>
            </div>
          </aside>
        </div>
      </section>
    </AppShell>
  );
}
