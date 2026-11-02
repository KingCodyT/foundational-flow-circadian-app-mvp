import { scheduleDateKey, shiftDateKey } from '../schedule-time';
import type { DailyProfile } from '@/types/circadian';
import { guidanceTime, type FirstRunGuidance } from './first-run-guidance';
import { eventSupportsSignal } from './now-coaching';
import { SIGNAL_REGISTRY } from './signal-registry';

/** Calendar language follows the saved timezone, not the device or a presumed day shift. */
function dayPart(at: string, now: Date, profile: DailyProfile) {
  const date = new Date(at), key = scheduleDateKey(date, profile.timeZone), today = scheduleDateKey(now, profile.timeZone);
  const hour = Number(new Intl.DateTimeFormat('en-US', {timeZone: profile.timeZone || undefined, hour:'numeric',hourCycle:'h23'}).format(date));
  if (key === today) return hour < 5 ? 'today' : hour < 12 ? 'this morning' : hour >= 18 ? 'tonight' : 'today';
  if (key === shiftDateKey(today, 1)) return hour < 5 ? 'tomorrow' : hour < 12 ? 'tomorrow morning' : hour >= 18 ? 'tomorrow evening' : 'tomorrow afternoon';
  return new Intl.DateTimeFormat('en-US', {timeZone:profile.timeZone || undefined,weekday:'long',month:'short',day:'numeric'}).format(date);
}

/** Copy only: does not choose actions, alter timing, or write evidence. */
export function firstStepExplanation(profile: DailyProfile, now: Date, signalId: string, step: FirstRunGuidance,
  nextFocus?: FirstRunGuidance) {
  const morning = ['morning_light_timing', 'morning_light_duration'].includes(signalId);
  const focus = morning ? 'morning light' : (SIGNAL_REGISTRY[signalId]?.label || 'selected habit').replace(/ Priority$/, '').toLowerCase();
  const heading = new Date(step.start) <= now ? 'Start here now' : `Start here ${dayPart(step.start, now, profile)} at ${guidanceTime(step.start, profile.timeZone)}`;
  const supportsFocus = eventSupportsSignal(step.eventId, signalId);
  if (supportsFocus) return { heading, why: `This first step puts your ${focus} focus into practice.`, next: undefined };
  const why = `This first step supports your sleep and wake schedule. Your focus remains ${focus}.`;
  const part = nextFocus ? dayPart(nextFocus.start, now, profile) : '';
  return { heading, why, next: nextFocus ? { ...nextFocus,
    label: `${part.charAt(0).toUpperCase()}${part.slice(1)}: your ${morning ? 'morning-light' : focus} step`,
    clock: guidanceTime(nextFocus.start, profile.timeZone),
    reason: nextFocus.eventId === 'morning_light' && profile.locationPermissionGranted ? nextFocus.reason : undefined,
  } : undefined };
}
