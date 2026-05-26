import { AnswerMap, CircadianInsight, ProtocolPlan } from "@/types/circadian";

type GuidanceCard = {
  title: string;
  description: string;
  items: string[];
};

export type ContextualExperience = {
  environmentTitle: string;
  environmentSummary: string;
  seasonalNutrition: GuidanceCard;
  habitStack: GuidanceCard;
};

function getEnvironmentTitle(answers: AnswerMap) {
  if (
    answers.location_latitude === "strong" ||
    answers.location_latitude === "extreme"
  ) {
    return "High-variation light environment";
  }

  if (
    answers.season_daylight === "challenging" ||
    answers.season_daylight === "very_challenging"
  ) {
    return "Constrained daylight season";
  }

  return "Workable daylight environment";
}

function getEnvironmentSummary(answers: AnswerMap) {
  if (
    answers.location_latitude === "extreme" ||
    answers.season_daylight === "very_challenging"
  ) {
    return "Your environment likely requires more deliberate circadian design than people living with stable, abundant daylight. The app should lean harder on routine, bright morning exposure, and earlier evening simplification.";
  }

  if (
    answers.location_latitude === "strong" ||
    answers.season_daylight === "challenging" ||
    answers.home_environment_support === "mixed" ||
    answers.home_environment_support === "low"
  ) {
    return "Your biology is workable here, but the environment will not carry the rhythm on its own. Morning access, indoor light quality, and home darkness need to be designed rather than assumed.";
  }

  return "Your setting is relatively supportive, which means the biggest gains should come from consistent habits rather than heavy environmental compensation.";
}

function buildSeasonalNutrition(answers: AnswerMap): GuidanceCard {
  const winterLike =
    answers.season_daylight === "challenging" ||
    answers.season_daylight === "very_challenging" ||
    answers.location_latitude === "strong" ||
    answers.location_latitude === "extreme";

  if (winterLike) {
    return {
      title: "Seasonal food rhythm",
      description:
        "In lower-light periods, meals should help reinforce daytime energy and reduce late biological confusion.",
      items: [
        "Use a protein-forward breakfast soon after the morning light window so wakefulness is reinforced by both light and feeding timing.",
        "Favor warm, substantial midday meals built around roots, cooked vegetables, legumes, fish, or slow carbohydrates rather than letting the day stay under-fueled.",
        "Keep dinner earlier and simpler than lunch so the body is not still processing a heavy, stimulating meal late into the evening.",
      ],
    };
  }

  return {
    title: "Seasonal food rhythm",
    description:
      "In more supportive daylight conditions, meals can help stabilize amplitude without needing to feel overly restrictive.",
    items: [
      "Anchor the first half of the day with a real breakfast or early meal instead of letting intake drift too far into the afternoon.",
      "Use outdoor lunches, produce-rich meals, and hydration during bright hours to keep daytime physiology feeling distinctly active.",
      "Let dinner be earlier, calmer, and less stimulant-heavy than the rest of the day so the evening can actually feel like a descent.",
    ],
  };
}

function buildHabitStack(
  insight: CircadianInsight,
  protocol: ProtocolPlan,
  answers: AnswerMap,
): GuidanceCard {
  const exactHabits = protocol.steps.flatMap((step) =>
    step.actions.slice(0, 1).map((action) => `${step.window}: ${action}`),
  );

  if (insight.primaryBrokenSignal.key === "darknessScore") {
    return {
      title: "Habits to install this week",
      description:
        "Your fastest leverage is to make evening feel unmistakably different from daytime.",
      items: [
        "Two to three hours before bed: switch off overheads and move to lamps or warmer, lower light.",
        "Final 90 minutes: pre-decide when bright screens end so the boundary is structural, not negotiable.",
        "Bedroom check: remove the most obvious light leak or device glow this week rather than trying to fix every detail at once.",
      ],
    };
  }

  if (insight.primaryBrokenSignal.key === "morningSignalScore") {
    return {
      title: "Habits to install this week",
      description:
        "The goal is to teach the body when day begins, at roughly the same time, with enough brightness to matter.",
      items: [
        "Within 15 minutes of waking: get outside before messages, work, or indoor lighting becomes the start of the day.",
        "First hour: pair that light with walking, movement, or a practical errand so the cue feels embodied rather than symbolic.",
        "Repeat on rough days too: the consistency of the anchor matters more than waiting for a perfect morning.",
      ],
    };
  }

  return {
    title: "Habits to install this week",
    description:
      "Use the first layer of the protocol as a repeatable behavior stack rather than trying to master the whole plan at once.",
    items: exactHabits.slice(0, 3).length > 0 ? exactHabits.slice(0, 3) : [
      "Choose one repeatable morning anchor.",
      "Choose one daytime brightness checkpoint.",
      "Choose one evening simplification ritual.",
    ],
  };
}

export function buildContextualExperience(args: {
  answers: AnswerMap;
  insight: CircadianInsight;
  protocol: ProtocolPlan;
}): ContextualExperience {
  return {
    environmentTitle: getEnvironmentTitle(args.answers),
    environmentSummary: getEnvironmentSummary(args.answers),
    seasonalNutrition: buildSeasonalNutrition(args.answers),
    habitStack: buildHabitStack(args.insight, args.protocol, args.answers),
  };
}
