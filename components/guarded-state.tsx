import Link from "next/link";

export function GuardedState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[2rem] border border-[var(--color-line)] bg-white/80 p-8 text-center shadow-[0_20px_60px_rgba(31,28,24,0.06)]">
      <div className="mx-auto max-w-xl space-y-4">
        <p className="text-xs uppercase tracking-[0.34em] text-[var(--color-muted)]">
          Audit needed
        </p>
        <h2 className="font-[family-name:var(--font-display)] text-3xl">{title}</h2>
        <p className="text-base leading-7 text-[var(--color-muted)]">{description}</p>
        <Link
          href="/audit"
          className="inline-flex items-center justify-center rounded-full bg-[var(--color-charcoal)] px-5 py-3 text-sm font-medium text-[var(--color-cream)] transition hover:bg-[var(--color-gold)] hover:text-[var(--color-charcoal)]"
        >
          Start the audit
        </Link>
      </div>
    </div>
  );
}
