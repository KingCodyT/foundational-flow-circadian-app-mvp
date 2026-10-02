"use client";
import { useEffect, useRef, useState } from "react";
import { useCircadian } from "./circadian-provider";
import { timelineFood, validTimelineDate } from "@/lib/timeline";
import { formatTimeInZone, localDateKey } from "@/lib/live-clock";
import { scheduleTime } from "@/lib/schedule-time";
import { buildFoodJourneySnapshot } from "@/lib/personalization/circadian-food-journey";
import { FOOD_LOG_CLICK_GUARD_WINDOW_MS } from "@/lib/personalization/food-timing-action";
function formatTime(date?: Date | null, timeZone?: string | null) {
  if (!date) return "—";
  return formatTimeInZone(date, timeZone);
}

function isFoodOwnedEvent(eventId?: string | null) {
  return eventId === "first_meal" || eventId === "last_meal";
}

function toTwelveHourParts(date: Date, timeZone?: string | null) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: timeZone || undefined, hourCycle: "h23", hour: "2-digit", minute: "2-digit" }).formatToParts(date);
  const hours = Number(parts.find(part => part.type === "hour")?.value);
  const minute = parts.find(part => part.type === "minute")?.value || "00";
  return {
    hour: String(hours % 12 || 12),
    minute,
    meridiem: hours >= 12 ? "PM" : "AM",
  } as const;
}

function buildDateWithTime(input: {
  baseDate: Date;
  timeZone?: string | null;
  hour: string;
  minute: string;
  meridiem: "AM" | "PM";
}): Date | null {
  const hour = Number(input.hour);
  const minute = Number(input.minute);
  if (!Number.isInteger(hour) || hour < 1 || hour > 12) return null;
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) return null;

  const normalizedHour = hour % 12;
  const hour24 = input.meridiem === "PM" ? normalizedHour + 12 : normalizedHour;
  return scheduleTime(localDateKey(input.baseDate, input.timeZone), `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`, input.timeZone);
}

function getFocusableElements(container: HTMLElement | null) {
  if (!container) return [] as HTMLElement[];
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), select:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute("hidden"));
}

