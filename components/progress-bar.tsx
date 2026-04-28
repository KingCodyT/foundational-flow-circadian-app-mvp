export function ProgressBar({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  const percentage = Math.round((current / total) * 100);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-[var(--color-muted)]">
        <span>
          Section {current} of {total}
        </span>
        <span>{percentage}% complete</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--color-taupe)]/50">
        <div
          className="h-full rounded-full bg-[var(--color-gold)] transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
