"use client";

import Link from "next/link";
import { FlowShell } from "@/components/flow-shell";
import { useCircadian } from "@/components/circadian-provider";

function dateKeyDaysAgo(daysAgo: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function EvidenceTestPage() {
  const { eventStateByDate, setEventRecord, isHydrated } = useCircadian();

  if (!isHydrated) {
    return (
      <FlowShell>
        <section className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-semibold">Loading test harness…</h1>
        </section>
      </FlowShell>
    );
  }

  const morningConfirmations = Object.values(eventStateByDate ?? {}).filter(
    (day) => day?.morning_light?.status === "completed",
  ).length;

  function addMorningEvidence(totalDays: number) {
    for (let daysAgo = 0; daysAgo < totalDays; daysAgo += 1) {
      const dateKey = dateKeyDaysAgo(daysAgo);
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      date.setHours(7, 0, 0, 0);
      setEventRecord(dateKey, "morning_light", {
        status: "completed",
        at: date.toISOString(),
      });
    }
  }

  return (
    <FlowShell>
      <section className="mx-auto max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">Developer Test</p>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl tracking-[-0.03em] sm:text-5xl">Evidence progression.</h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-[var(--color-muted)]">
          Temporary harness for testing repeated Morning Light evidence without changing production timing rules.
        </p>

        <div className="mt-10 rounded-3xl border border-[var(--color-line)] bg-white/70 p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">Morning Light</p>
          <p className="mt-3 text-3xl font-semibold">{morningConfirmations} confirmed days</p>
          <p className="mt-3 leading-7 text-[var(--color-muted)]">
            For a signal that starts Developing, four distinct completed days should earn Established. This harness writes only positive completion evidence; it does not manufacture misses or failures.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <button onClick={() => addMorningEvidence(1)} className="rounded-full border border-[var(--color-line)] bg-white px-5 py-3 text-sm font-semibold">Set 1 day</button>
            <button onClick={() => addMorningEvidence(2)} className="rounded-full border border-[var(--color-line)] bg-white px-5 py-3 text-sm font-semibold">Set 2 days</button>
            <button onClick={() => addMorningEvidence(4)} className="rounded-full bg-[var(--color-charcoal)] px-5 py-3 text-sm font-semibold text-[var(--color-cream)]">Set 4 days</button>
          </div>

          <div className="mt-8 border-t border-[var(--color-line)] pt-6">
            <Link href="/you" className="text-sm font-semibold underline underline-offset-4">Open YOU →</Link>
          </div>
        </div>

        <p className="mt-6 text-sm leading-6 text-[var(--color-muted)]">
          Temporary developer-only route. Remove after progression and target handoff are verified.
        </p>
      </section>
    </FlowShell>
  );
}
