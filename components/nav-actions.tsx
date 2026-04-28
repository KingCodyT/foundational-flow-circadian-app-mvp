import Link from "next/link";

export function NavActions({
  previousHref,
  nextHref,
  previousLabel = "Back",
  nextLabel = "Continue",
}: {
  previousHref?: string;
  nextHref?: string;
  previousLabel?: string;
  nextLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {previousHref ? (
        <Link
          href={previousHref}
          className="inline-flex items-center justify-center rounded-full border border-[var(--color-line)] px-5 py-3 text-sm font-medium text-[var(--color-charcoal)] transition hover:bg-white"
        >
          {previousLabel}
        </Link>
      ) : null}
      {nextHref ? (
        <Link
          href={nextHref}
          className="inline-flex items-center justify-center rounded-full bg-[var(--color-charcoal)] px-5 py-3 text-sm font-medium text-[var(--color-cream)] transition hover:bg-[var(--color-gold)] hover:text-[var(--color-charcoal)]"
        >
          {nextLabel}
        </Link>
      ) : null}
    </div>
  );
}
