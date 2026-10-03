import { hasValidCoordinates } from '../solar';
export type ZipLocation = { label: string; latitude: number; longitude: number };
export function parseZipLocation(value: unknown): ZipLocation[] {
  if (!value || typeof value !== 'object' || !('places' in value) || !Array.isArray(value.places)) return [];
  return value.places.flatMap((place: unknown) => {
    if (!place || typeof place !== 'object') return [];
    const p = place as Record<string, unknown>;
    if (typeof p['place name'] !== 'string' || typeof p['state abbreviation'] !== 'string' || typeof p.latitude !== 'string' || typeof p.longitude !== 'string' || !p.latitude.trim() || !p.longitude.trim()) return [];
    const latitude = Number(p.latitude), longitude = Number(p.longitude);
    return hasValidCoordinates(latitude, longitude) ? [{label: `${p['place name']}, ${p['state abbreviation']}`, latitude, longitude}] : [];
  }).slice(0, 20);
}
