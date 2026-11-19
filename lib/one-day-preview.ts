import { buildTodaysFlow } from './flow-engine';
import { scheduleTime, scheduleDateKey, shiftDateKey } from './schedule-time';
import type { DailyProfile } from '@/types/circadian';

/** Pure what-if: never writes a profile, event or notification. */
export function oneDayPreview(profile: Partial<DailyProfile>, now: Date, day: 'today'|'tomorrow', wake: string, bed: string) {
  const key = shiftDateKey(scheduleDateKey(now, profile.timeZone), day === 'tomorrow' ? 1 : 0);
  const wakeAt = scheduleTime(key, wake, profile.timeZone);
  // Bedtime explicitly belongs to the night before the selected wake.
  const bedKey = bed <= wake ? key : shiftDateKey(key, -1);
  const bedAt = scheduleTime(bedKey, bed, profile.timeZone);
  if (!wakeAt || !bedAt || +bedAt >= +wakeAt) return null;
  const p = {...profile, wakeTime:wake, targetBedtime:profile.targetBedtime,
    latitude:profile.locationPermissionGranted ? profile.latitude : null,
    longitude:profile.locationPermissionGranted ? profile.longitude : null};
  const flow = buildTodaysFlow({date:scheduleTime(key,'12:00',profile.timeZone)!,now,profile:p});
  const located = flow.locationAvailable;
  const morning = located ? flow.events.find(e=>e.id==='morning_light' && scheduleDateKey(e.start,profile.timeZone)===key) : undefined;
  // Same two-hour evening rule as flow-engine, anchored to the explicitly dated bed.
  const evening = {start:new Date(+bedAt-120*60000), guidance:'Reduce bright lighting about two hours before your entered bedtime.'};
  return {key,wakeAt,bedAt,evening,morning,located,solar:flow.solar,sleepHours:(+wakeAt-+bedAt)/3600000};
}
