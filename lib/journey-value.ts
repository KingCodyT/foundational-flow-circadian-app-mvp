import { SIGNAL_REGISTRY } from './personalization/signal-registry';

/** Explain implemented uses, not an invented individual prescription. */
export function assessmentPurpose(questionId: string): string {
  const signal = Object.values(SIGNAL_REGISTRY).find(item => item.questionId === questionId);
  if (signal?.coachingEligible) return `This helps decide whether ${signal.label.replace(/ Priority$/, '').toLowerCase()} should be your starting focus. Your saved schedule will set its opportunities; this answer alone does not set a time.`;
  if (questionId === 'travel_schedule_variability') return 'This helps us explain when saved times may need updating. The app does not follow a live shift roster.';
  if (questionId === 'home_environment_support') return 'This can adapt light guidance to what you control, without asking you to change the whole household.';
  if (['bedroom_darkness', 'sleep_duration', 'sleep_latency', 'stress_winddown'].includes(questionId)) return 'This adds context to evening guidance when relevant. It does not diagnose a sleep problem or predict when you will fall asleep.';
  return 'This contributes context to your assessment. Not every answer changes your next step; Today will explain the selected focus.';
}

export type CueOpportunity = { action: string; start: Date | string };
export function opportunityLabel(opportunity: CueOpportunity, now: Date, timeZone?: string | null): string {
  const at = new Date(opportunity.start);
  if (at <= now) return `Available now: ${opportunity.action}`;
  const formatted = new Intl.DateTimeFormat('en-US', { timeZone: timeZone || undefined, weekday: 'short', hour: 'numeric', minute: '2-digit' }).format(at);
  return `Next opportunity: ${formatted} · ${opportunity.action}`;
}

export function hasGuidanceSchedule(profile: { wakeTime?: string | null; targetBedtime?: string | null } | null) {
  const valid = (value?: string | null) => Boolean(value && /^([01]\d|2[0-3]):[0-5]\d$/.test(value));
  return valid(profile?.wakeTime) && valid(profile?.targetBedtime);
}

export function missingScheduleDescription(profile: { wakeTime?: string | null; targetBedtime?: string | null } | null) {
  const wake = Boolean(profile?.wakeTime && /^([01]\d|2[0-3]):[0-5]\d$/.test(profile.wakeTime));
  const bed = Boolean(profile?.targetBedtime && /^([01]\d|2[0-3]):[0-5]\d$/.test(profile.targetBedtime));
  if (wake && !bed) return 'Your wake time is saved. Add your usual bedtime to time your guidance.';
  if (bed && !wake) return 'Your bedtime is saved. Add your usual wake time to time your guidance.';
  return 'Add your usual wake and bedtime to get guidance timed to your day.';
}
