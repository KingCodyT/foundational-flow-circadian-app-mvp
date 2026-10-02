import { FlowShell } from "@/components/flow-shell";
import { JourneyCard } from "@/components/journey-design";

export default function TimelinePage() {
  return <FlowShell>
    <header className="journey-intro"><h1>Timeline</h1><p>Your history, in one place.</p></header>
    <JourneyCard><h2>Your Timeline is coming</h2><p>This space will bring together your recorded activities and their context. Your existing meal history remains available in Profile.</p></JourneyCard>
  </FlowShell>;
}
