# Visible first-action explanation

Local-only copy/presentation fix, based on 042a480. No event selection, timing, evidence or progression rules changed. Existing 4181 profile and answers retained; no action was marked complete, deferred or skipped during verification.

The primary action card now shows the action's existing reason, distinguishes same-focus practice from a supporting schedule action, and shows the next accepted-focus opportunity when one is returned by the existing selector. A statement that today's morning-light window ended is made only when the computed window actually ended on the current saved-zone date. No blanket tomorrow/evening language is used. The assessment evidence remains in “Why this focus?”; the action explanation is always visible.

Exact live review case verified: 6 AM wake, 10 PM bedtime, America/Los_Angeles. 8 PM reduction step visibly supports 10 PM bedtime; today's morning-light window ended; morning light remains selected. Next morning-light opportunity displays Monday November 2 at 6:11 AM, with explanation that this follows the 6 AM wake time and local daylight. No raw coordinates were accessed or copied.

Verification: 464 non-browser tests passed; tsc --noEmit passed; git diff --check passed. New tests cover same-focus, supporting-action, after-window, overnight and actual visible primary-card rendering. Desktop and 390x844 mobile inspected; viewport restored. No new build/lint run for this presentation-only follow-up (previous local build passed; repository still lacks a configured standalone lint command).

Library screenshots:
- Desktop: libfile_9d13c123f0a88191b916101ac80db36a
- Mobile: libfile_58c375dcd5d4819195e6c904745082b7

No push, merge, deployment or notification transport changes. Preview remains http://127.0.0.1:4181/today?view=overview .
