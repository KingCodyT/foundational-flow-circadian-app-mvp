"use client";

import { useMemo, useState } from "react";
import { FlowShell } from "@/components/flow-shell";
import { useCircadian } from "@/components/circadian-provider";
import { buildTodaysFlow } from "@/lib/flow-engine";

function formatTime(date?: Date | null) {
  if (!date) return "—";

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function NowPage() {
  const {
  dailyProfile,
  participationLevel,
  getEventStateForDate,
  setEventRecord,
  isHydrated,
} = useCircadian();


const [now] = useState(() => new Date());
  const todayKey = useMemo(() => {
    const d = new Date();

    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const profileInput = useMemo(
    () => ({
      wakeTime: dailyProfile?.wakeTime ?? null,
      targetBedtime: dailyProfile?.targetBedtime ?? null,
      latitude: dailyProfile?.latitude ?? null,
      longitude: dailyProfile?.longitude ?? null,
    }),
    [dailyProfile]
  );
if (!isHydrated) {
  return (
    <FlowShell>
      <section className="mx-auto max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">
          NOW
        </p>

        <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl tracking-[-0.03em] sm:text-5xl">
          Getting your rhythm...
        </h1>
      </section>
    </FlowShell>
  );
}
  const eventStateForDate = getEventStateForDate(todayKey);

  const {
    activeEvent,
    next,
    solar,
    locationAvailable,
  } = buildTodaysFlow({
    now,
    profile: profileInput,
    participationLevel,
    eventStateForDate,
  });

  return (
    <FlowShell>
      <section className="mx-auto max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">
          NOW
        </p>

        <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl tracking-[-0.03em] sm:text-5xl">
          Your biology, right now.
        </h1>

        <p className="mt-4 text-lg text-[var(--color-muted)]">
          {formatTime(now)}
        </p>

        <div className="mt-10 rounded-3xl border border-[var(--color-line)] bg-white/70 p-6 sm:p-8">
          {activeEvent ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">
                Current Guidance
              </p>

              <h2 className="mt-3 text-3xl font-semibold">
                {activeEvent.name}
              </h2>

              <p className="mt-4 leading-7 text-[var(--color-muted)]">
                {activeEvent.guidance}
              </p>

              {activeEvent.why ? (
                <details className="mt-6">
                  <summary className="cursor-pointer text-sm font-semibold">
                    Why this?
                  </summary>

                  <p className="mt-3 leading-7 text-[var(--color-muted)]">
                    {activeEvent.why}
                  </p>
                </details>
              ) : null}
              {!activeEvent.userStatus ? (
  <button
    onClick={() =>
      setEventRecord(todayKey, activeEvent.id, {
        status: "completed",
        at: new Date().toISOString(),
      })
    }
    className="mt-6 rounded-full border border-[var(--color-gold)] px-5 py-2.5 text-sm font-semibold text-[var(--color-charcoal)]"
  >
   {activeEvent.name === "Last Meal"
  ? "I’ve finished eating"
  : activeEvent.name === "Morning Light"
    ? "I’m outside"
    : activeEvent.name === "Sunset / Light Transition"
      ? "I’ve adjusted my light"
      : activeEvent.name === "Darkness"
        ? "My environment is dim"
        : activeEvent.name === "Sleep Window"
          ? "I’m winding down"
          : "I did this"}
  </button>
) : null}
            </>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">
                Current Guidance
              </p>

              <h2 className="mt-3 text-2xl font-semibold">
                You don’t need to do anything right now.
              </h2>

              <p className="mt-3 leading-7 text-[var(--color-muted)]">
                We’ll let you know when something biologically meaningful is coming up.
              </p>
            </>
          )}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-[var(--color-line)] bg-white/60 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted)]">
              What’s Next
            </p>

            <p className="mt-2 text-xl font-semibold">
              {next ? next.name : "Nothing else scheduled"}
            </p>

            <p className="mt-1 text-sm text-[var(--color-muted)]">
              {next ? formatTime(next.start) : "You’re good for now."}
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--color-line)] bg-white/60 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted)]">
              Environment
            </p>

            {locationAvailable && solar ? (
              <>
                <p className="mt-2">
                  Sunrise: {formatTime(solar.sunrise)}
                </p>
                <p className="mt-1">
                  Sunset: {formatTime(solar.sunset)}
                </p>
              </>
            ) : (
              <p className="mt-2 text-[var(--color-muted)]">
                Location is not available yet.
              </p>
            )}
          </div>
        </div>
      </section>
    </FlowShell>
  );
}
