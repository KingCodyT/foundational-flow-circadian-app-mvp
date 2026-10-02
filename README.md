# Foundational Flow Circadian App MVP

Foundational Flow is a local-first Next.js app organized around Today, Timeline, and Profile. The current branch is the implementation source of truth.

## Current experience

- `/today`: current coaching focus, one relevant reminder or silence, and a small pattern summary. Meal recording and editing remain available.
- `/timeline`: a dedicated shared-shell scaffold. Historical browsing, recommendation history and the complete Timeline read model are deferred to Stage 4.
- `/profile`: profile/preferences and existing meal history.
- `/audit` (also `/`): five-stage onboarding (Basics, Schedule, Environment, Your Reality, Finish), retaining draft recovery, optional location, saved profile/timezone and approved artwork. Finish hands into `/today?view=overview`.
- `/dev/evidence`: development-only evidence controls; production requests return 404.

Compatibility redirects preserve query parameters: `/rhythm`, `/my-day`, `/season` → `/timeline`; `/now`, `/todays-flow`, `/protocol` → `/today`; `/you`, `/my-profile`, `/dashboard`, `/results`, `/tracker` → `/profile`.

## Personalization and persistence

Assessment answer values seed per-signal coaching states and confidence. Dated event records provide additional behavioral evidence. Signal classification and hierarchy determine the primary coaching target. The app does not calculate an aggregate circadian score or generate a protocol.

Question option `score` values remain necessary for initial coaching-state mapping and are currently displayed by assessment cards. Question weights and category score keys have been removed. Provisional mappings remain for combined meal/activity, late-meal/stimulant, schedule variability, season, and latitude questions; changing these requires a deliberate personalization migration.

`components/circadian-provider.tsx` persists answers, assessment completion, client ID, save timestamp, daily profile/location, participation level, and dated event records in browser local storage under `foundational-flow-circadian-app-state`. The legacy audit names and storage key are retained for compatibility. No server persistence or email service is wired into the current app. No service credentials are required.

Profile exposes profile and participation controls under “Edit profile & preferences.” Saved wake/bed times immediately update the rhythm; browser location can be requested, updated, or removed without changing assessment answers. Location errors are shown inline and preserve any previously saved location. Participation is stored and passed to the flow engine; it does not currently change the generated schedule, and the control states that limitation.

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

The regression tests cover solar reference times across timezones, polar day/night, invalid inputs, DST/leap-day calendar arithmetic, stable default scheduling, persisted event statuses, live clock transitions, tab resume, cleanup, and midnight evidence rollover. `npm run lint` currently opens ESLint setup because no ESLint configuration is installed; it is not yet an unattended validation check.

## Solar calculations

The NOAA-based utility supplies sunrise, sunset, solar noon, and day length as UTC instants for the requested local calendar date. It refines the calculation at the individual events, handles UTC date rollover, and formats results in the runtime timezone. Reference tests use US Naval Observatory results with a two-minute tolerance for the selected ordinary-latitude fixtures.

Polar day/night returns no sunrise or sunset, with 24 or 0 hours of daylight, and the UI explains the condition. Invalid coordinates yield unavailable data. Civil dawn/dusk remain explicitly unavailable (`null`); adding twilight calculations would be a separate feature. These are approximate astronomical times, without terrain or local weather adjustments. Coordinates do not provide an IANA timezone; when viewing a remote location, display still uses the device timezone.

Sources: [NOAA equations](https://gml.noaa.gov/grad/solcalc/solareqns.PDF) and [USNO reference data](https://aa.usno.navy.mil/api/rstt/oneday?date=2026-06-21&coords=37.7749,-122.4194&tz=-7).

## Navigation and scheduling

The single root provider owns the live clock, saved-timezone runtime date and shared personalization state. Routes consume that state; navigation does not rebuild or reset accepted focus, evidence, confidence, reconsideration or Established progress. Initial first-run guidance caching remains intact and is separate from personalization.

The shared journey navigation exposes exactly Today / Timeline / Profile. The active canonical link has `aria-current="page"`, a visible indicator and keyboard focus styling. The onboarding Finish screen uses the same navigation; its button goes to Today. No Stage 4 historical functionality is included yet.

Stage 3 non-browser validation uses `npm run test:non-browser` and `node node_modules/typescript/bin/tsc --noEmit --incremental false`. It mounts real page components under one provider, tests route changes and onboarding handoff, and exercises all legacy redirect functions. Browser history, responsive visual and keyboard testing in a real browser remain deferred to authorized browser validation.

Without a valid saved wake time, the schedule uses 07:00 on the requested local date; opening the app later does not move event times. An absent bedtime retains the existing fallback of 15 hours after wake. Saved answers, profile, participation, and dated evidence keep their existing storage format.

## Historical reference

`supabase/schema.sql` is the unused Build 1 table definition, retained for existing installations as a historical reference. It is not a setup step for this app. Its score, insight, and protocol columns do not describe the current local state. The old audit API and protocol email endpoint are absent.
