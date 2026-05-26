# Foundational Flow Circadian App MVP

This is a shareable Next.js MVP for a circadian signal audit. It walks a user through a six-part questionnaire, calculates weighted circadian scores, identifies the weakest signal, generates a daily protocol, tracks progress across repeat audits, and translates the results into a lived daily rhythm with environmental context.

## What it includes

- Welcome and overview page
- Step-by-step audit flow
- Weighted circadian scoring
- Results page with weakest-signal interpretation
- Protocol page with personalized recommendations
- Daily Rhythm page with morning, daytime, evening, and sleep-window structure
- Dashboard with progress tracking and recent audit history
- Seasonal and latitude-aware environment guidance
- Seasonal food rhythm suggestions
- Exact weekly habit guidance
- Local browser persistence by default
- Optional Supabase-backed audit history, with no auth requirement for the MVP

## Local development

On this machine, local development uses a small bootstrap script because of a platform-specific Next/SWC issue:

```bash
node scripts/next-wasm-bootstrap.cjs dev --hostname 127.0.0.1 --port 3001
```

## Vercel deployment

Vercel should use the standard Next.js build path.

### Recommended path

1. Push this project to a Git repository.
2. Import the repository into Vercel.
3. Keep the detected framework as `Next.js`.
4. Deploy with the default install command and the configured build command.

### Notes

- No environment variables are required for the local-only version.
- Questionnaire answers are always kept in browser state for immediate UX.
- If Supabase settings are not present, the app falls back gracefully to local persistence only.

## Optional Supabase persistence

The app can save and reload recent audits through `pages/api/audits.ts` when these environment variables are set:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_AUDITS_TABLE=circadian_audits
```

Recommended table shape:

- `id uuid primary key`
- `client_id text not null`
- `created_at timestamptz default now()`
- `answers jsonb not null`
- `scores jsonb not null`
- `insight jsonb not null`
- `protocol jsonb not null`

A starter SQL file is included at `supabase/schema.sql`.

## Next product steps

- Add repeat-audit tracking over time
- Add richer protocol branching and educational guidance
- Add auth and user-specific history once the anonymous MVP flow is validated
