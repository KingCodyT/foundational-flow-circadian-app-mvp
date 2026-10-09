import { localDateKey } from "./live-clock";

export function shiftDateKey(key: string, days: number): string {
  const date = new Date(`${key}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Resolve wall-clock input in the profile zone, independently of the host zone.
 * Repeated DST times use the first occurrence; nonexistent times move forward
 * by the gap, matching Date's compatible disambiguation.
 */
export function scheduleTime(key: string, time: string | null | undefined, timeZone?: string | null): Date | null {
  if (!time || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  if (!timeZone) return new Date(`${key}T${time}:00`);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  });
  const wallStamp = (instant: number) => {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(instant)).map(p => [p.type, p.value]));
    return Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  };
  const desired = Date.parse(`${key}T${time}:00Z`);
  const offsets = new Set([-36, 0, 36].map(hours => {
    const instant = desired + hours * 3600000;
    return wallStamp(instant) - instant;
  }));
  const candidates = [...offsets].map(offset => desired - offset).sort((a, b) => a - b);
  const exact = candidates.find(candidate => wallStamp(candidate) === desired);
  return new Date(exact ?? candidates.find(candidate => wallStamp(candidate) > desired)!);
}

export function scheduleDateKey(date: Date, timeZone?: string | null): string {
  return localDateKey(date, timeZone);
}
