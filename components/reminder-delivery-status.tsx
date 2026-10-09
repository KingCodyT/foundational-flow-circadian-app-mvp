"use client";
import { useCircadian } from "./circadian-provider";
export function ReminderDeliveryStatus() {
  const { notificationState, dailyProfile } = useCircadian();
  const status = notificationState.deliveryStatus;
  return <details className="mt-4" id="reminder-delivery-status">
    <summary>Reminder delivery status</summary>
    <div role="status">
      {status ? <>
        <p>{status.status}{status.reason ? ` — ${status.reason}` : ""}</p>
        {status.scheduledFor && <p>Reminder time: {new Intl.DateTimeFormat("en-US", { timeZone: dailyProfile?.timeZone || undefined, dateStyle: "medium", timeStyle: "short" }).format(new Date(status.scheduledFor))}</p>}
        <p>Updated: {new Intl.DateTimeFormat("en-US", { timeZone: dailyProfile?.timeZone || undefined, dateStyle: "medium", timeStyle: "short" }).format(new Date(status.at))}</p>
      </> : <p>No delivery attempt recorded.</p>}
      <p>Delivered means the browser reported displaying the notification. It does not confirm that you saw it.</p>
    </div>
  </details>;
}
