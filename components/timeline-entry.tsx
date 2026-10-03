import type { TimelineEntry as Entry } from "@/types/timeline";
const categories = { RECORDED: "Recorded", CONTEXT: "Saved context", PLANNED: "Planned reminder", RECOMMENDED: "Guidance sent" };
export function TimelineEntry({ entry, timeZone, onEditMeal, savedMessage }: { entry: Entry; timeZone: string; onEditMeal?: (id: string, trigger: HTMLElement) => void; savedMessage?: string }) {
  const time = entry.at ? new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit",  }).format(new Date(entry.at)) : null;
  const isMeal = entry.kind === "RECORDED" && entry.status === "completed" && entry.id.startsWith("food:");
  return <li className={`timeline-entry${isMeal ? " timeline-meal" : ""}`} data-kind={entry.kind}>
    <div className="timeline-time">{entry.at ? <time dateTime={entry.at}>{time}</time> : <span>Time unknown</span>}</div>
    <div className="timeline-story">
      <h2>{isMeal ? "Meal" : entry.title}</h2>
      {!isMeal && <p className="timeline-entry-kind">{categories[entry.kind]}{entry.status.toLowerCase() !== categories[entry.kind].toLowerCase() && ` · ${entry.status}`}</p>}
      {entry.kind === "RECORDED" && entry.status === "status" && <p>Reported status, not a completion.</p>}
      {entry.kind === "PLANNED" && <p>Planned only · no completion recorded here.</p>}
      {entry.kind === "RECOMMENDED" && entry.details && <p>{entry.details}</p>}
      {onEditMeal && entry.kind === "RECORDED" && entry.status === "completed" && entry.id.startsWith("food:") && <button type="button" className="text-sm font-semibold underline underline-offset-2" onClick={event => onEditMeal(entry.id.slice(5), event.currentTarget)}>Edit</button>}
      {savedMessage && <p role="status" className="timeline-save-message">{savedMessage}</p>}
    </div>
  </li>;
}

export function TimelineRecordDetails({ entry }: { entry: Entry }) {
  return <li className="py-3">
    <p><strong>{entry.title}</strong> · {entry.provenance}</p>
    {entry.details && <p>{entry.details}</p>}
    <p>Original timestamp: {entry.at ?? "not recorded"}. Historical timezone: {entry.timeZone ?? "not recorded"}.</p>
    {entry.kind === "RECORDED" && <p>Recorded: {entry.recordedAt ?? "not separately recorded"}. Last edited: {entry.updatedAt ?? "not separately recorded"}.</p>}
  </li>;
}
