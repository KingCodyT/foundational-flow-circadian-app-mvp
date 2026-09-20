"use client";

import { useMemo } from "react";

import { FirstRunToday } from "@/components/first-run-today";
import { JourneyNow } from "@/components/journey-now";
import { FlowShell } from "@/components/flow-shell";
import { FutureNotificationPlannerBridge } from "@/components/future-notification-planner-bridge";
import { useCircadian } from "@/components/circadian-provider";
import { buildTodaysFlow } from "@/lib/flow-engine";
import { useLiveClock } from "@/hooks/use-live-clock";
import { localDateKey } from "@/lib/live-clock";
import { buildDerivedEnvironment } from "@/lib/personalization/derived-environment";
import { assembleDay1Personalization } from "@/lib/personalization/day1";
import { applyDailyEvidence } from "@/lib/personalization/daily-evidence";
import { applyCircadianFoodCoachingEvidence } from "@/lib/personalization/circadian-food-signal-integration";
import { selectPrimaryCoachingTarget, resolveCoachingFocus } from "@/lib/personalization/primary-target";
import {
  assessReconsideration,
  buildContextSnapshot,
  ContextSnapshot,
} from "@/lib/personalization/reconsideration";
import { buildFoodTimingPlan } from "@/lib/personalization/food-timing-plan";
import { buildUpcomingReminderPreview } from "@/lib/personalization/upcoming-reminder-preview";
import { selectContextualReminder } from "@/lib/personalization/contextual-reminders";
import { summarizeDailyEvidence } from "@/lib/personalization/daily-evidence";
import { SIGNAL_REGISTRY } from "@/lib/personalization/signal-registry";
import { assembleNowCoachingDecision } from "@/lib/personalization/now-coaching";
import { buildVoiceRelationshipOutput } from "@/lib/voice/voice-relationship";

export default function NowPage() {
  const { answers, dailyProfile, participationLevel, eventStateByDate, foodTimingEvidenceByDate,
    previousContextSnapshot, firstRunHandoff, notificationState, getEventStateForDate, getFoodTimingEvidenceForDate, setEventRecord, isHydrated } = useCircadian();
  const now = useLiveClock();
  const profileTimeZone = dailyProfile?.timeZone ?? null;
  const todayKey = localDateKey(now, profileTimeZone);
  const profileInput = useMemo(
    () => ({
      wakeTime: dailyProfile?.wakeTime ?? null,
      targetBedtime: dailyProfile?.targetBedtime ?? null,
      lastMealTime: dailyProfile?.lastMealTime ?? null,
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
    const proposedTarget = selectPrimaryCoachingTarget(withFoodEvidence);
    const primaryCoachingTarget = resolveCoachingFocus(withFoodEvidence, initialDay1.primaryCoachingTarget, dailyProfile?.coachingTargetSignalId);
    return {
      ...initialDay1,
      signalStates: withFoodEvidence.perSignal,
      derivedEnvironment: withFoodEvidence.derivedEnvironment ?? environment,
      primaryCoachingTarget,
      proposedTarget,
    };
  }, [
    answers,
    environment,
    eventStateByDate,
    foodTimingEvidenceByDate,
    participationLevel,
    profileInput,
    dailyProfile?.coachingTargetSignalId,
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

  const eventStateForDate = getEventStateForDate(todayKey);
  const { events } = buildTodaysFlow({
    now,
    profile: profileInput,
    participationLevel,
    eventStateForDate,
  });
  const foodPlan = buildFoodTimingPlan(dailyProfile, events, now);
  const reminders = selectContextualReminder({ events, day1: currentPersonalization, records: eventStateForDate,
    foodEvidence: getFoodTimingEvidenceForDate(todayKey), foodPlan, now, timeZone: profileTimeZone });
  const activeEvent = reminders.current;
  const next = activeEvent ? null : reminders.next;
  const preview = buildUpcomingReminderPreview({
    day1: currentPersonalization, futureEvent: next, now, timeZone: profileTimeZone,
    notificationsEnabled: dailyProfile?.remindersEnabled === true,
    derivedEnvironment: environment, reconsideration,
    delivered: notificationState.deliveredNotifications,
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
  const respond = (response: "completed" | "skipped" | "adjust", remindAt?: string) => {
    if (!activeEvent || !surfacedEvent) return;
    const at = new Date();
    if (response === "adjust") {
      const proposed = remindAt ? new Date(remindAt) : null;
      if (!proposed || proposed <= at || proposed > (activeEvent.end ?? activeEvent.start)) return;
      setEventRecord(todayKey, activeEvent.id, { status: "upcoming", at: at.toISOString(), remindAt });
    } else setEventRecord(todayKey, activeEvent.id, { status: response, at: at.toISOString() });
  };
  const progress = Object.values(summarizeDailyEvidence(eventStateByDate)).map(summary =>
    `${SIGNAL_REGISTRY[summary.signalId]?.label || summary.signalId}: observed on ${summary.completedDays} distinct days.`);
  if (!isHydrated) return <FlowShell><p role="status">Loading your focus…</p></FlowShell>;
  if (firstRunHandoff && dailyProfile) return <FirstRunToday now={now} voice={voice} />;
  return <JourneyNow profile={dailyProfile} voice={voice} reminder={surfacedEvent && activeEvent ? { ...activeEvent, action: coachingDecision.candidate.originalDecision.reason === "adapted_feasible_action_due_to_constraint" ? coachingDecision.candidate.adaptedAction || activeEvent.action : activeEvent.action } : null}
    preview={preview} respond={respond} now={now} primarySignalId={currentPersonalization.primaryCoachingTarget.signalId}
    primaryState={currentPersonalization.primaryCoachingTarget.coachingState} progress={progress}>
    <FutureNotificationPlannerBridge activeEventId={activeEvent?.id} day1={currentPersonalization} futureEvent={next ? { ...next, name: next.action, guidance: next.reason, why: next.reason } : null}
      derivedEnvironment={environment} reconsideration={reconsideration} now={now} />
  </JourneyNow>;
}
