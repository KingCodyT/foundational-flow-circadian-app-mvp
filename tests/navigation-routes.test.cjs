const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-typescript.cjs');

for (const [canonical, view] of [['today', 'now'], ['timeline', 'timeline'], ['profile', 'you']]) {
  test(`/${canonical} resolves directly to its dedicated view`, () => {
    const page = load(`pages/${canonical}.tsx`);
    assert.equal(page.default, load(`views/${view}-page.tsx`).default);
    assert.equal(page.getServerSideProps, undefined);
  });
}
for (const [destination, aliases] of Object.entries({
  timeline: ['rhythm', 'my-day', 'season'], today: ['now', 'todays-flow', 'protocol'],
  profile: ['you', 'my-profile', 'dashboard', 'results', 'tracker'],
})) {
  for (const alias of aliases) test(`/${alias} redirects to /${destination} preserving query parameters`, async () => {
    const page = load(`pages/${alias}.tsx`);
    for (const suffix of ['', '?date=2026-09-10&view=overview&tag=a&tag=b&note=a%20b']) {
      const result = await page.getServerSideProps({ resolvedUrl: `/${alias}${suffix}` });
      assert.deepEqual(result, { redirect: { destination: `/${destination}${suffix}`, permanent: false } });
    }
    assert.equal(page.default(), null);
  });
}
