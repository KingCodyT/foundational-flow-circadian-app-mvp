const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
// Browser suites must remain explicitly invoked through test:browser.
const files = fs.readdirSync(path.join(root, 'tests'))
  .filter(name => name.endsWith('.test.cjs') && !name.includes('browser'))
  .sort().map(name => path.join('tests', name));
const result = spawnSync(process.execPath, ['--test', ...files], { cwd: root, stdio: 'inherit' });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
