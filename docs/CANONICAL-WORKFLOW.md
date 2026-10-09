# Canonical development workflow

This repository has one source of truth:

- `main` — canonical development and production branch. Every upgrade starts here and returns here after review.
- `feature/*` and `review/*` — temporary branches only. They must not become competing versions of the app.

## Upgrade rule

1. Update the local repository from `main`.
2. Create one short-lived feature or review branch.
3. Implement and verify the change with tests, a production build, and a preview when UI behavior changes.
4. Merge the reviewed change back into `main`.
5. Delete or archive the temporary branch after merge.
Never begin an upgrade from an integration branch, old review branch, downloaded copy, or unmerged preview. A deployment URL is evidence for review, not a source of code.

## Canonical onboarding ownership

| Experience | Route | Canonical implementation |
| --- | --- | --- |
| 16-question circadian evidence assessment | `/` and `/audit` | `views/audit-page.tsx` and `lib/questionnaire.ts` |
| Personal profile setup | `/setup` | `views/profile-setup-page.tsx` |
| Today | `/today` | `views/now-page.tsx` |
| Timeline | `/timeline` | `views/timeline-page.tsx` |
| Profile | `/profile` | `views/you-page.tsx` |

The 16-question assessment collects evidence first and routes to `/setup`. Profile setup persists the profile, marks onboarding complete, and routes to Today. Do not combine, shorten, or replace these flows without an explicit product decision and matching contract tests.
