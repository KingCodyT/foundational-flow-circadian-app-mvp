"use client";

import { formatTimeInZone } from "@/lib/live-clock";
import { FlowEvent } from "@/lib/flow-engine";

export default function EventRow({ e, timeZone }: { e: FlowEvent; timeZone?: string | null }) {
  const timeLabel = e.end ? `${formatTimeInZone(e.start, timeZone)} - ${formatTimeInZone(e.end, timeZone)}` : formatTimeInZone(e.start, timeZone);
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
      <div>
        <p className="text-xs uppercase text-[var(--color-muted)]">{e.name}</p>
        <p className="mt-1 font-semibold">{timeLabel}</p>
        <p className="mt-2 text-sm text-[var(--color-muted)]">{e.guidance}</p>
      </div>
      <div className="text-sm">
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs ${e.status === "current" ? "bg-[var(--color-charcoal)] text-[var(--color-cream)]" : "bg-[var(--color-cream)]/30 text-[var(--color-charcoal)]"}`}>{e.status}</span>
      </div>
    </div>
  );
}
