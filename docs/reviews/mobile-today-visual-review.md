# Mobile Today visual review

Base: 518efe5, branch review/today-coaching-loop-local.

Only app/globals.css changes: Today-scoped styling at widths <=600px. Existing coastal photograph, blue/green/cream surfaces, gold accent, compact greeting and focus panels, readable action card, 48px action targets and fixed phone navigation. No component, timing, profile, progression, assessment or notification changes. Desktop and other routes retain existing rules.

Inspected all three approved Library mockups and existing image assets. Uses coastal-hero-placeholder.jpg, not a screenshot with baked UI. The scene is decorative artwork, not current local weather/daylight imagery.

Verified actual Chrome phone views at 320x740 and 390x844; 320px document scrollWidth equals viewport width. Saved 4181 profile preserved. What/why/next visible, lower guide readable by scrolling, native guide expanded and collapsed using Enter in isolated 4180 fixture. Phone screenshots captured and visually inspected. No desktop deliverables.

19 targeted tests passed across first-step explanation, first-run controls, Today coaching, weekly check-in, light guide preview, light check-in and coaching explanations. npx tsc --noEmit passed. npm run build passed. Build warns of outdated Browserslist data; no dependency changes. Separate interactive lint not run.

Limit: current Evening QA fixture resolved to a future window; active Done/Smaller step/Later controls were covered by existing automated regression tests, not newly clicked end-to-end in this CSS review. No owner actions completed. No notifications sent. Preview is local and can stop when the execution environment disconnects.

Verified fresh reload at http://127.0.0.1:4181/today?view=overview after restarting dev server following build; left 390x844 phone viewport available.

Library screenshots: libfile_ac1fa83348288191a103882b639ef698 (top), libfile_bfa34e2266cc81918235e88d50175144 (light guide).
