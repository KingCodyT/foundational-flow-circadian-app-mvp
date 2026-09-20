# Biological timeline timing

The profile's timezone owns schedule interpretation and display. The device timezone is only the fallback when no profile timezone is saved. Solar calculations use the same local calendar date in both the timeline and environment panel.

- Wake is the start of the schedule's waking day. Bedtime at or before wake belongs to the following calendar day. Meal times before wake likewise belong to the next calendar day; if that puts a meal outside the waking period, keep it and display a schedule conflict.
- The entered last meal is authoritative. A saved 18:30 remains 18:30. Only absent or invalid meal input uses the explicitly labeled fallback of bedtime minus three hours (bounded by wake).
- Sleep remains bedtime ±45 minutes. A saved 21:45 yields 21:00–22:30; sunset never overrides it. Keep the sleep window internal; show editable bedtime under You → Your schedule.
- An internal first-meal reference starts 30 minutes after waking and ends no later than the last meal or sleep window. This is not a recommendation: the coaching surface does not infer breakfast timing from wake time alone. Movement stays within waking hours. Dim-light and screen wind-down guidance use bedtime minus two and one hours.
- Outdoor light windows intersect actual daylight and waking hours, ending before wind-down. Polar night does not invent sunrise or daylight. Without coordinates, light windows are labeled schedule-based suggestions.
- Events sort by absolute start time. Windows must end after they start. Windows may overlap: they are opportunities, not appointments requiring exclusive blocks of time.
- Unusually short/long waking days and meals outside the waking period produce visible warnings without changing entered anchors. These checks catch schedule inconsistencies; they are not individual medical assessments.
- DST repeated times use the earlier occurrence. Nonexistent clock times advance by the DST gap. Ordinary clock times retain the entered hour and minute across DST.

General rationale: [NHLBI healthy sleep habits](https://www.nhlbi.nih.gov/health/sleep-deprivation/healthy-sleep-habits) supports consistent sleep timing, time outside, quieter/dimmer pre-sleep routines, and avoiding heavy meals close to bedtime. It does not prescribe this app's precise minute offsets; those remain transparent planning heuristics, never reasons to overwrite user input.

Validation: `node --test tests/flow-engine.test.cjs tests/timing.test.cjs tests/live-clock.test.cjs`; browser check against a running app: `FLOW_SMOKE_URL=http://localhost:3014 node scripts/smoke/biological-timeline.cjs`. The browser check completes onboarding, verifies the question is asked once, and checks saved schedule fields with a UTC device and a saved Los Angeles profile, and verifies that calculation details are absent from Today. Legacy Timeline/Rhythm routes return to Today. It also checks a mobile Food step and suppression after a constraint response and reload.

## Walkthrough coaching contract

WAKE → ORIENT → GUIDE → OBSERVE → INTERPRET → ADAPT remains the operating sequence. The assessed or explicitly reviewed target stays fixed while evidence updates NEEDS_ATTENTION → DEVELOPING → ESTABLISHED. Time and environmental events choose an opportunity for that target, never a new target.

Food stores three separate concepts: reported current pattern; internal daylight/sleep direction; and today's workable step. The internal endpoint is never shown as an instruction. An explicit earlier-meal goal can yield a change of at most 30 minutes, rounded to a practical quarter-hour. Unknown goals, missing anchors, or reported schedule constraints stay observational. First-meal timing stays observational until habits and context support a recommendation. No wearables are involved.

Only the selected target can surface an action. Related movement/daylight guidance requires evidence. Overlapping evening cues form one wind-down action; a completion or constraint response quiets the group. Food responses and relevant meal evidence quiet the Food step. No response is scored as noncompliance. Today’s Perspective remains optional and selective.

The primary surface shows focus, one relevant reminder or silence, and a small pattern summary. No daily lineup or calculation disclosure appears on Today. The complete ordered schedule stays internal. Editable anchors are under You → Your schedule; meal history is user-initiated under You.
