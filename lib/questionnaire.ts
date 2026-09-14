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
  options = frequencyOptions,
): Question {
  return {
    id,
    category,
    prompt,
    description,
    inputType: "segmented",
    options: [...options],
  };
}

export const categoryDefinitions: CategoryDefinition[] = [
  {
    title: "Morning Light",
    subtitle: "Anchor the biological morning.",
    intention: "Strong early light tells the brain when the day begins.",
  },
  {
    title: "Daytime Environment",
    subtitle: "Build a bright, active daylight window.",
    intention: "The daytime signal should be bright, dynamic, and awake.",
  },
  {
    title: "Evening Light",
    subtitle: "Protect the descent into darkness.",
    intention: "Lower light exposure supports melatonin timing and depth.",
  },
  {
    title: "Sleep Timing",
    subtitle: "Stabilize sleep output and recovery.",
    intention: "Regular sleep timing helps the body trust the pattern.",
  },
  {
    title: "Life Constraints",
    subtitle: "Work with the life you actually live.",
    intention: "Schedule, travel, and environmental control shape what guidance is realistic.",
  },
];

export const questionnaire: Question[] = [
  makeQuestion(
    "morning_light_timing",
    "Morning Light",
    "How soon after waking do you get outside or into bright natural light?",
    "Early outdoor light is one of the strongest signals for circadian timing.",
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
  ),
  makeQuestion(
    "day_brightness",
    "Daytime Environment",
    "How bright is your work or daytime environment for most of the day?",
    "Indoor spaces are often much dimmer than the body expects during the day.",
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
    "How consistent is the timing of your meals from day to day?",
    "Meal timing is its own biological signal and should not be bundled with activity.",
  ),
  makeQuestion(
    "evening_light_reduction",
    "Evening Light",
    "How much do you dim lights in the final 2 to 3 hours before bed?",
    "Evening darkness is a direct signal that the biological night has started.",
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
  ),
  makeQuestion(
    "bedroom_darkness",
    "Evening Light",
    "How dark is your sleep environment once you are in bed?",
    "Residual bedroom light can fragment the darkness signal overnight.",
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
  ),
  makeQuestion(
    "sleep_duration",
    "Sleep Timing",
    "How often do you get enough total sleep for your body to feel restored?",
    "Sleep output reflects both timing quality and total opportunity.",
  ),
  makeQuestion(
    "sleep_latency",
    "Sleep Timing",
    "How easily do you fall asleep once you intend to sleep?",
    "Difficulty falling asleep can indicate misaligned timing or excess stimulation.",
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
    "Life Constraints",
    "How predictable is your work and daily schedule from week to week?",
    "This is context, not a performance score. It helps Foundational Flow adapt guidance to your real schedule.",
    [
      {
        value: "stable",
        label: "Very predictable",
        detail: "My wake, work, and sleep windows are usually stable.",
        score: 100,
      },
      {
        value: "mostly_stable",
        label: "Mostly predictable",
        detail: "There are occasional changes, but a normal pattern exists.",
        score: 70,
      },
      {
        value: "variable",
        label: "Variable",
        detail: "My schedule changes materially from day to day or week to week.",
        score: 35,
      },
      {
        value: "shift_or_irregular",
        label: "Shift or irregular",
        detail: "Rotating, overnight, or irregular hours are part of my reality.",
        score: 10,
      },
    ],
  ),
  makeQuestion(
    "late_meals_stimulants",
    "Life Constraints",
    "When do you usually finish your last meal relative to bedtime?",
    "Last-meal timing is evaluated separately from alcohol and stimulants.",
    [
      {
        value: "3_plus_hours",
        label: "3+ hours before",
        detail: "My last meal usually finishes at least three hours before bed.",
        score: 100,
      },
      {
        value: "2_to_3_hours",
        label: "2–3 hours before",
        detail: "My last meal usually leaves a moderate buffer before bed.",
        score: 70,
      },
      {
        value: "1_to_2_hours",
        label: "1–2 hours before",
        detail: "My last meal often sits fairly close to bedtime.",
        score: 35,
      },
      {
        value: "within_1_hour",
        label: "Within 1 hour",
        detail: "I often eat immediately before bed or during my sleep window.",
        score: 10,
      },
    ],
  ),
  makeQuestion(
    "stress_winddown",
    "Life Constraints",
    "How settled do you usually feel as you approach bedtime?",
    "This is an outcome signal that helps interpret your evening—not a judgment about discipline.",
  ),
  makeQuestion(
    "home_environment_support",
    "Life Constraints",
    "How easy is it to shape your home for both bright mornings and dark evenings?",
    "This identifies environmental control and constraints. Location, latitude, season, sunrise, and sunset are calculated automatically.",
  ),
];

export function getQuestionsForCategory(category: QuestionCategory) {
  return questionnaire.filter((question) => question.category === category);
}
