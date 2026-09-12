const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-typescript.cjs');
const { getStaticProps } = load('pages/dev/evidence.tsx');

test('evidence route is available only in development', async () => {
  const previous = process.env.NODE_ENV;
  try {
    for (const environment of ['production', 'test', 'development']) {
      process.env.NODE_ENV = environment;
      assert.deepEqual(await getStaticProps({}), environment === 'development' ? { props: {} } : { notFound: true });
    }
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
});
