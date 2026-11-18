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
