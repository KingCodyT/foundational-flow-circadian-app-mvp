"use client";

import { useMemo, useState } from "react";
import { buildTodaysFlow, FlowEvent } from "@/lib/flow-engine";
import { useCircadian } from "@/components/circadian-provider";
import EventRow from "@/components/todays-flow/event-row";

function formatWindow(e: FlowEvent) {
  if (!e) return "";
  if (e.end) {
    return `${e.start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${e.end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }
  return e.start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ActiveStep() {
  const { dailyProfile, participationLevel, eventStateByDate, getEventStateForDate, setEventRecord } = useCircadian();
  const [now] = useState<Date>(new Date());
  const todayKey = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const profileInput = useMemo(() => ({
    wakeTime: dailyProfile?.wakeTime ?? null,
    targetBedtime: dailyProfile?.targetBedtime ?? null,
    latitude: dailyProfile?.locationPermissionGranted ? dailyProfile.latitude ?? null : null,
    longitude: dailyProfile?.locationPermissionGranted ? dailyProfile.longitude ?? null : null,
  }), [dailyProfile]);

  const eventStateForDate = getEventStateForDate(todayKey);

  const { events, activeEvent, next, solar, locationAvailable, progress } = buildTodaysFlow({ now, profile: profileInput, participationLevel, eventStateForDate });

  const [showPlan, setShowPlan] = useState(false);

  const canAct = (ev?: FlowEvent) => {
    if (!ev) return false;
    // Only allow actions on events that are currently actionable (status === 'current').
    return ev.status === "current";
  };

  const handleDone = (ev?: FlowEvent) => {
    if (!ev) return;
    setEventRecord(todayKey, ev.id, { status: "completed", at: new Date().toISOString() });
  };

  const handleSkip = (ev?: FlowEvent) => {
    if (!ev) return;
    setEventRecord(todayKey, ev.id, { status: "skipped", at: new Date().toISOString() });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-[1.25rem] border bg-white/80 p-6">
        {activeEvent ? (
          <>
            <p className="text-xs uppercase tracking-[0.26em] text-[var(--color-gold-soft)]">Your next best move</p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-2xl">{activeEvent.name}</h2>
            <p className="mt-2 text-sm text-[var(--color-muted)]">{activeEvent.guidance}</p>

            <div className="mt-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-muted)]">When</p>
                <p className="font-semibold">{formatWindow(activeEvent)}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => handleDone(activeEvent)} disabled={!canAct(activeEvent)} className="inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm">Done</button>
                <button onClick={() => handleSkip(activeEvent)} disabled={!canAct(activeEvent)} className="inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm">Skip</button>
              </div>
            </div>
          </>
        ) : next ? (
          // Caught-up state with upcoming event preview
          <>
            <p className="text-xs uppercase tracking-[0.26em] text-[var(--color-gold-soft)]">You're caught up</p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-2xl">You're caught up</h2>
            <p className="mt-2 text-sm text-[var(--color-muted)]">Nothing to do right now.</p>

            <div className="mt-4 border-t pt-4">
              <p className="text-xs uppercase text-[var(--color-muted)]">Coming up</p>
              <h3 className="mt-2 font-semibold">{next.name}</h3>
              <p className="text-sm text-[var(--color-muted)]">{formatWindow(next)}</p>
              <p className="mt-2 text-sm text-[var(--color-muted)]">{next.guidance}</p>
            </div>
          </>
        ) : (
          // No next event for today
          <>
            <p className="text-xs uppercase tracking-[0.26em] text-[var(--color-gold-soft)]">You're caught up</p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-2xl">You're done for today</h2>
            <p className="mt-2 text-sm text-[var(--color-muted)]">No more scheduled items for today. Great work.</p>
          </>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button onClick={() => setShowPlan((s) => !s)} className="text-sm text-[var(--color-muted)]">{showPlan ? "Hide today's plan" : "View today's plan"}</button>
        <div className="text-sm text-[var(--color-muted)]">Progress: {progress.completed}/{progress.total} ({progress.percent}%)</div>
      </div>

      {showPlan && (
        <div className="space-y-3">
          {events.map((e) => (
            <EventRow key={e.id} e={e} />
          ))}
        </div>
      )}
    </div>
  );
}
