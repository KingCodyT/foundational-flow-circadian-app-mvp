"use client";

import Link from "next/link";
import { useMemo } from "react";
import { FlowShell } from "@/components/flow-shell";
import { useCircadian } from "@/components/circadian-provider";
import { buildDerivedEnvironment } from "@/lib/personalization/derived-environment";
import { buildInitialPersonalizationState } from "@/lib/personalization/initial-state";
import { assignInitialConfidence } from "@/lib/personalization/initial-confidence";
import {
  applyDailyEvidence,
  summarizeDailyEvidence,
} from "@/lib/personalization/daily-evidence";
import { selectPrimaryCoachingTarget } from "@/lib/personalization/primary-target";
import { SIGNAL_REGISTRY } from "@/lib/personalization/signal-registry";
import {
  CoachingState,
  HierarchyLayer,
  SignalClassification,
} from "@/lib/personalization/types";

function formatProfileTime(value?: string | null) {
  if (!value) return "Not set";
  const [hour, minute] = value.split(":").map(Number);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatSolarTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDayLength(minutes?: number | null) {
  if (minutes == null) return "—";
  const roundedMinutes = Math.round(minutes);
  const hours = Math.floor(roundedMinutes / 60);
  const remainder = roundedMinutes % 60;
  return `${hours}h ${remainder}m`;
}

function coachingLabel(state?: CoachingState) {
  if (state === CoachingState.NEEDS_ATTENTION) return "Needs Attention";
  if (state === CoachingState.DEVELOPING) return "Developing";
  if (state === CoachingState.ESTABLISHED) return "Established";
  if (state === CoachingState.DISRUPTED) return "Disrupted";
  return "Still Learning";
}

function participationLabel(value?: string | null) {
  if (value === "BASELINE") return "Baseline";
  if (value === "GUIDED_FLOW") return "Guided Flow";
  if (value === "FULL_FLOW") return "Full Flow";
  return "Not set";
}

function hierarchyExplanation(layer?: HierarchyLayer | null) {
  if (layer === HierarchyLayer.MORNING_LIGHT_CIRCADIAN_ANCHOR)
    return "This is the strongest upstream signal currently asking for attention, so Foundational Flow is prioritizing your circadian anchor first.";
  if (layer === HierarchyLayer.DAYTIME_LIGHT_ENVIRONMENT)
    return "Your morning anchor is not the loudest problem right now, so the next useful leverage point is strengthening daytime light.";
  if (layer === HierarchyLayer.EVENING_LIGHT_DARKNESS)
    return "Your current leverage point is the transition from daytime light into biological night.";
  if (layer === HierarchyLayer.SLEEP_OPPORTUNITY_TIMING)
    return "The strongest current signal is the timing and consistency of your sleep opportunity.";
  if (layer === HierarchyLayer.MEAL_TIMING)
    return "The stronger upstream signals are sufficiently supported, making meal timing the most useful current target.";
  if (layer === HierarchyLayer.OPTIMIZATION)
    return "The major foundations are relatively supported, so the app can work on a smaller optimization layer.";
  return "Foundational Flow is still gathering enough evidence to choose a useful primary target.";
}

function confidenceLabel(score?: number | null) {
  if (score == null) return null;
  if (score >= 0.8) return "High confidence";
  if (score >= 0.5) return "Moderate confidence";
  return "Early signal";
}

export default function YouPage() {
  const {
    answers,
    dailyProfile,
    participationLevel,
    isHydrated,
    hasCompletedAudit,
    eventStateByDate,
  } = useCircadian();

  const environment = useMemo(
    () => buildDerivedEnvironment({ profile: dailyProfile }),
    [dailyProfile]
  );

  const personalization = useMemo(() => {
    const initial = buildInitialPersonalizationState({
      answers,
      derivedEnvironment: environment,
    });
    const withConfidence = assignInitialConfidence(initial);
    return applyDailyEvidence(withConfidence, eventStateByDate);
  }, [answers, environment, eventStateByDate]);

  const dailyEvidence = useMemo(
    () => summarizeDailyEvidence(eventStateByDate),
    [eventStateByDate]
  );

  const primaryTarget = useMemo(
    () => selectPrimaryCoachingTarget(personalization),
    [personalization]
  );

  const behavioralSignals = useMemo(
    () =>
      Object.entries(personalization.perSignal)
        .filter(([id, signal]) => {
          const definition = SIGNAL_REGISTRY[id];
          return definition?.classification === SignalClassification.BEHAVIOR && Boolean(signal.coachingState);
        })
        .map(([id, signal]) => ({
          id,
          label: SIGNAL_REGISTRY[id]?.label ?? id,
          state: signal.coachingState,
        })),
    [personalization]
  );

  const groupedSignals = {
    needsAttention: behavioralSignals.filter((signal) => signal.state === CoachingState.NEEDS_ATTENTION),
    developing: behavioralSignals.filter((signal) => signal.state === CoachingState.DEVELOPING),
    established: behavioralSignals.filter((signal) => signal.state === CoachingState.ESTABLISHED),
  };

  const targetSignal = primaryTarget.signalId ? personalization.perSignal[primaryTarget.signalId] : null;
  const targetDefinition = primaryTarget.signalId ? SIGNAL_REGISTRY[primaryTarget.signalId] : null;
  const targetConfidence = confidenceLabel(targetSignal?.confidence?.score);
  const targetDailyEvidence = primaryTarget.signalId
    ? dailyEvidence[primaryTarget.signalId]
    : null;

  if (!isHydrated) {
    return (
      <FlowShell>
        <section className="mx-auto max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">YOU</p>
          <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl tracking-[-0.03em] sm:text-5xl">Learning your rhythm...</h1>
        </section>
      </FlowShell>
    );
  }

  return (
    <FlowShell>
      <section className="mx-auto max-w-4xl">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">YOU</p>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl tracking-[-0.03em] sm:text-5xl">What your biology is telling us.</h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-[var(--color-muted)]">Foundational Flow learns your patterns so it can coach what matters, adapt when life changes, and get quieter when a signal is handled.</p>

        <div className="mt-10 rounded-3xl border border-[var(--color-line)] bg-white/70 p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">What I Understand About You</p>
          <div className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            <ProfileFact label="Wake time" value={formatProfileTime(dailyProfile?.wakeTime)} />
            <ProfileFact label="Sleep window" value={formatProfileTime(dailyProfile?.targetBedtime)} />
            <ProfileFact label="Guidance level" value={participationLabel(participationLevel)} />
            <ProfileFact label="Sunrise" value={formatSolarTime(environment.sunrise)} />
            <ProfileFact label="Sunset" value={formatSolarTime(environment.sunset)} />
            <ProfileFact label="Day length" value={formatDayLength(environment.dayLengthMinutes)} />
          </div>
          <p className="mt-6 border-t border-[var(--color-line)] pt-5 text-sm leading-6 text-[var(--color-muted)]">
            {environment.locationAvailable
              ? environment.dayLengthMinutes === 1440
                ? "Your location has continuous daylight today; there is no sunrise or sunset."
                : environment.dayLengthMinutes === 0
                ? "At your location, the sun stays below the horizon today."
                : "Location is available, so today’s solar timing can adapt to where you are."
              : "Location is not available yet, so solar timing is less personalized."}
          </p>
        </div>

        <div className="mt-6 rounded-3xl border border-[var(--color-line)] bg-white/70 p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">What We’re Working On</p>
          {hasCompletedAudit && targetDefinition && primaryTarget.signalId ? (
            <>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <h2 className="text-3xl font-semibold tracking-[-0.02em]">{targetDefinition.label}</h2>
                <span className="rounded-full border border-[var(--color-gold)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em]">{coachingLabel(primaryTarget.coachingState)}</span>
              </div>
              <p className="mt-4 max-w-2xl leading-7 text-[var(--color-muted)]">{hierarchyExplanation(primaryTarget.hierarchy)}</p>
              <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-[var(--color-charcoal)]">
                {targetConfidence ? <p>{targetConfidence}</p> : null}
                {targetDailyEvidence?.completedDays ? (
                  <p>
                    {targetDailyEvidence.completedDays} daily confirmation{targetDailyEvidence.completedDays === 1 ? "" : "s"}
                  </p>
                ) : null}
              </div>
            </>
          ) : hasCompletedAudit ? (
            <>
              <h2 className="mt-4 text-2xl font-semibold">No active correction is demanding attention.</h2>
              <p className="mt-3 max-w-2xl leading-7 text-[var(--color-muted)]">That does not mean the system is finished learning. It means there is not enough reason to interrupt you with a primary target right now.</p>
            </>
          ) : (
            <>
              <h2 className="mt-4 text-2xl font-semibold">Complete your starting assessment.</h2>
              <p className="mt-3 max-w-2xl leading-7 text-[var(--color-muted)]">Give Foundational Flow its first behavioral signal. From there, it can choose what matters most instead of guessing.</p>
              <Link href="/audit" className="mt-6 inline-flex items-center justify-center rounded-full bg-[var(--color-charcoal)] px-5 py-3 text-sm font-semibold text-[var(--color-cream)] transition hover:bg-[var(--color-gold)] hover:text-[var(--color-charcoal)]">Start assessment</Link>
            </>
          )}
        </div>

        <div className="mt-6 rounded-3xl border border-[var(--color-line)] bg-white/60 p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">Your Foundations</p>
          <h2 className="mt-3 text-2xl font-semibold">What still needs coaching — and what can stay quiet.</h2>
          {behavioralSignals.length > 0 ? (
            <div className="mt-7 grid gap-4 lg:grid-cols-3">
              <FoundationGroup title="Needs Attention" description="Worth actively coaching now." signals={groupedSignals.needsAttention} />
              <FoundationGroup title="Developing" description="Improving. Coaching can begin to back off." signals={groupedSignals.developing} />
              <FoundationGroup title="Established" description="Supported enough to mostly stay in the background." signals={groupedSignals.established} />
            </div>
          ) : (
            <p className="mt-6 max-w-2xl leading-7 text-[var(--color-muted)]">
              Your foundation map will appear here as Foundational Flow gathers enough evidence to understand your patterns.
            </p>
          )}
        </div>
      </section>
    </FlowShell>
  );
}

function ProfileFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}

function FoundationGroup({ title, description, signals }: { title: string; description: string; signals: { id: string; label: string; state?: CoachingState }[] }) {
  return (
    <div className="rounded-2xl border border-[var(--color-line)] bg-white/70 p-5">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-sm leading-6 text-[var(--color-muted)]">{description}</p>
      <div className="mt-5 space-y-3">
        {signals.length > 0 ? signals.map((signal) => (
          <div key={signal.id} className="border-t border-[var(--color-line)] pt-3 first:border-t-0 first:pt-0">
            <p className="text-sm font-medium leading-6">{signal.label}</p>
          </div>
        )) : <p className="text-sm text-[var(--color-muted)]">Nothing here right now.</p>}
      </div>
    </div>
  );
}
