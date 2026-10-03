import type { DailyEventState } from "@/types/circadian";
import { historicalFoodContextIsApplicable, type FoodTimingEvidence } from "@/lib/personalization/circadian-food-timing";
import type { NotificationPersistenceState } from "@/lib/personalization/notification-persistence";
import type { TimelineEntry } from "@/types/timeline";
import { localDateKey } from "@/lib/live-clock";

export function validTimelineDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function timelineDate(value: unknown, today: string) { return validTimelineDate(value) ? value : today; }
const validInstant = (at?: string | null): at is string => Boolean(at && Number.isFinite(Date.parse(at)));
const label = (id: string) => id.replaceAll("_", " ").replace(/^./, s => s.toUpperCase());

// Scan all stored buckets: travel and cross-date edits must not hide an instant.
// Deduplicate by stable evidence identity; prefer the most recently edited copy.
export function timelineFood(records: Record<string, FoodTimingEvidence[]> | null | undefined, date: string, zone: string) {
  const unique = new Map<string, FoodTimingEvidence>();
  for (const bucket of Object.keys(records ?? {}).sort()) for (const record of records![bucket]) {
    const old = unique.get(record.id);
    const revision = (r: FoodTimingEvidence) => Date.parse(r.updatedAt ?? r.recordedAt ?? r.at) || 0;
    if (!old || revision(record) > revision(old) || (revision(record) === revision(old) && record.at > old.at)) unique.set(record.id, record);
  }
  return [...unique.values()].filter(r => validInstant(r.at) && localDateKey(new Date(r.at), zone) === date)
    .sort((a,b) => Date.parse(a.at) - Date.parse(b.at) || a.id.localeCompare(b.id));
}
export function buildTimeline(input: {
  date: string; today: string; timeZone: string;
  food?: Record<string, FoodTimingEvidence[]> | null;
  events?: Record<string, DailyEventState> | null;
  notifications?: NotificationPersistenceState | null;
  firstRunHandoff?: import("./personalization/first-run-guidance").FirstRunHandoff | null;
}): TimelineEntry[] {
  const entries = new Map<string, TimelineEntry>();
  const onDate = (at?: string | null) => validInstant(at) && localDateKey(new Date(at), input.timeZone) === input.date;
  const add = (entry: TimelineEntry) => entries.set(entry.id, entry);
  const future = input.date > input.today;
  if (!future) {
    const food = timelineFood(input.food, input.date, input.timeZone);
    const meals = food.filter(r => r.action === "MEAL_STARTED");
    for (const record of food) {
      const meal = record.action === "MEAL_STARTED";
      const title = !meal ? record.action === "NOT_YET" ? "Not yet eating — reported status" : "Eating later — reported intention" :
        meals.length === 1 ? "Recorded meal" : record.id === meals[0].id ? "First recorded meal" : record.id === meals[meals.length-1].id ? "Last recorded meal" : "Recorded meal";
      add({ id: `food:${record.id}`, kind: "RECORDED", status: meal ? "completed" : "status", title, at: record.at,
        recordedAt: record.recordedAt, updatedAt: record.updatedAt, timeZone: record.historicalContext?.timeZone,
        provenance: "User food record", details: meal ? undefined : "A status statement, not a meal or completion." });
      if (!meal) continue;
      const context = record.historicalContext;
      if (!context || !historicalFoodContextIsApplicable(record)) { add({ id: `context:unavailable:${record.id}`, kind: "CONTEXT", status: "unavailable", at: record.at,
        title: "Historical biological context unavailable", timeZone: context?.timeZone, provenance: `Meal ${record.id}`, details: record.historicalContextOccurrenceAt
          ? `Context for this edited occurrence is unavailable. Original occurrence: ${record.historicalContextOccurrenceAt}. ${context ? `Retained prior snapshot: ${JSON.stringify(context)}.` : "No original snapshot was saved."} Current settings have not been substituted.`
          : "No saved context; current settings have not been applied to this record." }); continue; }
      for (const [field, title] of [["wakeAt", "Saved wake anchor"], ["morningLightAt", "Saved light opportunity"], ["sunriseAt", "Sunrise"], ["sunsetAt", "Sunset"], ["targetSleepAt", "Saved sleep anchor"]] as const) {
        const at = context[field];
        // Anchors outside this calendar day remain described with their meal,
        // rather than being moved to this day or mistaken for behavior.
        if (!validInstant(at) || !onDate(at)) continue;
        const id = `context:${field}:${at}:${context.timeZone}:${context.latitude}:${context.longitude}`;
        add({ id, kind: "CONTEXT", status: "saved", title, at, timeZone: context.timeZone,
          provenance: "Saved meal context", details: `Snapshot: ${context.capturedAt}. An environmental or schedule anchor, not recorded behavior.` });
      }
      add({ id: `context:meal:${record.id}`, kind: "CONTEXT", status: "saved", title: "Biological context saved with meal", at: record.at,
        timeZone: context.timeZone, provenance: "Saved meal context", details: `Wake: ${context.wakeAt ?? "unavailable"}; sleep: ${context.targetSleepAt ?? "unavailable"}; sunrise: ${context.sunriseAt ?? "unavailable"}; sunset: ${context.sunsetAt ?? "unavailable"}.` });
    }
  }
  for (const bucket of Object.keys(input.events ?? {}).sort()) for (const [eventId, record] of Object.entries(input.events![bucket])) {
    const terminal = record.status === "completed" || record.status === "skipped";
    if (!future && (onDate(record.at) || (!validInstant(record.at) && bucket === input.date))) {
      const id = `event:${eventId}:${validInstant(record.at) ? record.at : bucket}`;
      add({ id, kind: "RECORDED", status: record.status === "completed" ? "completed" : record.status === "skipped" ? "skipped" : "status",
        title: `${label(eventId)} — ${record.status === "missed" ? "saved status: missed (not proof of failure)" : record.status}`,
        at: validInstant(record.at) ? record.at : null, provenance: `Saved event record (${bucket})`,
        details: "Timezone provenance was not saved. No scheduled timestamp is substituted." });
    }
    if (!terminal && onDate(record.remindAt)) add({ id: `plan:${eventId}:${record.remindAt}`, kind: "PLANNED", status: "planned",
      title: `${label(eventId)} — reminder requested`, at: record.remindAt!, provenance: "Saved user-adjusted reminder", details: "Planned time; not evidence of completion or failure." });
  }
  const guidance = input.firstRunHandoff?.guidance;
  if (guidance && onDate(guidance.start)) {
    const linked = Object.values(input.events ?? {}).some(day => {
      const record = day[guidance.eventId];
      return record && (record.status === "completed" || record.status === "skipped") && onDate(record.at);
    });
    const scheduled = input.notifications?.scheduledNotification;
    const duplicatesScheduled = scheduled?.eventId === guidance.eventId && scheduled.scheduledFor === guidance.start;
    if (!linked && !duplicatesScheduled) add({ id: `plan:guidance:${guidance.eventId}:${guidance.start}`, kind: "PLANNED", status: "planned",
      title: guidance.action, at: guidance.start, provenance: "Saved first-run guidance plan", details: `${guidance.reason} This is a planned opportunity, not recorded behavior.` });
  }
  const notices = input.notifications;
  const deliveredIds = new Set((notices?.deliveredNotifications ?? []).map(r => r.id));
  const planned = notices?.scheduledNotification;
  const linkedCompleted = planned?.eventId && Object.values(input.events ?? {}).some(day => {
    const record = day[planned.eventId!];
    return record && (record.status === "completed" || record.status === "skipped") && onDate(record.at);
  });
  const alreadyPlanned = planned?.eventId && [...entries.values()].some(entry => entry.kind === "PLANNED"
    && entry.id.startsWith(`plan:${planned.eventId}:`) && entry.at && Date.parse(entry.at) === Date.parse(planned.scheduledFor));
  if (planned && !alreadyPlanned && !linkedCompleted && !deliveredIds.has(planned.id) && onDate(planned.scheduledFor)) add({ id: `plan:notification:${planned.id}`, kind: "PLANNED", status: "planned",
    title: planned.title, at: planned.scheduledFor, timeZone: planned.timeZone, provenance: "Saved scheduled guidance", details: `${planned.body} Planned delivery is not recorded behavior.` });
  if (!future) for (const record of notices?.deliveredNotifications ?? []) {
    if (!onDate(record.deliveredAt)) continue;
    const content = [notices?.lastNotification, notices?.scheduledNotification].find(n => n?.id === record.id);
    add({ id: `recommendation:${record.id}`, kind: "RECOMMENDED", status: "delivered", title: content?.title ?? "Guidance delivery recorded",
      at: record.deliveredAt, provenance: "Saved delivery record", timeZone: content?.timeZone,
      details: content?.body ?? "The original guidance text was not retained. No guidance has been reconstructed." });
  }
  return [...entries.values()].sort((a,b) => (a.at ? Date.parse(a.at) : Infinity) - (b.at ? Date.parse(b.at) : Infinity) || a.id.localeCompare(b.id));
}
