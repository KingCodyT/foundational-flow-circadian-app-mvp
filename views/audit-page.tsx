"use client";

import { useRouter } from "next/router";
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { FlowShell } from "@/components/flow-shell";
import { ProgressBar } from "@/components/progress-bar";
import { useCircadian } from "@/components/circadian-provider";
import { getRuntimeTimeZone } from "@/lib/live-clock";
import type { DailyProfile } from "@/types/circadian";

const stages = ["Basics", "Schedule", "Environment", "Your Reality", "Finish"] as const;
type Stage = (typeof stages)[number];
type SetDraft = Dispatch<SetStateAction<DailyProfile>>;
type Choice = { value: string; label: string; detail: string };

const choices = {
  work: [["daytime", "Regular daytime", "A predictable daytime work window."], ["flexible", "Flexible", "The schedule moves, but I have meaningful control."], ["shift", "Shift work", "Early, late, or rotating shifts shape my week."], ["overnight", "Overnight", "Work regularly overlaps the biological night."]],
  travel: [["rarely", "Rarely", "Travel seldom changes my normal rhythm."], ["monthly", "Occasionally", "Travel changes my routine about once a month."], ["weekly", "Often", "Travel affects my rhythm most weeks."], ["frequent", "Constantly", "Changing locations or time zones is normal life."]],
  exercise: [["morning", "Morning", "Movement usually happens early in my day."], ["midday", "Midday", "Movement usually happens during daylight."], ["evening", "Evening", "Movement usually happens later in my day."], ["variable", "It varies", "There is no consistent exercise window."], ["none", "Not currently", "Exercise is not part of my current pattern."]],
  sleep: [["very_dark", "Very dark", "The room stays dark through the night."], ["mostly_dark", "Mostly dark", "Only minor light leaks are present."], ["some_light", "Some light", "Street light, devices, or ambient light are noticeable."], ["bright", "Bright", "The room never becomes properly dark."]],
} satisfies Record<string, [string, string, string][]>;

const asChoices = (items: [string, string, string][]): Choice[] => items.map(([value, label, detail]) => ({ value, label, detail }));
const copy: Record<Stage, [string, string, string]> = {
  Basics: ["Start with context", "Where your day happens.", "Time and place let Foundational Flow interpret your biology in the right context."],
  Schedule: ["Your daily anchors", "Give the day its shape.", "Typical timing matters more than a perfect schedule. Use the pattern that represents real life."],
  Environment: ["Light and darkness", "Describe the room where you recover.", "Your sleep environment changes what guidance is realistic and useful."],
  "Your Reality": ["Constraints are context", "Build around the life you actually live.", "Work, travel, and movement help us adapt without treating constraints as failure."],
  Finish: ["You’re all set", "Your starting profile is ready.", "This is the beginning of the model—not a permanent verdict. Foundational Flow will learn as your pattern changes."],
};
const emptyProfile = (): DailyProfile => ({ wakeTime: null, targetBedtime: null, timeZone: getRuntimeTimeZone(), locationPermissionGranted: false, lastMealTime: null, workStructure: null, travelFrequency: null, exercisePattern: null, sleepEnvironment: null });

