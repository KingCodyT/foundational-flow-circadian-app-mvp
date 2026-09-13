const fs = require("node:fs");
const assert = require("node:assert/strict");

const source = fs.readFileSync("lib/personalization/circadian-food-signal-integration.ts", "utf8");
const nowPage = fs.readFileSync("views/now-page.tsx", "utf8");
const youPage = fs.readFileSync("views/you-page.tsx", "utf8");

assert.match(source, /interpretFoodTimingPattern/);
assert.match(source, /shouldContributeEvidence/);
assert.match(source, /SignalSourceType\.USER_FEEDBACK/);
assert.match(source, /current === CoachingState\.NEEDS_ATTENTION/);
assert.match(source, /return CoachingState\.DEVELOPING/);
assert.match(source, /does not choose the primary target or intervention level/);
assert.match(source, /hierarchy, severity override, intervention eligibility, Voice, and delivery/);
assert.match(nowPage, /applyCircadianFoodCoachingEvidence/);
assert.match(nowPage, /selectPrimaryCoachingTarget\(withFoodEvidence\)/);
assert.match(youPage, /applyCircadianFoodCoachingEvidence/);
assert.match(youPage, /selectPrimaryCoachingTarget\(personalization\)/);

console.log("Circadian Food signal integration v1 contract tests passed.");
