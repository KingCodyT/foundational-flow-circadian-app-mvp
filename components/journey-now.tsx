import Link from "next/link";
import { useState, type ReactNode } from "react";
import { JourneyFrame, JourneyCard } from "./journey-design";
import type { DailyProfile } from "@/types/circadian";
import type { ContextualReminder } from "@/lib/personalization/contextual-reminders";
import type { VoiceRelationshipOutput } from "@/lib/voice/voice-relationship";
import { SIGNAL_REGISTRY } from "@/lib/personalization/signal-registry";

export function JourneyNow({ profile, now, voice, reminder, preview, respond, primarySignalId, primaryState, progress, firstRun, children }: {
  profile: DailyProfile | null; now: Date; voice: VoiceRelationshipOutput; reminder: ContextualReminder | null;
  preview: string | null;
  firstRun?: { heading: string; action: string; reason: string; focus: string; setup: ReactNode; summary: string };
  respond: (response: "completed" | "skipped" | "adjust", remindAt?: string) => void;
  primarySignalId: string | null; primaryState?: string | null; progress: string[]; children: ReactNode;
}) {
  const [adjusting, setAdjusting] = useState(false);
  const action = (firstRun || voice.mode === "COACHING") && reminder;
  const later = new Date(now.getTime() + 15 * 60000);
  return <JourneyFrame image={7}>
    <header className="journey-intro"><h1>Today</h1></header>
    <div className="journey-content">
      <JourneyCard><h2>Your current coaching focus</h2><h3>{firstRun?.focus || (primarySignalId ? SIGNAL_REGISTRY[primarySignalId]?.label : profile?.wakeTime && profile?.targetBedtime ? "Your saved sleep and wake schedule" : "Your daily rhythm")}</h3>{!firstRun && primaryState && <p>{primaryState.replaceAll("_", " ")}</p>}</JourneyCard>
      <JourneyCard className="journey-focus">
        <h2>{firstRun?.heading || "What matters now"}</h2>
        <h3>{firstRun?.action || (action ? reminder.action : "You’re set for now.")}</h3>
        <p>{firstRun?.reason || (action ? reminder.reason : "Your schedule is working in the background. We’ll bring you one useful step when the timing matters.")}</p>
        {firstRun?.setup}
        {!firstRun && !action && preview && <p>{preview}</p>}
        {action && <div role="group" aria-label="Reminder responses">
          <button className="journey-primary" onClick={() => { setAdjusting(false); respond("completed"); }}>Done</button>
          <button className="journey-outline" onClick={() => { setAdjusting(false); respond("skipped"); }}>Not today</button>
          <button className="journey-outline" onClick={() => setAdjusting(!adjusting)}>Adjust</button>
          {adjusting && <div><p>Choose what fits. Your saved schedule stays unchanged.</p>
            {reminder.end && later <= reminder.end && <button className="journey-outline" onClick={() => { setAdjusting(false); respond("adjust", later.toISOString()); }}>Remind me in 15 minutes</button>}
            <Link href="/profile#your-schedule">Change my schedule or preferences</Link>
          </div>}
        </div>}
      </JourneyCard>
      <JourneyCard><h2>Patterns over time</h2>{progress.length ? progress.slice(0, 2).map(line => <p key={line}>{line}</p>) : <p>{firstRun?.summary || "We’re still learning from your pattern across days."}</p>}</JourneyCard>
      {children}
    </div>
  </JourneyFrame>;
}
