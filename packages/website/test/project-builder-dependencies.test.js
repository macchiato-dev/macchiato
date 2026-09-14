import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

test("ordinary document compilation excludes framework compilers and runtimes", async () => {
  const result = await build({
    entryPoints: [new URL("../project-builder-bootstrap.js", import.meta.url).pathname],
    bundle: true, write: false, metafile: true, format: "iife", platform: "neutral",
    mainFields: ["browser", "module", "main"],
  });
  const inputs = Object.keys(result.metafile.inputs);
  assert.ok(inputs.some(path => path.endsWith("single-file-compiler.js")));
  assert.deepEqual(inputs.filter(path => /node_modules\/(?:@vue|vue|svelte|three)\//.test(path) ||
    path.endsWith("framework-runtimes.js")), []);
  assert.ok(result.outputFiles[0].text.includes("__resourcesCompileFiles"));
  assert.ok(!result.outputFiles[0].text.includes("__resourcesBuildFiles"));
});
