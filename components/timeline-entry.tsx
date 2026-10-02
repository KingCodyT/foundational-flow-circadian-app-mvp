import type { TimelineEntry as Entry } from "@/types/timeline";
const categories = { RECORDED: "Recorded", CONTEXT: "Context", PLANNED: "Planned", RECOMMENDED: "Recommended" };
export function TimelineEntry({ entry, timeZone }: { entry: Entry; timeZone: string }) {
  const time = entry.at ? new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(entry.at)) : null;
  return <li className="timeline-entry" data-kind={entry.kind}>
    <div className="timeline-time">{entry.at ? <time dateTime={entry.at}>{time}</time> : <span>Time unknown</span>}</div>
    <div className="timeline-story">
      <h2>{entry.title}</h2>
      <p className="timeline-entry-kind">{categories[entry.kind]} · {entry.status}</p>
      {entry.kind === "RECORDED" && entry.status === "status" && <p>Reported status, not a completion.</p>}
      {entry.kind === "PLANNED" && <p>Planned time, not recorded behavior.</p>}
      {entry.kind === "RECOMMENDED" && entry.details && <p>{entry.details}</p>}
      <details className="timeline-disclosure"><summary>Time and provenance<span className="sr-only">: {entry.title}</span></summary>
        <p>{entry.provenance}</p>
        {entry.kind !== "RECOMMENDED" && entry.details && <p>{entry.details}</p>}
        <p>Original timestamp: {entry.at ?? "not recorded"}</p>
        <p>Historical timezone: {entry.timeZone ?? "not recorded"}. Display timezone: {timeZone}.</p>
        {entry.kind === "RECORDED" && <><p>Recorded: {entry.recordedAt ?? "not separately recorded"}</p><p>Last edited: {entry.updatedAt ?? "not separately recorded"}</p></>}
      </details>
    </div>
  </li>;
}
