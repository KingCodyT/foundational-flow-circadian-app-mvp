"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import ParticipationSelector from "@/components/todays-flow/participation-selector";
import DailyProfileForm from "@/components/todays-flow/daily-profile-form";
import { useCircadian } from "@/components/circadian-provider";
import ActiveStep from "@/components/todays-flow/active-step";
import { FlowEvent } from "@/lib/flow-engine";

function EventRow({ e }: { e: FlowEvent }) {
  const timeLabel = e.end ? `${e.start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${e.end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : e.start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
      <div>
        <p className="text-xs uppercase text-[var(--color-muted)]">{e.name}</p>
        <p className="mt-1 font-semibold">{timeLabel}</p>
        <p className="mt-2 text-sm text-[var(--color-muted)]">{e.guidance}</p>
      </div>
      <div className="text-sm">
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs ${e.status === "current" ? "bg-[var(--color-charcoal)] text-[var(--color-cream)]" : "bg-[var(--color-cream)]/30 text-[var(--color-charcoal)]"}`}>{e.status}</span>
      </div>
    </div>
  );
}

export default function TodaysFlowPage() {
  const { isHydrated, participationLevel, dailyProfile } = useCircadian();
  const [now, setNow] = useState<Date>(new Date());
  const [showSetup, setShowSetup] = useState<boolean>(() => {
    // default to showing setup if not fully configured
    return !(Boolean(participationLevel) && Boolean(dailyProfile?.wakeTime) && Boolean(dailyProfile?.targetBedtime) && participationLevel !== "BASELINE");
  });
  const profileInput = useMemo(() => ({
    wakeTime: dailyProfile?.wakeTime ?? null,
    targetBedtime: dailyProfile?.targetBedtime ?? null,
    latitude: dailyProfile?.latitude ?? null,
    longitude: dailyProfile?.longitude ?? null,
  }), [dailyProfile]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const configured = Boolean(participationLevel) && participationLevel !== "BASELINE" && Boolean(dailyProfile?.wakeTime) && Boolean(dailyProfile?.targetBedtime);

  // collapse setup automatically when user becomes configured
  useEffect(() => {
    if (configured) setShowSetup(false);
  }, [configured]);

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

        {/* For configured returning users, prioritize the journey */}
        {configured && !showSetup ? (
          <>
            <div className="rounded-[1.25rem] border bg-white/80 p-6">
              <ActiveStep />
            </div>

            <div className="rounded-[1.25rem] border bg-white/6 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{participationLevel}</p>
                  <p className="text-sm text-[var(--color-muted)]">Wake {dailyProfile?.wakeTime} · Bed {dailyProfile?.targetBedtime} · {dailyProfile?.latitude != null && dailyProfile?.longitude != null ? "Location enabled" : "Location not set"}</p>
                </div>
                <div>
                  <button onClick={() => setShowSetup(true)} className="inline-flex items-center justify-center rounded-full border px-3 py-2 text-sm">Edit settings</button>
                </div>
              </div>
            </div>
          </>
        ) : (
          // show full setup when not configured or when editing
          <>
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

            {(!participationLevel || participationLevel === "BASELINE") ? (
              <div className="rounded-[1.25rem] border bg-white/6 p-6">
                <p className="text-[var(--color-muted)]">Your participation level is set to BASELINE. Upgrade to GUIDED FLOW or FULL FLOW to see the daily timeline.</p>
              </div>
            ) : (
              <>
                <div className="rounded-[1.25rem] border bg-white/80 p-6">
                  <ActiveStep />
                </div>
                {/* ActiveStep handles location fallback and plan toggling */}
              </>
            )}
          </>
        )}

      </section>
    </AppShell>
  );
}
