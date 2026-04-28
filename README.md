# Foundational Flow Circadian App MVP

This is a shareable Next.js MVP for a circadian signal audit. It walks a user through a six-part questionnaire, calculates weighted circadian scores, identifies the weakest signal, and generates a daily protocol.

## What it includes

- Landing page
- Step-by-step audit flow
- Weighted circadian scoring
- Results page with weakest-signal interpretation
- Protocol page with personalized recommendations
- Dashboard summary
- Client-side local state only, with no auth requirement

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

- No environment variables are required for this MVP.
- Supabase is not integrated yet.
- Questionnaire answers are stored in local browser state only.

## Next product steps

- Add Supabase persistence for saved audits and dashboard history
- Add repeat-audit tracking over time
- Add richer protocol branching and educational guidance
