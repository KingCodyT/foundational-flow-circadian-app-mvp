import type { DailyEventState, DailyProfile } from '@/types/circadian';
import type { ContextualReminder } from './personalization/contextual-reminders';
import { eventSupportsSignal } from './personalization/now-coaching';
import { scheduleDateKey, shiftDateKey } from './schedule-time';

export const isLightReduction = (id?: string) => ['sunset', 'dim_house'].includes(id || '');
export function deferredTime(reminder: ContextualReminder, now: Date): Date | null {
  const later = new Date(+now + 15 * 60000);
  return reminder.end && now >= reminder.start && now < reminder.end && later < reminder.end ? later : null;
}
export function reportedDays(records: Record<string, DailyEventState> | null, signal: string | null, now: Date, zone?: string | null): number {
  if (!signal) return 0;
  const today = scheduleDateKey(now, zone);
  return Array.from({length: 7}, (_, i) => shiftDateKey(today, -i)).filter(day =>
    Object.entries(records?.[day] || {}).some(([id, r]) => eventSupportsSignal(id, signal) && r.status === 'completed' &&
      Number.isFinite(Date.parse(r.at)) && Date.parse(r.at) <= +now && scheduleDateKey(new Date(r.at), zone) === day)).length;
}
export function eveningHeadline(profile: DailyProfile | null, reminder: ContextualReminder | null, now: Date): boolean {
  const hour = Number(new Intl.DateTimeFormat('en-GB', {timeZone: profile?.timeZone || undefined, hour: '2-digit', hourCycle: 'h23'}).format(now));
  return Boolean((isLightReduction(reminder?.id) || reminder?.id === 'digital_sunset') && hour >= 17 && profile?.workStructure !== 'shift' && profile?.workStructure !== 'overnight');
}
export function responseAllowed(reminder: ContextualReminder | null, record: DailyEventState[string] | undefined, now: Date, day: string, zone?: string | null): boolean {
  return Boolean(reminder && day === scheduleDateKey(now, zone) && now >= reminder.start && reminder.end && now < reminder.end && !['completed','skipped'].includes(record?.status || ''));
}
export function smallerAction(id: string): string | null {
  if (id === 'morning_light' || id === 'midday_light') return 'If it’s safe and accessible, step outside briefly. Keep the step manageable; don’t look directly at the sun.';
  if (id === 'digital_sunset') return 'Put aside one nonessential bright screen for now, if safe. Keep any screen or lighting you need for work, navigation, or safety.';
  if (id === 'movement') return 'If comfortable for you, stand up or change position for a moment. Skip it if movement is unsafe or painful.';
  if (id === 'sleep_window') return 'Choose just the first step of your usual bedtime routine.';
  // Meal timing has its own evidence flow. Do not invent a substitute meal prescription.
  return null;
}
