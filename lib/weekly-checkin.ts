import type { DailyProfile, WeeklyCheckin } from '@/types/circadian';
import { localDateKey } from './live-clock';
import { shiftDateKey } from './schedule-time';
import { SIGNAL_REGISTRY } from './personalization/signal-registry';
export type WeeklyAction = { type: 'weekly' } | { type: 'off' } | { type: 'answer'; expectedAnchor: string; response: 'on_track' | 'adjusted' };
export function normalizeWeeklyCheckins(value: unknown): Record<string, WeeklyCheckin> {
 const result: Record<string, WeeklyCheckin> = {};
 if (!value || typeof value !== 'object' || Array.isArray(value)) return result;
 for (const [id, raw] of Object.entries(value)) {
  if (!SIGNAL_REGISTRY[id] || !raw || typeof raw !== 'object') continue;
  const v = raw as WeeklyCheckin;
  if (v.version !== 1 || !['weekly','off'].includes(v.mode)) continue;
  if (v.mode === 'weekly' && (!v.anchorAt || !Number.isFinite(Date.parse(v.anchorAt)))) continue;
  result[id] = {version:1,mode:v.mode,...(v.mode==='weekly'?{anchorAt:new Date(v.anchorAt!).toISOString()}:{}),
   ...(['on_track','adjusted'].includes(v.lastResponse || '') && v.answeredAt && Number.isFinite(Date.parse(v.answeredAt)) ? {lastResponse:v.lastResponse,answeredAt:new Date(v.answeredAt).toISOString()}: {})};
 }
 return result;
}
// Reinterpret the actual opt-in/answer instant in the current saved zone. Calendar
// addition (not 168 elapsed hours) keeps the due day stable through DST.
export function weeklyDueDate(entry: WeeklyCheckin | undefined, timeZone?: string | null): string | null {
 return entry?.mode==='weekly' && entry.anchorAt ? shiftDateKey(localDateKey(new Date(entry.anchorAt),timeZone),7) : null;
}
export function weeklyIsDue(entry: WeeklyCheckin | undefined, now: Date, timeZone?: string | null): boolean {
 const due=weeklyDueDate(entry,timeZone);return !!due && localDateKey(now,timeZone)>=due;
}
export function applyWeeklyAction(profile: DailyProfile | null, signalId: string, action: WeeklyAction, now: Date, eligible: boolean): DailyProfile | null {
 if (!profile || !SIGNAL_REGISTRY[signalId]) return profile;
 const entries=normalizeWeeklyCheckins(profile.weeklyCheckins), prior=entries[signalId];
 let next: WeeklyCheckin;
 if (action.type==='off') next={version:1,mode:'off'};
 else if (action.type==='weekly') {
  if (!eligible || prior?.mode==='weekly') return profile;
  next={version:1,mode:'weekly',anchorAt:now.toISOString()};
 } else {
  if (prior?.anchorAt!==action.expectedAnchor || !weeklyIsDue(prior,now,profile.timeZone)) return profile;
  next={version:1,mode:'weekly',anchorAt:now.toISOString(),answeredAt:now.toISOString(),lastResponse:action.response};
 }
 return {...profile,weeklyCheckins:{...entries,[signalId]:next}};
}
