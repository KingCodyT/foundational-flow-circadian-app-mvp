export function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-4">
      <p className="text-xs uppercase tracking-[0.34em] text-[var(--color-muted)]">
        {eyebrow}
      </p>
      <div className="space-y-3">
        <h1 className="max-w-3xl font-[family-name:var(--font-display)] text-4xl leading-tight md:text-5xl">
          {title}
        </h1>
        <p className="max-w-2xl text-base leading-7 text-[var(--color-muted)] md:text-lg">
          {description}
        </p>
      </div>
    </div>
  );
}
