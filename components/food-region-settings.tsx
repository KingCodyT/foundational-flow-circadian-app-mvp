import Link from 'next/link';
import { useCircadian } from './circadian-provider';
import { FOOD_REGIONS, seasonalFood } from '@/lib/seasonal/seasonal-food';

export function FoodRegionSettings() {
  const { dailyProfile, setDailyProfile, now } = useCircadian();
  const season = seasonalFood(dailyProfile, now);
  return <section className="journey-card" aria-label="Seasonal food location">
    <h2>Food from your region</h2>
    <p>Your growing region and time of year determine the seasonal produce used in meal ideas below.</p>
    <label htmlFor="food-region">Growing region</label>{' '}
    <select id="food-region" value={dailyProfile?.foodRegion || ''} onChange={event => setDailyProfile({
      wakeTime: null, targetBedtime: null, locationPermissionGranted: false, ...dailyProfile, foodRegion: event.target.value,
    })}>
      <option value="">Use my saved location</option>
      {FOOD_REGIONS.map(region => <option key={region.id} value={region.id}>{region.name}</option>)}
    </select>
    <p className="food-idea-note" role="status">{season ? `${season.regionName} · ${season.periodLabel}. ${dailyProfile?.foodRegion ? 'Your chosen growing region.' : 'Matched from your saved coordinates; correct the region here if needed.'}` : 'Choose a U.S. growing region, or save your location in Profile. General meal ideas remain available until a region is set.'}</p>
    <p className="food-idea-note">All 50 states and Washington, DC are available. Regional calendars describe typical availability; weather, storage, and growing methods can vary. Ask your grower what is being harvested now.</p>
    <Link href="/profile" className="underline">Manage saved location</Link>
  </section>;
}
