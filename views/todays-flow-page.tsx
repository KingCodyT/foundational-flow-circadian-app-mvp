"use client";

import { AppShell } from "@/components/app-shell";
import ParticipationSelector from "@/components/todays-flow/participation-selector";
import DailyProfileForm from "@/components/todays-flow/daily-profile-form";
import { useCircadian } from "@/components/circadian-provider";

export default function TodaysFlowPage() {
  const { isHydrated, participationLevel } = useCircadian();

  if (!isHydrated) {
    return (
      <AppShell>
        <div className="py-20 text-[var(--color-muted)]">Loading...</div>
      </AppShell>
    );
  }

  return (
    <AppShell eyebrow="Today's Flow">
      <section className="space-y-8 py-6">
        <h1 className="font-[family-name:var(--font-display)] text-3xl">Today's Flow</h1>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[1.25rem] border bg-white/6 p-6">
            <ParticipationSelector />
          </div>

          <div className="rounded-[1.25rem] border bg-white/6 p-6">
            {participationLevel && participationLevel !== "BASELINE" ? (
              <DailyProfileForm />
            ) : (
              <p className="text-[var(--color-muted)]">Select a participation level to configure a daily profile.</p>
            )}
          </div>
        </div>

        <div>
          <p className="text-sm text-[var(--color-muted)]">This is the initial scaffold for Today's Flow. Presentation is separated from recommendation logic.</p>
        </div>
      </section>
    </AppShell>
  );
}
