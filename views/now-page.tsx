"use client";
import { focusReason, establishedReason } from '@/lib/coaching-explanations';

import { useMemo, useRef } from "react";

import { TodayCoach } from '@/components/today-coach';
import { eveningHeadline, reportedDays, responseAllowed } from '@/lib/today-coaching';
import { eventSupportsSignal } from '@/lib/personalization/now-coaching';
import { selectFirstRunGuidance } from "@/lib/personalization/first-run-guidance";
import { FirstRunToday } from "@/components/first-run-today";
import { JourneyNow } from "@/components/journey-now";
import { FlowShell } from "@/components/flow-shell";
import { FutureNotificationPlannerBridge } from "@/components/future-notification-planner-bridge";
import { useCircadian } from "@/components/circadian-provider";
import { buildTodaysFlow } from "@/lib/flow-engine";
import { localDateKey } from "@/lib/live-clock";
import { buildFoodTimingPlan } from "@/lib/personalization/food-timing-plan";
import { buildUpcomingReminderPreview } from "@/lib/personalization/upcoming-reminder-preview";
import { selectContextualReminder } from "@/lib/personalization/contextual-reminders";
import { summarizeDailyEvidence } from "@/lib/personalization/daily-evidence";
import { SIGNAL_REGISTRY } from "@/lib/personalization/signal-registry";
import { assembleNowCoachingDecision } from "@/lib/personalization/now-coaching";
import { buildVoiceRelationshipOutput } from "@/lib/voice/voice-relationship";

export default function NowPage() {
  const submitted = useRef(new Set<string>());
  const { answers, dailyProfile, setDailyProfile, updateWeeklyCheckin, clientId, participationLevel, eventStateByDate,
    now, environment, currentPersonalization, reconsideration, firstRunHandoff, notificationState, getEventStateForDate, getFoodTimingEvidenceForDate, setEventRecord, isHydrated } = useCircadian();
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

  if (!isHydrated || !currentPersonalization) return <FlowShell><p role="status">Loading your focus…</p></FlowShell>;

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
  const displayedReminder = surfacedEvent && activeEvent ? { ...activeEvent, action: coachingDecision.candidate.originalDecision.reason === "adapted_feasible_action_due_to_constraint" ? coachingDecision.candidate.adaptedAction || activeEvent.action : activeEvent.action } : null;
  const signalId = currentPersonalization.primaryCoachingTarget.signalId;
  const respond = (response: "completed" | "skipped" | "adjust", remindAt?: string): boolean => {
    const at = new Date();
    const key = `${todayKey}:${activeEvent?.id}:${response}:${remindAt || ''}`;
    if (!surfacedEvent || !responseAllowed(activeEvent, activeEvent ? eventStateForDate[activeEvent.id] : undefined, at, todayKey, profileTimeZone) || submitted.current.has(key)) return false;
    if (!activeEvent) return false;
    if (response === "adjust") {
      const proposed = remindAt ? new Date(remindAt) : null;
      if (!proposed || !Number.isFinite(+proposed) || proposed <= at || proposed >= (activeEvent.end ?? activeEvent.start)) return false;
      submitted.current.add(key);
      setEventRecord(todayKey, activeEvent.id, { status: "upcoming", at: at.toISOString(), remindAt });
    } else {
      submitted.current.add(key);
      setEventRecord(todayKey, activeEvent.id, { status: response, at: at.toISOString() });
    }
    return true;
  };
  const handled = Object.entries(eventStateForDate).filter(([id, record]) => eventSupportsSignal(id, signalId) && ["completed", "skipped"].includes(record.status))
    .sort((a,b)=>Date.parse(b[1].at)-Date.parse(a[1].at))[0]?.[1];
  const pending = reminders.next;
  const progress = Object.values(summarizeDailyEvidence(eventStateByDate)).map(summary =>
    `${SIGNAL_REGISTRY[summary.signalId]?.label || summary.signalId}: observed on ${summary.completedDays} distinct days.`);
  if (!isHydrated) return <FlowShell><p role="status">Loading your focus…</p></FlowShell>;
  if (firstRunHandoff && dailyProfile) return <FirstRunToday now={now} voice={voice} />;
  return <JourneyNow profile={dailyProfile} voice={voice} reminder={surfacedEvent && activeEvent ? { ...activeEvent, action: coachingDecision.candidate.originalDecision.reason === "adapted_feasible_action_due_to_constraint" ? coachingDecision.candidate.adaptedAction || activeEvent.action : activeEvent.action } : null}
    headline={eveningHeadline(dailyProfile, activeEvent, now) ? 'The day’s done. Give your body the message.' : undefined}
    coaching={<><p className="today-focus-line">{focusReason(answers, signalId || '')}</p>{process.env.NODE_ENV === 'development' && clientId === 'coaching-review-only' && <aside className="today-review-banner">LOCAL REVIEW · Synthetic profile and schedule. “Evening” refers to the test schedule, not your local time. Device clock: {new Intl.DateTimeFormat('en-US', {hour:'numeric',minute:'2-digit',hour12:true,timeZoneName:'short'}).format(now)}.</aside>}<TodayCoach signalId={signalId || ''} updateWeekly={updateWeeklyCheckin} key={`${todayKey}:${signalId}`} profile={dailyProfile} clientId={clientId} now={now} day={todayKey}
      reminder={displayedReminder} pending={pending} handled={handled} nextOpportunity={dailyProfile ? selectFirstRunGuidance(dailyProfile, now, eventStateByDate, signalId) ?? undefined : undefined}
      establishedExplanation={establishedReason(answers, signalId || '', currentPersonalization.signalStates[signalId || '']?.notes)} count={reportedDays(eventStateByDate, signalId, new Date(), profileTimeZone)} established={currentPersonalization.primaryCoachingTarget.coachingState === 'ESTABLISHED'}
      respond={respond} saveProfile={setDailyProfile} /></>}
    preview={preview} respond={respond} now={now} primarySignalId={currentPersonalization.primaryCoachingTarget.signalId}
    primaryState={currentPersonalization.primaryCoachingTarget.coachingState} progress={progress}>
    <FutureNotificationPlannerBridge activeEventId={activeEvent?.id} day1={currentPersonalization} futureEvent={next ? { ...next, name: next.action, guidance: next.reason, why: next.reason } : null}
      derivedEnvironment={environment} reconsideration={reconsideration} now={now} />
  </JourneyNow>;
}
