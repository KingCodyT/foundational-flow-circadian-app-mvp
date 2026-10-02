import type { TimelineEntry as Entry } from "@/types/timeline";
export function TimelineEntry({ entry, timeZone }: { entry: Entry; timeZone: string }) {
  const time = entry.at ? new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(entry.at)) : null;
  return <li className="timeline-entry">
    <p className="timeline-entry-kind">{entry.kind} · {entry.status}</p>
    <h2>{entry.title}</h2>
    {entry.at ? <time dateTime={entry.at}>{time}</time> : <p>Occurrence time unknown</p>}
    <p>{entry.provenance}</p>
    {entry.details && <p>{entry.details}</p>}
    <details><summary>Time and provenance</summary>
      <p>Original timestamp: {entry.at ?? "not recorded"}</p>
      <p>Historical timezone: {entry.timeZone ?? "not recorded"}. Display timezone: {timeZone}.</p>
      {entry.kind === "RECORDED" && <><p>Recorded: {entry.recordedAt ?? "not separately recorded"}</p><p>Last edited: {entry.updatedAt ?? "not separately recorded"}</p></>}
    </details>
  </li>;
}
