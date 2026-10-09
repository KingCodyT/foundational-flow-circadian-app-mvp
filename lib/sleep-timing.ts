export type SleepIntervalAssessment = {
  durationMinutes: number | null;
  interpretation: string | null;
  error: string | null;
  warning: string | null;
  source: "user_entered";
};

const clockPattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function parseClockTime(value: string | null | undefined): number | null {
  const match = value?.match(clockPattern);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

export function formatClockTime(value: string | null | undefined): string | null {
  const minutes = parseClockTime(value);
  if (minutes === null) return null;
  const hour24 = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${hour24 % 12 || 12}:${String(minute).padStart(2, "0")} ${hour24 < 12 ? "AM" : "PM"}`;
}

export function toClockTime(hour: number, minute: number, period: "AM" | "PM"): string {
  const hour24 = (hour % 12) + (period === "PM" ? 12 : 0);
  return `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function assessSleepInterval(bedtime: string | null | undefined, wakeTime: string | null | undefined): SleepIntervalAssessment {
  const bed = parseClockTime(bedtime);
  const wake = parseClockTime(wakeTime);
  const base = { durationMinutes: null, interpretation: null, error: null, warning: null, source: "user_entered" as const };
  if (bed === null || wake === null) return base;
  if (bed === wake) return { ...base, error: "Wake time and bedtime can’t be the same. Check the AM/PM choices." };
  const durationMinutes = (wake - bed + 24 * 60) % (24 * 60);
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  const duration = `${hours} hr${minutes ? ` ${minutes} min` : ""}`;
  const interpretation = `${formatClockTime(bedtime)} → ${formatClockTime(wakeTime)} · ${duration}`;
  const warning = durationMinutes < 180 || durationMinutes > 960
    ? "That interval is unusual. Please check the AM/PM choices; keep it if it reflects your real schedule."
    : null;
  return { durationMinutes, interpretation, error: null, warning, source: "user_entered" };
}
