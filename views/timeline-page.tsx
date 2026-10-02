import { useRouter } from "next/router";
import { FlowShell } from "@/components/flow-shell";
import { useCircadian } from "@/components/circadian-provider";
import FoodTimingHistory from "@/components/food-timing-history";
import { TimelineDateNavigation } from "@/components/timeline-date-navigation";
import { TimelineEntry } from "@/components/timeline-entry";
import { buildTimeline, timelineDate } from "@/lib/timeline";

export default function TimelinePage() {
  const router = useRouter();
  const { isHydrated, environment, dailyProfile, foodTimingEvidenceByDate, eventStateByDate, notificationState, firstRunHandoff } = useCircadian();
  const timeZone = dailyProfile?.timeZone || environment.timezone || "UTC";
  const today = environment.localDate;
  const date = timelineDate(router.query.date, today);
  const entries = buildTimeline({ date, today, timeZone, food: foodTimingEvidenceByDate, events: eventStateByDate, notifications: notificationState, firstRunHandoff });
  return <FlowShell>
    <div className="timeline-page">
    <header className="journey-intro timeline-intro"><h1>Timeline</h1><p>What happened, the context around it, and guidance that was saved.</p></header>
    {!isHydrated ? <p role="status">Loading your Timeline…</p> : <>
      <TimelineDateNavigation date={date} today={today} onChange={next => { void router.push({ pathname: "/timeline", query: { ...router.query, date: next } }, undefined, { shallow: true, scroll: false }); }}/>
      <p className="timeline-zone">{timeZone}{!dailyProfile?.timeZone ? " · display timezone; none saved" : ""}</p>
      {!entries.length && <p>No saved entries for this date.</p>}
      <ol className="timeline-entries" aria-label="Timeline entries">{entries.map(entry => <TimelineEntry key={entry.id} entry={entry} timeZone={timeZone}/>)}</ol>
      <details className="timeline-disclosure timeline-day-details"><summary>About this day’s records</summary>
        <p>Recorded actions, context, plans and recommendations share this chronology. Plans are not completions.</p>
        {date > today ? <p>Future dates show saved plans only.</p> : <>
          {!entries.some(e => e.kind === "CONTEXT") && <p>Historical environmental context is unavailable for this date.</p>}
          {!entries.some(e => e.kind === "RECOMMENDED") && <p>Historical guidance is unavailable for this date. It has not been reconstructed from current settings.</p>}
        </>}
      </details>
      {date <= today && <FoodTimingHistory key={`${date}:${timeZone}`} selectedDate={date} displayTimeZone={timeZone}/>}
    </>}
    </div>
  </FlowShell>;
}
