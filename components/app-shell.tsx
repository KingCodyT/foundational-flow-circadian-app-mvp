"use client";

import Link from "next/link";
import { useRouter } from "next/router";
import { ReactNode } from "react";

const navItems = [
  { href: "/", label: "Overview" },
  { href: "/audit", label: "Audit" },
  { href: "/results", label: "Results" },
  { href: "/protocol", label: "Protocol" },
  { href: "/rhythm", label: "Daily Rhythm" },
  { href: "/dashboard", label: "Dashboard" },
];

export function AppShell({
  children,
  eyebrow = "Foundational Flow",
}: {
  children: ReactNode;
  eyebrow?: string;
}) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[var(--color-cream)] text-[var(--color-charcoal)]">
      <div className="absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(circle_at_top,_rgba(179,145,80,0.16),_transparent_44%),linear-gradient(180deg,rgba(255,251,244,0.96),rgba(247,242,233,0.72))]" />
      <header className="mx-auto w-full max-w-7xl px-6 py-6 lg:px-10">
        <div className="flex items-center justify-between gap-6">
        <Link href="/" className="space-y-1">
          <p className="text-xs uppercase tracking-[0.34em] text-[var(--color-muted)]">
            {eyebrow}
          </p>
          <p className="font-[family-name:var(--font-display)] text-xl tracking-[0.08em]">
            Circadian App MVP
          </p>
        </Link>
        <nav className="hidden gap-2 rounded-full border border-[var(--color-line)] bg-white/70 p-2 shadow-[0_8px_30px_rgba(31,28,24,0.06)] backdrop-blur md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-full px-4 py-2 text-sm transition ${
                router.pathname === item.href
                  ? "bg-[var(--color-charcoal)] text-[var(--color-cream)]"
                  : "text-[var(--color-muted)] hover:bg-[var(--color-charcoal)] hover:text-[var(--color-cream)]"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        </div>
        <nav className="mt-5 flex gap-2 overflow-x-auto pb-1 md:hidden">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm transition ${
                router.pathname === item.href
                  ? "border-[var(--color-charcoal)] bg-[var(--color-charcoal)] text-[var(--color-cream)]"
                  : "border-[var(--color-line)] bg-white/72 text-[var(--color-muted)]"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-7xl px-6 pb-16 lg:px-10">{children}</main>
    </div>
  );
}
