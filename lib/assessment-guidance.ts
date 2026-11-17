import { questionnaire } from './questionnaire';
import type { AnswerMap } from '@/types/circadian';

export type AssessmentAdaptation = { questionId: string; youSaid: string; suggestion: string; why: string };

/** Explicit answer branches only: never infer constraints from free text or diagnose outcomes. */
export function assessmentAdaptations(answers: AnswerMap, signalId: string): AssessmentAdaptation[] {
  const results: AssessmentAdaptation[] = [];
  const add = (id: string, suggestion: string, why: string) => {
    const q = questionnaire.find(q => q.id === id);
    const option = q?.options.find(o => o.value === answers[id]);
    if (option && option.score < 65) results.push({questionId:id, youSaid:option.detail || option.label, suggestion, why});
  };
  const evening = ['evening_light_reduction','evening_screen_exposure','sleep_schedule'].includes(signalId);
  const light = evening || ['morning_light_timing','morning_light_duration','day_brightness','day_breaks_outside'].includes(signalId);
  if (light) add('home_environment_support', evening ? 'Start with one unnecessary light or screen you control. Leave shared or safety-critical lighting alone.' : 'Use a safe daylight opportunity that is accessible to you; you do not need to change the whole household.', 'This keeps the step within the control you actually have.');
  add('travel_schedule_variability', 'Check your saved wake time and bedtime before using today’s time windows. Update them when your shift changes; skip an opportunity that conflicts with work or safety.', 'The displayed windows follow saved times, not a live work roster.');
  if (evening) {
    add('bedroom_darkness', 'As part of winding down, reduce a light leak or unnecessary device light if practical. Keep safe access lighting.', 'Your answer makes the sleep environment worth checking, without assuming you can control every light.');
    add('stress_winddown', 'Keep this step small: put one optional task aside as you begin your usual wind-down.', 'Feeling unsettled is context, not a failure to follow the routine.');
    add('sleep_latency', 'Keep the wind-down comfortable rather than trying to force sleep at the displayed time.', 'This is a routine cue, not a prediction of when you will fall asleep.');
    add('sleep_duration', 'Protect the time you have set aside for sleep; do not shorten it just to complete a light or movement step.', 'Your report of insufficient rest takes priority over completing a prompt.');
  }
  return results;
}
