import type { EventRecord } from '@/types/circadian';

/** Opportunities support these focuses; completing one is not evidence of all of them. */
export const EVENT_SIGNAL_MAP: Record<string, string[]> = {
  morning_light: ['morning_light_timing', 'morning_light_duration'],
  first_meal: ['meal_timing_regularity'],
  midday_light: ['day_brightness', 'day_breaks_outside'],
  movement: ['morning_movement'],
  last_meal: ['meal_timing_regularity', 'last_meal_timing'],
  sunset: ['evening_light_reduction'],
  dim_house: ['evening_light_reduction'],
  digital_sunset: ['evening_screen_exposure'],
  sleep_window: ['sleep_schedule'],
};

// Preserve previously supported history. Never backfill duration, brightness,
// sleep, movement or meal-regularity claims from an old generic Done tap.
const LEGACY_SIGNALS: Record<string, string[]> = {
  morning_light: ['morning_light_timing'],
  midday_light: ['day_breaks_outside'],
  dim_house: ['evening_light_reduction'],
  digital_sunset: ['evening_screen_exposure'],
  last_meal: ['last_meal_timing'],
};

export function completionSignals(eventId: string, record: EventRecord): string[] {
  if (record.status !== 'completed') return [];
  if (record.coachingSignalId === null) return [];
  if (record.coachingSignalId !== undefined) {
    return EVENT_SIGNAL_MAP[eventId]?.includes(record.coachingSignalId) ? [record.coachingSignalId] : [];
  }
  return LEGACY_SIGNALS[eventId] ?? [];
}
