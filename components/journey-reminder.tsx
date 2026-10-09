import { useState } from "react";
import { useCircadian } from "./circadian-provider";
import { requestBrowserNotificationPermission, registerNotificationServiceWorker } from "@/lib/personalization/background-notification-transport";
import { ensureWebPushSubscription, syncServerPushSchedule } from "@/lib/personalization/web-push-client";
import { formatTimeInZone } from "@/lib/live-clock";

/** Only enables delivery of a reminder already approved by the existing planner. */
export function JourneyReminder() {
  const { clientId, notificationState, dailyProfile } = useCircadian();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const planned = notificationState.scheduledNotification;
  if (!planned) return null;
  async function enable() {
    if (!planned) return;
    setBusy(true);
    try {
      const permission = await requestBrowserNotificationPermission();
      if (permission !== "GRANTED") { setMessage("Notifications aren’t enabled. You can return to your plan at any time."); return; }
      await registerNotificationServiceWorker();
      const subscription = await ensureWebPushSubscription(clientId);
      if (subscription === "SUBSCRIBED" && await syncServerPushSchedule(clientId, planned)) {
        setMessage(`Reminder enabled for ${formatTimeInZone(new Date(planned.scheduledFor), dailyProfile?.timeZone)}.`);
      } else { setMessage("Background reminders aren’t available here yet. Your plan is still available in the app."); }
    } catch { setMessage("The reminder couldn’t be enabled. Please try again later."); }
    finally { setBusy(false); }
  }
  return <div className="journey-reminder"><button className="journey-outline" disabled={busy} onClick={enable}>{busy ? "Enabling…" : "◷ Remind Me"}</button>{message && <p role="status">{message}</p>}</div>;
}
