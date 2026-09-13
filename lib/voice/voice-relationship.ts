import { CoachingState } from "@/lib/personalization/types";
import { NowCoachingDecision } from "@/lib/personalization/now-coaching";

export type VoiceMode = "SILENT" | "PASSIVE_CONTEXT" | "COACHING";

export type VoiceRelationshipOutput = {
  mode: VoiceMode;
  silent: boolean;
  headline: string | null;
  guidance: string | null;
  why: string | null;
  evidenceAction: string | null;
  perspective: string | null;
};

function evidenceActionForEvent(name?: string | null): string | null {
  if (!name) return null;
  if (name === "Last Meal") return "I’ve finished eating";
  if (name === "Morning Light") return "I’m outside";
  if (name === "Sunset") return "I’ve adjusted my light";
  if (name === "Dim the House") return "My environment is dim";
  if (name === "Digital Sunset") return "Screens are down";
  if (name === "Sleep Window") return "I’m winding down";
  return "I did this";
}

function passiveContextForEvent(eventId?: string | null): string | null {
  switch (eventId) {
    case "morning_light":
      return "Morning light is available now, one of the day’s strongest circadian timing signals.";
    case "first_meal":
      return "Your first-meal window is part of today’s biological rhythm.";
    case "midday_light":
      return "Daytime light is available now, reinforcing the contrast between day and night.";
    case "movement":
      return "This part of the day is one of your natural movement windows.";
    case "last_meal":
      return "Your biological day is moving toward its final meal window.";
    case "sunset":
      return "Sunset is part of the transition into a lower-light phase of the biological day.";
    case "dim_house":
      return "The evening light environment is shifting toward darkness.";
    case "digital_sunset":
      return "Your biological day is moving deeper into the evening.";
    case "sleep_window":
      return "Your planned sleep window is approaching.";
    default:
      return "A circadian transition is active right now.";
  }
}

export function buildVoiceRelationshipOutput(
  decision: NowCoachingDecision,
): VoiceRelationshipOutput {
  const candidate = decision.candidate;
  const event = decision.activeEvent;

  if (decision.shouldSurfacePassiveContext && event) {
    return {
      mode: "PASSIVE_CONTEXT",
      silent: false,
      headline: event.name,
      guidance: passiveContextForEvent(event.id),
      why: null,
      evidenceAction: null,
      perspective: null,
    };
  }

  // Voice never overrides upstream silence or invents a coaching moment.
  if (!decision.shouldSurfacePersonalizedGuidance || !event) {
    return {
      mode: "SILENT",
      silent: true,
      headline: null,
      guidance: null,
      why: null,
      evidenceAction: null,
      perspective: null,
    };
  }

  const coachingState = candidate.coachingState ?? null;
  const reconsidering = candidate.reconsideration?.shouldReconsider === true;
  const adaptedAction = candidate.adaptedAction ?? null;

  let headline = event.name;
  let guidance = adaptedAction ?? event.guidance;
  let perspective: string | null = null;

  if (coachingState === CoachingState.DEVELOPING) {
    headline = `Keep the ${event.name.toLowerCase()} signal steady.`;
  } else if (coachingState === CoachingState.NEEDS_ATTENTION) {
    headline = event.name;
  }

  if (adaptedAction) {
    // Constraint is not noncompliance. The approved fallback is authoritative.
    guidance = `${adaptedAction} The biological objective stays the same; this is the workable move right now.`;
  }

  if (reconsidering) {
    // Reconsideration opens the question; it does not claim confidence collapsed.
    perspective = "Something relevant in your context changed, so Foundational Flow is paying attention to this signal again.";
  }

  return {
    mode: "COACHING",
    silent: false,
    headline,
    guidance,
    why: event.why ?? null,
    evidenceAction: evidenceActionForEvent(event.name),
    perspective,
  };
}

export default buildVoiceRelationshipOutput;
