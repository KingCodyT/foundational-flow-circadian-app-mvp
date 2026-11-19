"use client";
import { OneDayPreview } from "@/components/one-day-preview";
import { useOneDayPlan } from "@/components/use-one-day-plan";
import { assessmentContext } from '@/lib/journey-value';
import { focusReason, establishedReason } from '@/lib/coaching-explanations';

import { useMemo, useRef } from "react";

import { TodayPersonalCue } from '@/components/today-personal-cue';
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
    now, environment, currentPersonalization, hasCompletedAudit, candidateTarget, reconsideration, firstRunHandoff, notificationState, getEventStateForDate, getFoodTimingEvidenceForDate, setEventRecord, isHydrated } = useCircadian();
  const pushBlocked = !!(dailyProfile?.remindersEnabled || dailyProfile?.mealRemindersEnabled || notificationState.scheduledNotification || notificationState.lastNotification || notificationState.deliveredNotifications.length || notificationState.deliveryStatus || firstRunHandoff || Object.values(eventStateByDate || {}).some(records => Object.values(records).some(r=>!!r.remindAt)));
  const oneDay = useOneDayPlan(dailyProfile,now,pushBlocked);
  const applied = oneDay.active;
  const replacing = applied && now >= applied.starts;
  const lightFocus = !currentPersonalization?.primaryCoachingTarget.signalId || ['dim_house', 'digital_sunset', 'morning_light'].some(eventId => eventSupportsSignal(eventId, currentPersonalization.primaryCoachingTarget.signalId));
  const dateLabel=(date:Date)=>new Intl.DateTimeFormat('en-US',{timeZone:dailyProfile?.timeZone||undefined,weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(date);
  const planNotice = applied ? <aside className="today-personal-cue" aria-label="Applied one-day light plan"><h2>{replacing?'One-day light plan active':'One-day light plan upcoming'}</h2><p>Bed: {dateLabel(applied.bedAt)} · Wake: {dateLabel(applied.wakeAt)}</p>{applied.step?<><h3>{applied.step.action}</h3><p>When: {dateLabel(applied.step.start)} – {dateLabel(applied.step.end)}</p><p>Why: {applied.step.reason}</p></>:<p>No remaining light step in this plan. Without a saved location, no morning daylight time can be given.</p>}<p>Only Today’s evening/morning guidance changes. Your usual plan resumes at {dateLabel(applied.expires)}. Meals, Timeline, solar settings and push reminders are unchanged.</p><button onClick={oneDay.undo}>Undo one-day plan</button></aside>:null;
  const planControl=<>{!replacing&&planNotice}{oneDay.stored&&!applied&&<p role="status">The one-day plan is expired, no longer matches your settings, or is blocked by reminder state. Your usual guidance applies. <button onClick={oneDay.undo}>Clear inactive plan</button></p>}{oneDay.error&&<p role="alert">{oneDay.error}</p>}<OneDayPreview profile={dailyProfile} now={now} onApply={oneDay.apply} blocked={!oneDay.ready?'Loading saved plan…':pushBlocked?'Apply is unavailable while reminders are enabled, pending, previously scheduled, or first-step setup is active. This preview cannot verify or change server push schedules. You can compare times without applying.':undefined}/></>;
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
      setEventRecord(todayKey, activeEvent.id, { status: response, at: at.toISOString(), coachingSignalId: eventSupportsSignal(activeEvent.id, signalId) ? signalId : null });
    }
    return true;
  };
  const handled = Object.entries(eventStateForDate).filter(([id, record]) => eventSupportsSignal(id, signalId) && ["completed", "skipped"].includes(record.status))
    .sort((a,b)=>Date.parse(b[1].at)-Date.parse(a[1].at))[0]?.[1];
  const pending = reminders.next;
  const nextOpportunity = dailyProfile ? selectFirstRunGuidance(dailyProfile, now, eventStateByDate, signalId) ?? undefined : undefined;
  const progress = Object.values(summarizeDailyEvidence(eventStateByDate)).map(summary =>
    `${SIGNAL_REGISTRY[summary.signalId]?.label || summary.signalId}: reported on ${summary.completedDays} distinct days.`);
  if (!isHydrated) return <FlowShell><p role="status">Loading your focus…</p></FlowShell>;
  if (firstRunHandoff && dailyProfile) return <FirstRunToday now={now} voice={voice} />;
  return <JourneyNow planControl={planControl} lightOverride={replacing?"Your applied one-day light step is shown above. Other sections keep your usual plan.":undefined} profile={dailyProfile} voice={voice} reminder={surfacedEvent && activeEvent ? { ...activeEvent, action: coachingDecision.candidate.originalDecision.reason === "adapted_feasible_action_due_to_constraint" ? coachingDecision.candidate.adaptedAction || activeEvent.action : activeEvent.action } : null}
    headline={eveningHeadline(dailyProfile, activeEvent, now) ? 'The day’s done. Give your body the message.' : undefined}
    personalCue={replacing ? planNotice : <TodayPersonalCue assessment={assessmentContext(answers, hasCompletedAudit, candidateTarget?.noTargetReason)} signalId={signalId || ""} profile={dailyProfile} now={now} opportunity={handled ? nextOpportunity : (displayedReminder || pending || nextOpportunity)} quiet={currentPersonalization.primaryCoachingTarget.coachingState === "ESTABLISHED" || dailyProfile?.weeklyCheckins?.[signalId || ""]?.mode === "weekly"} />}
    coaching={replacing && lightFocus ? <p>Your one-day light guidance is above. Your assessment focus stays saved; usual coaching resumes automatically.</p> : <>{signalId && SIGNAL_REGISTRY[signalId] && <p className="today-focus-line">{focusReason(answers, signalId)}</p>}{process.env.NODE_ENV === 'development' && clientId === 'coaching-review-only' && <aside className="today-review-banner">LOCAL REVIEW · Synthetic profile and schedule. “Evening” refers to the test schedule, not your local time. Device clock: {new Intl.DateTimeFormat('en-US', {hour:'numeric',minute:'2-digit',hour12:true,timeZoneName:'short'}).format(now)}.</aside>}<TodayCoach assessment={assessmentContext(answers, hasCompletedAudit, candidateTarget?.noTargetReason)} answers={answers} signalId={signalId || ''} updateWeekly={updateWeeklyCheckin} key={`${todayKey}:${signalId}`} profile={dailyProfile} clientId={clientId} now={now} day={todayKey}
      reminder={displayedReminder} pending={pending} handled={handled} nextOpportunity={nextOpportunity}
      establishedExplanation={establishedReason(answers, signalId || '', currentPersonalization.signalStates[signalId || '']?.notes)} count={reportedDays(eventStateByDate, signalId, new Date(), profileTimeZone)} established={currentPersonalization.primaryCoachingTarget.coachingState === 'ESTABLISHED'}
      respond={respond} saveProfile={setDailyProfile} /></>}
    preview={preview} respond={respond} now={now} primarySignalId={currentPersonalization.primaryCoachingTarget.signalId}
    primaryState={currentPersonalization.primaryCoachingTarget.coachingState} progress={progress}>
    <FutureNotificationPlannerBridge activeEventId={activeEvent?.id} day1={currentPersonalization} futureEvent={next ? { ...next, name: next.action, guidance: next.reason, why: next.reason } : null}
      derivedEnvironment={environment} reconsideration={reconsideration} now={now} />
  </JourneyNow>;
}
