"use client";

import { FormEvent, useEffect, useState } from "react";
import { useCircadian } from "@/components/circadian-provider";
import type { ParticipationLevel } from "@/types/circadian";

const options: { value: ParticipationLevel; label: string; description: string }[] = [
  { value: "BASELINE", label: "Baseline", description: "I prefer the essentials." },
  { value: "GUIDED_FLOW", label: "Guided Flow", description: "I welcome more guidance." },
  { value: "FULL_FLOW", label: "Full Flow", description: "I prefer a more involved experience." },
];

export default function ParticipationSelector() {
  const { participationLevel, setParticipationLevel } = useCircadian();
  const [selected, setSelected] = useState<ParticipationLevel | null>(participationLevel);
  useEffect(() => setSelected(participationLevel), [participationLevel]);
  const saved = selected !== null && selected === participationLevel;

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (selected) setParticipationLevel(selected);
  };

  return (
    <form onSubmit={save} className="space-y-5">
      <fieldset className="space-y-3">
        <legend className="mb-3 text-lg font-semibold">Participation level</legend>
        <p className="text-sm leading-6 text-[var(--color-muted)]">Save how much guidance you prefer. For now, your daily rhythm stays the same at every level.</p>
        {options.map((option) => (
          <label key={option.value} className={`block cursor-pointer rounded-2xl border bg-white/60 p-4 ${selected === option.value ? "border-[var(--color-gold)]" : "border-[var(--color-line)]"}`}>
            <input required className="mr-3" type="radio" name="participation" value={option.value} checked={selected === option.value} onChange={() => setSelected(option.value)} />
            <span className="font-semibold">{option.label}</span>
            <span className="mt-1 block pl-6 text-sm text-[var(--color-muted)]">{option.description}</span>
          </label>
        ))}
      </fieldset>
      <button type="submit" disabled={!selected || saved} className="rounded-full border border-[var(--color-line)] bg-white px-5 py-2.5 text-sm font-semibold disabled:opacity-60">{saved ? "Preference saved ✓" : "Save preference"}</button>
    </form>
  );
}
