"use client";

import { useMemo } from "react";
import { FlowShell } from "@/components/flow-shell";
import { useCircadian } from "@/components/circadian-provider";
import { buildTodaysFlow } from "@/lib/flow-engine";
import { useLiveClock } from "@/hooks/use-live-clock";
import { formatTimeInZone, localDateKey } from "@/lib/live-clock";
import { buildDerivedEnvironment } from "@/lib/personalization/derived-environment";
import { assembleDay1Personalization } from "@/lib/personalization/day1";
import { applyDailyEvidence } from "@/lib/personalization/daily-evidence";
import { selectPrimaryCoachingTarget } from "@/lib/personalization/primary-target";
import {
  assessReconsideration,
  buildContextSnapshot,
  ContextSnapshot,
} from "@/lib/personalization/reconsideration";
import { assembleNowCoachingDecision } from "@/lib/personalization/now-coaching";
import { buildVoiceRelationshipOutput } from "@/lib/voice/voice-relationship";

function formatTime(date?: Date | null, timeZone?: string | null) {
  if (!date) return "—";
  return formatTimeInZone(date, timeZone);
}

export default function NowPage() {
  const {
    answers,
    dailyProfile,
    participationLevel,
    eventStateByDate,
    previousContextSnapshot,
    getEventStateForDate,
    setEventRecord,
    isHydrated,
  } = useCircadian();

  const now = useLiveClock();
  const profileTimeZone = dailyProfile?.timeZone ?? null;
  const todayKey = localDateKey(now, profileTimeZone);

  const profileInput = useMemo(
    () => ({
      wakeTime: dailyProfile?.wakeTime ?? null,
      targetBedtime: dailyProfile?.targetBedtime ?? null,
      timeZone: dailyProfile?.timeZone ?? null,
      latitude: dailyProfile?.locationPermissionGranted ? dailyProfile.latitude ?? null : null,
      longitude: dailyProfile?.locationPermissionGranted ? dailyProfile.longitude ?? null : null,
    }),
    [dailyProfile]
  );

  const environment = useMemo(
    () => buildDerivedEnvironment({ profile: dailyProfile }),
    [dailyProfile, todayKey]
  );

  const currentPersonalization = useMemo(() => {
    const initialDay1 = assembleDay1Personalization({ answers, derivedEnvironment: environment });
    const withDailyEvidence = applyDailyEvidence(
      {
        generatedAt: initialDay1.generatedAt,
        perSignal: initialDay1.signalStates,
        derivedEnvironment: initialDay1.derivedEnvironment,
      },
      eventStateByDate,
    );
    const primaryCoachingTarget = selectPrimaryCoachingTarget(withDailyEvidence);
    return {
      ...initialDay1,
      signalStates: withDailyEvidence.perSignal,
      derivedEnvironment: withDailyEvidence.derivedEnvironment ?? environment,
      primaryCoachingTarget,
    };
  }, [answers, environment, eventStateByDate]);

  const reconsideration = useMemo(() => {
    const currentContext = buildContextSnapshot({
      profile: dailyProfile,
      derivedEnvironment: environment,
      capturedAt: now.toISOString(),
    });
    const priorContext: ContextSnapshot | null = previousContextSnapshot
      ? { ...previousContextSnapshot, capturedAt: previousContextSnapshot.capturedAt ?? now.toISOString() }
      : null;
    const signalEvidence = Object.fromEntries(
      Object.entries(currentPersonalization.signalStates).map(([signalId, signal]) => [
        signalId,
        (signal.evidence ?? []).map((evidence) => ({
          questionId: evidence.questionId ?? null,
          answer: evidence.answer ?? null,
          source: evidence.source,
        })),
      ]),
    );
    return assessReconsideration({
      priorContext,
      currentContext,
      signalEvidence,
      signalIds: Object.keys(currentPersonalization.signalStates),
    });
  }, [currentPersonalization, dailyProfile, environment, now, previousContextSnapshot]);

  if (!isHydrated) {
    return (
      <FlowShell>
        <section className="mx-auto max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">NOW</p>
          <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl tracking-[-0.03em] sm:text-5xl">Getting your rhythm...</h1>
        </section>
      </FlowShell>
    );
  }

  const eventStateForDate = getEventStateForDate(todayKey);
  const { activeEvent, next, solar, locationAvailable } = buildTodaysFlow({
    now,
    profile: profileInput,
    participationLevel,
    eventStateForDate,
  });

  const coachingDecision = assembleNowCoachingDecision({
    day1: currentPersonalization,
    activeEvent,
    derivedEnvironment: environment,
    reconsideration,
    now,
  });
  const voice = buildVoiceRelationshipOutput(coachingDecision);
  const surfacedEvent = voice.silent ? null : coachingDecision.activeEvent;
  const isPassiveContext = voice.mode === "PASSIVE_CONTEXT";
  const isCoaching = voice.mode === "COACHING";

  const completeCurrentEvent = (eventId: string) => {
    const at = new Date();
    const dateKey = localDateKey(at, profileTimeZone);
    const current = buildTodaysFlow({
      now: at,
      profile: profileInput,
      participationLevel,
      eventStateForDate: getEventStateForDate(dateKey),
    });
    if (current.events.find((event) => event.id === eventId)?.status !== "current") return;
    setEventRecord(dateKey, eventId, { status: "completed", at: at.toISOString() });
  };

  return (
    <FlowShell>
      <section className="mx-auto max-w-3xl">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">NOW</p>
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl tracking-[-0.03em] sm:text-5xl">Your biology, right now.</h1>
          </div>
          <p className="shrink-0 pb-1 text-sm tabular-nums text-[var(--color-muted)]">{formatTime(now, profileTimeZone)}</p>
        </div>

        <div className={`mt-9 rounded-3xl border p-6 sm:p-8 ${isCoaching ? "border-[var(--color-gold)] bg-white" : isPassiveContext ? "border-[var(--color-line)] bg-white/55" : "border-[var(--color-line)] bg-transparent"}`}>
          {surfacedEvent ? (
            <>
              <p className={`text-xs font-semibold uppercase tracking-[0.22em] ${isCoaching ? "text-[var(--color-charcoal)]" : "text-[var(--color-muted)]"}`}>
                {isPassiveContext ? "Biological Context" : "Current Guidance"}
              </p>
              <h2 className={isPassiveContext ? "mt-3 text-2xl font-semibold tracking-[-0.02em]" : "mt-3 text-3xl font-semibold tracking-[-0.025em] sm:text-4xl"}>
                {voice.headline}
              </h2>
              {voice.guidance ? <p className={`mt-4 max-w-2xl leading-7 ${isCoaching ? "text-[var(--color-charcoal)]" : "text-[var(--color-muted)]"}`}>{voice.guidance}</p> : null}
              {isCoaching && voice.why ? (
                <details className="mt-6 border-t border-[var(--color-line)] pt-5">
                  <summary className="cursor-pointer text-sm font-semibold text-[var(--color-muted)]">Why this?</summary>
                  <p className="mt-3 max-w-2xl leading-7 text-[var(--color-muted)]">{voice.why}</p>
                </details>
              ) : null}
              {isCoaching && voice.perspective ? (
                <p className="mt-5 text-sm leading-6 text-[var(--color-muted)]">{voice.perspective}</p>
              ) : null}
              {isCoaching && surfacedEvent.status === "current" && voice.evidenceAction ? (
                <button
                  onClick={() => completeCurrentEvent(surfacedEvent.id)}
                  className="mt-7 rounded-full bg-[var(--color-charcoal)] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-85"
                >
                  {voice.evidenceAction}
                </button>
              ) : null}
            </>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">Right Now</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.02em]">Nothing needs your attention.</h2>
              <p className="mt-3 max-w-2xl leading-7 text-[var(--color-muted)]">Your current signals don’t call for coaching. Foundational Flow will speak up when something becomes biologically relevant and useful.</p>
            </>
          )}
        </div>

        <div className="mt-8 border-t border-[var(--color-line)] pt-6">
          <div className="grid gap-7 sm:grid-cols-2 sm:gap-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted)]">What’s Next</p>
              <p className="mt-2 text-lg font-semibold">{next ? next.name : "The rest of the day is clear"}</p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">{next ? formatTime(next.start, profileTimeZone) : "Nothing else needs your attention."}</p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted)]">Environment</p>
              {locationAvailable && solar ? (
                <>
                  <p className="mt-2 text-sm"><span className="text-[var(--color-muted)]">Sunrise</span> <span className="ml-2 font-semibold">{formatTime(solar.sunrise, profileTimeZone)}</span></p>
                  <p className="mt-1 text-sm"><span className="text-[var(--color-muted)]">Sunset</span> <span className="ml-2 font-semibold">{formatTime(solar.sunset, profileTimeZone)}</span></p>
                  {solar.dayLengthMinutes === 1440 || solar.dayLengthMinutes === 0 ? (
                    <p className="mt-2 text-sm text-[var(--color-muted)]">{solar.dayLengthMinutes === 1440 ? "Continuous daylight today; there is no sunrise or sunset." : "The sun stays below the horizon today."}</p>
                  ) : null}
                </>
              ) : (
                <p className="mt-2 text-sm text-[var(--color-muted)]">Location is not available yet.</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </FlowShell>
  );
}
