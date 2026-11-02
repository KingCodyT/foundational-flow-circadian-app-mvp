# Mobile setup visual continuity

Base 823aab7. CSS-only, scoped to JourneyFrame containing Setup progress at <=600px. Reuses coastal image and compact brand, readable white panels, lighter headings and selected cobalt accents. All five setup stages, questions, routes and logic unchanged; 16-question assessment untouched. Narrow time selectors now fit their card.

Actual browser: isolated disposable 4180 profile, not owner's 4181 state. Basics at390, Schedule at390/320, Reality at320, Finish at390 visually inspected. Keyboard Enter advances Basics. Missing required times blocks Schedule; entered6AM/10PM restored after reload at Schedule. Continued without location/optional fields through Environment/Reality to Finish, then Edit Details back to Schedule. No location permission or notification enabled. Automated tests cover additional cancel/recovery boundaries.

43 setup navigation/profile-handoff tests passed; TypeScript passed. Final CSS diff check passed. No build rerun for this stylesheet-only follow-up. Existing synthetic fixture files preserved, not committed. No push/deploy.

Review http://127.0.0.1:4180/setup uses disposable synthetic review state; owner's4181profile is untouched. Phone viewport390x844 retained. This URL does not force phone size itself.
