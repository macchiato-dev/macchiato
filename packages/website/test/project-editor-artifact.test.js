import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { editorLanguages } from "../../project-editor/src/languages.js";

test("editor programs are current QuickJS bytecode, separate from the runtime", async t => {
  const root = new URL("../../../", import.meta.url).pathname;
  const working = join(root, "../macchiato-work");
  await mkdir(working, { recursive: true });
  const directory = await mkdtemp(join(working, "editor-artifact-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const generated = join(root, "packages/website/generated");
  const programs = new Set(["core", "workspace", "surface",
    ...editorLanguages.map(language => `language-${language.package}`)]);
  for (const name of programs) {
    const source = join(generated, `project-editor-${name}.js`);
    const rebuilt = join(directory, `${name}.bin`);
    execFileSync(join(generated, "project-editor-compile"), [source, rebuilt, "--strip-source"]);
    assert.deepEqual(await readFile(rebuilt),
      await readFile(join(generated, `project-editor-${name}.bin`)), `${name} bytecode is stale`);
  }
  const workspace = await readFile(join(generated, "project-editor-workspace.js"), "utf8");
  assert.doesNotMatch(workspace, /function (?:bundleProjectModule|serializeOutputNode|parseProjectHtml)\b/);
  assert.doesNotMatch(workspace, /resources-project-output-frame-v1/);
  assert.doesNotMatch(workspace, /class EditorView\b/, "the project controls must not embed CodeMirror");
  const core = await readFile(join(generated, "project-editor-core.js"), "utf8");
  assert.ok(/records\.length > 128 \? (?:\/\* @__PURE__ \*\/ )?new Map\(\) : null/.test(core));
  const module = await WebAssembly.compile(await readFile(join(generated, "project-editor-quickjs-runtime.wasm")));
  assert.equal(WebAssembly.Module.customSections(module, "wasm-web-machine").length, 0,
    "the runtime must not stamp in the editor, controls, or grammar programs");
});
