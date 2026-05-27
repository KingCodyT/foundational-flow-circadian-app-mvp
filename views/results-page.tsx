"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { GuardedState } from "@/components/guarded-state";
import { NavActions } from "@/components/nav-actions";
import { ScoreCard } from "@/components/score-card";
import { SectionHeading } from "@/components/section-heading";
import { useCircadian } from "@/components/circadian-provider";

export default function ResultsPage() {
  const [email, setEmail] = useState("");
  const [hasRequestedProtocol, setHasRequestedProtocol] = useState(false);
  const { hasCompletedAudit, insight, isHydrated, scores } = useCircadian();

  const handleProtocolRequest = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim()) {
      return;
    }

    setHasRequestedProtocol(true);
  };

  if (!isHydrated) {
    return (
      <AppShell>
        <div className="py-20 text-[var(--color-muted)]">Loading your results...</div>
      </AppShell>
    );
  }

  if (!hasCompletedAudit || !scores || !insight) {
    return (
      <AppShell eyebrow="Results">
        <div className="py-10">
          <GuardedState
            title="Results appear after the audit is complete."
            description="Finish the questionnaire and the app will calculate your weighted circadian scores and identify the weakest signal to focus on first."
          />
        </div>
      </AppShell>
    );
  }

  const rankedScores = insight.rankedSignals;

  return (
    <AppShell eyebrow="Results">
      <section className="space-y-10 py-6 lg:py-10">
        <SectionHeading
          eyebrow="Results"
          title={`Primary broken signal: ${insight.primaryBrokenSignal.label}`}
          description="These results rank the signal domains most responsible for circadian timing, amplitude, and night-day contrast."
        />

        <div className="grid gap-4 rounded-[2.25rem] border border-[var(--color-line)] bg-[linear-gradient(135deg,rgba(255,255,255,0.86),rgba(240,232,216,0.9))] p-6 lg:grid-cols-[0.34fr_0.66fr]">
          <div className="rounded-[1.75rem] bg-[var(--color-charcoal)] px-6 py-5 text-[var(--color-cream)]">
            <p className="text-xs uppercase tracking-[0.26em] text-[var(--color-gold-soft)]">
              Overall Circadian Score
            </p>
            <p className="mt-4 font-[family-name:var(--font-display)] text-6xl">
              {scores.overallCircadianScore}
            </p>
            <p className="mt-4 text-sm leading-6 text-[rgba(248,244,236,0.74)]">
              Calculated from the weighted model across morning signal, daylight strength, darkness, sleep output, and disruption load.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.75rem] border border-[var(--color-line)] bg-white/7 px-5 py-5">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">
                Primary constraint
              </p>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl">
                {insight.primaryBrokenSignal.label}
              </h2>
              <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
                {insight.primaryReason}
              </p>
            </div>
            <div className="rounded-[1.75rem] border border-[var(--color-line)] bg-white/7 px-5 py-5">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">
                Clinical read
              </p>
              <p className="mt-3 text-lg leading-8 text-[var(--color-charcoal)]">
                {insight.summary}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.72fr_0.28fr]">
          <div className="grid gap-4 md:grid-cols-2">
            {rankedScores.map((score, index) => (
              <ScoreCard
                key={score.label}
                label={score.label}
                value={score.value}
                description={score.description}
                highlight={index === 0}
              />
            ))}
          </div>

          <aside className="rounded-[2rem] border border-[var(--color-line)] bg-white/80 p-6">
            <p className="text-xs uppercase tracking-[0.34em] text-[var(--color-muted)]">
              Interpretation
            </p>
            <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl leading-tight">
              {insight.primaryBrokenSignal.label}
            </h2>
            <p className="mt-4 text-sm leading-6 text-[var(--color-muted)]">
              {insight.primaryBrokenSignal.description}
            </p>
            <div className="mt-6 rounded-[1.5rem] bg-[var(--color-cream)]/72 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
                Existing strengths
              </p>
              <div className="mt-3 space-y-2">
                {insight.strengths.map((strength) => (
                  <p key={strength} className="text-sm leading-6 text-[var(--color-muted)]">
                    {strength}
                  </p>
                ))}
              </div>
            </div>
            <div className="mt-6 space-y-3">
              {insight.contextualNotes.map((note) => (
                <p key={note} className="text-sm leading-6 text-[var(--color-muted)]">
                  {note}
                </p>
              ))}
            </div>
            <div className="mt-8">
              <NavActions nextHref="/protocol" nextLabel="View daily protocol" />
            </div>
          </aside>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/audit"
            className="inline-flex items-center justify-center rounded-full border border-[var(--color-line)] px-5 py-3 text-sm font-medium text-[var(--color-charcoal)] transition hover:bg-white"
          >
            Revise answers
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-full border border-[var(--color-line)] px-5 py-3 text-sm font-medium text-[var(--color-charcoal)] transition hover:bg-white"
          >
            Go to dashboard
          </Link>
        </div>

        <section className="ff-glass-card rounded-[2.25rem] p-6 lg:p-8">
          <div className="grid gap-6 lg:grid-cols-[0.56fr_0.44fr] lg:items-end">
            <div>
              <p className="ff-section-eyebrow text-xs uppercase text-[var(--color-muted)]">
                7-day protocol
              </p>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl leading-tight lg:text-4xl">
                Want your 7-day protocol sent to your inbox?
              </h2>
              <p className="mt-4 text-sm leading-7 text-[var(--color-muted)]">
                This is the natural next step after results. For now, we’ll capture the intent in the experience so the handoff feels real before email delivery is wired up.
              </p>
            </div>

            <form onSubmit={handleProtocolRequest} className="grid gap-3">
              <label className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="rounded-[1.2rem] border border-[var(--color-line)] bg-white/80 px-4 py-3 text-sm text-[var(--color-charcoal)] outline-none transition focus:border-[rgba(179,145,80,0.5)]"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full bg-[var(--color-charcoal)] px-5 py-3 text-sm font-medium text-[var(--color-cream)] transition hover:bg-[var(--color-gold)] hover:text-[var(--color-charcoal)]"
              >
                Send me the 7-day protocol
              </button>
              <p className="text-xs leading-6 text-[var(--color-muted)]">
                {hasRequestedProtocol
                  ? "Captured. This is the placeholder for the future email handoff."
                  : "Email delivery is the next product layer. This capture is currently a polished placeholder."}
              </p>
            </form>
          </div>
        </section>
      </section>
    </AppShell>
  );
}
