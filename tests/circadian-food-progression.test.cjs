const fs = require("node:fs");
const assert = require("node:assert/strict");

const progression = fs.readFileSync("lib/personalization/circadian-food-progression.ts", "utf8");
const integration = fs.readFileSync("lib/personalization/circadian-food-signal-integration.ts", "utf8");

assert.match(progression, /DEVELOPING_MIN_ALIGNED_DAYS = 3/);
assert.match(progression, /ESTABLISHED_MIN_ALIGNED_DAYS = 7/);
assert.match(progression, /REOPEN_MIN_RECENT_MISMATCH_DAYS = 2/);
assert.match(progression, /RECENT_WINDOW_DAYS = 4/);
assert.match(progression, /Missing days are unknown/);
assert.match(progression, /One aligned day cannot establish a signal/);
assert.match(progression, /One\n \* unusual late meal cannot regress an established pattern/);
assert.match(progression, /NEEDS_ATTENTION -> DEVELOPING -> ESTABLISHED/);
assert.match(progression, /sleepSeparation >= 120/);
assert.match(progression, /recentMismatchDays >= REOPEN_MIN_RECENT_MISMATCH_DAYS/);
assert.doesNotMatch(progression, /streak/i);
assert.match(integration, /progressCircadianFoodTiming/);
assert.match(integration, /never chooses the primary target, severity, intervention level/);

console.log("Circadian Food Progression v1 contract tests passed.");
