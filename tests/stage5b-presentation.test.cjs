const test = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup: render } = require('react-dom/server');
const load = require('./load-typescript.cjs');
const { AssessmentDisclosure } = load('components/assessment-disclosure.tsx');
const { TimelineEntry } = load('components/timeline-entry.tsx');
test('assessment displays only saved answers with existing labels; unknown data is not interpreted', () => {
  const answers = Object.freeze({ morning_light_timing: 'within_15', unknown_field: 'original_value' });
  const html = render(React.createElement(AssessmentDisclosure, { answers }));
  assert.match(html, /Within 15 min/); assert.match(html, /Saved field: unknown_field/); assert.match(html, /original_value/);
  assert.doesNotMatch(html, /<form|<input|<button|score|ESTABLISHED|completeAudit/);
  assert.match(html, /<details[^>]*><summary>View saved answers/);
  assert.doesNotMatch(html, /<details[^>]* open/);
  assert.match(render(React.createElement(AssessmentDisclosure, { answers: {} })), /No saved assessment answers/);
});
test('Timeline presentation keeps categories, skipped status, unknown time and complete provenance', () => {
  for (const [kind,status] of [['RECORDED','skipped'],['RECORDED','status'],['CONTEXT','unavailable'],['PLANNED','planned'],['RECOMMENDED','delivered']]) {
    const entry = Object.freeze({ id:'test',kind,status,title:'Saved title',at:null,provenance:'Original source',details:'Original detail',timeZone:'Asia/Tokyo' });
    const html = render(React.createElement(TimelineEntry, { entry, timeZone:'Europe/London' }));
    assert.match(html,/Time unknown/); assert.doesNotMatch(html,/<time /);
    assert.ok(html.includes(status)); assert.ok(html.includes(kind.charAt(0)+kind.slice(1).toLowerCase()));
    assert.match(html,/Original source/); assert.match(html,/Original detail/); assert.match(html,/Asia\/Tokyo/);
    assert.match(html,/not recorded/); assert.doesNotMatch(html,/<details[^>]* open/);
    if (status==='status') assert.match(html,/not a completion/);
    if (kind==='PLANNED') assert.match(html,/not recorded behavior/);
  }
});
test('Timeline shows time before title and preserves original offset in disclosure', () => {
  const entry = { id:'meal',kind:'RECORDED',status:'completed',title:'Recorded meal',at:'2026-09-01T18:14:37+09:00',provenance:'User food record',recordedAt:'2026-09-02T10:00:00Z',updatedAt:'2026-09-03T10:00:00Z' };
  const html = render(React.createElement(TimelineEntry, { entry,timeZone:'Asia/Tokyo' }));
  assert.ok(html.indexOf('<time ')<html.indexOf('<h2>')); assert.match(html,/6:14 PM/);
  for (const value of [entry.at,entry.recordedAt,entry.updatedAt]) assert.ok(html.includes(value));
});
