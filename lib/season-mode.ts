import { AnswerMap, CircadianInsight, ProtocolPlan } from "@/types/circadian";

export type SeasonModeProfile = {
  key: "winter-lean" | "swing-season" | "high-daylight";
  title: string;
  label: string;
  summary: string;
  rhythmAdjustments: string[];
  trackerFocus: string[];
  foodTimingNotes: string[];
};

function isWinterLean(answers: AnswerMap) {
  return (
    answers.season_daylight === "very_challenging" ||
    answers.location_latitude === "extreme" ||
    (answers.season_daylight === "challenging" &&
      (answers.location_latitude === "strong" ||
        answers.home_environment_support === "low"))
  );
}

function isSwingSeason(answers: AnswerMap) {
  return (
    answers.season_daylight === "challenging" ||
    answers.location_latitude === "strong" ||
    answers.location_latitude === "moderate" ||
    answers.home_environment_support === "mixed"
  );
}

function buildWinterLeanProfile(
  insight: CircadianInsight,
  protocol: ProtocolPlan,
): SeasonModeProfile {
  return {
    key: "winter-lean",
    title: "Winter-Lean Mode",
    label: "Constrained daylight season",
    summary:
      "This mode assumes daylight is not reliably doing the work for you. Rhythm quality depends more on deliberate structure, brighter mornings, cleaner evenings, and tighter feeding timing.",
    rhythmAdjustments: [
      "Push the morning anchor earlier and make it longer than feels necessary on naturally dim days.",
      "Treat midday daylight as a scheduled checkpoint, not a bonus if the weather cooperates.",
      "Simplify the evening faster so the contrast between day and night is unmistakable.",
      `If ${insight.primaryBrokenSignal.label.toLowerCase()} is weak, solve it with structure before chasing optimization elsewhere.`,
    ],
    trackerFocus: [
      "Morning light completion matters more than total habit count in this mode.",
      "A partially completed day with a strong morning anchor and earlier evening descent still counts as a win.",
      "Look for consistency across several days rather than waiting for one perfect high-energy day.",
    ],
    foodTimingNotes: [
      "Use an earlier, protein-forward first meal to reinforce wakefulness after the morning light window.",
      "Let the largest, most substantial meal happen during the brighter middle of the day.",
      "Keep dinner simpler and earlier so the body is not still metabolically active late into the night.",
    ],
  };
}

function buildSwingSeasonProfile(
  insight: CircadianInsight,
): SeasonModeProfile {
  return {
    key: "swing-season",
    title: "Swing-Season Mode",
    label: "Variable daylight conditions",
    summary:
      "This mode assumes the environment is workable but inconsistent. Some days will support the rhythm naturally, and others will require more active correction. The goal is to avoid drifting with the season.",
    rhythmAdjustments: [
      "Keep the wake anchor stable across brighter and dimmer days so the rhythm does not drift with changing conditions.",
      "Use outdoor checkpoints whenever light is available, but preserve an indoor fallback routine for less supportive days.",
      "Scale evening inputs down earlier on days that already felt dim or indoor-heavy.",
      `If ${insight.primaryBrokenSignal.label.toLowerCase()} remains fragile, make it the non-negotiable habit category for the week.`,
    ],
    trackerFocus: [
      "Try to complete the same core anchors even when the day feels different from the day before.",
      "Use the tracker to notice which blocks collapse first when schedule or weather changes.",
      "Consistency beats intensity here; repeatable moderate days are more valuable than occasional heroic ones.",
    ],
    foodTimingNotes: [
      "Use regular meal timing to keep daytime physiology from becoming too dependent on environmental variability.",
      "Aim for the most substantial meal in the brighter half of the day when possible.",
      "Let the final meal signal closure rather than extending the active portion of the day.",
    ],
  };
}

function buildHighDaylightProfile(
  insight: CircadianInsight,
): SeasonModeProfile {
  return {
    key: "high-daylight",
    title: "High-Daylight Mode",
    label: "Supportive daylight season",
    summary:
      "This mode assumes the environment is helping more than hurting. The opportunity is to use abundant daylight to strengthen amplitude while protecting the evening from staying too active for too long.",
    rhythmAdjustments: [
      "Take advantage of naturally supportive mornings rather than wasting them indoors.",
      "Use long-day conditions to reinforce daytime amplitude without letting the active window bleed too far into the evening.",
      "Protect a cleaner, dimmer transition at night because supportive daylight can still be undone by overstimulated evenings.",
      `If ${insight.primaryBrokenSignal.label.toLowerCase()} remains weak even in this mode, treat it as a true leverage point rather than blaming the season.`,
    ],
    trackerFocus: [
      "Prioritize the evening and sleep-window checkoffs if bright, long days keep the night signal delayed.",
      "Use the tracker to keep strong days repeatable instead of assuming the environment will do the job for you.",
      "Completion should feel easier in this mode, which makes it a good time to build durable habits.",
    ],
    foodTimingNotes: [
      "Use outdoor meals and hydration during bright hours to reinforce the active part of the day.",
      "Avoid letting later social meals or stimulants erase the benefit of stronger daylight.",
      "Keep the final meal calm enough that evening can still feel like a descent rather than an extension of the day.",
    ],
  };
}

export function buildSeasonMode(
  answers: AnswerMap,
  insight: CircadianInsight,
  protocol: ProtocolPlan,
): SeasonModeProfile {
  if (isWinterLean(answers)) {
    return buildWinterLeanProfile(insight, protocol);
  }

  if (isSwingSeason(answers)) {
    return buildSwingSeasonProfile(insight);
  }

  return buildHighDaylightProfile(insight);
}
