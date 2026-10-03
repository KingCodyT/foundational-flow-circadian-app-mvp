"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
    setEventRecord, setDailyProfile, notificationState, setScheduledNotification, deliverySetup } = useCircadian();
  const [permission, setPermission] = useState(getBrowserNotificationPermissionState);
  const [permissionError, setPermissionError] = useState(false);
  const saved = firstRunHandoff?.guidance;
  const guidance = profile && saved?.profileKey === guidanceProfileKey(profile) ? saved :
    profile ? selectFirstRunGuidance(profile, now, eventStateByDate) : null;
  const record = guidance ? eventStateByDate?.[guidance.dateKey]?.[guidance.eventId] : null;
  const effective = guidance && record?.remindAt ? { ...guidance, start: record.remindAt } : guidance;
  const finished = Boolean(effective && (now > new Date(effective.end) || ["completed", "skipped"].includes(record?.status ?? "")));
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
    const shouldSchedule = profile?.remindersEnabled === true && permission === "GRANTED" && !delivered;
    const planned = shouldSchedule ? notification : null;
    const existing = notificationState.scheduledNotification;
    if (planned && existing?.id !== planned.id) setScheduledNotification(planned);
    else if (!planned && existing?.id.startsWith("first-run:")) setScheduledNotification(null);
  }, [finished, profile?.remindersEnabled, permission, delivered, notification, notificationState.scheduledNotification, setScheduledNotification]);

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
  return <JourneyNow profile={profile} now={now} voice={voice} reminder={reminder} preview={null}
    primarySignalId={null} progress={[]} firstRun={{
      heading: tomorrow ? "You’re ready for tomorrow" : "Your next step",
      action: `${current ? "Now" : `At ${time}${tomorrow ? " tomorrow" : ""}`}, ${effective.action.charAt(0).toLowerCase()}${effective.action.slice(1)}.`,
      reason: tomorrow ? `Your first guidance will arrive here at ${time}, based on your schedule. ${effective.reason}` : effective.reason,
      focus: effective.focus, setup,
      summary: "Your saved schedule gives us a starting point. Your responses will help tailor guidance over time.",
    }} respond={(response, remindAt) => {
      if (!current) return;
      if (response === "adjust") {
        const at = remindAt ? new Date(remindAt) : null;
        if (!at || at <= now || at > new Date(effective.end)) return;
        setEventRecord(effective.dateKey, effective.eventId, { status: "upcoming", at: now.toISOString(), remindAt });
      } else {
        setEventRecord(effective.dateKey, effective.eventId, { status: response, at: now.toISOString() });
        setFirstRunHandoff(null);
        if (notificationState.scheduledNotification?.id.startsWith("first-run:")) setScheduledNotification(null);
      }
    }}>{null}</JourneyNow>;
}
