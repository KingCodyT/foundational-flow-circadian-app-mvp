import { AnswerMap, CircadianInsight, CircadianScores, ProtocolPlan } from "@/types/circadian";

type ProtocolTemplate = {
  headline: string;
  rationale: string;
  focusArea: string;
  steps: ProtocolPlan["steps"];
};

const protocolTemplates: Record<string, ProtocolTemplate> = {
  morningSignalScore: {
    headline: "Front-load the day with a decisive morning anchor.",
    rationale:
      "The earliest light timing is not yet strong enough to anchor the biological day reliably.",
    focusArea: "Morning signal",
    steps: [
      {
        window: "Within 15 minutes of waking",
        title: "Get bright light fast",
        actions: [
          "Step outside as soon as possible, even if only for a short walk.",
          "Keep your eyes in natural daylight rather than starting the day under indoor light alone.",
        ],
      },
      {
        window: "First 60 minutes",
        title: "Stack movement onto light",
        actions: [
          "Pair the light exposure with an easy walk, mobility, or errands on foot.",
          "Delay deep desk work until after the light window when possible.",
        ],
      },
      {
        window: "Mid-morning",
        title: "Protect the anchor",
        actions: [
          "Avoid drifting back into a dark environment for long stretches.",
          "Keep caffeine aligned with the same wake window instead of sliding later each day.",
        ],
      },
    ],
  },
  daylightStrengthScore: {
    headline: "Increase the amplitude of your daytime signal.",
    rationale:
      "The daytime environment appears too dim or too indoor-heavy to create a strong contrast between day and night.",
    focusArea: "Daytime environment",
    steps: [
      {
        window: "Morning work block",
        title: "Brighten the workspace",
        actions: [
          "Work near windows whenever possible and prioritize naturally bright spaces.",
          "Create a rule that at least one focus block happens in a high-light environment.",
        ],
      },
      {
        window: "Midday",
        title: "Take a daylight pulse",
        actions: [
          "Schedule a 10 to 20 minute outdoor break around the middle of the day.",
          "Use meals, calls, or walking meetings to get daylight without adding complexity.",
        ],
      },
      {
        window: "Afternoon",
        title: "Sustain alertness without overstimulation",
        actions: [
          "Use posture, light movement, and outdoor resets before reaching for extra stimulation.",
          "Keep the day active enough that evening can feel distinctly quieter.",
        ],
      },
    ],
  },
  darknessScore: {
    headline: "Create a genuine descent into darkness each evening.",
    rationale:
      "The evening environment is likely too bright or too screen-heavy to support a strong night signal.",
    focusArea: "Evening darkness",
    steps: [
      {
        window: "2 to 3 hours before bed",
        title: "Dim the environment on purpose",
        actions: [
          "Lower overhead lighting and shift to warm, localized lamps.",
          "Make the room feel noticeably different from daytime rather than only slightly softer.",
        ],
      },
      {
        window: "Final 90 minutes",
        title: "Reduce screen intensity",
        actions: [
          "Shorten high-brightness phone and laptop use in the last stretch before bed.",
          "Move to low-input activities that do not keep the visual system activated.",
        ],
      },
      {
        window: "Sleep window",
        title: "Protect bedroom darkness",
        actions: [
          "Limit device light, hallway spill, and street light leaks into the room.",
          "Aim for a bedroom that reads as unmistakably dark once you are in bed.",
        ],
      },
    ],
  },
  sleepOutputScore: {
    headline: "Stabilize the timing of the sleep window itself.",
    rationale:
      "Sleep output appears constrained by timing inconsistency or insufficient recovery opportunity.",
    focusArea: "Sleep timing",
    steps: [
      {
        window: "Daily schedule",
        title: "Choose a stable wake anchor",
        actions: [
          "Keep wake time within a narrow band across the week.",
          "Let bedtime become the variable that adapts to protect total sleep opportunity.",
        ],
      },
      {
        window: "Late evening",
        title: "Build a repeatable pre-sleep runway",
        actions: [
          "Use the same 30 to 60 minute wind-down sequence most nights.",
          "Reduce decision-making and stimulation as you approach the sleep window.",
        ],
      },
      {
        window: "Next morning",
        title: "Reinforce the cycle",
        actions: [
          "Get morning light even after a rough night so the schedule does not drift.",
          "Avoid sleeping in so long that the next night becomes harder to initiate.",
        ],
      },
    ],
  },
  disruptionLoadScore: {
    headline: "Reduce the noise that keeps the system from trusting the rhythm.",
    rationale:
      "Baseline signals may be present, but recurring disruptions are likely cancelling part of their benefit.",
    focusArea: "Disruption load",
    steps: [
      {
        window: "Weekly planning",
        title: "Reduce schedule volatility",
        actions: [
          "Identify the one or two recurring disruptions most often pushing your rhythm off course.",
          "Stabilize wake time first, even if other parts of the day remain imperfect.",
        ],
      },
      {
        window: "Evening intake",
        title: "Tighten late inputs",
        actions: [
          "Pull meals, alcohol, and stimulants earlier when possible.",
          "Give your body a clearer transition from feeding and activation into recovery.",
        ],
      },
      {
        window: "Before bed",
        title: "Lower nervous system load",
        actions: [
          "Create a brief shutdown ritual to reduce cognitive carryover into bed.",
          "Aim for a calmer final hour rather than trying to fix sleep only once you are already in bed.",
        ],
      },
    ],
  },
};

