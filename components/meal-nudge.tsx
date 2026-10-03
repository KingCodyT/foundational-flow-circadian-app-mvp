import Link from "next/link";
import { useEffect, useState } from "react";
import type { DailyProfile } from "@/types/circadian";
import { mealNudge } from "@/lib/personalization/meal-nudge";

const key = "foundational-flow-meal-nudge-response";
type Response = { id: string; until: number; dismissed: boolean };
export function MealNudge({ profile, now, children }: { profile: DailyProfile | null; now: Date; children: React.ReactNode }) {
  const nudge = mealNudge(profile, now);
  const [response, setResponse] = useState<Response | null>(null);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const read = () => {
      try {
        const value = JSON.parse(window.localStorage.getItem(key) || "null");
        setResponse(value && typeof value.id === "string" && Number.isFinite(value.until) && typeof value.dismissed === "boolean" ? value : null);
      } catch { /* Unavailable storage: responses still work in this view. */ }
      setReady(true);
    };
    read();
    window.addEventListener("storage", read);
    window.addEventListener("meal-response-updated", read);
    return () => {window.removeEventListener("storage", read);window.removeEventListener("meal-response-updated", read);};
  }, []);
  useEffect(() => { setMessage(""); }, [nudge?.id]);
  const respond = (dismissed: boolean) => {
    if (!nudge) return;
    const value = {id: nudge.id, until: +now + 15 * 60000, dismissed};
    setResponse(value);
    let saved = true;
    try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { saved = false; }
    window.dispatchEvent?.(new Event("meal-response-updated"));
    setMessage(`${dismissed ? "Meal suggestion dismissed for today." : "We’ll show this again in 15 minutes while the app is open."}${saved ? "" : " This choice could not be saved and may reset when you leave this page."}`);
  };
  const hidden = response?.id === nudge?.id && (response?.dismissed || (response?.until ?? 0) > +now);
  if (!ready || !nudge || hidden) return <>{children}{message && <p role="status" className="food-idea-note">{message}</p>}</>;
  return <section aria-label="Meal suggestion">
    <h2>A little help with your next meal</h2>
    <h3>Thinking about your next meal?</h3>
    <p>You usually have your last meal around {nudge.time}. If you’re planning food, here are some ideas that fit this part of your day.</p>
    <p className="food-idea-note">Follow your hunger and plans. This is a friendly cue from your saved schedule, not a requirement to eat or log a meal.</p>
    <div className="flex flex-wrap gap-3 mt-4">
      <Link href="/food" className="journey-outline" onClick={() => respond(true)}>See meal ideas</Link>
      {+now + 15 * 60000 < nudge.end && <button type="button" className="journey-outline" onClick={() => respond(false)}>Remind me in 15 minutes</button>}
      <button type="button" className="journey-outline" onClick={() => respond(true)}>Dismiss</button>
    </div>
    <p className="food-idea-note">Meal logging is optional. Enable background meal notifications on the Food page.</p>
  </section>;
}
