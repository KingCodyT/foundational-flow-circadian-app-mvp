import { AnswerMap, CircadianInsight, ProtocolPlan } from "@/types/circadian";

export type DailyRhythmBlock = {
  phase: "Morning" | "Daytime" | "Evening" | "Sleep Window";
  timing: string;
  goal: string;
  anchors: string[];
};

function buildMorningBlock(
  answers: AnswerMap,
  insight: CircadianInsight,
  protocol: ProtocolPlan,
): DailyRhythmBlock {
  const anchors = [
    "Get outside or into strong natural light as early as possible after waking.",
    "Keep the first hour of the day pointed toward brightness, movement, and feeding timing.",
  ];

  if (answers.morning_light_duration === "under_5" || answers.morning_light_duration === "5_15") {
    anchors.push(
      "Extend the morning light window beyond a quick doorstep check so the signal is long enough to matter.",
    );
  }

  if (insight.primaryBrokenSignal.key === "morningSignalScore") {
    anchors.unshift(protocol.steps[0]?.actions[0] ?? "Start the day with a decisive wake anchor.");
  }

  return {
    phase: "Morning",
    timing: "Wake to first 90 minutes",
    goal: "Tell the brain, clearly and early, that the biological day has begun.",
    anchors,
  };
}

function buildDaytimeBlock(
  answers: AnswerMap,
  protocol: ProtocolPlan,
): DailyRhythmBlock {
  const anchors = [
    "Keep at least one meaningful work or movement block in a bright environment.",
    "Use lunch, calls, or walking breaks to create a second daylight checkpoint.",
  ];

  if (answers.day_brightness === "dim_indoor" || answers.day_brightness === "very_dim") {
    anchors.push(
      "Treat midday outdoor exposure like a scheduled appointment rather than something that happens only on easier days.",
    );
  }

  if (protocol.focusArea === "Daytime environment") {
    anchors.unshift(protocol.steps[1]?.actions[0] ?? "Increase daytime amplitude with a repeatable brightness checkpoint.");
  }

  return {
    phase: "Daytime",
    timing: "Mid-morning through late afternoon",
    goal: "Build daytime amplitude so alertness feels distinct from night.",
    anchors,
  };
}

function buildEveningBlock(
  answers: AnswerMap,
  insight: CircadianInsight,
  protocol: ProtocolPlan,
): DailyRhythmBlock {
  const anchors = [
    "Shift the home environment into a lower-light, lower-input mode before bed arrives.",
    "Move stimulation, screens, and heavier inputs earlier so the final stretch feels quieter.",
  ];

  if (answers.evening_light_reduction === "very_bright" || answers.evening_screen_exposure === "low") {
    anchors.push(
      "Create a hard edge around bright screens and overhead light rather than relying on willpower once the evening is underway.",
    );
  }

  if (answers.late_meals_stimulants === "often" || answers.late_meals_stimulants === "very_often") {
    anchors.push(
      "Pull dinner, alcohol, and stimulation forward on your controllable days to reduce late biological noise.",
    );
  }

  if (insight.primaryBrokenSignal.key === "darknessScore") {
    anchors.unshift(protocol.steps[1]?.actions[0] ?? "Create a genuine descent into darkness each evening.");
  }

  return {
    phase: "Evening",
    timing: "2 to 3 hours before bed",
    goal: "Reduce visual, metabolic, and nervous-system activation before the sleep window.",
    anchors,
  };
}

function buildSleepBlock(
  answers: AnswerMap,
  insight: CircadianInsight,
  protocol: ProtocolPlan,
): DailyRhythmBlock {
  const anchors = [
    "Keep the bedroom dark, quiet, and visually simple enough that the environment supports sleep without extra effort.",
    "Protect a stable wake anchor even after imperfect nights so the rhythm does not keep drifting.",
  ];

  if (answers.sleep_schedule === "mixed" || answers.sleep_schedule === "low") {
    anchors.push(
      "Aim for a narrower wake-time band across the week before chasing a perfect bedtime every night.",
    );
  }

  if (answers.bedroom_darkness === "some_light" || answers.bedroom_darkness === "bright_room") {
    anchors.push(
      "Fix the clearest bedroom light leak this week so darkness continues after you are already in bed.",
    );
  }

  if (insight.primaryBrokenSignal.key === "sleepOutputScore") {
    anchors.unshift(protocol.steps[2]?.actions[0] ?? "Reinforce the sleep window with a stable wake anchor.");
  }

  return {
    phase: "Sleep Window",
    timing: "Bedtime through overnight",
    goal: "Let the body trust when recovery starts and keep the night signal intact.",
    anchors,
  };
}

export function buildDailyRhythm(
  answers: AnswerMap,
  insight: CircadianInsight,
  protocol: ProtocolPlan,
) {
  return [
    buildMorningBlock(answers, insight, protocol),
    buildDaytimeBlock(answers, protocol),
    buildEveningBlock(answers, insight, protocol),
    buildSleepBlock(answers, insight, protocol),
  ];
}
