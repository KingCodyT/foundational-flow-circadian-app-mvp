import {
  AnswerMap,
  CircadianInsight,
  CircadianScores,
  Question,
  QuestionOption,
  ScoreSummary,
} from "@/types/circadian";
import { categoryDefinitions, questionnaire } from "@/lib/questionnaire";

function roundScore(value: number) {
  return Math.round(value * 10) / 10;
}

function getScoreBand(value: number): ScoreSummary["band"] {
  if (value >= 85) {
    return "strong";
  }

  if (value >= 65) {
    return "stable";
  }

  if (value >= 40) {
    return "fragile";
  }

  return "broken";
}

function averageWeightedScore(questions: Question[], answers: AnswerMap) {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const question of questions) {
    const answer = answers[question.id];
    const option = question.options.find((item) => item.value === answer);

    if (!option) {
      continue;
    }

    weightedSum += option.score * question.weight;
    totalWeight += question.weight;
  }

  if (totalWeight === 0) {
    return 0;
  }

  return roundScore(weightedSum / totalWeight);
}

export function calculateScores(answers: AnswerMap): CircadianScores {
  const getByCategory = (title: Question["category"]) =>
    questionnaire.filter((question) => question.category === title);

  const morningSignalScore = averageWeightedScore(
    getByCategory("Morning Light"),
    answers,
  );
  const daylightStrengthScore = averageWeightedScore(
    getByCategory("Daytime Environment"),
    answers,
  );
  const darknessScore = averageWeightedScore(
    getByCategory("Evening Light"),
    answers,
  );
  const sleepOutputScore = averageWeightedScore(
    getByCategory("Sleep Timing"),
    answers,
  );
  const disruptionLoadScore = averageWeightedScore(
    getByCategory("Disruption Load"),
    answers,
  );
  const locationSeasonScore = averageWeightedScore(
    getByCategory("Location / Season"),
    answers,
  );

  const overallCircadianScore = roundScore(
    morningSignalScore * 0.3 +
      daylightStrengthScore * 0.2 +
      darknessScore * 0.25 +
      sleepOutputScore * 0.15 +
      disruptionLoadScore * 0.1,
  );

  return {
    morningSignalScore,
    daylightStrengthScore,
    darknessScore,
    sleepOutputScore,
    disruptionLoadScore,
    locationSeasonScore,
    overallCircadianScore,
  };
}

function describeScore(
  key: ScoreSummary["key"],
  value: number,
  lowestAnswer?: QuestionOption,
) {
  const band = getScoreBand(value);

  const copyByKey: Record<ScoreSummary["key"], Record<ScoreSummary["band"], string>> = {
    morningSignalScore: {
      strong:
        "The wake signal appears well anchored, which gives the rest of the rhythm a reliable phase reference.",
      stable:
        "Mornings are directionally supportive, but the anchor is not yet strong enough to absorb inconsistent days.",
      fragile:
        "A morning signal is present, but it is not yet decisive. The brain is likely receiving mixed information about when the day begins.",
      broken:
        "Morning light timing is too weak or too delayed to anchor circadian phase reliably.",
    },
    daylightStrengthScore: {
      strong:
        "The daytime environment creates a clear contrast between active day and biological night.",
      stable:
        "Daytime support is reasonably good, but it still depends more on circumstance than deliberate structure.",
      fragile:
        "Days are likely too indoor or too dim to reinforce a strong daytime circadian state.",
      broken:
        "The daytime signal is underpowered, which commonly flattens alertness and weakens day-night contrast.",
    },
    darknessScore: {
      strong:
        "Evenings appear well protected, which supports melatonin timing and a stronger night signal.",
      stable:
        "Evening conditions are broadly supportive, but some light leakage or screen intensity is probably still delaying full descent.",
      fragile:
        "The darkness signal is inconsistent enough to blur the transition into biological night.",
      broken:
        "Evening light is likely overpowering the night signal and should be addressed first.",
    },
    sleepOutputScore: {
      strong:
        "Sleep timing and sleep opportunity appear supportive of recovery, even if not perfect every night.",
      stable:
        "Sleep output is generally workable, but inconsistency may still be limiting how restorative it becomes.",
      fragile:
        "The sleep window appears irregular or compressed enough to weaken recovery and next-day timing.",
      broken:
        "Sleep timing itself is unstable enough to function as a primary bottleneck in the rhythm.",
    },
    disruptionLoadScore: {
      strong:
        "The routine is relatively protected from the kinds of disruption that commonly erase circadian gains.",
      stable:
        "Disruption load is manageable, but recurring inputs are still likely eroding consistency.",
      fragile:
        "The rhythm is likely being diluted by repeated schedule or intake disruptions even when other habits are decent.",
      broken:
        "Disruption load is currently high enough to blunt the benefit of otherwise good circadian habits.",
    },
  };

  const baseCopy = copyByKey[key][band];

  if (!lowestAnswer || band === "strong") {
    return baseCopy;
  }

  return `${baseCopy} The weakest response in this category was "${lowestAnswer.label.toLowerCase()}."`;
}

