# Reminder-first Today — review

## Implementation

Today now contains only the current coaching focus, one relevant actionable reminder (or quiet state), and at most two pattern summaries. Environmental estimates, schedule anchors, Food calculations, the timeline lineup, and calculation disclosure are absent from Today.

The internal selector ranks actionable opportunities for the existing target, combines evening cues, excludes unsupported first-meal coaching, respects stage/evidence, and supplies one pending opportunity to the existing notification planner. Each in-app reminder includes an action, reason, and Done / Not today / Adjust responses. Adjust offers a persisted 15-minute deferral only while the biological window remains open, plus a link to schedule/preferences. A deferred evening reminder suppresses overlapping evening cues. Neither deferral nor response changes saved anchors.

You → Your schedule edits wake, bedtime, last meal, and timezone. Food goal and reminder opt-in live there too. Existing meal recording/editing has moved to optional Meal history under You. Notifications require explicit preference opt-in and browser permission. Opt-out blocks planning/delivery and cancels pending server delivery through the existing cancellation path. No external delivery was triggered for validation.

## Validation

- 178 non-browser tests passed, 0 failures.
- 22 focused reminder, notification, coaching, and navigation checks passed.
- TypeScript: `npx tsc --noEmit` passed.
- Production build: `npm run build` passed in an isolated copy of the final source.
- Walkthrough browser smoke passed: no calculation UI; one reminder; Adjust persistence; Not today suppression after reload; notification opt-out; unchanged 18:30 meal and 21:45 bedtime while editing another schedule field; profile/device timezone difference; mobile layout; no page errors.
- Meal-history browser regression passed: recording, editing, dialog keyboard/focus behavior, and legacy Timeline redirection.
- `git diff --check` passed.

## Limits

No failing local checks remain. Real OS/background push delivery was not exercised; it depends on notification permission and the existing configured transport. Reminder responses are exposed in the app when a notification opens Today. First-meal guidance remains observational when habits, goals, and constraints do not support an actionable recommendation.

No commit, push, merge, or deployment was performed.

## Exact files changed in this request

Compared with the working-tree snapshot at the start of this request; earlier uncommitted work was preserved.

- `components/circadian-provider.tsx`
- `components/food-timing-history.tsx`
- `components/future-notification-planner-bridge.tsx`
- `components/journey-now.tsx`
- `components/notification-transport-bridge.tsx`
- `components/todays-flow/daily-profile-form.tsx`
- `docs/biological-timeline.md`
- `docs/reminder-first-review.md`
- `lib/personalization/contextual-reminders.ts`
- `lib/personalization/future-notification-planner.ts`
- `scripts/smoke/biological-timeline.cjs`
- `tests/food-timing-browser-regression.test.cjs`
- `tests/timeline-semantics-contract.test.cjs`
- `tests/walkthrough-coaching.test.cjs`
- `types/circadian.ts`
- `views/now-page.tsx`
- `views/you-page.tsx`
