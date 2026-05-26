"use client";

import { AppShell } from "@/components/app-shell";
import { GuardedState } from "@/components/guarded-state";
import { NavActions } from "@/components/nav-actions";
import { ProtocolBlock } from "@/components/protocol-block";
import { SectionHeading } from "@/components/section-heading";
import { useCircadian } from "@/components/circadian-provider";

export default function ProtocolPage() {
  const { hasCompletedAudit, insight, isHydrated, protocol } = useCircadian();

  if (!isHydrated) {
    return (
      <AppShell>
        <div className="py-20 text-[var(--color-muted)]">Loading your protocol...</div>
      </AppShell>
    );
  }

  if (!hasCompletedAudit || !protocol || !insight) {
    return (
      <AppShell eyebrow="Protocol">
        <div className="py-10">
          <GuardedState
            title="A protocol appears after we identify your weakest signal."
            description="Complete the audit so the app can generate a daily rhythm plan tailored to the lowest scoring category."
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell eyebrow="Protocol">
      <section className="space-y-10 py-6 lg:py-10">
        <SectionHeading
          eyebrow={protocol.focusArea}
          title="Your daily protocol"
          description="This protocol is designed as a first operational pass. It focuses attention on the weakest signal first so the system has one clear place to stabilize."
        />
        <ProtocolBlock protocol={protocol} />
        <NavActions previousHref="/results" nextHref="/rhythm" nextLabel="Open daily rhythm" />
      </section>
    </AppShell>
  );
}
