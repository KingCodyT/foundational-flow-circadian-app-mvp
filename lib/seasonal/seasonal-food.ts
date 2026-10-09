import regions from './regions.json';
import calendar from './harvest-calendar.json';
import boundaries from './us-boundaries.json';
import type { DailyProfile } from '@/types/circadian';
import { hasValidCoordinates } from '@/lib/solar';

export const FOOD_REGIONS = regions;
export const HARVEST_SOURCE = 'https://www.seasonalfoodguide.org';
export type SeasonalFood = { region: string; regionName: string; period: number; periodLabel: string; vegetables: string[]; fruits: string[]; source: string };
// Ray casting against state outlines, including islands; no coordinates leave the device.
function inRing(x: number, y: number, ring: number[][]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function nearRing(x: number, y: number, ring: number[][]) {
  // Simplified coastal outlines can omit waterfront neighborhoods. A small tolerance
  // makes the result a suggested region, which is always user-correctable.
  return ring.some(([ax, ay], i) => {
    const [bx, by] = ring[(i + 1) % ring.length];
    const dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(x - ax - t * dx, y - ay - t * dy) < 0.05;
  });
}
export function regionFromCoordinates(latitude: number, longitude: number): string | null {
  if (!hasValidCoordinates(latitude, longitude)) return null;
  for (const tolerateCoast of [false, true]) for (const state of boundaries) {
    const polygons = (state.geometry.type === 'Polygon' ? [state.geometry.coordinates] : state.geometry.coordinates) as number[][][][];
    if (polygons.some(p => (inRing(longitude, latitude, p[0]) || (tolerateCoast && nearRing(longitude, latitude, p[0]))) && !p.slice(1).some(r => inRing(longitude, latitude, r)))) {
      const id = regions.find(r => r.name === state.name || (state.name === 'District of Columbia' && r.id === 'DC'))?.id;
      // These splits are approximate. The visible selector lets users correct their growing region.
      if (id === 'CA') return latitude >= 36 ? 'NCA' : 'SCA';
      if (id === 'FL') return latitude >= 28 ? 'NFL' : 'SFL';
      return id ?? null;
    }
  }
  return null;
}
export function seasonalFood(profile: DailyProfile | null, now: Date): SeasonalFood | null {
  const automatic = profile?.locationPermissionGranted && hasValidCoordinates(profile.latitude, profile.longitude)
    ? regionFromCoordinates(profile.latitude!, profile.longitude!) : null;
  const region = regions.find(r => r.id === (profile?.foodRegion || automatic));
  if (!region || !Number.isFinite(now.getTime())) return null;
  let parts: Intl.DateTimeFormatPart[];
  try { parts = new Intl.DateTimeFormat('en-US', { timeZone: profile?.timeZone || undefined, month: 'numeric', day: 'numeric' }).formatToParts(now); }
  catch { return null; }
  const month = Number(parts.find(p => p.type === 'month')?.value);
  const day = Number(parts.find(p => p.type === 'day')?.value);
  const period = (month - 1) * 2 + (day <= 15 ? 1 : 2);
  const names = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const available = calendar.filter(c => (c.regions as Record<string, number[]>)[region.id]?.includes(period));
  const vegetables = available.filter(c => c.kind === 'vegetable' || c.name === 'Tomatoes').map(c => c.name);
  const fruits = available.filter(c => c.kind === 'fruit' && c.name !== 'Tomatoes').map(c => c.name);
  return {region: region.id, regionName: region.name, period, periodLabel: `${day <= 15 ? 'Early' : 'Late'} ${names[month - 1]}`, vegetables, fruits,
    source: `${HARVEST_SOURCE}/${region.name.toLowerCase().replaceAll(' ', '-')}/${day <= 15 ? 'early' : 'late'}-${names[month - 1].toLowerCase()}`};
}
