const fs = require("node:fs");
const assert = require("node:assert/strict");

const source = fs.readFileSync("lib/personalization/circadian-food-coaching.ts", "utf8");

assert.match(source, /MIN_OBSERVED_DAYS = 3/);
assert.match(source, /REPEATED_PATTERN_DAYS = 2/);
assert.match(source, /INSUFFICIENT_EVIDENCE/);
assert.match(source, /ALIGNED_OR_VARIABLE/);
assert.match(source, /LATE_LAST_MEAL_PATTERN/);
assert.match(source, /LATE_FIRST_MEAL_PATTERN/);
assert.match(source, /LATE_EATING_DAY_PATTERN/);
assert.match(source, /minutesBeforeSleep >= 0 && minutesBeforeSleep < 120/);
assert.match(source, /minutesFromWake > 360/);
assert.match(source, /lastAfterSunset && closeToSleep/);
assert.match(source, /One unusual day is intentionally quiet/);
assert.match(source, /does not select a primary target/);
assert.match(source, /never as a command to eat breakfast or shorten a fasting window/);

console.log("Circadian Food Coaching v1 contract tests passed.");
