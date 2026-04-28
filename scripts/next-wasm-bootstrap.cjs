#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const isMacLocalWorkaround =
  process.platform === "darwin" && !process.env.VERCEL && !process.env.CI;

if (isMacLocalWorkaround) {
  process.env.NEXT_DISABLE_SWC_WASM = "";
}

function patchNextSwcLoader() {
  const swcIndexPath = path.join(
    process.cwd(),
    "node_modules",
    "next",
    "dist",
    "build",
    "swc",
    "index.js",
  );

  if (!fs.existsSync(swcIndexPath)) {
    return;
  }

  let source = fs.readFileSync(swcIndexPath, "utf8");

  if (
    !source.includes('pkgPath = require.resolve(pkg);') &&
    source.includes('pkgPath = _path.default.join(importPath, pkg, "wasm.js");')
  ) {
    source = source.replace(
      'pkgPath = _path.default.join(importPath, pkg, "wasm.js");\n            }',
      'pkgPath = _path.default.join(importPath, pkg, "wasm.js");\n            } else {\n                pkgPath = require.resolve(pkg);\n            }',
    );
  }

  if (!source.includes('let bindings = require(require.resolve("@next/swc-wasm-nodejs"));')) {
    source = source.replace(
      "    // we can leverage the wasm bindings if they are already\n    // loaded\n",
      `    try {\n        let bindings = require(require.resolve("@next/swc-wasm-nodejs"));\n        wasmBindings = {\n            isWasm: true,\n            transform (src, options) {\n                return (bindings == null ? void 0 : bindings.transform) ? bindings.transform(src.toString(), options) : Promise.resolve(bindings.transformSync(src.toString(), options));\n            },\n            transformSync (src, options) {\n                return bindings.transformSync(src.toString(), options);\n            },\n            minify (src, options) {\n                return (bindings == null ? void 0 : bindings.minify) ? bindings.minify(src.toString(), options) : Promise.resolve(bindings.minifySync(src.toString(), options));\n            },\n            minifySync (src, options) {\n                return bindings.minifySync(src.toString(), options);\n            },\n            parse (src, options) {\n                return (bindings == null ? void 0 : bindings.parse) ? bindings.parse(src.toString(), options) : Promise.resolve(bindings.parseSync(src.toString(), options));\n            },\n            parseSync (src, options) {\n                return bindings.parseSync(src.toString(), options);\n            },\n            getTargetTriple () {\n                return undefined;\n            },\n            turbo: {\n                startTrace: ()=>{\n                    _log.error("Wasm binding does not support trace yet");\n                },\n                entrypoints: {\n                    stream: (turboTasks, rootDir, applicationDir, pageExtensions, callbackFn)=>{\n                        return bindings.streamEntrypoints(turboTasks, rootDir, applicationDir, pageExtensions, callbackFn);\n                    },\n                    get: (turboTasks, rootDir, applicationDir, pageExtensions)=>{\n                        return bindings.getEntrypoints(turboTasks, rootDir, applicationDir, pageExtensions);\n                    }\n                }\n            },\n            mdx: {\n                compile: (src, options)=>bindings.mdxCompile(src, getMdxOptions(options)),\n                compileSync: (src, options)=>bindings.mdxCompileSync(src, getMdxOptions(options))\n            }\n        };\n        return wasmBindings;\n    } catch (error) {\n        attempts.push(\`Attempted to load @next/swc-wasm-nodejs, but an error occurred: \${error.message ?? error}\`);\n    }\n    // we can leverage the wasm bindings if they are already\n    // loaded\n`,
    );
  }

  fs.writeFileSync(swcIndexPath, source);
}

(async () => {
  if (isMacLocalWorkaround) {
    patchNextSwcLoader();
    const swc = require("next/dist/build/swc");
    await swc.loadBindings();
  }

  process.argv = [
    process.argv[0],
    require.resolve("next/dist/bin/next"),
    ...process.argv.slice(2),
  ];

  require("next/dist/bin/next");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
