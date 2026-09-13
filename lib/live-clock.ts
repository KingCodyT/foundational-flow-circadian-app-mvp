export const CLOCK_REFRESH_MS = 15000;

export function getRuntimeTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

export function localDateKey(date: Date, timeZone?: string | null): string {
  const zone = timeZone || getRuntimeTimeZone();

  if (!zone) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? String(date.getFullYear());
  const month = parts.find((part) => part.type === "month")?.value ?? String(date.getMonth() + 1).padStart(2, "0");
  const day = parts.find((part) => part.type === "day")?.value ?? String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function formatTimeInZone(date: Date | null, timeZone?: string | null) {
  if (!date || !Number.isFinite(date.getTime())) return "--:--";

  const zone = timeZone || getRuntimeTimeZone();
  if (!zone) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  return new Intl.DateTimeFormat(undefined, {
    timeZone: zone,
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

// Refresh after sleep/background throttling as well as while the page is open.
export function subscribeToClock(
  refresh: () => void,
  host: Pick<Window, "setInterval" | "clearInterval" | "addEventListener" | "removeEventListener"> = window,
  page: Pick<Document, "visibilityState" | "addEventListener" | "removeEventListener"> = document,
): () => void {
  const onVisible = () => {
    if (page.visibilityState === "visible") refresh();
  };
  const timer = host.setInterval(refresh, CLOCK_REFRESH_MS);
  host.addEventListener("focus", refresh);
  host.addEventListener("pageshow", refresh);
  page.addEventListener("visibilitychange", onVisible);
  refresh();

  return () => {
    host.clearInterval(timer);
    host.removeEventListener("focus", refresh);
    host.removeEventListener("pageshow", refresh);
    page.removeEventListener("visibilitychange", onVisible);
  };
}
