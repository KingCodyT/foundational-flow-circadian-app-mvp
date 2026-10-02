import { shiftDateKey } from "@/lib/schedule-time";
import { validTimelineDate } from "@/lib/timeline";
export function TimelineDateNavigation({ date, today, onChange }: { date: string; today: string; onChange: (date: string) => void }) {
  return <nav className="timeline-date-navigation" aria-label="Timeline date">
    <button type="button" onClick={() => onChange(shiftDateKey(date, -1))}>Previous day</button>
    <label>Timeline date<input type="date" value={date} onChange={e => { if (validTimelineDate(e.target.value)) onChange(e.target.value); }}/></label>
    <button type="button" onClick={() => onChange(shiftDateKey(date, 1))}>Next day</button>
    <button type="button" onClick={() => onChange(today)}>Return to Today</button>
  </nav>;
}
