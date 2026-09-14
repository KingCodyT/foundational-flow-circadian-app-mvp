const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const cache = new Map();

// Use the project's existing TypeScript compiler; no runtime dependency needed.
function load(relativePath) {
  let filename = path.resolve(root, relativePath);
  if (!path.extname(filename)) filename += '.ts';
  if (cache.has(filename)) return cache.get(filename).exports;
  const mod = { exports: {} };
  cache.set(filename, mod);
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const localRequire = (id) => id.startsWith('@/') ? load(id.slice(2))
    : id.startsWith('.') ? load(path.resolve(path.dirname(filename), id)) : require(id);
  new Function('require', 'module', 'exports', output)(localRequire, mod, mod.exports);
  return mod.exports;
}
module.exports = load;
