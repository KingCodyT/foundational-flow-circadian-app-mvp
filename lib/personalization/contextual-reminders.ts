import type { FlowEvent } from "../flow-engine";
import type { DailyEventState } from "@/types/circadian";
import type { FoodTimingEvidence } from "./circadian-food-timing";
import type { Day1PersonalizationResult } from "./day1";
import type { FoodTimingPlan } from "./food-timing-plan";
import { SignalSourceType } from "./types";
import { eventSupportsSignal } from "./now-coaching";

export type ContextualReminder = FlowEvent & { action: string; reason: string; priority: number; scheduledFor: string; responses: readonly ["Done", "Not today", "Adjust"] };

const reminderCopy: Record<string, [string, string, number]> = {
  morning_light: ["Step outside for some morning light.", "Light after waking supports your current focus.", 90],
  midday_light: ["Take a short daylight break.", "Your recent pattern suggests a useful daytime light opportunity.", 60],
  movement: ["Take a short movement break.", "This fits the movement pattern you’re working on.", 50],
  sunset: ["Soften the lights as you wind down.", "Less evening light supports your selected focus.", 65],
  dim_house: ["Dim bright lights and ease off screens.", "A quieter light environment fits your wind-down window.", 85],
  digital_sunset: ["Put bright screens aside for now.", "This is a useful moment for your evening-light focus.", 80],
  sleep_window: ["Begin your usual bedtime routine.", "This window follows the bedtime you entered.", 90],
};

const evening = new Set(["sunset", "dim_house", "digital_sunset"]);
const handled = (status?: string) => status === "completed" || status === "skipped";

export function foodStepHandled(records: DailyEventState, evidence: FoodTimingEvidence[], plan: FoodTimingPlan): boolean {
  if (handled(records.last_meal?.status)) return true;
  return evidence.some(item => item.action !== "MEAL_STARTED" ||
    Boolean(plan.today.at && new Date(item.at).getTime() >= plan.today.at.getTime() - 60 * 60000));
}

/** Select at most one opportunity for the already-selected target. This never
 * chooses a target, promotes a missed event, or treats a constraint as failure. */
export function selectContextualReminder(input: {
  events: FlowEvent[]; day1: Day1PersonalizationResult; records: DailyEventState;
  foodEvidence: FoodTimingEvidence[]; foodPlan: FoodTimingPlan; now: Date; timeZone?: string | null;
}): { current: ContextualReminder | null; next: ContextualReminder | null } {
  const { day1, records, foodEvidence, foodPlan, now } = input;
  const id = day1.primaryCoachingTarget.signalId;
  const state = id ? day1.signalStates[id] : null;
  if (!id || !state || state.coachingState === "ESTABLISHED") return { current: null, next: null };
  const adjustedEvening = Object.entries(records).find(([key, record]) => evening.has(key) && record.remindAt && new Date(record.remindAt) > now);
  const candidates = input.events.flatMap(event => {
    if (evening.has(event.id) && adjustedEvening && event.id !== adjustedEvening[0]) return [];
    if (!eventSupportsSignal(event.id, id) || handled(records[event.id]?.status) || event.status === "completed" || event.status === "skipped") return [];
    if (event.id === "first_meal") return []; // no breakfast prescription from wake alone
    if (["movement", "midday_light"].includes(event.id) && !state.evidence.some(item => item.answer != null || item.source.includes(SignalSourceType.USER_FEEDBACK))) return [];
    if (evening.has(event.id) && [...evening].some(key => handled(records[key]?.status))) return [];
    if (event.id === "last_meal") {
      if (foodPlan.today.kind !== "SMALL_STEP" || !foodPlan.today.at) return [];
      if (foodStepHandled(records, foodEvidence, foodPlan)) return [];
      const start = new Date(foodPlan.today.at.getTime() - 30 * 60000);
      const end = new Date(foodPlan.today.at.getTime() + 30 * 60000);
      return [{ ...event, start, end, name: "A small meal-timing step", guidance: foodPlan.today.explanation, status: now < start ? "upcoming" as const : now <= end ? "current" as const : "missed" as const }];
    }
    return [{ ...event, ...(evening.has(event.id) ? { name: "Evening wind-down", guidance: "Lower bright lights and ease off screens as you wind down. One small change is enough." } : {}) }];
  }).flatMap(event => {
    const adjusted = records[event.id]?.remindAt ? new Date(records[event.id].remindAt!) : null;
    const end = event.end ?? new Date(event.start.getTime() + 60 * 60000);
    const start = adjusted && Number.isFinite(+adjusted) ? adjusted : event.start;
    if (start > end) return [];
    const copy = reminderCopy[event.id] ?? ["Keep your usual routine.", "A small step is enough for your current focus.", 50];
    const mealTime = foodPlan.today.at ? new Intl.DateTimeFormat(undefined, { timeZone: input.timeZone || undefined, hour: "numeric", minute: "2-digit" }).format(foodPlan.today.at) : null;
    return [{ ...event, start, end, status: now < start ? "upcoming" : now <= end ? "current" : "missed",
      action: event.id === "last_meal" ? `If it fits, try your last meal around ${mealTime}.` : copy[0],
      reason: event.id === "last_meal" ? "This is a small step from your reported pattern, not a new required meal time." : copy[1],
      priority: event.id === "last_meal" ? 80 : copy[2], scheduledFor: start.toISOString(), responses: ["Done", "Not today", "Adjust"]
    } as ContextualReminder];
  });
  const rank = (a: ContextualReminder, b: ContextualReminder) => b.priority - a.priority || +a.start - +b.start || a.id.localeCompare(b.id);
  const current = candidates.filter(event => event.status === "current").sort(rank)[0] ?? null;
  const upcoming = candidates.filter(event => event.status === "upcoming").sort((a, b) => +a.start - +b.start || rank(a, b));
  // One pending reminder, never a scheduled daily lineup.
  return { current, next: current ? null : upcoming[0] ?? null };
}
