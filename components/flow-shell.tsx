"use client";

import Link from "next/link";
import { useRouter } from "next/router";
import { ReactNode } from "react";

const navItems = [
  { href: "/now", label: "NOW" },
  { href: "/rhythm", label: "RHYTHM" },
  { href: "/you", label: "YOU" },
];

export function FlowShell({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[var(--color-cream)] text-[var(--color-charcoal)]">
      <header className="mx-auto w-full max-w-7xl px-6 pt-6 lg:px-10">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center sm:gap-6">
          <Link href="/now" className="space-y-1">
            <p className="text-xs uppercase tracking-[0.34em] text-[var(--color-muted)]">
              Foundational Flow
            </p>
            <p className="font-[family-name:var(--font-display)] text-xl tracking-[-0.02em]">
              Live in Rhythm
            </p>
          </Link>

          <nav
            className="flex items-center gap-1 rounded-full border border-[var(--color-line)] bg-white/70 p-1"
            aria-label="Primary navigation"
          >
            {navItems.map((item) => {
              const active = router.pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-4 py-2 text-xs font-semibold tracking-[0.12em] transition ${
                    active
                      ? "bg-[var(--color-charcoal)] text-[var(--color-cream)]"
                      : "text-[var(--color-muted)] hover:text-[var(--color-charcoal)]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-6 pb-16 pt-8 lg:px-10">
        {children}
      </main>
    </div>
  );
}