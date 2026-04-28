export function ScoreCard({
  label,
  value,
  description,
  highlight = false,
}: {
  label: string;
  value: number;
  description: string;
  highlight?: boolean;
}) {
  return (
    <article
      className={`rounded-[2rem] border p-5 shadow-[0_16px_36px_rgba(31,28,24,0.05)] ${
        highlight
          ? "border-[var(--color-gold)] bg-[rgba(179,145,80,0.12)]"
          : "border-[var(--color-line)] bg-white/80"
      }`}
    >
      <div className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <p className="text-sm uppercase tracking-[0.24em] text-[var(--color-muted)]">
            {label}
          </p>
          <p className="font-[family-name:var(--font-display)] text-3xl">
            {value}
          </p>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[var(--color-taupe)]/55">
          <div
            className={`h-full rounded-full ${
              highlight ? "bg-[var(--color-gold)]" : "bg-[var(--color-charcoal)]"
            }`}
            style={{ width: `${Math.max(8, Math.min(100, value))}%` }}
          />
        </div>
        <p className="text-sm leading-6 text-[var(--color-muted)]">{description}</p>
      </div>
    </article>
  );
}
