# First-day handoff fixes — local review

Scope: approved local integration only. All 16 questions and scoring/progression remain unchanged. No push, merge, deployment, production data, permission grants or real notifications.

## Behavior

- First-run Today uses the same TodayCoach controls and restrained supporting disclosures as regular Today. The accepted assessment focus remains visible, with a quoted answer detail explaining the starting evidence. The immediate schedule action is explicitly distinct and cannot rotate the accepted focus.
- Still-open schedule windows are eligible. Ended windows remain excluded; completed/skipped evening steps cannot create another evening-light prompt that day.
- Smaller step is not completion. Safe alternatives, Cancel/Back, bounded Later and Not today are shared with the reviewed loop. A synchronous terminal guard prevents both duplicate and conflicting terminal responses. Acknowledgment survives refresh until the original window ends, when the normal Today handoff resumes.
- Completion/skip names the next available opportunity for the accepted focus, with date, AM/PM and saved timezone. An unrelated first action never becomes a fabricated completion for the accepted focus. Missing days remain unknown.
- Assessment position is retained per local profile, synchronized to a shallow URL so browser Back/Forward works. Hydration waits for the restored position before showing answer controls. All 16 question definitions are unchanged.
- Setup clarifies optional details/location, label versus coordinates, and timezone. Existing time-format preference is retained with an explicit statement that schedule entry and Today currently use AM/PM. Free-text notes are saved, not automatically interpreted; Smaller step is the concrete adaptation path. Notification setup is an optional disclosure and makes no unconfirmed delivery claim.

## Browser checks

Actual Chrome journeys used fictional dayworker (07:00/22:30, Los Angeles), overnight worker (18:00/09:00, Los Angeles, shared-room/driving notes), and after-window boundary profile (04:00/12:00). Assessment and five-stage setup were traversed through UI controls. Confirmed contrasting accepted focus survives the first action, overnight anchors remain unchanged, and after-window case offers the following date without backlog.

Reload, question Back/Forward, setup draft save/reload and setup Back were checked. A reload race exposed an early question-one render and was fixed by waiting for position hydration. Regression test covers saved position, URL changes and retained selected answer. Duplicate Finish did not duplicate completion.

A synthetic schedule inside an already-open evening-light window exercised Smaller step Cancel with keyboard Enter, Later Cancel, safety/work, shared-room, low-energy and Back. Selection/cancel did not count. Double-click I did that recorded one dim_house completion; morning-light focus remained selected and received no invented completed day. Refresh retained the acknowledgment and named next morning's focus opportunity.

Disposable local fixture also tested exhausted Later, double-click Not today with refresh, and valid Later with double-click/refresh: pending in-app opportunity persisted, no completion. Mobile 390x844 inspection found and corrected explanation contrast. No location or notification permissions were granted.

## Automated verification

Full non-browser suite: 459 passed, zero failed. Additional assessment resume component regression: 1 passed (460 total distinct tests). Includes selector active/end boundaries, accepted-focus follow-up, first-run controls/duplicate/conflicting response guard and expired handoff cleanup. Existing weekly tests remain green.
Typecheck: npx tsc --noEmit passed.
Build and lint final results recorded below.

## Limits

No physical-device, screen-reader, multi-browser or real overnight wait. DST/date boundaries have deterministic test coverage. No push transport integration or real notifications tested. Dev-only QA routes and fictional evidence JSON remain untracked, excluded from the local product commit. Runtime browser timing is the real clock; unusual boundary schedules are invented test inputs, not advice.

Final presentation keeps the answer explanation in a keyboard-accessible “Why this focus and first step?” disclosure so the immediate action remains dominant. Mobile and desktop screenshots were captured after this adjustment.

Confirmed screenshot Library IDs:
- Desktop active first-run: libfile_c7b31ea050ec8191bdb2ae61e87f1c1b
- Mobile active first-run: libfile_d601ad4425148191836c2f7e0d178dd1

Build: passed (optimized production build). Lint: `npm run lint` exits at the existing interactive ESLint configuration prompt; no configuration was created. No successful standalone lint result is claimed.
