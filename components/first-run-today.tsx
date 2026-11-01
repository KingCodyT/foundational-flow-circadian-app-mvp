"use client";

import { firstStepExplanation } from '@/lib/personalization/first-step-explanation';
import { TodayCoach } from './today-coach';
import { reportedDays } from '@/lib/today-coaching';
import { questionnaire } from '@/lib/questionnaire';
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCircadian } from "./circadian-provider";
import { JourneyNow } from "./journey-now";
import { JourneyCard, JourneyFrame } from "./journey-design";
import { firstRunNotification, guidanceProfileKey, guidanceTime, selectFirstRunGuidance } from "@/lib/personalization/first-run-guidance";
import { scheduleDateKey } from "@/lib/schedule-time";
import { getBrowserNotificationPermissionState, requestBrowserNotificationPermission } from "@/lib/personalization/background-notification-transport";
import type { VoiceRelationshipOutput } from "@/lib/voice/voice-relationship";
import type { ContextualReminder } from "@/lib/personalization/contextual-reminders";

export function FirstRunToday({ now, voice }: { now: Date; voice: VoiceRelationshipOutput }) {
  const { dailyProfile: profile, firstRunHandoff, setFirstRunHandoff, eventStateByDate,
    setEventRecord, setDailyProfile, notificationState, setScheduledNotification, deliverySetup, currentPersonalization, answers, clientId, updateWeeklyCheckin } = useCircadian();
  const submitted = useRef(new Set<string>());
  const [permission, setPermission] = useState(getBrowserNotificationPermissionState);
  const [permissionError, setPermissionError] = useState(false);
  const saved = firstRunHandoff?.guidance;
  const guidance = profile && saved?.profileKey === guidanceProfileKey(profile) ? saved :
    profile ? selectFirstRunGuidance(profile, now, eventStateByDate) : null;
  const record = guidance ? eventStateByDate?.[guidance.dateKey]?.[guidance.eventId] : null;
  const effective = guidance && record?.remindAt ? { ...guidance, start: record.remindAt } : guidance;
  const finished = Boolean(effective && (now >= new Date(effective.end)));
  const notification = effective ? firstRunNotification(effective) : null;
  const delivered = notificationState.deliveredNotifications.some(item => item.id === notification?.id);

  useEffect(() => {
    const refresh = () => setPermission(getBrowserNotificationPermissionState());
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);
  useEffect(() => {
    if (finished) {
      setFirstRunHandoff(null);
      if (notificationState.scheduledNotification?.id.startsWith("first-run:")) setScheduledNotification(null);
    } else if (guidance && guidance !== saved) setFirstRunHandoff({ guidance });
  }, [finished, guidance, saved, setFirstRunHandoff, notificationState.scheduledNotification, setScheduledNotification]);
  useEffect(() => {
    if (finished) return;
    const shouldSchedule = profile?.remindersEnabled === true && permission === "GRANTED" && !delivered && !["completed", "skipped"].includes(record?.status ?? "");
    const planned = shouldSchedule ? notification : null;
    const existing = notificationState.scheduledNotification;
    if (planned && existing?.id !== planned.id) setScheduledNotification(planned);
    else if (!planned && existing?.id.startsWith("first-run:")) setScheduledNotification(null);
  }, [finished, record?.status, profile?.remindersEnabled, permission, delivered, notification, notificationState.scheduledNotification, setScheduledNotification]);

  if (!profile || !effective) return <JourneyFrame image={7}><JourneyCard><h1>Your next step</h1><p>Add your wake time and bedtime so we can time your first guidance.</p><Link href="/profile#your-schedule">Complete your schedule</Link></JourneyCard></JourneyFrame>;
  const current = now >= new Date(effective.start) && !finished;
  const tomorrow = scheduleDateKey(new Date(effective.start), profile.timeZone) > scheduleDateKey(now, profile.timeZone);
  const time = guidanceTime(effective.start, profile.timeZone);
  const confirmed = profile.remindersEnabled && permission === "GRANTED" && deliverySetup?.id === notification?.id && deliverySetup?.status === "scheduled";
  const enable = async () => {
    setPermissionError(false);
    try {
      const result = await requestBrowserNotificationPermission();
      setPermission(result);
      setDailyProfile({ ...profile, remindersEnabled: true });
    } catch { setPermissionError(true); }
  };
  const reminder: ContextualReminder | null = current ? {
    id: effective.eventId, name: effective.action, action: effective.action, reason: effective.reason,
    guidance: effective.reason, start: new Date(effective.start), end: new Date(effective.end), status: "current",
    scheduledFor: effective.start, priority: 90, responses: ["Done", "Not today", "Adjust"],
  } : null;
  const setup = <div role="status">
    {delivered ? <p>Your reminder was delivered for {time}.</p> : confirmed ? <p>We’ll remind you at {time}{tomorrow ? " tomorrow" : ""}. You do not need to keep checking the app.</p> :
      <>
        <p>{!profile.remindersEnabled ? `Turn on reminders so we can remind you at ${time}${tomorrow ? " tomorrow" : ""}.` :
          permission === "DENIED" ? "Notifications are blocked. Allow them in your browser settings to receive this reminder." :
          permission === "UNAVAILABLE" ? "Notifications aren’t supported in this browser. Your guidance is available here." :
          permission === "PROMPT" ? `Allow browser notifications to receive your ${time} reminder.` :
          deliverySetup?.id === notification?.id && deliverySetup?.status === "unavailable" ? "Background reminders aren’t connected yet. Your guidance is available here; delivery is not confirmed." :
          current ? "Your next step is ready now." : `Setting up your ${time} reminder…`}</p>
        {permissionError && <p>Reminder setup couldn’t finish. Please try again.</p>}
        {permission !== "UNAVAILABLE" && permission !== "DENIED" && (!profile.remindersEnabled || permission === "PROMPT" || permissionError) &&
          <button className="journey-primary" onClick={enable}>Enable reminders</button>}
        <Link href="/profile#preferences-heading">Reminder settings</Link>
      </>}
  </div>;
  const signalId = currentPersonalization?.primaryCoachingTarget.signalId || '';
  const question = questionnaire.find(q => q.id === signalId);
  const answer = question?.options.find(option => option.value === answers[question.id]);
  const respond = (response: "completed" | "skipped" | "adjust", remindAt?: string): boolean => {
    const at = new Date();
    const key = `${effective.dateKey}:${effective.eventId}:${response}:${remindAt || ''}`;
    const terminalKey = `${effective.dateKey}:${effective.eventId}:terminal`;
    if (["completed", "skipped"].includes(record?.status ?? "") || submitted.current.has(terminalKey)) return false;
    if (at < new Date(effective.start) || at >= new Date(effective.end) || finished || submitted.current.has(key)) return false;
    if (response === "adjust") {
      const deferred = remindAt ? new Date(remindAt) : null;
      if (!deferred || !Number.isFinite(+deferred) || deferred <= at || deferred >= new Date(effective.end)) return false;
      submitted.current.add(key);
      setEventRecord(effective.dateKey, effective.eventId, { status: "upcoming", at: at.toISOString(), remindAt });
    } else {
      submitted.current.add(terminalKey);
      submitted.current.add(key);
      setEventRecord(effective.dateKey, effective.eventId, { status: response, at: at.toISOString() });
      if (notificationState.scheduledNotification?.id.startsWith("first-run:")) setScheduledNotification(null);
    }
    return true;
  };
  const handled = record && ["completed", "skipped"].includes(record.status) ? record : undefined;
  const nextOpportunity = selectFirstRunGuidance(profile, now, eventStateByDate, signalId) ?? undefined;
  const explanation = firstStepExplanation(profile, now, signalId, effective, nextOpportunity);
  const upcoming: ContextualReminder = { id: effective.eventId, name: effective.action, action: effective.action,
    reason: effective.reason, guidance: effective.reason, start: new Date(effective.start), end: new Date(effective.end),
    status: "upcoming", scheduledFor: effective.start, priority: 90, responses: ["Done", "Not today", "Adjust"] };
  return <JourneyNow profile={profile} now={now} voice={voice} reminder={reminder} preview={null}
    primarySignalId={signalId} primaryState={currentPersonalization?.primaryCoachingTarget.coachingState} progress={[]} respond={respond}
    coaching={<>
      <details className="today-focus-line"><summary>Why this focus?</summary><p>{answer ? `You reported: “${answer.detail || answer.label}” That helped choose this focus.` : 'Your assessment answers helped choose this focus.'} Your focus stays selected as you practice.</p>
      </details>
      <TodayCoach signalId={signalId} updateWeekly={updateWeeklyCheckin} profile={profile} clientId={clientId} now={now}
        firstStepContext={explanation} handled={handled} nextOpportunity={nextOpportunity} day={effective.dateKey} reminder={reminder} pending={current ? null : upcoming} count={reportedDays(eventStateByDate, signalId, now, profile.timeZone)}
        established={false} respond={respond} saveProfile={setDailyProfile} />
      <details className="today-focus-line"><summary>Optional reminder settings</summary><p>You can use Today without enabling notifications.</p>{setup}</details>
    </>}>{null}</JourneyNow>;
}
