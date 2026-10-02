const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');
test('Today contains only focus and one reminder or silence, without a history panel', () => {
  const source = read('components/journey-now.tsx');
  assert.doesNotMatch(source, /calculation-details|events\.map|See how today was calculated|journey-timeline|Sunrise|Sunset|foodEditor/);
  assert.match(source, /Your current coaching focus/);
  assert.doesNotMatch(source, /Patterns over time|progress\.slice/);
  assert.match(source, /You’re set for now/);
  for (const response of ['Done', 'Not today', 'Adjust']) assert.ok(source.includes(response));
  assert.doesNotMatch(read('components/journey-design.tsx'), /<span>(NOW|RHYTHM|YOU)<\/span>/);
});
test('Timeline remains a dedicated read-only historical screen', () => {
  assert.match(read('pages/timeline.tsx'), /views\/timeline-page/);
  assert.doesNotMatch(read('pages/timeline.tsx'), /redirect|getServerSideProps/);
  const source = read('views/timeline-page.tsx');
  assert.match(source, /<FlowShell>/);
  assert.match(source, /<h1>Timeline<\/h1>/);
  assert.doesNotMatch(source, /useEffect|setDailyProfile|advancePersonalization|resolvePersonalizationReview/);
});
