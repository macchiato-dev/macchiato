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
  execFileSync(join(examples, "microquickjs-suite/microquickjs-guest-runtime/microquickjs/mqjs"),
    ["-m32", "-o", bytecode, join(examples, "codemirror/generated/microquickjs-runtime.js")]);

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
  for (const entry of new TextDecoder().decode(stamp.subarray(0, headerEnd)).split(",")) {
    const [name, size] = entry.split(":");
    const length = Number(size);
    assert.ok(Number.isSafeInteger(length) && length >= 0 && offset + length <= stamp.length);
    if (name === "runtime.bin") runtime = stamp.slice(offset, offset + length);
    offset += length;
  }
  assert.equal(offset, stamp.length);
  assert.ok(runtime, "runtime.bin is present in the editor stamp");
  assert.ok(Buffer.from(runtime).equals(await readFile(bytecode)),
    "embedded editor runtime is stale: rebuild its bytecode before stamping the WASM");
});
