import {
  CategoryDefinition,
  Question,
  QuestionCategory,
} from "@/types/circadian";

const frequencyOptions: Question["options"] = [
  {
    value: "ideal",
    label: "Consistent",
    detail: "Most days, with minimal effort or friction.",
    score: 100,
  },
  {
    value: "good",
    label: "Often",
    detail: "Several days each week, but not fully locked in.",
    score: 75,
  },
  {
    value: "mixed",
    label: "Sometimes",
    detail: "Irregular and dependent on schedule or motivation.",
    score: 45,
  },
  {
    value: "low",
    label: "Rarely",
    detail: "This is mostly missing or actively working against me.",
    score: 15,
  },
];

function makeQuestion(
  id: string,
  category: QuestionCategory,
  prompt: string,
  description: string,
  weight = 1,
  options = frequencyOptions,
): Question {
  return {
    id,
    category,
    prompt,
    description,
    inputType: "segmented",
    weight,
    options: [...options],
  };
}

export const categoryDefinitions: CategoryDefinition[] = [
  {
    title: "Morning Light",
    subtitle: "Anchor the biological morning.",
    intention: "Strong early light tells the brain when the day begins.",
    scoreKey: "morningSignalScore",
  },
  {
    title: "Daytime Environment",
    subtitle: "Build a bright, active daylight window.",
    intention: "The daytime signal should be bright, dynamic, and awake.",
    scoreKey: "daylightStrengthScore",
  },
  {
    title: "Evening Light",
    subtitle: "Protect the descent into darkness.",
    intention: "Lower light exposure supports melatonin timing and depth.",
    scoreKey: "darknessScore",
  },
  {
    title: "Sleep Timing",
    subtitle: "Stabilize sleep output and recovery.",
    intention: "Regular sleep timing helps the body trust the pattern.",
    scoreKey: "sleepOutputScore",
  },
  {
    title: "Disruption Load",
    subtitle: "Reduce the signals that create circadian noise.",
    intention: "Travel, late meals, alcohol, and irregularity can blunt progress.",
    scoreKey: "disruptionLoadScore",
  },
  {
    title: "Location / Season",
    subtitle: "Adapt the plan to your environment.",
    intention: "Latitude, climate, and seasonal daylight change the protocol details.",
  },
];