function replaceStep(
  steps: ProtocolPlan["steps"],
  window: string,
  nextStep: ProtocolPlan["steps"][number],
) {
  return steps.map((step) => (step.window === window ? nextStep : step));
}

export function generateProtocol(
  scores: CircadianScores,
  insight: CircadianInsight,
  answers: AnswerMap,
): ProtocolPlan {
  const template = protocolTemplates[insight.primaryBrokenSignal.key];
  const supportNotes = [...insight.contextualNotes];
  let steps = [...template.steps];
  let rationale = template.rationale;

  if (scores.locationSeasonScore < 50) {
    supportNotes.push(
      "Because your location or season score is low, use structure and environment design rather than waiting for conditions to become naturally ideal.",
    );
  }

  if (
    answers.travel_schedule_variability === "often" ||
    answers.travel_schedule_variability === "very_often"
  ) {
    supportNotes.push(
      "High schedule volatility means consistency matters more than intensity. Protect anchors first.",
    );
  }

  if (answers.evening_screen_exposure === "low" || answers.evening_light_reduction === "very_bright") {
    supportNotes.push(
      "Even if evening light is not your lowest score, reducing late visual activation will support almost every protocol pathway.",
    );
  }

  if (insight.primaryBrokenSignal.key === "morningSignalScore") {
    if (answers.morning_light_timing === "rarely" || answers.morning_light_timing === "later") {
      rationale =
        "The main issue is not simply weak mornings, but mornings that begin too late or too far indoors to set circadian phase confidently.";
    }

    if (answers.morning_light_duration === "under_5" || answers.morning_light_duration === "5_15") {
      steps = replaceStep(steps, "First 60 minutes", {
        window: "First 60 minutes",
        title: "Extend exposure long enough to matter",
        actions: [
          "Treat brief doorstep light as the start, not the full intervention.",
          "Aim for a longer outdoor window on waking, especially in darker seasons or on overcast days.",
        ],
      });
    }
  }

  if (insight.primaryBrokenSignal.key === "daylightStrengthScore") {
    if (answers.day_brightness === "dim_indoor" || answers.day_brightness === "very_dim") {
      rationale =
        "The body is probably spending too much of the day in lighting conditions that remain biologically subdued.";
    }

    if (answers.day_breaks_outside === "almost_never" || answers.day_breaks_outside === "occasional") {
      steps = replaceStep(steps, "Midday", {
        window: "Midday",
        title: "Install a non-negotiable outdoor checkpoint",
        actions: [
          "Put one daylight break on the calendar rather than relying on convenience.",
          "Tie it to lunch, a call, or a standing errand so the habit survives busy days.",
        ],
      });
    }
  }

  if (insight.primaryBrokenSignal.key === "darknessScore") {
    if (answers.evening_light_reduction === "very_bright") {
      rationale =
        "The evening environment is staying too visually active too late, which likely delays biological night before sleep even begins.";
    }

    if (answers.evening_screen_exposure === "low") {
      steps = replaceStep(steps, "Final 90 minutes", {
        window: "Final 90 minutes",
        title: "Create a hard edge around bright screens",
        actions: [
          "Decide in advance which screens are truly necessary late at night and which are just default drift.",
          "Move anything stimulating earlier so the final stretch feels visually quieter, not just shorter.",
        ],
      });
      supportNotes.push(
        "Late screen intensity appears to be a specific weak point, so screen boundaries should be treated as part of the protocol rather than as a bonus habit.",
      );
    }

    if (answers.bedroom_darkness === "some_light" || answers.bedroom_darkness === "bright_room") {
      steps = replaceStep(steps, "Sleep window", {
        window: "Sleep window",
        title: "Upgrade the room itself",
        actions: [
          "Reduce hallway spill, device LEDs, and early dawn light so the bedroom supports the protocol after you get into bed.",
          "Treat room darkness as an environmental fix, not something to solve with willpower once you are tired.",
        ],
      });
    }
  }

  if (insight.primaryBrokenSignal.key === "sleepOutputScore") {
    if (answers.sleep_schedule === "mixed" || answers.sleep_schedule === "low") {
      rationale =
        "The biggest constraint appears to be sleep timing variability, not simply a lack of total hours in bed.";
    }

    if (answers.sleep_latency === "often_delayed" || answers.sleep_latency === "very_delayed") {
      steps = replaceStep(steps, "Late evening", {
        window: "Late evening",
        title: "Reduce sleep onset friction",
        actions: [
          "Begin the wind-down earlier than you think you need so the body is not asked to stop abruptly.",
          "Remove the brightest, most cognitively sticky inputs before you expect sleep to arrive.",
        ],
      });
    }
  }

  if (insight.primaryBrokenSignal.key === "disruptionLoadScore") {
    if (answers.travel_schedule_variability === "often" || answers.travel_schedule_variability === "very_often") {
      rationale =
        "Circadian gains are likely being erased by repeated schedule changes, so the protocol has to prioritize anchors over perfection.";
    }

    if (answers.late_meals_stimulants === "often" || answers.late_meals_stimulants === "very_often") {
      steps = replaceStep(steps, "Evening intake", {
        window: "Evening intake",
        title: "Pull late inputs earlier",
        actions: [
          "Move meals, alcohol, and stimulation earlier on the days you can control most easily first.",
          "Focus on narrowing the latest edge of the day rather than trying to overhaul every behavior at once.",
        ],
      });
    }
  }

  return {
    headline: template.headline,
    rationale,
    focusArea: template.focusArea,
    steps,
    supportNotes,
  };
}