function findLowestAnswerForCategory(category: Question["category"], answers: AnswerMap) {
  const categoryQuestions = questionnaire.filter((question) => question.category === category);
  const selectedOptions = categoryQuestions
    .map((question) => question.options.find((option) => option.value === answers[question.id]))
    .filter((option): option is QuestionOption => Boolean(option));

  if (selectedOptions.length === 0) {
    return undefined;
  }

  return selectedOptions.reduce((lowest, option) =>
    option.score < lowest.score ? option : lowest,
  );
}

function buildSummary(scores: CircadianScores, primary: ScoreSummary) {
  if (scores.overallCircadianScore >= 80) {
    return `Overall rhythm quality is solid. The best next move is to narrow attention to ${primary.label.toLowerCase()} so the stronger habits translate into more dependable outcomes.`;
  }

  if (scores.overallCircadianScore >= 60) {
    return `The rhythm is directionally healthy, but one weak signal is pulling down the overall system. Start with ${primary.label.toLowerCase()} before trying to optimize everything else.`;
  }

  if (scores.overallCircadianScore >= 40) {
    return `This looks more like a coordination problem than a single bad habit. Several signals are partially present, but ${primary.label.toLowerCase()} remains the clearest leverage point.`;
  }

  return `The system is currently receiving mixed day-night information. The fastest path is to repair ${primary.label.toLowerCase()} first, then stabilize the next weakest category.`;
}

function buildPrimaryReason(primary: ScoreSummary["key"], answers: AnswerMap) {
  const reasonByKey: Record<ScoreSummary["key"], string> = {
    morningSignalScore:
      answers.morning_light_timing === "later" || answers.morning_light_timing === "rarely"
        ? "The day appears to start too dim or too late, so the brain is not receiving a strong early phase anchor."
        : "Morning reinforcement is too inconsistent to lock the daily phase in place reliably.",
    daylightStrengthScore:
      answers.day_brightness === "dim_indoor" || answers.day_brightness === "very_dim"
        ? "Most of the day seems to happen in low indoor light, which weakens the physiological contrast between day and night."
        : "The daytime signal is present, but not yet strong or repeated enough to create clear circadian amplitude.",
    darknessScore:
      answers.evening_light_reduction === "very_bright"
        ? "The evening environment is staying biologically active too late, which likely delays the onset of the night signal."
        : "Night conditions are not becoming dark enough, early enough, or consistently enough to support a strong circadian descent.",
    sleepOutputScore:
      answers.sleep_schedule === "mixed" || answers.sleep_schedule === "low"
        ? "Sleep timing looks too irregular for the body to predict when recovery should occur."
        : "The sleep window itself appears too compressed or too difficult to initiate to support stable output.",
    disruptionLoadScore:
      answers.travel_schedule_variability === "often" || answers.travel_schedule_variability === "very_often"
        ? "Schedule volatility is likely undoing progress faster than the system can adapt."
        : "Late inputs and insufficient wind-down are probably generating too much circadian noise around otherwise decent habits.",
  };

  return reasonByKey[primary];
}

export function summarizeScores(scores: CircadianScores): ScoreSummary[] {
  const summaries: ScoreSummary[] = [
    {
      key: "morningSignalScore",
      label: "Morning Signal Score",
      value: scores.morningSignalScore,
      band: getScoreBand(scores.morningSignalScore),
      description: describeScore("morningSignalScore", scores.morningSignalScore),
    },
    {
      key: "daylightStrengthScore",
      label: "Daylight Strength Score",
      value: scores.daylightStrengthScore,
      band: getScoreBand(scores.daylightStrengthScore),
      description: describeScore("daylightStrengthScore", scores.daylightStrengthScore),
    },
    {
      key: "darknessScore",
      label: "Darkness Score",
      value: scores.darknessScore,
      band: getScoreBand(scores.darknessScore),
      description: describeScore("darknessScore", scores.darknessScore),
    },
    {
      key: "sleepOutputScore",
      label: "Sleep Output Score",
      value: scores.sleepOutputScore,
      band: getScoreBand(scores.sleepOutputScore),
      description: describeScore("sleepOutputScore", scores.sleepOutputScore),
    },
    {
      key: "disruptionLoadScore",
      label: "Disruption Load Score",
      value: scores.disruptionLoadScore,
      band: getScoreBand(scores.disruptionLoadScore),
      description: describeScore("disruptionLoadScore", scores.disruptionLoadScore),
    },
  ];

  return summaries.sort((a, b) => a.value - b.value);
}

