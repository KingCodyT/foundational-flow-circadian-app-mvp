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
            eyebrow="Foundational Flow"
            title="A circadian signal audit that turns weak rhythms into a workable protocol."
            description="This MVP evaluates the quality of your morning signal, daytime amplitude, darkness, sleep timing, and disruption load, then builds a practical plan around the weakest link."
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
              Start the circadian audit
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
              Audit flow
            </p>
            <span className="rounded-full border border-[rgba(248,244,236,0.14)] px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-[rgba(248,244,236,0.7)]">
              8-10 min first pass
            </span>
          </div>
          <div className="mt-8 space-y-6">
            {[
              ["1", "Complete the questionnaire", "Six sections reveal where the signal is strong and where it breaks down."],
              ["2", "Review weighted scores", "The model ranks the circadian pillars using your required scoring formula."],
              ["3", "Follow a focused protocol", "The protocol narrows attention to the signal category that needs the cleanest repair."],
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

      <section className="rounded-[2.5rem] border border-[var(--color-line)] bg-[linear-gradient(135deg,rgba(255,255,255,0.78),rgba(239,231,214,0.88))] px-8 py-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.34em] text-[var(--color-muted)]">
              What this prototype includes
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-3xl">
              A clean first-pass experience with room for future Supabase persistence.
            </h2>
            <p className="max-w-3xl text-base leading-7 text-[var(--color-muted)]">
              This version uses simple client state, route-level pages, and deterministic scoring logic so the product can be expanded later without rebuilding the foundations.
            </p>
          </div>
          <NavActions nextHref="/audit" nextLabel="Begin the MVP flow" />
        </div>
      </section>
    </AppShell>
  );
}
