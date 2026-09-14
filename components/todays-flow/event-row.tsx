"use client";

import { FlowEvent } from "@/lib/flow-engine";

export default function EventRow({ e }: { e: FlowEvent }) {
  const timeLabel = e.end ? `${e.start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${e.end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : e.start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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