export function generateInsights(
  scores: CircadianScores,
  answers: AnswerMap,
): CircadianInsight {
  const rankedSignals = [
    {
      key: "morningSignalScore" as const,
      label: "Morning Signal Score",
      value: scores.morningSignalScore,
      band: getScoreBand(scores.morningSignalScore),
      description: describeScore(
        "morningSignalScore",
        scores.morningSignalScore,
        findLowestAnswerForCategory("Morning Light", answers),
      ),
    },
    {
      key: "daylightStrengthScore" as const,
      label: "Daylight Strength Score",
      value: scores.daylightStrengthScore,
      band: getScoreBand(scores.daylightStrengthScore),
      description: describeScore(
        "daylightStrengthScore",
        scores.daylightStrengthScore,
        findLowestAnswerForCategory("Daytime Environment", answers),
      ),
    },
    {
      key: "darknessScore" as const,
      label: "Darkness Score",
      value: scores.darknessScore,
      band: getScoreBand(scores.darknessScore),
      description: describeScore(
        "darknessScore",
        scores.darknessScore,
        findLowestAnswerForCategory("Evening Light", answers),
      ),
    },
    {
      key: "sleepOutputScore" as const,
      label: "Sleep Output Score",
      value: scores.sleepOutputScore,
      band: getScoreBand(scores.sleepOutputScore),
      description: describeScore(
        "sleepOutputScore",
        scores.sleepOutputScore,
        findLowestAnswerForCategory("Sleep Timing", answers),
      ),
    },
    {
      key: "disruptionLoadScore" as const,
      label: "Disruption Load Score",
      value: scores.disruptionLoadScore,
      band: getScoreBand(scores.disruptionLoadScore),
      description: describeScore(
        "disruptionLoadScore",
        scores.disruptionLoadScore,
        findLowestAnswerForCategory("Disruption Load", answers),
      ),
    },
  ].sort((a, b) => a.value - b.value);
  const primaryBrokenSignal = rankedSignals[0];
  const locationNotes: string[] = [];

  if (
    answers.season_daylight === "challenging" ||
    answers.season_daylight === "very_challenging"
  ) {
    locationNotes.push(
      "Current season is reducing natural light access, so exposure likely needs to be more deliberate than intuitive.",
    );
  }

  if (answers.location_latitude === "strong" || answers.location_latitude === "extreme") {
    locationNotes.push(
      "Your daylight swing suggests seasonal protocol adjustments should be expected rather than treated as setbacks.",
    );
  }

  if (
    answers.home_environment_support === "mixed" ||
    answers.home_environment_support === "low"
  ) {
    locationNotes.push(
      "Home lighting and window control may be limiting both your bright morning signal and your dark evening signal.",
    );
  }

  const strengths = rankedSignals
    .filter((signal) => signal.band === "strong" || signal.band === "stable")
    .slice()
    .reverse()
    .slice(0, 2)
    .map((signal) => `${signal.label} is already giving the system useful support.`);

  const contextualNotes =
    locationNotes.length > 0
      ? locationNotes
      : [
          "Your environment appears reasonably workable, so improvements should come mostly from timing and consistency.",
        ];

  return {
    primaryBrokenSignal,
    rankedSignals,
    summary: buildSummary(scores, primaryBrokenSignal),
    primaryReason: buildPrimaryReason(primaryBrokenSignal.key, answers),
    strengths:
      strengths.length > 0
        ? strengths
        : [
            "No major strength is carrying the rhythm yet, so early gains will come from consistency more than intensity.",
          ],
    contextualNotes,
  };
}

export function getCategoryMetadata(label: string) {
  return categoryDefinitions.find((category) =>
    label.toLowerCase().includes(category.title.split(" ")[0].toLowerCase()),
  );
}
