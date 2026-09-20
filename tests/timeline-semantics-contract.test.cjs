const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');
test('Today contains only focus, one reminder or silence, and small progress', () => {
  const source = read('components/journey-now.tsx');
  assert.doesNotMatch(source, /calculation-details|events\.map|See how today was calculated|journey-timeline|Sunrise|Sunset|foodEditor/);
  assert.match(source, /Your current coaching focus/);
  assert.match(source, /Patterns over time/);
  for (const response of ['Done', 'Not today', 'Adjust']) assert.ok(source.includes(response));
  assert.doesNotMatch(read('components/journey-design.tsx'), /href="\/timeline"|<span>RHYTHM<\/span>/);
});
test('legacy daily routes return to the coaching surface', () => {
  for (const route of ['timeline', 'rhythm', 'my-day']) assert.match(read(`pages/${route}.tsx`), /"\/today"/);
});
