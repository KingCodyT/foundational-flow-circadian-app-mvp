export function ProgressSparkline({
  values,
  stroke = "var(--color-gold)",
}: {
  values: number[];
  stroke?: string;
}) {
  if (values.length === 0) {
    return (
      <div className="flex h-28 items-center justify-center rounded-[1.5rem] border border-dashed border-[var(--color-line)] bg-white/55 text-sm text-[var(--color-muted)]">
        No trend yet
      </div>
    );
  }

  if (values.length === 1) {
    return (
      <div className="rounded-[1.5rem] border border-[var(--color-line)] bg-white/70 px-4 py-6">
        <p className="text-sm text-[var(--color-muted)]">
          One completed audit saved. Add another check-in to unlock the trend view.
        </p>
      </div>
    );
  }

  const width = 360;
  const height = 140;
  const padding = 14;
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;

  const points = values
    .map((value, index) => {
      const x =
        padding + (index * (width - padding * 2)) / Math.max(values.length - 1, 1);
      const y =
        height - padding - ((value - minValue) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const finalPoint = points.split(" ").at(-1)?.split(",") ?? ["0", "0"];

  return (
    <div className="rounded-[1.75rem] border border-[var(--color-line)] bg-white/78 p-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-32 w-full" role="img">
        <title>Overall circadian score trend</title>
        <defs>
          <linearGradient id="circadianTrendFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(179,145,80,0.22)" />
            <stop offset="100%" stopColor="rgba(179,145,80,0.02)" />
          </linearGradient>
        </defs>
        <polygon
          fill="url(#circadianTrendFill)"
          points={`${points} ${width - padding},${height - padding} ${padding},${height - padding}`}
        />
        <polyline
          fill="none"
          points={points}
          stroke={stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="4"
        />
        <circle
          cx={Number(finalPoint[0])}
          cy={Number(finalPoint[1])}
          fill="var(--color-charcoal)"
          r="5"
        />
      </svg>
      <div className="mt-2 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-[var(--color-muted)]">
        <span>Earlier audits</span>
        <span>Latest audit</span>
      </div>
    </div>
  );
}