export default function AuditPage() {
  const router = useRouter();
  const { completeAudit, dailyProfile, isHydrated, setAnswer, setDailyProfile, setParticipationLevel } = useCircadian();
  const [index, setIndex] = useState(0);
  const [validation, setValidation] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const [draft, setDraft] = useState<DailyProfile>(emptyProfile);

  useEffect(() => { if (isHydrated) setDraft({ ...emptyProfile(), ...dailyProfile, timeZone: dailyProfile?.timeZone ?? getRuntimeTimeZone() }); }, [dailyProfile, isHydrated]);
  useEffect(() => window.scrollTo({ top: 0, behavior: "auto" }), [index]);
  const stage = stages[index];
  const valid = useMemo(() => stage === "Basics" ? Boolean(draft.timeZone) : stage === "Schedule" ? Boolean(draft.wakeTime && draft.targetBedtime && draft.lastMealTime) : stage === "Environment" ? Boolean(draft.sleepEnvironment) : stage === "Your Reality" ? Boolean(draft.workStructure && draft.travelFrequency && draft.exercisePattern) : true, [draft, stage]);

  function useLocation() {
    if (!navigator.geolocation) return setLocationMessage("Location is unavailable. Your timezone will still be saved.");
    setLocationMessage("Requesting location…");
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      setDraft((current) => ({ ...current, locationPermissionGranted: true, latitude: coords.latitude, longitude: coords.longitude }));
      setLocationMessage("Location added. Sunrise, sunset, season, and latitude will be calculated automatically.");
    }, () => setLocationMessage("Location was not added. You can continue and add it later from YOU."), { timeout: 10000 });
  }

  function finish() {
    setDailyProfile(draft);
    setParticipationLevel("GUIDED_FLOW");
    const darkness = { very_dark: "blackout", mostly_dark: "mostly_dark", some_light: "some_light", bright: "bright_room" } as const;
    const schedule = { daytime: "stable", flexible: "mostly_stable", shift: "shift_or_irregular", overnight: "shift_or_irregular" } as const;
    if (draft.sleepEnvironment) setAnswer("bedroom_darkness", darkness[draft.sleepEnvironment]);
    if (draft.workStructure) setAnswer("travel_schedule_variability", schedule[draft.workStructure]);
    completeAudit();
    setIndex(4);
  }
  function next() { if (!valid) return setValidation(true); setValidation(false); stage === "Your Reality" ? finish() : setIndex((current) => current + 1); }
  if (!isHydrated) return <FlowShell><div className="py-20 text-[var(--color-muted)]">Loading your profile…</div></FlowShell>;
  const [eyebrow, title, description] = copy[stage];

  return <FlowShell><section className="mx-auto max-w-5xl py-6 lg:py-10"><div className="grid gap-10 lg:grid-cols-[0.36fr_0.64fr]">
    <aside className="lg:sticky lg:top-6 lg:self-start"><p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">{eyebrow}</p><h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl leading-[1.05] tracking-[-0.035em] sm:text-5xl">{title}</h1><p className="mt-5 text-lg leading-8 text-[var(--color-muted)]">{description}</p><div className="mt-8 rounded-[2rem] border border-[var(--color-line)] bg-white/70 p-6"><ProgressBar current={index + 1} total={stages.length} /><div className="mt-5 space-y-2">{stages.map((name, position) => <div key={name} className={`flex items-center justify-between rounded-2xl px-4 py-3 ${position === index ? "bg-[rgba(179,145,80,0.16)]" : "bg-[var(--color-cream)]/60"}`}><span className="text-sm font-medium">{name}</span><span className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">{position < index ? "Done" : position === index ? "Now" : "Next"}</span></div>)}</div></div></aside>
    <main className="rounded-[2rem] border border-[var(--color-line)] bg-white/75 p-6 shadow-[0_24px_60px_rgba(31,28,24,0.05)] sm:p-9"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">Step {index + 1} of {stages.length}</p>
      {stage === "Basics" && <Basics draft={draft} useLocation={useLocation} message={locationMessage} />}
      {stage === "Schedule" && <Schedule draft={draft} setDraft={setDraft} />}
      {stage === "Environment" && <ChoiceField title="How dark is your sleep environment?" description="Darkness and sleep are separate biological signals. This describes the environment, not whether you sleep well." value={draft.sleepEnvironment ?? ""} items={asChoices(choices.sleep)} onChange={(value) => setDraft((current) => ({ ...current, sleepEnvironment: value as DailyProfile["sleepEnvironment"] }))} />}
      {stage === "Your Reality" && <Reality draft={draft} setDraft={setDraft} />}
      {stage === "Finish" && <Finish draft={draft} edit={() => setIndex(0)} go={() => router.push("/now")} />}
      {validation && <div className="mt-6 rounded-2xl border border-[rgba(179,145,80,0.35)] bg-[rgba(179,145,80,0.12)] px-4 py-3 text-sm">Complete the fields on this step before continuing.</div>}
      {stage !== "Finish" && <div className="mt-8 flex justify-between gap-3"><button type="button" disabled={index === 0} onClick={() => setIndex((current) => Math.max(0, current - 1))} className="rounded-full border border-[var(--color-line)] px-5 py-3 text-sm font-semibold disabled:opacity-35">Back</button><button type="button" onClick={next} className="rounded-full bg-[var(--color-charcoal)] px-6 py-3 text-sm font-semibold text-[var(--color-cream)]">{stage === "Your Reality" ? "Build my profile" : "Continue"}</button></div>}
    </main>
  </div></section></FlowShell>;
}

function Basics({ draft, useLocation, message }: { draft: DailyProfile; useLocation: () => void; message: string }) { return <div className="mt-6 space-y-6"><div><h2 className="text-2xl font-semibold">Timezone</h2><p className="mt-2 leading-7 text-[var(--color-muted)]">Detected automatically so guidance follows your local biological day.</p><div className="mt-4 rounded-2xl bg-[var(--color-cream)] px-5 py-4 font-semibold">{draft.timeZone || "Detecting…"}</div></div><div className="border-t border-[var(--color-line)] pt-6"><h2 className="text-2xl font-semibold">Location</h2><p className="mt-2 leading-7 text-[var(--color-muted)]">Optional. It lets the app derive sunrise, sunset, day length, season, and latitude instead of asking you to estimate them.</p><button type="button" onClick={useLocation} className="mt-4 rounded-full border border-[var(--color-charcoal)] px-5 py-3 text-sm font-semibold">{draft.locationPermissionGranted ? "Update location" : "Use my location"}</button>{message && <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">{message}</p>}</div></div>; }

function Schedule({ draft, setDraft }: { draft: DailyProfile; setDraft: SetDraft }) { const fields = [["wakeTime", "Typical wake time", "When your day usually begins."], ["targetBedtime", "Target sleep time", "When you generally intend to be asleep."], ["lastMealTime", "Typical last meal", "When food usually ends for the day."]] as const; return <div className="mt-6 space-y-5">{fields.map(([key, label, detail]) => <label key={key} className="block rounded-2xl border border-[var(--color-line)] p-5"><span className="text-lg font-semibold">{label}</span><span className="mt-1 block text-sm text-[var(--color-muted)]">{detail}</span><input type="time" value={draft[key] ?? ""} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))} className="mt-4 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-cream)] px-4 py-3 text-lg" /></label>)}</div>; }