export default function FoodTimingHistory({ selectedDate, displayTimeZone }: { selectedDate?: string; displayTimeZone?: string } = {}) {
  const { dailyProfile, environment, foodTimingEvidenceByDate, now, recordFoodTimingAction, updateFoodTimingAction, deleteFoodTimingAction } = useCircadian();
  const lastMealTapAtMsRef = useRef(0);
  const [timeDialogMode, setTimeDialogMode] = useState<"add" | "edit" | null>(null);
  const [timeDialogEvidenceId, setTimeDialogEvidenceId] = useState<string | null>(null);
  const [timeDialogBaseDate, setTimeDialogBaseDate] = useState<Date | null>(null);
  const [timeDialogHour, setTimeDialogHour] = useState("12");
  const [timeDialogMinute, setTimeDialogMinute] = useState("00");
  const [timeDialogMeridiem, setTimeDialogMeridiem] = useState<"AM" | "PM">("AM");
  const [timeDialogError, setTimeDialogError] = useState<string | null>(null);
  const [timeDialogDeleteConfirm, setTimeDialogDeleteConfirm] = useState(false);
  const [mealSavedMessage, setMealSavedMessage] = useState<string | null>(null);
  const [lastSavedMealAtIso, setLastSavedMealAtIso] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const dialogHourRef = useRef<HTMLSelectElement | null>(null);
  const dialogTriggerRef = useRef<HTMLElement | null>(null);
  const mealSavedTimeoutRef = useRef<number | null>(null);
  const profileTimeZone = displayTimeZone || dailyProfile?.timeZone || environment.timezone || "UTC";
  const todayKey = localDateKey(now, profileTimeZone);
  const dateKey = selectedDate && validTimelineDate(selectedDate) ? selectedDate : todayKey;
  const [dialogDate, setDialogDate] = useState(dateKey);

  const foodTimingSnapshot = buildFoodJourneySnapshot({ evidence: timelineFood(foodTimingEvidenceByDate, dateKey, profileTimeZone), events: [] });
  const foodTimingOwnsCurrentMoment = false;
  const mealEntries = [...foodTimingSnapshot.meals].sort((a, b) => {
    const aTime = new Date(a.at).getTime();
    const bTime = new Date(b.at).getTime();
    if (aTime !== bTime) return aTime - bTime;
    return a.evidenceId.localeCompare(b.evidenceId);
  });

  const announceMealSaved = (atIso?: string | null) => {
    const savedAt = atIso ? new Date(atIso) : null;
    const hasValidSavedAt = Boolean(savedAt && Number.isFinite(savedAt.getTime()));
    setMealSavedMessage(
      hasValidSavedAt
        ? `Meal time saved: ${formatTime(savedAt, profileTimeZone)}`
        : "Meal time saved.",
    );
    setLastSavedMealAtIso(hasValidSavedAt ? savedAt!.toISOString() : null);
    if (mealSavedTimeoutRef.current) {
      window.clearTimeout(mealSavedTimeoutRef.current);
    }
    mealSavedTimeoutRef.current = window.setTimeout(() => {
      setMealSavedMessage(null);
      mealSavedTimeoutRef.current = null;
    }, 2200);
  };

  const openTimeDialog = (input: {
    mode: "add" | "edit";
    at: Date;
    evidenceId?: string | null;
    trigger?: HTMLElement | null;
    startDeleteConfirm?: boolean;
  }) => {
    if (input.trigger) {
      dialogTriggerRef.current = input.trigger;
    }
    const parts = toTwelveHourParts(input.at, profileTimeZone);
    setTimeDialogMode(input.mode);
    setTimeDialogEvidenceId(input.evidenceId ?? null);
    setTimeDialogBaseDate(new Date(input.at));
    setDialogDate(localDateKey(input.at, profileTimeZone));
    setTimeDialogHour(parts.hour);
    setTimeDialogMinute(parts.minute);
    setTimeDialogMeridiem(parts.meridiem);
    setTimeDialogError(null);
    setTimeDialogDeleteConfirm(Boolean(input.startDeleteConfirm));
  };

  const closeTimeDialog = () => {
    setTimeDialogMode(null);
    setTimeDialogEvidenceId(null);
    setTimeDialogBaseDate(null);
    setTimeDialogHour("12");
    setTimeDialogMinute("00");
    setTimeDialogMeridiem("AM");
    setTimeDialogError(null);
    setTimeDialogDeleteConfirm(false);

    window.setTimeout(() => {
      dialogTriggerRef.current?.focus();
    }, 0);
  };

  const saveTimeDialog = () => {
    if (!timeDialogBaseDate || !validTimelineDate(dialogDate)) {
      setTimeDialogError("Choose a valid meal start time.");
      return;
    }

    const originalParts = toTwelveHourParts(timeDialogBaseDate, profileTimeZone);
    const unchanged = timeDialogMode === "edit" && dialogDate === localDateKey(timeDialogBaseDate, profileTimeZone)
      && timeDialogHour === originalParts.hour && timeDialogMinute === originalParts.minute && timeDialogMeridiem === originalParts.meridiem;
    // Preserve seconds and the original occurrence in a repeated DST hour when
    // the user has not changed the date/time. No evidence edit is needed.
    if (unchanged) { closeTimeDialog(); return; }
    const parsed = buildDateWithTime({
      baseDate: scheduleTime(dialogDate, "12:00", profileTimeZone) ?? timeDialogBaseDate,
      timeZone: profileTimeZone,
      hour: timeDialogHour,
      minute: timeDialogMinute,
      meridiem: timeDialogMeridiem,
    });
    if (!parsed) {
      setTimeDialogError("Choose a valid meal start time.");
      return;
    }
    if (parsed.getTime() > Date.now()) {
      setTimeDialogError("Choose a time that is not in the future.");
      return;
    }

    const atIso = parsed.toISOString();
    if (timeDialogMode === "edit") {
      if (!timeDialogEvidenceId || !updateFoodTimingAction(timeDialogEvidenceId, atIso)) {
        setTimeDialogError("That meal time could not be changed.");
        return;
      }
    } else {
      const dateKey = localDateKey(parsed, profileTimeZone);
      recordFoodTimingAction(dateKey, "MEAL_STARTED", atIso);
    }

    announceMealSaved(atIso);
    closeTimeDialog();
  };

  const deleteMealFromDialog = () => {
    if (!timeDialogEvidenceId) return;
    if (!timeDialogDeleteConfirm) {
      setTimeDialogDeleteConfirm(true);
      return;
    }
    if (!deleteFoodTimingAction(timeDialogEvidenceId)) {
      setTimeDialogError("That meal time could not be removed.");
      return;
    }
    setMealSavedMessage("Meal time removed.");
    setLastSavedMealAtIso(null);
    if (mealSavedTimeoutRef.current) {
      window.clearTimeout(mealSavedTimeoutRef.current);
    }
    mealSavedTimeoutRef.current = window.setTimeout(() => {
      setMealSavedMessage(null);
      mealSavedTimeoutRef.current = null;
    }, 2200);
    closeTimeDialog();
  };

  useEffect(() => {
    return () => {
      if (mealSavedTimeoutRef.current) {
        window.clearTimeout(mealSavedTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!timeDialogMode) return;

    const focusInitial = () => dialogHourRef.current?.focus();
    focusInitial();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!timeDialogMode) return;

      if (event.key === "Escape") {
        event.preventDefault();
        closeTimeDialog();
        return;
      }

      if (event.key !== "Tab") return;

      const focusables = getFocusableElements(dialogRef.current);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [timeDialogMode]);

  const recordMealNow = () => {
    const clickedAt = Date.now();
    if (clickedAt - lastMealTapAtMsRef.current <= FOOD_LOG_CLICK_GUARD_WINDOW_MS) {
      return;
    }
    lastMealTapAtMsRef.current = clickedAt;
    const clickedDate = new Date(clickedAt);
    recordFoodTimingAction(localDateKey(clickedDate, profileTimeZone), "MEAL_STARTED", clickedDate.toISOString());
    announceMealSaved(clickedDate.toISOString());
  };

  const recentSavedMeal =
    (lastSavedMealAtIso
      ? mealEntries.find((meal) => meal.at === lastSavedMealAtIso)
      : null) ??
    (mealEntries.length > 0 ? mealEntries[mealEntries.length - 1] : null);

  const foodTimingEditor = (
    <div className={`mt-4 rounded-xl border p-4 ${foodTimingOwnsCurrentMoment ? "border-[var(--color-gold)] bg-white" : "border-[var(--color-line)] bg-[var(--color-cream)]/70"}`}>
      <h2 className="text-lg font-semibold tracking-[-0.02em] text-[var(--color-charcoal)]">FOOD TIMING</h2>
      <details><summary>Record or edit a meal time</summary>
      <p>Save what happened when it’s useful. There is no meal checklist.</p>

      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={dateKey !== todayKey}
          onClick={recordMealNow}
          className={`inline-flex min-h-12 w-full items-center justify-center rounded-full px-6 py-3 text-base font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)] focus-visible:ring-offset-2 active:translate-y-px sm:w-auto ${foodTimingOwnsCurrentMoment ? "bg-[var(--color-charcoal)] text-[var(--color-cream)] hover:bg-[var(--color-gold)] hover:text-[var(--color-charcoal)]" : "border border-[var(--color-line)] bg-white text-[var(--color-charcoal)] hover:border-[var(--color-charcoal)]"}`}
        >
          I&apos;m eating now
        </button>
        <button
          type="button"
          onClick={(event) =>
            openTimeDialog({ mode: "add", at: dateKey === todayKey ? now : scheduleTime(dateKey, "12:00", profileTimeZone)!, trigger: event.currentTarget })
          }
          className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-[var(--color-line)] bg-white px-6 py-3 text-base font-semibold text-[var(--color-charcoal)] transition hover:border-[var(--color-charcoal)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)] focus-visible:ring-offset-2 active:translate-y-px sm:w-auto"
        >
          Add a meal time
        </button>
      </div>

      <p role="status" aria-live="polite" className="mt-2 min-h-5 text-sm text-[var(--color-muted)]">
        {mealSavedMessage ?? ""}
      </p>
      {mealSavedMessage && recentSavedMeal ? (
        <div className="flex items-center gap-3 text-sm">
          <button
            type="button"
            onClick={(event) =>
              openTimeDialog({
                mode: "edit",
                at: new Date(recentSavedMeal.at),
                evidenceId: recentSavedMeal.evidenceId,
                trigger: event.currentTarget,
              })
            }
            className="font-semibold text-[var(--color-muted)] underline underline-offset-2 transition hover:text-[var(--color-charcoal)]"
          >
            Change time
          </button>
          <span className="text-[var(--color-muted)]">|</span>
          <button
            type="button"
            onClick={(event) =>
              openTimeDialog({
                mode: "edit",
                at: new Date(recentSavedMeal.at),
                evidenceId: recentSavedMeal.evidenceId,
                trigger: event.currentTarget,
                startDeleteConfirm: true,
              })
            }
            className="font-semibold text-[var(--color-muted)] underline underline-offset-2 transition hover:text-[var(--color-charcoal)]"
          >
            Remove time
          </button>
        </div>
      ) : null}

      <div className="mt-2 border-t border-[var(--color-line)] pt-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">Meal times · {dateKey} · {profileTimeZone}</p>
        {mealEntries.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--color-muted)]">No meal times saved for this date.</p>
        ) : (
          <div className="mt-2 space-y-1.5">
            {mealEntries.map((meal) => {
              const mealAt = new Date(meal.at);
              return (
                <div key={meal.evidenceId} className="flex items-center justify-between gap-3 rounded-lg bg-white/70 px-3 py-2">
                  <p className="text-sm font-semibold text-[var(--color-charcoal)]">{formatTime(mealAt, profileTimeZone)}</p>
                  <button
                    type="button"
                    onClick={(event) =>
                      openTimeDialog({
                        mode: "edit",
                        at: mealAt,
                        evidenceId: meal.evidenceId,
                        trigger: event.currentTarget,
                      })
                    }
                    className="text-sm font-semibold text-[var(--color-muted)] underline-offset-2 transition hover:text-[var(--color-charcoal)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)] focus-visible:ring-offset-2"
                  >
                    Change time
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </details>
    </div>
  );

  return <>{foodTimingEditor}        {timeDialogMode ? (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-2 sm:items-center sm:p-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="food-time-dialog-title"
              ref={dialogRef}
              className="w-full max-w-sm rounded-2xl border border-[var(--color-line)] bg-white p-4 shadow-xl sm:p-5"
            >
              <h2 id="food-time-dialog-title" className="text-lg font-semibold tracking-[-0.02em] text-[var(--color-charcoal)]">
                {timeDialogMode === "add" ? "Add a meal time" : "Change time"}
              </h2>
              <form
                className="mt-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  saveTimeDialog();
                }}
              >
                <p>Meal times use {profileTimeZone}. When clocks change, a repeated time uses the first occurrence and a skipped time moves forward.</p>
                <label>Meal date<input type="date" value={dialogDate} max={todayKey} onChange={e => setDialogDate(e.target.value)}/></label>
                <fieldset aria-label={timeDialogMode === "add" ? "Add a meal time" : "Change time"}>
                  <div className="flex flex-wrap items-end gap-2">
                    <div>
                      <label htmlFor="food-time-hour" className="block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                        Hour
                      </label>
                      <select
                        id="food-time-hour"
                        ref={dialogHourRef}
                        value={timeDialogHour}
                        onChange={(event) => setTimeDialogHour(event.target.value)}
                        className="mt-1 rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 text-sm text-[var(--color-charcoal)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)] focus-visible:ring-offset-2"
                      >
                        {Array.from({ length: 12 }, (_, index) => String(index + 1)).map((hour) => (
                          <option key={hour} value={hour}>{hour}</option>
                        ))}
                      </select>
                    </div>
                    <p className="pb-2 text-sm font-semibold text-[var(--color-muted)]">:</p>
                    <div>
                      <label htmlFor="food-time-minute" className="block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                        Minute
                      </label>
                      <select
                        id="food-time-minute"
                        value={timeDialogMinute}
                        onChange={(event) => setTimeDialogMinute(event.target.value)}
                        className="mt-1 rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 text-sm text-[var(--color-charcoal)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)] focus-visible:ring-offset-2"
                      >
                        {Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0")).map((minute) => (
                          <option key={minute} value={minute}>{minute}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="food-time-meridiem" className="block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                        AM / PM
                      </label>
                      <select
                        id="food-time-meridiem"
                        value={timeDialogMeridiem}
                        onChange={(event) => setTimeDialogMeridiem(event.target.value as "AM" | "PM")}
                        className="mt-1 rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 text-sm text-[var(--color-charcoal)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)] focus-visible:ring-offset-2"
                      >
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                    </div>
                  </div>
                </fieldset>

                {timeDialogError ? (
                  <p className="mt-2 text-sm text-[var(--color-error, #8f2c2c)]">{timeDialogError}</p>
                ) : null}

                {timeDialogMode === "edit" ? (
                  <div className="mt-3 border-t border-[var(--color-line)] pt-3">
                    {timeDialogDeleteConfirm ? (
                      <div>
                        <p className="text-sm text-[var(--color-muted)]">Remove this meal time?</p>
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            onClick={() => setTimeDialogDeleteConfirm(false)}
                            className="inline-flex min-h-10 flex-1 items-center justify-center rounded-full border border-[var(--color-line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-charcoal)] transition hover:border-[var(--color-charcoal)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)] focus-visible:ring-offset-2"
                          >
                            Keep
                          </button>
                          <button
                            type="button"
                            onClick={deleteMealFromDialog}
                            className="inline-flex min-h-10 flex-1 items-center justify-center rounded-full border border-[rgba(143,44,44,0.35)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-charcoal)] transition hover:border-[rgba(143,44,44,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)] focus-visible:ring-offset-2"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={deleteMealFromDialog}
                        className="text-sm font-semibold text-[var(--color-muted)] underline-offset-2 transition hover:text-[var(--color-charcoal)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)] focus-visible:ring-offset-2"
                      >
                        Remove time
                      </button>
                    )}
                  </div>
                ) : null}

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={closeTimeDialog}
                    className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-[var(--color-line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-charcoal)] transition hover:border-[var(--color-charcoal)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)] focus-visible:ring-offset-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-[var(--color-charcoal)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)] focus-visible:ring-offset-2"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
</>;
}
