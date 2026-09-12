import { getSolarTimes, hasValidCoordinates, SolarTimes } from "../solar";
import { DailyProfile } from "@/types/circadian";
import { Confidence } from "./types";

export type DerivedEnvironment = {
  latitude?: number | null;
  longitude?: number | null;
  // Whether we had explicit coordinates available from the user's profile
  locationAvailable: boolean;
  // Timezone reported by the runtime environment (IANA string) — see provenance below
  timezone?: string | null;
  // Local date string for the environment in YYYY-MM-DD (derived from the provided date)
  localDate: string;
  // Solar times (ISO strings) when available
  sunrise?: string | null;
  sunset?: string | null;
  solarNoon?: string | null;
  civilDawn?: string | null;
  civilDusk?: string | null;
  // Day length in minutes when available
  dayLengthMinutes?: number | null;
  // Day-of-year numeric (1..366) — objective calendar-derived value
  dayOfYear: number;
  // Timestamp when this object was last calculated
  lastCalculatedAt: string;
  // Basic provenance / confidence notes about the derivation
  provenance: {
    locationSource: "profile" | "none";
    timezoneSource: "system" | "profile-unknown";
    timezoneReliable: boolean; // whether timezone was objectively derived from coords (false if unavailable)
    confidence?: Confidence;
  };
  // Raw solar data returned by the solar utilities (keeps consumers from re-calling solar)
  solarRaw?: SolarTimes | null;
};

export function buildDerivedEnvironment(opts?: { profile?: DailyProfile | null; date?: Date | null; now?: Date | null; }): DerivedEnvironment {
  const profile = opts?.profile ?? null;
  const date = opts?.date ?? new Date();
  const now = opts?.now ?? new Date();

  const locationAvailable = Boolean(
    profile && profile.locationPermissionGranted && hasValidCoordinates(profile.latitude, profile.longitude),
  );

  const latitude = locationAvailable ? profile!.latitude! : null;
  const longitude = locationAvailable ? profile!.longitude! : null;

  // Reuse existing solar calculation module. It returns local Date objects when available.
  const solar = getSolarTimes(date, latitude ?? null, longitude ?? null);

  // Runtime/system timezone (IANA) — browsers/hosts provide this via Intl. This is the best
  // available value without calling external timezone lookup services.
  const tz = (() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
    } catch (e) {
      return null;
    }
  })();

  const localDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  // day-of-year
  // Calendar arithmetic must not lose an hour across daylight saving changes.
  const startOfYear = Date.UTC(date.getFullYear(), 0, 0);
  const diff = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - startOfYear;
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);

  const result: DerivedEnvironment = {
    latitude,
    longitude,
    locationAvailable,
    timezone: tz,
    localDate,
    sunrise: solar.sunrise ? solar.sunrise.toISOString() : null,
    sunset: solar.sunset ? solar.sunset.toISOString() : null,
    solarNoon: solar.solarNoon ? solar.solarNoon.toISOString() : null,
    // The current solar utility does not calculate civil twilight.
    civilDawn: null,
    civilDusk: null,
    dayLengthMinutes: solar.dayLengthMinutes ?? null,
    dayOfYear,
    lastCalculatedAt: now.toISOString(),
    provenance: {
      locationSource: locationAvailable ? "profile" : "none",
      timezoneSource: tz ? "system" : "profile-unknown",
      // Without an external timezone lookup from coordinates, the timezone cannot be
      // objectively guaranteed to match the provided lat/lon; mark as unreliable when
      // coordinates are present but no authoritative TZ mapping was done.
      timezoneReliable: locationAvailable ? false : Boolean(tz),
      confidence: {
        score: locationAvailable ? 0.9 : 0.3,
        lastEvidenceAt: locationAvailable ? now.toISOString() : undefined,
        sources: locationAvailable ? ["profile.location"] : ["system.timezone"],
      },
    },
    solarRaw: solar,
  };

  return result;
}

export default buildDerivedEnvironment;