function Reality({ draft, setDraft }: { draft: DailyProfile; setDraft: SetDraft }) { return <div className="mt-6 space-y-8"><ChoiceField title="What best describes your work structure?" value={draft.workStructure ?? ""} items={asChoices(choices.work)} onChange={(value) => setDraft((current) => ({ ...current, workStructure: value as DailyProfile["workStructure"] }))} /><ChoiceField title="How often does travel disrupt your normal rhythm?" value={draft.travelFrequency ?? ""} items={asChoices(choices.travel)} onChange={(value) => setDraft((current) => ({ ...current, travelFrequency: value as DailyProfile["travelFrequency"] }))} /><ChoiceField title="When does exercise usually happen?" value={draft.exercisePattern ?? ""} items={asChoices(choices.exercise)} onChange={(value) => setDraft((current) => ({ ...current, exercisePattern: value as DailyProfile["exercisePattern"] }))} /></div>; }

function ChoiceField({ title, description, value, items, onChange }: { title: string; description?: string; value: string; items: Choice[]; onChange: (value: string) => void }) { return <fieldset className="mt-6"><legend className="text-2xl font-semibold">{title}</legend>{description && <p className="mt-2 leading-7 text-[var(--color-muted)]">{description}</p>}<div className="mt-5 grid gap-3">{items.map((item) => <label key={item.value} className={`cursor-pointer rounded-2xl border p-5 ${value === item.value ? "border-[var(--color-gold)] bg-[rgba(179,145,80,0.12)]" : "border-[var(--color-line)]"}`}><input className="sr-only" type="radio" name={title} checked={value === item.value} onChange={() => onChange(item.value)} /><span className="font-semibold">{item.label}</span><span className="mt-1 block text-sm leading-6 text-[var(--color-muted)]">{item.detail}</span></label>)}</div></fieldset>; }

function Finish({ draft, edit, go }: { draft: DailyProfile; edit: () => void; go: () => void }) { const label = (group: keyof typeof choices, value?: string | null) => asChoices(choices[group]).find((item) => item.value === value)?.label ?? "Not set"; const facts = [["Location / timezone", `${draft.timeZone}${draft.locationPermissionGranted ? " · Location on" : " · Location off"}`], ["Typical wake", draft.wakeTime], ["Target sleep", draft.targetBedtime], ["Last meal", draft.lastMealTime], ["Work structure", label("work", draft.workStructure)], ["Travel", label("travel", draft.travelFrequency)], ["Exercise", label("exercise", draft.exercisePattern)], ["Sleep environment", label("sleep", draft.sleepEnvironment)]]; return <div className="mt-6"><div className="rounded-3xl bg-[var(--color-cream)]/80 p-6"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">Your profile at a glance</p><div className="mt-6 grid gap-5 sm:grid-cols-2">{facts.map(([name, value]) => <div key={name}><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">{name}</p><p className="mt-1 font-semibold">{value || "Not set"}</p></div>)}</div><button type="button" onClick={edit} className="mt-6 text-sm font-semibold underline underline-offset-4">Edit details</button></div><div className="mt-6 border-t border-[var(--color-line)] pt-6"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">What happens next?</p><h2 className="mt-3 text-2xl font-semibold">Guidance begins on NOW.</h2><p className="mt-2 leading-7 text-[var(--color-muted)]">Foundational Flow will use this context to choose what matters, adapt around constraints, and avoid repeating what is already handled.</p><button type="button" onClick={go} className="mt-6 rounded-full bg-[var(--color-charcoal)] px-6 py-3 text-sm font-semibold text-[var(--color-cream)]">Go to NOW</button></div></div>; }
