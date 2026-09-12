"use client";

import Link from "next/link";
import { FlowShell } from "@/components/flow-shell";
import { useCircadian } from "@/components/circadian-provider";

function dateKeyDaysAgo(daysAgo: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const testButtonClass =
  "rounded-full border border-[var(--color-line)] bg-white px-5 py-3 text-sm font-semibold";

export default function EvidenceTestPage() {
  const {
    eventStateByDate,
    setEventRecord,
    clearEventRecords,
    isHydrated,
  } = useCircadian();

  if (!isHydrated) {
    return (
      <FlowShell>
        <section className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-semibold">Loading test harness…</h1>
        </section>
      </FlowShell>
    );
  }

  const morningRecords = Object.entries(eventStateByDate ?? {})
    .filter(([, day]) => day?.morning_light?.status === "completed")
    .map(([date, day]) => ({ date, at: day.morning_light.at }))
    .sort((a, b) => b.date.localeCompare(a.date));

  function setMorningEvidence(totalDays: number) {
    clearEventRecords("morning_light");

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
          Temporary developer-only harness. These controls set the test to an exact number of Morning Light confirmation days; they are not part of the customer experience.
        </p>

        <div className="mt-10 rounded-3xl border border-[var(--color-line)] bg-white/70 p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">Current Test State</p>
          <p className="mt-3 text-3xl font-semibold">{morningRecords.length} confirmed day{morningRecords.length === 1 ? "" : "s"}</p>
          <p className="mt-3 leading-7 text-[var(--color-muted)]">
            Choose the exact evidence state you want to test. For a signal that starts Developing, four distinct completed days should earn Established.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <button onClick={() => setMorningEvidence(0)} className={testButtonClass}>Test 0 days</button>
            <button onClick={() => setMorningEvidence(1)} className={testButtonClass}>Test 1 day</button>
            <button onClick={() => setMorningEvidence(2)} className={testButtonClass}>Test 2 days</button>
            <button onClick={() => setMorningEvidence(4)} className={testButtonClass}>Test 4 days</button>
          </div>

          <div className="mt-8 border-t border-[var(--color-line)] pt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">Contributing dates</p>
            {morningRecords.length > 0 ? (
              <div className="mt-4 space-y-2">
                {morningRecords.map((record) => (
                  <div key={record.date} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--color-line)] bg-white/70 px-4 py-3 text-sm">
                    <span className="font-semibold">{record.date}</span>
                    <span className="text-[var(--color-muted)]">{new Date(record.at).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-[var(--color-muted)]">No Morning Light completion evidence is currently stored.</p>
            )}
          </div>

          <div className="mt-8 border-t border-[var(--color-line)] pt-6">
            <Link href="/you" className="text-sm font-semibold underline underline-offset-4">Open YOU →</Link>
          </div>
        </div>

        <p className="mt-6 text-sm leading-6 text-[var(--color-muted)]">
          Real users never see this route. In the production app, evidence accumulates naturally from their daily interactions.
        </p>
      </section>
    </FlowShell>
  );
}
