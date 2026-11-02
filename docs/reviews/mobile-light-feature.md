# Featured light education — mobile Today

Promotes the existing light guide to a blue/gold feature panel with a prominent “Light, timing & your body” heading. Visible preview reuses existing selected-band colors and the existing eye/body-clock explanation. Swatches are explicitly illustrative, not measured proportions; current local phase and calculated/estimated limitations remain visible. Full guide, sources and spectrum explorer remain behind the native expandable control. No new health claims, schedule or profile changes.

Phone-only presentation via <=600px CSS. Desktop keeps its previous heading and hides the new preview. Existing content remains unchanged. Original screenshot libfile_d2603f52e7b08191bc701b042def921e inspected before implementation.

Verification: actual Chrome at 320, 390 and 430px; no horizontal overflow at 320/430; visually inspected all three. Enter expands and collapses the guide. Preserved Cody's 4181 profile; no completion or notification actions. Ten targeted tests passed, including added static regression for illustrative swatches, missing location and closed-by-default guide. TypeScript and git diff --check passed. Build not rerun for this follow-up (previous mobile styling build passed).

Preview: http://127.0.0.1:4181/today?view=overview. Chrome viewport controls the phone size, not URL. Server restarted and visible updated content verified.

Mobile screenshot Library ID: libfile_2bc67edbdfd88191918bc737779bc94f.
