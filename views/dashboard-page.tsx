"use client";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { GuardedState } from "@/components/guarded-state";
import { ProgressSparkline } from "@/components/progress-sparkline";
import { ProtocolEmailCta } from "@/components/protocol-email-cta";
import { ScoreCard } from "@/components/score-card";
import { SectionHeading } from "@/components/section-heading";
import { useCircadian } from "@/components/circadian-provider";
import { buildContextualExperience } from "@/lib/contextual-guidance";
import {
  buildOverallTrend,
  buildSignalDeltaSummary,
  describeTrend,
  getOverallSeries,
} from "@/lib/progress";

function formatDelta(delta: number | null) {
  if (delta === null) {
    return "Baseline";
  }

  if (delta === 0) {
    return "No change";
  }

  return `${delta > 0 ? "+" : ""}${delta}`;
}

export default function DashboardPage() {
  const {
    answers,
    auditHistory,
    hasCompletedAudit,
    insight,
    isHydrated,
    lastSavedAt,
    persistenceMode,
    protocol,
    resetAudit,
    saveStatus,
    scores,
  } = useCircadian();

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
  const overallTrend = buildOverallTrend(auditHistory);
  const overallSeries = getOverallSeries(auditHistory);
  const signalDeltas = buildSignalDeltaSummary(auditHistory);
  const strongestMover = signalDeltas[0] ?? null;
  const weakestMover = signalDeltas[signalDeltas.length - 1] ?? null;
  const contextualExperience = buildContextualExperience({
    answers,
    insight,
    protocol,
  });

  return (
    <AppShell eyebrow="Dashboard">
      <section className="space-y-10 py-6 lg:py-10">
        <SectionHeading
          eyebrow="Current state"
          title="A simple command view for your current circadian profile."
          description="This dashboard keeps the latest audit visible, surfaces your current constraint, and now holds a lightweight recent history for repeat check-ins."
        />

        <div className="grid gap-4 lg:grid-cols-[0.64fr_0.36fr]">
          <article className="rounded-[1.75rem] border border-[var(--color-line)] bg-white/80 px-5 py-5">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">
              Save state
            </p>
            <p className="mt-3 text-lg leading-7 text-[var(--color-charcoal)]">
              {persistenceMode === "supabase"
                ? "Saved audit history is connected."
                : "This browser is carrying the history for now."}
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
              {saveStatus === "saving"
                ? "We are saving the latest audit in the background."
                : saveStatus === "error"
                  ? "The latest audit stayed local, but the current results are safe in this browser session."
                  : lastSavedAt
                    ? `Latest save: ${new Date(lastSavedAt).toLocaleString()}`
                    : "Complete an audit to create your first saved record."}
            </p>
          </article>

          <article className="rounded-[1.75rem] border border-[var(--color-line)] bg-[linear-gradient(140deg,rgba(179,145,80,0.12),rgba(255,255,255,0.92))] px-5 py-5">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">
              Why revisit this
            </p>
            <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
              Circadian repair usually improves through repetition, not one perfect day. Re-running the audit after a week gives you a cleaner read on whether the weakest signal is actually strengthening.
            </p>
          </article>
        </div>

        <ProtocolEmailCta compact />

        <div className="grid gap-6 lg:grid-cols-[0.62fr_0.38fr]">
          <article className="rounded-[2rem] border border-[var(--color-line)] bg-[linear-gradient(145deg,rgba(255,255,255,0.9),rgba(239,231,214,0.92))] p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">
                  Progress trend
                </p>
                <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl">
                  {overallTrend.delta === null
                    ? "Your first saved baseline"
                    : overallTrend.direction === "up"
                      ? "Overall score is rising"
                      : overallTrend.direction === "down"
                        ? "Overall score slipped back"
                        : "Overall score is holding steady"}
                </h2>
              </div>
              <div className="rounded-full border border-[var(--color-line)] bg-white/75 px-4 py-2 text-sm text-[var(--color-charcoal)]">
                {formatDelta(overallTrend.delta)}
              </div>
            </div>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--color-muted)]">
              {describeTrend(auditHistory)}
            </p>
            <div className="mt-6">
              <ProgressSparkline values={overallSeries} />
            </div>
          </article>

          <article className="rounded-[2rem] border border-[var(--color-line)] bg-[var(--color-charcoal)] p-6 text-[var(--color-cream)]">
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-gold-soft)]">
              Movement since last audit
            </p>
            <div className="mt-5 space-y-4">
              <div className="rounded-[1.5rem] bg-[rgba(248,244,236,0.07)] px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-gold-soft)]">
                  Best mover
                </p>
                <p className="mt-2 text-lg">
                  {strongestMover ? strongestMover.label : "No comparison yet"}
                </p>
                <p className="mt-1 text-sm text-[rgba(248,244,236,0.72)]">
                  {strongestMover
                    ? `${formatDelta(strongestMover.delta)} from the prior audit`
                    : "Complete another audit after following the protocol to compare changes."}
                </p>
              </div>
              <div className="rounded-[1.5rem] bg-[rgba(248,244,236,0.07)] px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-gold-soft)]">
                  Still lagging
                </p>
                <p className="mt-2 text-lg">
                  {weakestMover ? weakestMover.label : "No comparison yet"}
                </p>
                <p className="mt-1 text-sm text-[rgba(248,244,236,0.72)]">
                  {weakestMover
                    ? `${formatDelta(weakestMover.delta)} from the prior audit`
                    : "The weakest signal becomes easier to confirm once there are at least two saved check-ins."}
                </p>
              </div>
            </div>
          </article>
        </div>

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

            <article className="rounded-[2rem] border border-[var(--color-line)] bg-[linear-gradient(145deg,rgba(255,255,255,0.84),rgba(239,231,214,0.9))] p-5">
              <p className="text-sm uppercase tracking-[0.24em] text-[var(--color-muted)]">
                Environment layer
              </p>
              <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl">
                {contextualExperience.environmentTitle}
              </h2>
              <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
                {contextualExperience.environmentSummary}
              </p>
            </article>

            <article className="rounded-[2rem] border border-[var(--color-line)] bg-white/75 p-5">
              <p className="text-sm uppercase tracking-[0.24em] text-[var(--color-muted)]">
                Signal shifts
              </p>
              <div className="mt-4 space-y-3">
                {signalDeltas.map((signal) => (
                  <div
                    key={signal.label}
                    className="flex items-center justify-between gap-3 rounded-[1.25rem] bg-[var(--color-cream)]/72 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--color-charcoal)]">
                        {signal.label}
                      </p>
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
                        Current {signal.value}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.18em] ${
                        signal.delta === null
                          ? "bg-white text-[var(--color-muted)]"
                          : signal.delta > 0
                            ? "bg-[rgba(179,145,80,0.18)] text-[var(--color-charcoal)]"
                            : signal.delta < 0
                              ? "bg-[rgba(31,28,24,0.08)] text-[var(--color-charcoal)]"
                              : "bg-white text-[var(--color-muted)]"
                      }`}
                    >
                      {formatDelta(signal.delta)}
                    </span>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-[2rem] border border-[var(--color-line)] bg-white/75 p-5">
              <p className="text-sm uppercase tracking-[0.24em] text-[var(--color-muted)]">
                {contextualExperience.seasonalNutrition.title}
              </p>
              <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
                {contextualExperience.seasonalNutrition.description}
              </p>
              <div className="mt-4 space-y-3">
                {contextualExperience.seasonalNutrition.items.map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-[1.25rem] bg-[var(--color-cream)]/72 px-4 py-3"
                  >
                    <span className="mt-2 h-2 w-2 rounded-full bg-[var(--color-gold)]" />
                    <p className="text-sm leading-6 text-[var(--color-muted)]">{item}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-[2rem] border border-[var(--color-line)] bg-white/75 p-5 md:col-span-2">
              <p className="text-sm uppercase tracking-[0.24em] text-[var(--color-muted)]">
                {contextualExperience.habitStack.title}
              </p>
              <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
                {contextualExperience.habitStack.description}
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {contextualExperience.habitStack.items.map((item) => (
                  <div
                    key={item}
                    className="rounded-[1.5rem] border border-[var(--color-line)] bg-[var(--color-cream)]/65 px-4 py-4"
                  >
                    <p className="text-sm leading-6 text-[var(--color-charcoal)]">{item}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-[2rem] border border-[var(--color-line)] bg-white/75 p-5 md:col-span-2">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-[var(--color-muted)]">
                    Recent audit history
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                    A quick view of your most recent completed check-ins.
                  </p>
                </div>
                <span className="rounded-full border border-[var(--color-line)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--color-muted)]">
                  {auditHistory.length} saved
                </span>
              </div>
              <div className="mt-5 grid gap-3">
                {auditHistory.map((record) => (
                  <div
                    key={record.id}
                    className="grid gap-3 rounded-[1.5rem] border border-[var(--color-line)] bg-[var(--color-cream)]/65 px-4 py-4 md:grid-cols-[0.24fr_0.23fr_0.23fr_0.3fr]"
                  >
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-muted)]">
                        Completed
                      </p>
                      <p className="mt-2 text-sm text-[var(--color-charcoal)]">
                        {new Date(record.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-muted)]">
                        Overall
                      </p>
                      <p className="mt-2 text-sm text-[var(--color-charcoal)]">
                        {record.scores.overallCircadianScore}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-muted)]">
                        Constraint
                      </p>
                      <p className="mt-2 text-sm text-[var(--color-charcoal)]">
                        {record.insight.primaryBrokenSignal.label}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-muted)]">
                        Protocol focus
                      </p>
                      <p className="mt-2 text-sm text-[var(--color-charcoal)]">
                        {record.protocol.focusArea}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
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
                Clear this browser session
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
