import { ProtocolPlan } from "@/types/circadian";

export function ProtocolBlock({ protocol }: { protocol: ProtocolPlan }) {
  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-[var(--color-line)] bg-white/75 p-6">
        <p className="text-xs uppercase tracking-[0.34em] text-[var(--color-muted)]">
          Daily protocol
        </p>
        <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl leading-tight">
          {protocol.headline}
        </h2>
        <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--color-muted)]">
          {protocol.rationale}
        </p>
        <div className="mt-6 inline-flex rounded-full border border-[var(--color-line)] bg-[var(--color-cream)]/75 px-4 py-2 text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
          Primary focus: {protocol.focusArea}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {protocol.steps.map((step) => (
          <article
            key={step.title}
            className="rounded-[2rem] border border-[var(--color-line)] bg-[var(--color-cream)]/70 p-5"
          >
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-muted)]">
              {step.window}
            </p>
            <h3 className="mt-3 text-xl font-medium">{step.title}</h3>
            <div className="mt-4 space-y-3">
              {step.actions.map((action) => (
                <div key={action} className="flex items-start gap-3">
                  <span className="mt-2 h-2 w-2 rounded-full bg-[var(--color-gold)]" />
                  <p className="text-sm leading-6 text-[var(--color-muted)]">{action}</p>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="rounded-[2rem] border border-[var(--color-line)] bg-[var(--color-charcoal)] px-6 py-5 text-[var(--color-cream)]">
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-gold-soft)]">
          Implementation notes
        </p>
        <div className="mt-4 grid gap-3">
          {protocol.supportNotes.map((note) => (
            <p key={note} className="text-sm leading-6 text-[rgba(248,244,236,0.82)]">
              {note}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