export const questionnaire: Question[] = [
  makeQuestion(
    "morning_light_timing",
    "Morning Light",
    "How soon after waking do you get outside or into bright natural light?",
    "Early outdoor light is one of the strongest signals for circadian timing.",
    1.4,
    [
      {
        value: "within_15",
        label: "Within 15 min",
        detail: "This happens very shortly after waking.",
        score: 100,
      },
      {
        value: "within_60",
        label: "Within 1 hour",
        detail: "Usually early, but not immediate.",
        score: 75,
      },
      {
        value: "later",
        label: "Later morning",
        detail: "Light exposure happens after the day has started.",
        score: 40,
      },
      {
        value: "rarely",
        label: "Rarely",
        detail: "I mostly stay indoors through the morning.",
        score: 10,
      },
    ],
  ),
  makeQuestion(
    "morning_light_duration",
    "Morning Light",
    "How much bright morning light do you usually accumulate?",
    "Longer exposure helps reinforce the wake signal, especially in winter.",
    1.1,
    [
      {
        value: "30_plus",
        label: "30+ minutes",
        detail: "A solid morning light window is part of the routine.",
        score: 100,
      },
      {
        value: "15_30",
        label: "15 to 30 min",
        detail: "Good exposure, though not always long enough.",
        score: 80,
      },
      {
        value: "5_15",
        label: "5 to 15 min",
        detail: "A brief dose, but usually incomplete.",
        score: 45,
      },
      {
        value: "under_5",
        label: "Under 5 min",
        detail: "Very little meaningful morning light.",
        score: 15,
      },
    ],
  ),
  makeQuestion(
    "morning_movement",
    "Morning Light",
    "How often do you pair morning light with a walk or light movement?",
    "Movement can amplify the alerting effect of the morning signal.",
    0.8,
  ),
  makeQuestion(
    "day_brightness",
    "Daytime Environment",
    "How bright is your work or daytime environment for most of the day?",
    "Indoor spaces are often much dimmer than the body expects during the day.",
    1.3,
    [
      {
        value: "mostly_outdoors",
        label: "Very bright",
        detail: "I spend meaningful time outside or near strong daylight.",
        score: 100,
      },
      {
        value: "windowed",
        label: "Moderately bright",
        detail: "My space has decent daylight, but not consistently strong.",
        score: 75,
      },
      {
        value: "dim_indoor",
        label: "Dim indoor",
        detail: "Most of the day is spent in subdued indoor light.",
        score: 35,
      },
      {
        value: "very_dim",
        label: "Very dim",
        detail: "My daytime environment is usually low-light and enclosed.",
        score: 10,
      },
    ],
  ),
  makeQuestion(
    "day_breaks_outside",
    "Daytime Environment",
    "How often do you take midday daylight breaks outdoors?",
    "A midday light pulse can support alertness and circadian amplitude.",
    1,
    [
      {
        value: "daily",
        label: "Daily",
        detail: "This is built into most days.",
        score: 100,
      },
      {
        value: "several",
        label: "Several times weekly",
        detail: "It happens often, but not every day.",
        score: 75,
      },
      {
        value: "occasional",
        label: "Occasional",
        detail: "This is more aspirational than reliable.",
        score: 45,
      },
      {
        value: "almost_never",
        label: "Almost never",
        detail: "Midday daylight breaks are mostly absent.",
        score: 15,
      },
    ],
  ),
  makeQuestion(
    "day_meal_regular",
    "Daytime Environment",
    "How regular are your daytime meals and activity blocks?",
    "Predictable daytime patterns can strengthen the body clock.",
    0.7,
  ),
  makeQuestion(
    "evening_light_reduction",
    "Evening Light",
    "How much do you dim lights in the final 2 to 3 hours before bed?",
    "Evening darkness is a direct signal that the biological night has started.",
    1.3,
    [
      {
        value: "deep_dim",
        label: "Clearly dimmed",
        detail: "The home environment becomes noticeably softer at night.",
        score: 100,
      },
      {
        value: "some_dimming",
        label: "Some dimming",
        detail: "I dim some lights but the space still feels active.",
        score: 70,
      },
      {
        value: "bright_home",
        label: "Mostly bright",
        detail: "Evenings still happen under normal household lighting.",
        score: 35,
      },
      {
        value: "very_bright",
        label: "Very bright",
        detail: "Screens and lights stay intense until bedtime.",
        score: 5,
      },
    ],
  ),
  makeQuestion(
    "evening_screen_exposure",
    "Evening Light",
    "How controlled is your screen exposure late in the evening?",
    "Late screen light can delay sleep timing and reduce sleep depth.",
    1.1,
  ),
  makeQuestion(
    "bedroom_darkness",
    "Evening Light",
    "How dark is your sleep environment once you are in bed?",
    "Residual bedroom light can fragment the darkness signal overnight.",
    0.9,
    [
      {
        value: "blackout",
        label: "Very dark",
        detail: "The room stays consistently dark through the night.",
        score: 100,
      },
      {
        value: "mostly_dark",
        label: "Mostly dark",
        detail: "Minor light leaks are present, but limited.",
        score: 80,
      },
      {
        value: "some_light",
        label: "Some light",
        detail: "Street light, devices, or ambient light are noticeable.",
        score: 40,
      },
      {
        value: "bright_room",
        label: "Bright room",
        detail: "The room rarely reaches a properly dark state.",
        score: 10,
      },
    ],
  ),
  makeQuestion(
    "sleep_schedule",
    "Sleep Timing",
    "How consistent are your bedtime and wake time across the week?",
    "Regular timing is often more important than chasing perfection on any one night.",
    1.3,
  ),
  makeQuestion(
    "sleep_duration",
    "Sleep Timing",
    "How often do you get enough total sleep for your body to feel restored?",
    "Sleep output reflects both timing quality and total opportunity.",
    1.1,
  ),
  makeQuestion(
    "sleep_latency",
    "Sleep Timing",
    "How easily do you fall asleep once you intend to sleep?",
    "Difficulty falling asleep can indicate misaligned timing or excess stimulation.",
    0.8,
    [
      {
        value: "easy",
        label: "Usually easy",
        detail: "I tend to fall asleep without much delay.",
        score: 100,
      },
      {
        value: "mixed",
        label: "Sometimes delayed",
        detail: "Some nights are easy, some are sticky.",
        score: 65,
      },
      {
        value: "often_delayed",
        label: "Often delayed",
        detail: "Falling asleep regularly takes longer than I want.",
        score: 35,
      },
      {
        value: "very_delayed",
        label: "Very difficult",
        detail: "Sleep onset is frequently a struggle.",
        score: 10,
      },
    ],
  ),
  makeQuestion(
    "travel_schedule_variability",
    "Disruption Load",
    "How often do travel, shift work, or large schedule swings affect your week?",
    "Frequent schedule changes can reduce circadian reliability.",
    1.2,
    [
      {
        value: "rarely",
        label: "Rarely",
        detail: "My weekly schedule is relatively stable.",
        score: 100,
      },
      {
        value: "sometimes",
        label: "Sometimes",
        detail: "There are occasional disruptions, but they are not constant.",
        score: 70,
      },
      {
        value: "often",
        label: "Often",
        detail: "My schedule changes materially most weeks.",
        score: 35,
      },
      {
        value: "very_often",
        label: "Very often",
        detail: "Travel or erratic timing is a defining feature of my routine.",
        score: 10,
      },
    ],
  ),
  makeQuestion(
    "late_meals_stimulants",
    "Disruption Load",
    "How often do late meals, alcohol, or stimulants push into your evening window?",
    "These inputs can create noise even when light habits are decent.",
    1,
    [
      {
        value: "rarely",
        label: "Rarely",
        detail: "These disruptions are limited and deliberate.",
        score: 100,
      },
      {
        value: "sometimes",
        label: "Sometimes",
        detail: "They show up occasionally, but not nightly.",
        score: 70,
      },
      {
        value: "often",
        label: "Often",
        detail: "Evenings are regularly affected by these inputs.",
        score: 35,
      },
      {
        value: "very_often",
        label: "Very often",
        detail: "This is a major recurring source of disruption.",
        score: 10,
      },
    ],
  ),
  makeQuestion(
    "stress_winddown",
    "Disruption Load",
    "How often do you create a true wind-down period before bed?",
    "A nervous system that never ramps down often blunts the sleep signal.",
    0.8,
  ),
  makeQuestion(
    "season_daylight",
    "Location / Season",
    "How supportive is your current season for natural daylight exposure?",
    "Short winter days or harsh weather often require a more deliberate plan.",
    1,
    [
      {
        value: "very_supportive",
        label: "Very supportive",
        detail: "Long, accessible daylight is easy to get most days.",
        score: 100,
      },
      {
        value: "moderate",
        label: "Moderate",
        detail: "The season is workable, but not effortless.",
        score: 70,
      },
      {
        value: "challenging",
        label: "Challenging",
        detail: "Short days, weather, or heat make access inconsistent.",
        score: 40,
      },
      {
        value: "very_challenging",
        label: "Very challenging",
        detail: "My environment strongly limits natural light exposure.",
        score: 15,
      },
    ],
  ),
  makeQuestion(
    "location_latitude",
    "Location / Season",
    "How extreme is the daylight swing where you live?",
    "Higher latitude living often calls for stronger timing habits.",
    0.9,
    [
      {
        value: "minimal",
        label: "Minimal swing",
        detail: "Day length is relatively stable year-round.",
        score: 90,
      },
      {
        value: "moderate",
        label: "Moderate swing",
        detail: "There is a noticeable seasonal shift, but manageable.",
        score: 70,
      },
      {
        value: "strong",
        label: "Strong swing",
        detail: "Seasonal light timing changes a lot through the year.",
        score: 40,
      },
      {
        value: "extreme",
        label: "Extreme swing",
        detail: "Seasonal daylight changes are dramatic.",
        score: 20,
      },
    ],
  ),
  makeQuestion(
    "home_environment_support",
    "Location / Season",
    "How easy is it to shape your home for both bright mornings and dark evenings?",
    "Blackout shades, outdoor access, and lighting control all matter here.",
    0.9,
  ),
];

export function getQuestionsForCategory(category: QuestionCategory) {
  return questionnaire.filter((question) => question.category === category);
}
