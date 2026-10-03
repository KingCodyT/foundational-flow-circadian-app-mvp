import Link from 'next/link';
import type { DailyProfile } from '@/types/circadian';
import { hasValidCoordinates } from '@/lib/solar';

export function LocationRequiredNotice({ profile, onProfile = false }: { profile: DailyProfile | null; onProfile?: boolean }) {
  if (profile?.locationPermissionGranted && hasValidCoordinates(profile.latitude, profile.longitude)) return null;
  return <aside className="journey-card" aria-label="Location needed for personalization">
    <h2>Start with your location</h2>
    <p><strong>Saving your location is essential to personalizing Circadian Flow.</strong> Where you live determines your local daylight and helps us choose the regional calendar for seasonal food suggestions.</p>
    <p>Until you save it, the app cannot tailor sunrise, sunset, or day length to you. Meal ideas use general guidance unless you choose a growing region. A food region alone does not personalize your daylight guidance.</p>
    <p className="food-idea-note">Your location stays in this browser. Update it when you travel or move.</p>
    {onProfile ? <a href="#profile-location" className="journey-outline inline-flex mt-4">Save my location below</a> : <Link href="/profile#profile-location" className="journey-outline inline-flex mt-4">Save my location</Link>}
  </aside>;
}
