"use client";

import { formatClockTime, parseClockTime, toClockTime } from "@/lib/sleep-timing";

export function matchesSetupPeriod(value: string | null | undefined, period: "AM" | "PM") {
  const minutes = parseClockTime(value);
  return minutes !== null && (minutes < 720 ? "AM" : "PM") === period;
}

export function SetupSleepTimeField({ label, value, period, onChange }: {
  label: string; value: string | null | undefined; period: "AM" | "PM"; onChange: (value: string) => void;
}) {
  const matches = matchesSetupPeriod(value, period);
  const parsed = parseClockTime(value);
  const hour = matches ? Math.floor(parsed! / 60) % 12 || 12 : 12;
  const minute = matches ? parsed! % 60 : 0;
  const selectClass = "rounded-xl border border-[var(--color-line)] bg-white px-3 py-2";
  return <fieldset>
    <legend className="text-sm text-[var(--color-muted)]">{label} ({period})</legend>
    <div className="mt-2 flex items-center gap-2">
      <select aria-label={label + " hour"} required className={selectClass} value={matches ? hour : ""} onChange={e => onChange(toClockTime(Number(e.target.value), minute, period))}>
        <option value="" disabled>Hour</option>{Array.from({ length: 12 }, (_, i) => i + 1).map(h => <option key={h} value={h}>{h}</option>)}
      </select>
      <span aria-hidden="true">:</span>
      <select aria-label={label + " minute"} required className={selectClass} value={matches ? minute : ""} onChange={e => onChange(toClockTime(hour, Number(e.target.value), period))}>
        <option value="" disabled>Min</option>{Array.from({ length: 60 }, (_, i) => <option key={i} value={i}>{String(i).padStart(2, "0")}</option>)}
      </select>
      <span>{period}</span>
    </div>
    {!matches && value && <p className="journey-small">Saved time: {formatClockTime(value) || "unrecognized"}. It has not been changed. Select a new {period} time to continue in setup.</p>}
  </fieldset>;
}
