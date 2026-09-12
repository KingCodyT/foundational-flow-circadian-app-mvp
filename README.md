# Foundational Flow Circadian App MVP

Foundational Flow is a local-first Next.js app organized around NOW, RHYTHM, and YOU. The current branch is the implementation source of truth.

## Current experience

- `/now`: current guidance, the next upcoming event, and available sunrise/sunset context. Confirming an action saves dated behavioral evidence.
- `/rhythm`: today's timeline using the engine's current, upcoming, completed, skipped, and missed statuses.
- `/you` (also `/`): profile/environment facts, behavioral coaching states, confidence, and the primary coaching target.
- `/audit`: six assessment sections containing 18 questions. Finishing saves completion and opens YOU.
- `/dev/evidence`: evidence test controls in local development only. Production HTML and Next data requests return 404.

The legacy `/dashboard`, `/results`, and `/tracker` routes show YOU; `/season` shows RHYTHM; `/todays-flow` and `/protocol` show NOW. These are compatibility aliases, not separate legacy features.

## Personalization and persistence

Assessment answer values seed per-signal coaching states and confidence. Dated event records provide additional behavioral evidence. Signal classification and hierarchy determine the primary coaching target. The app does not calculate an aggregate circadian score or generate a protocol.

Question option `score` values remain necessary for initial coaching-state mapping and are currently displayed by assessment cards. Question weights and category score keys have been removed. Provisional mappings remain for combined meal/activity, late-meal/stimulant, schedule variability, season, and latitude questions; changing these requires a deliberate personalization migration.

`components/circadian-provider.tsx` persists answers, assessment completion, client ID, save timestamp, daily profile/location, participation level, and dated event records in browser local storage under `foundational-flow-circadian-app-state`. The legacy audit names and storage key are retained for compatibility. No server persistence or email service is wired into the current app. No service credentials are required.

Profile and participation form components remain in the repository but are not mounted by the current main views. Existing stored values are still consumed. Participation is stored and passed to the flow engine; it does not currently change the generated schedule.

## Local development

Install dependencies with `npm install`, then run:

```bash
npm run dev -- --hostname 127.0.0.1 --port 3001
```

The scripts use the existing macOS Next/SWC bootstrap workaround. Deployment environments use the standard Next.js path through the same scripts.

## Validation and production

```bash
npm test
npx tsc --noEmit --incremental false
npm run build
npm run start -- --hostname 127.0.0.1 --port 3001
```

The regression tests cover solar reference times across timezones, polar day/night, invalid inputs, DST/leap-day calendar arithmetic, stable default scheduling, and persisted event statuses. `npm run lint` currently opens ESLint setup because no ESLint configuration is installed; it is not yet an unattended validation check.

## Solar calculations

The NOAA-based utility supplies sunrise, sunset, solar noon, and day length as UTC instants for the requested local calendar date. It refines the calculation at the individual events, handles UTC date rollover, and formats results in the runtime timezone. Reference tests use US Naval Observatory results with a two-minute tolerance for the selected ordinary-latitude fixtures.

Polar day/night returns no sunrise or sunset, with 24 or 0 hours of daylight, and the UI explains the condition. Invalid coordinates yield unavailable data. Civil dawn/dusk remain explicitly unavailable (`null`); adding twilight calculations would be a separate feature. These are approximate astronomical times, without terrain or local weather adjustments. Coordinates do not provide an IANA timezone; when viewing a remote location, display still uses the device timezone.

Sources: [NOAA equations](https://gml.noaa.gov/grad/solcalc/solareqns.PDF) and [USNO reference data](https://aa.usno.navy.mil/api/rstt/oneday?date=2026-06-21&coords=37.7749,-122.4194&tz=-7).

## Navigation and scheduling

Assessment and main views share `FlowShell` with NOW/RHYTHM/YOU navigation, including on narrow screens. Assessment completion still navigates to YOU. The obsolete navigation shell has been removed.

Without a valid saved wake time, the schedule uses 07:00 on the requested local date; opening the app later does not move event times. An absent bedtime retains the existing fallback of 15 hours after wake. Saved answers, profile, participation, and dated evidence keep their existing storage format.

## Historical reference

`supabase/schema.sql` is the unused Build 1 table definition, retained for existing installations as a historical reference. It is not a setup step for this app. Its score, insight, and protocol columns do not describe the current local state. The old audit API and protocol email endpoint are absent.
