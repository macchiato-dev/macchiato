import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

test("project editor embeds bytecode compiled from the current guest runtime", async (t) => {
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  const working = join(root, "../macchiato-work");
  await mkdir(working, { recursive: true });
  const directory = await mkdtemp(join(working, "editor-artifact-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const examples = join(root, "dev/wasm-web-runtimes/examples");
  const bytecode = join(directory, "runtime.bin");
  const editorBytecode = join(directory, "editor.bin");
  const projectBytecode = join(directory, "project.bin");
  const projectSource = join(root, "packages/website/generated/project-editor-services-microquickjs.js");
  const projectText = await readFile(projectSource, "utf8");
  assert.doesNotMatch(projectText, /function (?:bundleProjectModule|serializeOutputNode|parseProjectHtml)\b/,
    "the project UI must not carry a second output compiler/renderer");
  assert.doesNotMatch(projectText, /resources-project-output-frame-v1/,
    "the removed alternate iframe transport must not enter the UI bytecode");
  assert.match(projectText, /if \(message\.type === "output-error"\) return previousEditorReceive/,
    "output events must bypass the UI request-ID namespace in the shipped code");
  const editorSource = join(root, "packages/website/generated/project-editor-microquickjs.js");
  const source = await readFile(editorSource, "utf8");
  assert.match(source, /records\.length > 128 \? new Map\(\) : null/,
    "the editor build must include the guarded large-mutation optimization");
  execFileSync(join(examples, "microquickjs-suite/microquickjs-guest-runtime/microquickjs/mqjs"),
    ["-m32", "-o", bytecode, join(examples, "codemirror/generated/microquickjs-runtime.js")]);
  execFileSync(join(examples, "microquickjs-suite/microquickjs-guest-runtime/microquickjs/mqjs"),
    ["-m32", "-o", editorBytecode, editorSource]);
  execFileSync(join(examples, "microquickjs-suite/microquickjs-guest-runtime/microquickjs/mqjs"),
    ["-m32", "-o", projectBytecode, projectSource]);

  // Inspect the actual shipped artifact, not an independently rebuilt test VM.
  const module = await WebAssembly.compile(await readFile(join(root,
    "packages/website/generated/project-editor-quickjs-runtime.wasm")));
  const sections = WebAssembly.Module.customSections(module, "wasm-web-machine");
  assert.equal(sections.length, 1);
  const stamp = new Uint8Array(sections[0]);
  const headerEnd = stamp.indexOf(124);
  assert.ok(headerEnd > 0);
  let offset = headerEnd + 1;
  let runtime;
  let editor;
  let project;
  for (const entry of new TextDecoder().decode(stamp.subarray(0, headerEnd)).split(",")) {
    const [name, size] = entry.split(":");
    const length = Number(size);
    assert.ok(Number.isSafeInteger(length) && length >= 0 && offset + length <= stamp.length);
    if (name === "runtime.bin") runtime = stamp.slice(offset, offset + length);
    if (name === "editor.bin") editor = stamp.slice(offset, offset + length);
    if (name === "project.bin") project = stamp.slice(offset, offset + length);
    offset += length;
  }
  assert.equal(offset, stamp.length);
  assert.ok(runtime, "runtime.bin is present in the editor stamp");
  assert.ok(Buffer.from(runtime).equals(await readFile(bytecode)),
    "embedded editor runtime is stale: rebuild its bytecode before stamping the WASM");
  assert.ok(editor, "editor.bin is present in the editor stamp");
  assert.ok(Buffer.from(editor).equals(await readFile(editorBytecode)),
    "embedded CodeMirror is stale: rebuild its bytecode before stamping the WASM");
  assert.ok(project, "project.bin is present in the editor stamp");
  assert.ok(Buffer.from(project).equals(await readFile(projectBytecode)),
    "embedded project UI is stale: rebuild its bytecode before stamping the WASM");
});
