"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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

export default function RhythmPage() {
  const {
    dailyProfile,
    participationLevel,
    getEventStateForDate,
    isHydrated,
  } = useCircadian();

  const [now] = useState(() => new Date());
const currentEventRef = useRef<HTMLDivElement | null>(null);

useEffect(() => {
  currentEventRef.current?.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
}, [isHydrated]);
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
      latitude: dailyProfile?.locationPermissionGranted ? dailyProfile.latitude ?? null : null,
      longitude: dailyProfile?.locationPermissionGranted ? dailyProfile.longitude ?? null : null,
    }),
    [dailyProfile]
  );

  if (!isHydrated) {
    return (
      <FlowShell>
        <section className="mx-auto max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">
            RHYTHM
          </p>

          <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl tracking-[-0.03em] sm:text-5xl">
            Finding today&apos;s rhythm...
          </h1>
        </section>
      </FlowShell>
    );
  }

  const eventStateForDate = getEventStateForDate(todayKey);

  const {
    events,
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
          RHYTHM
        </p>

        <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl tracking-[-0.03em] sm:text-5xl">
          The shape of your day.
        </h1>

        <p className="mt-4 max-w-2xl text-lg leading-8 text-[var(--color-muted)]">
          Your biology moves through a rhythm. These are today&apos;s meaningful
          transitions — not a checklist, just the shape of the day around you.
        </p>

        <div className="mt-12">
          {events.length > 0 ? (
            <div className="relative">
              <div className="absolute bottom-6 left-[7px] top-6 w-px bg-[var(--color-line)]" />

              <div className="space-y-3">
                {events.map((event) => {
                  const isCurrent = event.status === "current";
                  const isPassed = event.status === "missed";
                  const isResolved =
                    event.status === "completed" ||
                    event.status === "skipped";

                  return (
                    <div
                      key={event.id}
                      ref={isCurrent ? currentEventRef : null}
                      className={`relative pl-10 ${
                        isPassed && !isResolved ? "opacity-50" : ""
                      }`}
                    >
                      <span
                        className={`absolute left-0 top-7 z-10 block h-[15px] w-[15px] rounded-full border ${
                          isCurrent
                            ? "border-[var(--color-gold)] bg-[var(--color-gold)]"
                            : isResolved
                            ? "border-[var(--color-charcoal)] bg-[var(--color-charcoal)]"
                            : "border-[var(--color-line)] bg-[var(--color-cream)]"
                        }`}
                      />

                      <div
                        className={`rounded-3xl border p-5 sm:p-6 ${
                          isCurrent
                            ? "border-[var(--color-gold)] bg-white"
                            : "border-[var(--color-line)] bg-white/60"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-6">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">
                              {isCurrent
                                ? "Right now"
                                : isResolved
                                ? "Handled"
                                : isPassed
                                ? "Earlier"
                                : "Ahead"}
                            </p>

                            <h2
                              className={`mt-2 font-[family-name:var(--font-display)] ${
                                isCurrent
                                  ? "text-3xl"
                                  : "text-2xl"
                              }`}
                            >
                              {event.name}
                            </h2>
                          </div>

                          <p className="shrink-0 text-sm font-medium text-[var(--color-muted)]">
                            {formatTime(event.start)}
                          </p>
                        </div>

                        {isCurrent ? (
                          <p className="mt-4 max-w-xl leading-7 text-[var(--color-muted)]">
                            {event.guidance}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-[var(--color-line)] bg-white/60 p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">
                TODAY
              </p>

              <h2 className="mt-3 font-[family-name:var(--font-display)] text-2xl">
                Your rhythm is quiet.
              </h2>

              <p className="mt-3 leading-7 text-[var(--color-muted)]">
                There&apos;s nothing biologically meaningful to surface here
                yet.
              </p>
            </div>
          )}
        </div>

        <div className="mt-10 border-t border-[var(--color-line)] pt-7">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">
            TODAY&apos;S LIGHT
          </p>

          {locationAvailable && solar ? (
            <div className="mt-4 flex flex-wrap gap-x-10 gap-y-2 text-sm">
              <p>
                <span className="text-[var(--color-muted)]">Sunrise </span>
                <span className="font-medium">{formatTime(solar.sunrise)}</span>
              </p>

              <p>
                <span className="text-[var(--color-muted)]">Sunset </span>
                <span className="font-medium">{formatTime(solar.sunset)}</span>
              </p>
              {solar.dayLengthMinutes === 1440 || solar.dayLengthMinutes === 0 ? (
                <p className="w-full text-[var(--color-muted)]">
                  {solar.dayLengthMinutes === 1440
                    ? "Continuous daylight today; there is no sunrise or sunset."
                    : "The sun stays below the horizon today."}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 text-sm text-[var(--color-muted)]">
              Location is needed for local sunrise and sunset timing.
            </p>
          )}
        </div>
      </section>
    </FlowShell>
  );
}