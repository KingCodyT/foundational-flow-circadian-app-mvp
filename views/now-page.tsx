"use client";

import { useMemo } from "react";
import { FlowShell } from "@/components/flow-shell";
import { FutureNotificationPlannerBridge } from "@/components/future-notification-planner-bridge";
import { useCircadian } from "@/components/circadian-provider";
import { buildTodaysFlow } from "@/lib/flow-engine";
import { useLiveClock } from "@/hooks/use-live-clock";
import { formatTimeInZone, localDateKey } from "@/lib/live-clock";
import { buildDerivedEnvironment } from "@/lib/personalization/derived-environment";
import { assembleDay1Personalization } from "@/lib/personalization/day1";
import { applyDailyEvidence } from "@/lib/personalization/daily-evidence";
import { applyCircadianFoodCoachingEvidence } from "@/lib/personalization/circadian-food-signal-integration";
import { selectPrimaryCoachingTarget } from "@/lib/personalization/primary-target";
import {
  buildFoodJourneyPrompt,
  buildFoodJourneySnapshot,
} from "@/lib/personalization/circadian-food-journey";
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
    foodTimingEvidenceByDate,
    previousContextSnapshot,
    getEventStateForDate,
    getFoodTimingEvidenceForDate,
    setEventRecord,
    recordFoodTimingAction,
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
    const withFoodEvidence = applyCircadianFoodCoachingEvidence(withDailyEvidence, {
      evidenceByDate: foodTimingEvidenceByDate,
      profile: profileInput,
      participationLevel,
    });
    const primaryCoachingTarget = selectPrimaryCoachingTarget(withFoodEvidence);
    return {
      ...initialDay1,
      signalStates: withFoodEvidence.perSignal,
      derivedEnvironment: withFoodEvidence.derivedEnvironment ?? environment,
      primaryCoachingTarget,
    };
  }, [
    answers,
    environment,
    eventStateByDate,
    foodTimingEvidenceByDate,
    participationLevel,
    profileInput,
  ]);

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
  const { events, activeEvent, next, solar, locationAvailable } = buildTodaysFlow({
    now,
    profile: profileInput,
    participationLevel,
    eventStateForDate,
  });
  const foodTimingSnapshot = buildFoodJourneySnapshot({
    evidence: getFoodTimingEvidenceForDate(todayKey),
    events,
  });
  const foodPrompt = buildFoodJourneyPrompt(foodTimingSnapshot);

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

  const recordFood = (action: "MEAL_STARTED" | "NOT_YET" | "EATING_LATER") => {
    const at = new Date();
    const dateKey = localDateKey(at, profileTimeZone);
    recordFoodTimingAction(dateKey, action, at.toISOString());
  };

  return (
    <FlowShell>
      <FutureNotificationPlannerBridge
        day1={currentPersonalization}
        futureEvent={next}
        derivedEnvironment={environment}
        reconsideration={reconsideration}
        now={now}
      />
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

        <div className="mt-6 rounded-3xl border border-[var(--color-line)] bg-white/45 p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">Food Timing</p>
          <h2 className="mt-3 text-xl font-semibold tracking-[-0.02em]">{foodPrompt.headline}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-muted)]">{foodPrompt.guidance}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={() => recordFood("MEAL_STARTED")}
              className="rounded-full bg-[var(--color-charcoal)] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-85"
            >
              I&apos;m eating
            </button>
            <button
              onClick={() => recordFood(foodPrompt.secondaryAction)}
              className="rounded-full border border-[var(--color-line)] px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-70"
            >
              {foodPrompt.secondaryLabel}
            </button>
          </div>
          {foodTimingSnapshot.firstMeal ? (
            <p className="mt-4 text-sm text-[var(--color-muted)]">
              First meal recorded at <span className="font-semibold text-[var(--color-charcoal)]">{formatTime(new Date(foodTimingSnapshot.firstMeal.at), profileTimeZone)}</span>
              {foodTimingSnapshot.mealCount > 1 && foodTimingSnapshot.lastMeal ? (
                <> · Latest meal <span className="font-semibold text-[var(--color-charcoal)]">{formatTime(new Date(foodTimingSnapshot.lastMeal.at), profileTimeZone)}</span></>
              ) : null}
            </p>
          ) : null}
          <details className="mt-5 border-t border-[var(--color-line)] pt-4">
            <summary className="cursor-pointer text-sm font-semibold text-[var(--color-muted)]">Why timing?</summary>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-muted)]">Metabolic handling is not identical across the biological day. Timing gives Foundational Flow useful context without asking you to track calories or macros.</p>
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-semibold text-[var(--color-muted)]">Go deeper</summary>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-muted)]">Circadian timing can influence glucose tolerance, insulin response, digestive timing, and peripheral metabolic clocks. Food Timing v1 uses those relationships as context; it does not turn them into a universal fasting window or meal score.</p>
            </details>
          </details>
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
