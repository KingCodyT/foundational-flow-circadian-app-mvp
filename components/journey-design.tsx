import Link from "next/link";
import { CodyFooter } from "./cody-discovery";
import { useRouter } from "next/router";
import type { CSSProperties, ReactNode } from "react";

export function RhythmIcon({ kind = "sun" }: { kind?: string }) {
  return <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === "food" ? <><circle cx="32" cy="32" r="15"/><path d="M7 9v17m7-17v17M7 19h7M10 26v29M54 9v46M54 9c-8 5-8 19 0 19"/></> : kind === "moon" ? <path d="M43 7A25 25 0 1 0 57 44 24 24 0 0 1 43 7Z" fill="currentColor" stroke="none" /> : kind === "check" ? <path d="m15 32 11 11 24-25" strokeWidth="8" /> : kind === "leaf" ? <><path d="M31 55C27 34 35 14 55 9c3 22-5 34-22 32M31 49C12 46 8 35 10 25c12 0 20 7 22 17" fill="currentColor" /><path d="m32 43 15-23" stroke="var(--journey-cream)" /></> : kind === "bed" ? <><path d="M9 15v39m46-30v30M9 42h46M27 25h19q9 0 9 9v8H27Z" fill="currentColor"/><circle cx="18" cy="30" r="6" fill="currentColor" /></> : kind === "person" ? <><circle cx="32" cy="17" r="10"/><path d="M12 51c0-22 40-22 40 0-3 9-37 9-40 0Z"/></> : kind === "bars" ? <><path d="M17 48V35m15 13V23m15 25V12" strokeWidth="5"/></> : kind === "pin" ? <><path d="M49 25c0 14-17 32-17 32S15 39 15 25a17 17 0 1 1 34 0Z"/><circle cx="32" cy="24" r="6"/></> : kind === "clock" ? <><circle cx="32" cy="32" r="24"/><path d="M32 16v17l12 8"/></> : <><circle cx="32" cy="31" r="13" fill="currentColor"/><path d="M32 3v8M32 51v8M4 31h8m40 0h8M12 11l6 6m28 28 6 6M12 51l6-6m28-28 6-6"/>{kind === "sunset" && <path d="M5 48h54M18 55h28"/>}</>}
  </svg>;
}
export function JourneyBrand() {
  return <div className="journey-brand"><Link href="/today" aria-label="Foundational Flow home" className="journey-wordmark"><svg viewBox="0 0 100 80" aria-hidden="true"><circle cx="50" cy="39" r="35" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M1 44h98M27 50h46M33 56h34M41 62h18" stroke="currentColor" strokeWidth="2"/><path d="M38 43a12 12 0 0 1 24 0" fill="currentColor"/></svg><span>FOUNDATIONAL FLOW<small>CIRCADIAN APP</small></span></Link><p>NATURAL RHYTHMS<br/>BRIGHTER DAYS<br/>A HEALTHIER YOU</p></div>;
}
export function JourneyFrame({ children, image = 1, night = false, onboarding = false }: { children: ReactNode; image?: number; night?: boolean; onboarding?: boolean }) {
  return <div className={`journey ${night ? "journey-night" : ""} ${onboarding ? "journey-onboarding" : ""}`} style={{"--journey-image": `url('/approved-journey/landscape-${image}.png')`} as CSSProperties}><div className="journey-landscape"/><div className="journey-inner"><JourneyBrand/>{children}<CodyFooter/></div>{!onboarding && <JourneyNav/>}</div>;
}
const destinations = [
  { href: "/today", label: "Today", icon: "sun" },
  { href: "/food", label: "Food", icon: "food" },
  { href: "/timeline", label: "Timeline", icon: "clock" },
  { href: "/profile", label: "Profile", icon: "person" },
] as const;
export function JourneyNav() {
  const { pathname } = useRouter();
  return <nav className="journey-nav" aria-label="Primary navigation">
    {destinations.map(({ href, label, icon }) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}>
      <RhythmIcon kind={icon}/><span>{label}</span>
    </Link>)}
  </nav>;
}
export function JourneyCard({ children, className = "" }: { children: ReactNode; className?: string }) { return <section className={`journey-card ${className}`}>{children}</section>; }
export function Segments({ label, value, options, onChange }: { label: string; value?: string | null; options: readonly (readonly [string,string])[]; onChange: (value: string) => void }) { return <fieldset className="journey-field"><legend>{label}</legend><div className="journey-segments">{options.map(([key,text]) => <label key={key} className={value === key ? "selected" : ""}><input type="radio" name={label} value={key} checked={value === key} onChange={() => onChange(key)}/><span>{text}</span></label>)}</div></fieldset>; }
