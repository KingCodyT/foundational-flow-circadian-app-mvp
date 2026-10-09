"use client";

import { formatClockTime, parseClockTime, toClockTime } from "@/lib/sleep-timing";

export function ClockTimeField({ label, value, onChange, required = false, className = "" }: {
  label: string; value: string | null | undefined; onChange: (value: string) => void; required?: boolean; className?: string;
}) {
  const parsed = parseClockTime(value);
  const hasValue = parsed !== null;
  const total = parsed ?? 0;
  const hour24 = Math.floor(total / 60);
  const hour = hour24 % 12 || 12;
  const minute = total % 60;
  const period: "AM" | "PM" = hour24 < 12 ? "AM" : "PM";
  const update = (nextHour = hour, nextMinute = minute, nextPeriod = period) => onChange(toClockTime(nextHour, nextMinute, nextPeriod));
  const selectClass = "rounded-xl border border-[var(--color-line)] bg-white px-3 py-2";
  return <fieldset className={className}>
    <legend className="text-sm text-[var(--color-muted)]">{label}</legend>
    <div className="mt-2 flex items-center gap-2">
      <select aria-label={`${label} hour`} required={required} className={selectClass} value={hasValue ? hour : ""} onChange={event => update(Number(event.target.value))}><option value="" disabled>Hour</option>{Array.from({ length: 12 }, (_, index) => index + 1).map(option => <option key={option}>{option}</option>)}</select>
      <span aria-hidden="true">:</span>
      <select aria-label={`${label} minute`} required={required} className={selectClass} value={hasValue ? minute : ""} onChange={event => update(hour, Number(event.target.value))}><option value="" disabled>Min</option>{Array.from({ length: 60 }, (_, index) => index).map(option => <option key={option} value={option}>{String(option).padStart(2, "0")}</option>)}</select>
      <select aria-label={`${label} AM or PM`} required={required} className={selectClass} value={hasValue ? period : ""} onChange={event => update(hour, minute, event.target.value as "AM" | "PM")}><option value="" disabled>AM/PM</option><option>AM</option><option>PM</option></select>
    </div>
    <span className="sr-only">Current value: {formatClockTime(value)}</span>
  </fieldset>;
}
