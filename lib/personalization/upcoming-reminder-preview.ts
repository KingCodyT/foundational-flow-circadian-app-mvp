import type { ContextualReminder } from "./contextual-reminders";
import { planFutureNotification, type FutureNotificationPlannerInput } from "./future-notification-planner";
import { assembleNowCoachingDecision } from "./now-coaching";

/** A passive preview of the single eligible pending opportunity. No delivery side effects. */
export function buildUpcomingReminderPreview(
  input: FutureNotificationPlannerInput & { futureEvent: ContextualReminder | null; timeZone?: string | null },
): string | null {
  const event = input.futureEvent;
  if (!event || !planFutureNotification(input).notification) return null;
  const decision = assembleNowCoachingDecision({
    ...input, activeEvent: { ...event, status: "current" }, now: event.start,
  });
  const adapted = decision.candidate.originalDecision.reason === "adapted_feasible_action_due_to_constraint"
    ? decision.candidate.adaptedAction : null;
  const action = (adapted || (event.id === "last_meal" ? "Plan your last meal" : event.action)).replace(/[.!?]+$/, "");
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: input.timeZone || undefined, hour: "numeric", minute: "2-digit",
  }).format(event.start);
  return `Coming up: ${action} around ${time}.`;
}
