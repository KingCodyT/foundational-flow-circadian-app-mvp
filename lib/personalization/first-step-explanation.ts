import { buildTodaysFlow } from '../flow-engine';
import { scheduleDateKey, scheduleTime } from '../schedule-time';
import type { DailyProfile } from '@/types/circadian';
import type { FirstRunGuidance } from './first-run-guidance';
import { eventSupportsSignal } from './now-coaching';
import { SIGNAL_REGISTRY } from './signal-registry';

/** Copy only: does not choose actions, alter timing, or write evidence. */
export function firstStepExplanation(profile: DailyProfile, now: Date, signalId: string, step: FirstRunGuidance,
  nextFocus?: FirstRunGuidance) {
  const morning = ['morning_light_timing', 'morning_light_duration'].includes(signalId);
  const focus = morning ? 'morning light' : (SIGNAL_REGISTRY[signalId]?.label || 'your selected habit').replace(/ Priority$/, '').toLowerCase();
  const supportsFocus = eventSupportsSignal(step.eventId, signalId);
  if (supportsFocus) return { why: `This step puts your ${focus} focus into practice.`, next: undefined };
  const today = scheduleDateKey(now, profile.timeZone);
  const { events } = buildTodaysFlow({ date: scheduleTime(today, '12:00', profile.timeZone)!, now, profile: {
    ...profile, latitude: profile.locationPermissionGranted ? profile.latitude : null,
    longitude: profile.locationPermissionGranted ? profile.longitude : null,
  } });
  const morningWindow = events.find(event => event.id === 'morning_light');
  const morningEndedToday = morning && morningWindow?.end && morningWindow.end <= now &&
    scheduleDateKey(morningWindow.start, profile.timeZone) === today;
  const why = morningEndedToday
    ? 'Today’s morning-light window has ended. This is a supporting step for your sleep schedule; morning light is still your focus.'
    : `This is a supporting step for your schedule. Your focus remains ${focus}.`;
  return { why, next: nextFocus ? { ...nextFocus, label: `Next for ${focus}`, reason: nextFocus.eventId === 'morning_light' && profile.locationPermissionGranted ? nextFocus.reason : undefined } : undefined };
}
