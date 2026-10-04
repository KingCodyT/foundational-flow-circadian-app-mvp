import Link from "next/link";
import { useRouter } from "next/router";
import { FlowShell } from "@/components/flow-shell";
import { useCircadian } from "@/components/circadian-provider";
import FoodTimingHistory from "@/components/food-timing-history";
import { TimelineDateNavigation } from "@/components/timeline-date-navigation";
import { TimelineEntry, TimelineRecordDetails } from "@/components/timeline-entry";
import { buildTimeline, timelineDate } from "@/lib/timeline";

export default function TimelinePage() {
  const router = useRouter();
  const { isHydrated, environment, dailyProfile, foodTimingEvidenceByDate, eventStateByDate, notificationState, firstRunHandoff } = useCircadian();
  const timeZone = dailyProfile?.timeZone || environment.timezone || "UTC";
  const today = environment.localDate;
  const date = timelineDate(router.query.date, today);
  const entries = buildTimeline({ date, today, timeZone, food: foodTimingEvidenceByDate, events: eventStateByDate, notifications: notificationState, firstRunHandoff });
  const activities = entries.filter(entry => entry.kind !== "CONTEXT");
  const recorded = activities.filter(entry => entry.kind === "RECORDED").length;
  const planned = activities.filter(entry => entry.kind === "PLANNED").length;
  const guidance = activities.filter(entry => entry.kind === "RECOMMENDED").length;
  const history = (editMeal?: (id: string, trigger: HTMLElement) => void, saved?: { at: string; message: string }) => <>
    <section className="rounded-xl border border-[var(--color-line)] bg-white/70 p-4" aria-label="Day recap">
      <h2 className="font-semibold">{date > today ? "Plans for this day" : "Your day at a glance"}</h2>
      {activities.length ? <>
        <p>{[recorded ? `${recorded} recorded ${recorded === 1 ? "activity" : "activities"}` : null, planned ? `${planned} planned ${planned === 1 ? "reminder" : "reminders"}` : null, guidance ? `${guidance} ${guidance === 1 ? "piece" : "pieces"} of guidance sent` : null].filter(Boolean).join(" · ")}</p>
      </> : <>
        <p>{date > today ? "No reminders saved for this date." : date === today ? "Your recorded activities will appear here as you use the app." : "No activities saved for this date. You can add a meal you remember below."}</p>
        <Link href="/today" className="inline-block py-3 font-semibold underline underline-offset-2">See your current daylight guidance on Today</Link>
      </>}
    </section>
    {activities.length > 0 && <ol className="timeline-entries" aria-label="Timeline entries">{activities.map(entry => <TimelineEntry key={entry.id} entry={entry} timeZone={timeZone} onEditMeal={editMeal} savedMessage={entry.kind === "RECORDED" && entry.id.startsWith("food:") && entry.at === saved?.at ? "Meal time saved." : undefined}/>)}</ol>}
    {entries.length > 0 && <details className="timeline-disclosure timeline-day-details"><summary>Day details</summary>
      <p>Reminders show what was planned. Recorded activities show what you reported. Guidance shows advice sent by the app.</p>
      <p>Saved light and sleep times provide background for your records; they do not confirm when you woke, slept, or went outside.</p>
      <ul aria-label="Saved record details">{entries.map(entry => <TimelineRecordDetails key={entry.id} entry={entry}/>)}</ul>
    </details>}
  </>;
  return <FlowShell>
    <div className="timeline-page">
    <header className="journey-intro timeline-intro"><h1>Timeline</h1><p>Look back at saved moments and planned reminders. Recording meal times is optional—your daily guidance works without a meal diary.</p></header>
    {!isHydrated ? <p role="status">Loading your Timeline…</p> : <>
      <TimelineDateNavigation date={date} today={today} onChange={next => { void router.push({ pathname: "/timeline", query: { ...router.query, date: next } }, undefined, { shallow: true, scroll: false }); }}/>
      <p className="timeline-zone">Times shown in {timeZone}</p>
      {date <= today
        ? <FoodTimingHistory key={`${date}:${timeZone}`} selectedDate={date} displayTimeZone={timeZone} renderHistory={history}/>
        : history()}

    </>}
    </div>
  </FlowShell>;
}
