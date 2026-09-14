import { FlowEvent } from "@/lib/flow-engine";
import { DerivedEnvironment } from "./derived-environment";
import { Day1PersonalizationResult } from "./day1";
import assembleInterventionCandidate, {
  InterventionCandidate,
} from "./intervention-candidate";
import { SignalReconsideration } from "./reconsideration";

const EVENT_SIGNAL_MAP: Record<string, string[]> = {
  morning_light: ["morning_light_timing", "morning_light_duration"],
  first_meal: ["meal_timing_regularity"],
  midday_light: ["day_brightness", "day_breaks_outside"],
  movement: ["morning_movement"],
  last_meal: ["meal_timing_regularity", "last_meal_timing"],
  sunset: ["evening_light_reduction"],
  dim_house: ["evening_light_reduction"],
  digital_sunset: ["evening_screen_exposure"],
  sleep_window: ["sleep_schedule"],
};

export type NowCoachingDecision = {
  candidate: InterventionCandidate;
  activeEvent: FlowEvent | null;
  activeEventSupportsTarget: boolean;
  shouldSurfacePersonalizedGuidance: boolean;
  shouldSurfacePassiveContext: boolean;
};

export function eventSupportsSignal(
  eventId?: string | null,
  signalId?: string | null,
): boolean {
  if (!eventId || !signalId) return false;
  return (EVENT_SIGNAL_MAP[eventId] ?? []).includes(signalId);
}

export function assembleNowCoachingDecision(opts: {
  day1: Day1PersonalizationResult;
  activeEvent?: FlowEvent | null;
  derivedEnvironment?: DerivedEnvironment | null;
  reconsideration?: Record<string, SignalReconsideration> | null;
  now?: Date | null;
}): NowCoachingDecision {
  const now = opts.now ?? new Date();
  const activeEvent = opts.activeEvent ?? null;
  const targetSignalId = opts.day1.primaryCoachingTarget?.signalId ?? null;
  const activeEventSupportsTarget = eventSupportsSignal(
    activeEvent?.id ?? null,
    targetSignalId,
  );

  const eventWindow = activeEventSupportsTarget && activeEvent
    ? {
        start: activeEvent.start.toISOString(),
        end: (activeEvent.end ?? activeEvent.start).toISOString(),
      }
    : null;

  const candidate = assembleInterventionCandidate({
    day1: opts.day1,
    derivedEnvironment: opts.derivedEnvironment ?? opts.day1.derivedEnvironment ?? null,
    reconsideration: opts.reconsideration ?? null,
    now,
    phase3aInput: {
      primary: opts.day1.primaryCoachingTarget ?? null,
      derivedEnvironment: opts.derivedEnvironment ?? opts.day1.derivedEnvironment ?? null,
      eventWindow,
      preferredAction: activeEventSupportsTarget ? activeEvent?.guidance ?? null : null,
      now,
    },
  });

  const shouldSurfacePersonalizedGuidance = Boolean(
    activeEvent &&
      activeEventSupportsTarget &&
      candidate.biologicallyRelevantNow &&
      candidate.actionableNow &&
      candidate.finalLevel >= 2 &&
      candidate.disposition !== "SILENT",
  );

  // Passive context is biological orientation, not coaching. An unrelated
  // active circadian event may be shown quietly without changing the selected
  // coaching target or borrowing the event's guidance as a recommendation.
  const shouldSurfacePassiveContext = Boolean(
    activeEvent &&
      !shouldSurfacePersonalizedGuidance &&
      (candidate.finalLevel === 1 || !activeEventSupportsTarget),
  );

  return {
    candidate,
    activeEvent,
    activeEventSupportsTarget,
    shouldSurfacePersonalizedGuidance,
    shouldSurfacePassiveContext,
  };
}

export default assembleNowCoachingDecision;
