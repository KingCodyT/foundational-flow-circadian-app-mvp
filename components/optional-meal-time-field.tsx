"use client";

import { formatClockTime, parseClockTime, toClockTime } from "@/lib/sleep-timing";

const quarterHours = [0, 15, 30, 45];

export function OptionalMealTimeField({ value, onChange }: {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
}) {
  const parsed = parseClockTime(value);
  const hasValue = parsed !== null;
  const total = parsed ?? 0;
  const hour24 = Math.floor(total / 60);
  const hour = hour24 % 12 || 12;
  const minute = total % 60;
  const period = hour24 < 12 ? "AM" : "PM";
  const legacyMinute = hasValue && !quarterHours.includes(minute);
  const update = (nextHour = hour, nextMinute = minute, nextPeriod: "AM" | "PM" = period) =>
    onChange(toClockTime(nextHour, nextMinute, nextPeriod));
  const selectClass = "rounded-xl border border-[var(--color-line)] bg-white px-3 py-2";
  return <fieldset>
    <legend className="text-sm text-[var(--color-muted)]">Last meal time (optional)</legend>
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <select aria-label="Last meal hour" className={selectClass} value={hasValue ? hour : ""} onChange={event => update(Number(event.target.value))}>
        <option value="" disabled>Hour</option>
        {Array.from({ length: 12 }, (_, i) => i + 1).map(h => <option key={h} value={h}>{h}</option>)}
      </select>
      <span aria-hidden="true">:</span>
      <select aria-label="Last meal minute" className={selectClass} value={hasValue ? minute : ""} onChange={event => update(hour, Number(event.target.value))}>
        <option value="" disabled>Min</option>
        {legacyMinute && <option value={minute} disabled>{String(minute).padStart(2, "0")} (saved)</option>}
        {quarterHours.map(m => <option key={m} value={m}>{String(m).padStart(2, "0")}</option>)}
      </select>
      <select aria-label="Last meal AM or PM" className={selectClass} value={hasValue ? period : ""} onChange={event => update(hour, minute, event.target.value as "AM" | "PM")}>
        <option value="" disabled>AM/PM</option><option>AM</option><option>PM</option>
      </select>
      {hasValue && <button type="button" className="journey-outline" onClick={() => onChange(null)}>Clear meal time</button>}
    </div>
    {hasValue ? <p className="journey-small">Last meal: {formatClockTime(value)}.</p> : <p className="journey-small">Leave blank to skip. When you start, remaining choices default to 12, 00, and AM; adjust them as needed.</p>}
    {legacyMinute && <p className="journey-small">Your saved time is unchanged. Choose 00, 15, 30, or 45 to change the minutes.</p>}
  </fieldset>;
}
