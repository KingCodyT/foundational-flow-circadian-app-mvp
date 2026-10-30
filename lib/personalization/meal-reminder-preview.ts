import type { DailyProfile } from "@/types/circadian";
import { planMealNotifications } from "./meal-notifications";

export function mealReminderPreview(profile: DailyProfile | null, now: Date): string {
  if (profile?.workStructure === "shift" || profile?.workStructure === "overnight") {
    return "Shift and overnight schedules use in-app meal suggestions instead of scheduled last-meal reminders.";
  }
  const reminder = planMealNotifications(profile, now)[0];
  if (!reminder) {
    return "To see your reminder time, save valid wake, bedtime, last-meal and timezone settings in Profile. Your last meal needs to fall within your waking schedule.";
  }
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: reminder.timeZone, month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short",
  }).format(new Date(reminder.scheduledFor));
  return `Planned reminder: ${time} (${reminder.timeZone}). Based on your saved last-meal schedule.`;
}
