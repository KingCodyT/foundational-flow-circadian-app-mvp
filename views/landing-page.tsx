import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { NavActions } from "@/components/nav-actions";
import { SectionHeading } from "@/components/section-heading";

const principles = [
  "Assess six circadian signal domains across light, timing, and disruption load.",
  "Calculate weighted scores to identify the primary broken signal.",
  "Translate the weakest category into a grounded, daily recovery protocol.",
];

const metrics = [
  ["6", "signal categories"],
  ["5", "core scores"],
  ["1", "daily protocol focus"],
];

export default function LandingPage() {
  return (
    <AppShell>
      <section className="grid gap-12 py-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end lg:py-16">
        <div className="space-y-8">
          <SectionHeading
            eyebrow="Welcome"
            title="A grounded circadian overview, audit, and protocol builder in one flow."
            description="Foundational Flow helps you see whether your day is giving your biology a clear morning anchor, enough daytime amplitude, a real descent into darkness, and a stable recovery window. Then it turns the weakest link into a focused daily plan."
          />
          <div className="grid gap-4 sm:grid-cols-3">
            {metrics.map(([value, label]) => (
              <div
                key={label}
                className="rounded-[1.75rem] border border-[var(--color-line)] bg-white/72 px-5 py-4 shadow-[0_12px_32px_rgba(31,28,24,0.04)]"
              >
                <p className="font-[family-name:var(--font-display)] text-3xl">{value}</p>
                <p className="mt-1 text-sm uppercase tracking-[0.18em] text-[var(--color-muted)]">
                  {label}
                </p>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Link
              href="/audit"
              className="inline-flex items-center justify-center rounded-full bg-[var(--color-charcoal)] px-6 py-3 text-sm font-medium text-[var(--color-cream)] transition hover:bg-[var(--color-gold)] hover:text-[var(--color-charcoal)]"
            >
              Begin the welcome flow
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-full border border-[var(--color-line)] px-6 py-3 text-sm font-medium text-[var(--color-charcoal)] transition hover:bg-white"
            >
              View current dashboard
            </Link>
          </div>
        </div>

        <div className="rounded-[2.5rem] border border-[var(--color-line)] bg-[var(--color-charcoal)] p-8 text-[var(--color-cream)] shadow-[0_24px_80px_rgba(31,28,24,0.18)]">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs uppercase tracking-[0.34em] text-[var(--color-gold-soft)]">
              Before you begin
            </p>
            <span className="rounded-full border border-[rgba(248,244,236,0.14)] px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-[rgba(248,244,236,0.7)]">
              8-10 min first pass
            </span>
          </div>
          <div className="mt-8 space-y-6">
            {[
              ["1", "Answer from your real routine", "Use the most typical version of your current week rather than your best day or your intended day."],
              ["2", "Expect one clear leverage point", "The app is designed to find the main constraint first instead of overwhelming you with every possible optimization."],
              ["3", "Use the protocol for a week", "Circadian signals respond to repetition. The plan matters most when you practice it across several days."],
            ].map(([index, title, copy]) => (
              <div key={title} className="grid grid-cols-[auto_1fr] gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(248,244,236,0.18)] text-sm">
                  {index}
                </div>
                <div className="space-y-1">
                  <h2 className="text-lg font-medium">{title}</h2>
                  <p className="text-sm leading-6 text-[rgba(248,244,236,0.72)]">
                    {copy}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 pb-10 md:grid-cols-3">
        {principles.map((principle) => (
          <article
            key={principle}
            className="rounded-[2rem] border border-[var(--color-line)] bg-white/75 p-6"
          >
            <p className="text-base leading-7 text-[var(--color-muted)]">{principle}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 pb-10 lg:grid-cols-[0.54fr_0.46fr]">
        <article className="rounded-[2.25rem] border border-[var(--color-line)] bg-white/80 p-7">
          <p className="text-xs uppercase tracking-[0.34em] text-[var(--color-muted)]">
            What this app does
          </p>
          <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl leading-tight">
            It translates daily habits into signal quality instead of generic sleep advice.
          </h2>
          <p className="mt-4 text-base leading-7 text-[var(--color-muted)]">
            Rather than asking whether you are “healthy” in the abstract, the audit looks at whether your routine sends clear timing information: when day starts, how bright day feels, whether evening actually becomes dark, how stable sleep timing is, and how much disruption keeps blunting progress.
          </p>
        </article>
        <article className="rounded-[2.25rem] border border-[var(--color-line)] bg-[linear-gradient(145deg,rgba(179,145,80,0.14),rgba(255,255,255,0.88))] p-7">
          <p className="text-xs uppercase tracking-[0.34em] text-[var(--color-muted)]">
            Why it matters
          </p>
          <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl leading-tight">
            Circadian problems often come from mixed signals, not lack of effort.
          </h2>
          <p className="mt-4 text-base leading-7 text-[var(--color-muted)]">
            Many people try to fix energy or sleep by changing everything at once. The better first move is usually to identify the signal that is failing most clearly, strengthen that one, and let the rest of the system start to organize around it.
          </p>
        </article>
      </section>

      <section className="rounded-[2.5rem] border border-[var(--color-line)] bg-[linear-gradient(135deg,rgba(255,255,255,0.78),rgba(239,231,214,0.88))] px-8 py-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.34em] text-[var(--color-muted)]">
              Brief instructions
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-3xl">
              Take the audit, read the weakest signal, then follow one protocol before chasing everything else.
            </h2>
            <p className="max-w-3xl text-base leading-7 text-[var(--color-muted)]">
              You will answer six sections, receive weighted scores, identify the primary constraint, and get a daily protocol. The best use of the app is to implement the protocol consistently for several days, then repeat the audit and compare your profile.
            </p>
          </div>
          <NavActions nextHref="/audit" nextLabel="Start the audit" />
        </div>
      </section>
    </AppShell>
  );
}
