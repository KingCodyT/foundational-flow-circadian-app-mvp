"use client";

import { useEffect, useState } from "react";
import { useCircadian } from "@/components/circadian-provider";

export default function ParticipationSelector() {
  const { participationLevel, setParticipationLevel } = useCircadian();
  const [selected, setSelected] = useState<string | null>(participationLevel ?? null);
  const [saved, setSaved] = useState<boolean>(false);

  useEffect(() => {
    setSelected(participationLevel ?? null);
    setSaved(participationLevel != null && selected === participationLevel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participationLevel]);

  useEffect(() => {
    setSaved(selected === participationLevel && participationLevel !== null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const handleSave = () => {
    setParticipationLevel(selected as any);
    setSaved(true);
  };

  return (
    <section className="space-y-4">
      <h3 className="text-lg font-semibold">Choose your participation level</h3>
      <p className="text-sm text-[var(--color-muted)]">Pick how actively you want Today's Flow to guide you.</p>

      <div className="space-y-3">
        <label className={`block rounded-lg border p-4 ${selected === "BASELINE" ? "border-[var(--color-charcoal)]" : "border-[var(--color-line)]"}`}>
          <input className="mr-3" type="radio" name="participation" value="BASELINE" checked={selected === "BASELINE"} onChange={() => setSelected("BASELINE")} />
          <strong>BASELINE</strong> — Just tell me where I stand.
        </label>

        <label className={`block rounded-lg border p-4 ${selected === "GUIDED_FLOW" ? "border-[var(--color-charcoal)]" : "border-[var(--color-line)]"}`}>
          <input className="mr-3" type="radio" name="participation" value="GUIDED_FLOW" checked={selected === "GUIDED_FLOW"} onChange={() => setSelected("GUIDED_FLOW")} />
          <strong>GUIDED FLOW</strong> — Help me improve this.
        </label>

        <label className={`block rounded-lg border p-4 ${selected === "FULL_FLOW" ? "border-[var(--color-charcoal)]" : "border-[var(--color-line)]"}`}>
          <input className="mr-3" type="radio" name="participation" value="FULL_FLOW" checked={selected === "FULL_FLOW"} onChange={() => setSelected("FULL_FLOW")} />
          <strong>FULL FLOW</strong> — Get in my business.
        </label>
      </div>

      <div className="flex gap-3">
        <button onClick={handleSave} className="inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm">
          {saved ? "Saved ✓" : "Save"}
        </button>
      </div>
    </section>
  );
}
