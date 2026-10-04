import type { DailyProfile } from '../types/circadian';
import { getSolarTimes, hasValidCoordinates } from './solar';

export const LIGHT_PHASES = [
  { id: 'dawn', label: 'Around sunrise', action: 'Welcome the morning outside', light: 'The sun is close to the horizon. Daylight is changing quickly.', why: 'Light reaching your eyes helps your brain’s clock track the start of the day.', invitation: 'If you’re starting your day, step outside and enjoy the sky. Look around naturally, without looking directly at the sun.' },
  { id: 'morning', label: 'Morning light', action: 'Take a little daylight break', light: 'The sun is climbing. Outdoor light contains a broad mix of wavelengths.', why: 'As the sun climbs, its light takes a shorter path through the atmosphere. Brightness and the spectral mix change, while visible daylight helps your body clock distinguish daytime from night.', invitation: 'Take your next quiet moment outdoors. Let the morning daylight reach your eyes naturally while you walk or look around—without looking directly at the sun.' },
  { id: 'midday', label: 'Around solar noon', action: 'Connect with the midday light', light: 'The sun is near its highest point today. UV levels often peak around solar noon.', why: 'The sun is near its highest point for your location. Its light travels through less atmosphere than near sunrise or sunset, changing the amount and mix reaching the ground. UV often reaches its daily peak around this time.', invitation: 'Bring your next break outdoors and connect with the daylight. Visible light gives your eyes a daytime signal; the other bands interact with skin and tissue in different ways, explained below.' },
  { id: 'afternoon', label: 'Afternoon light', action: 'Reconnect with the afternoon', light: 'The sun is moving lower toward the horizon. Brightness and the mix of wavelengths change along its path.', why: 'As the sun lowers, sunlight travels through more atmosphere and its intensity and mix change. Visible daylight continues to signal daytime as the transition toward evening approaches.', invitation: 'Consider an easy outdoor break while it’s still light. Notice how the sky has changed since morning.' },
  { id: 'sunset', label: 'Around sunset', action: 'Step outside for the sunset', light: 'The sun is near the horizon and daylight is fading. The sky’s colors depend on the atmosphere and clouds.', why: 'A dimmer evening reduces the light signal that can keep your body clock in daytime mode as bedtime approaches.', invitation: 'Enjoy the changing sky without looking directly at the sun. Then keep the transition going with softer indoor lighting.' },
  { id: 'night', label: 'After daylight', action: 'Let the evening get quieter', light: 'The sun is below the horizon. Your indoor lighting now matters more to your light exposure.', why: 'Bright evening light can delay the body clock and suppress melatonin. Dimmer surroundings support the transition toward sleep.', invitation: 'If you’re winding down, soften bright lights and make your sleeping space dark and comfortable.' },
] as const;

export function getLightCheckIn(profile: DailyProfile | null, now: Date) {
  if (!Number.isFinite(now.getTime()) || !profile?.locationPermissionGranted || !hasValidCoordinates(profile.latitude, profile.longitude)) return null;
  const solar = getSolarTimes(now, profile.latitude, profile.longitude, profile.timeZone);
  if (!solar.sunrise || !solar.sunset) return { solar, phase: null, next: null, polar: solar.dayLengthMinutes === 1440 ? 'day' : solar.dayLengthMinutes === 0 ? 'night' : 'unknown' } as const;
  const rise = solar.sunrise.getTime(), set = solar.sunset.getTime(), length = set - rise;
  // Gentle check-in windows, not measured spectral or UV thresholds. Scale for short days.
  const edge = Math.min(30 * 60000, length / 10);
  const boundaries = [rise - edge, rise + edge, rise + length * .4, rise + length * .6, set - edge, set + edge].map(Math.round);
  const t = now.getTime();
  const index = t < boundaries[0] || t >= boundaries[5] ? 5 : boundaries.findIndex((end, i) => i > 0 && t < end) - 1;
  const nextIndex = boundaries.findIndex(value => value > t);
  const next = nextIndex >= 0 ? { at: new Date(boundaries[nextIndex]), label: LIGHT_PHASES[nextIndex].label } : null;
  return { solar, phase: LIGHT_PHASES[index], next, polar: null } as const;
}
