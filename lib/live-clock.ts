export const CLOCK_REFRESH_MS = 15000;

export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
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
