import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";

const example = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
test("each CodeMirror demo initializes inside canonical QuickJS Wasm", async (context) => {
 for (const name of ["simple", "full", "large"]) {
  const wasm = path.join(example, `generated/codemirror-${name}.wasm`);
  const bytes = await readFile(wasm);
  const messages = [];
  let memory;
  let started;
  const { instance } = await WebAssembly.instantiate(bytes, { host: {
    now: () => performance.now(),
    msg(offset, length) {
      if (length) messages.push({ at: performance.now() - started,
        bytes: new Uint8Array(memory.buffer, offset, length).slice() });
      return 0;
    },
  } });
  memory = instance.exports.memory;
  started = performance.now();
  instance.exports.onmsg(0);

  assert.ok(messages.length > 0);
  assert.equal(messages[0].bytes[0], 3, "the canonical bridge emits a command batch");
  assert.ok(messages.every(({ bytes }) => bytes.length > 0));
  context.diagnostic(`${name}: initialize=${messages[0].at.toFixed(1)}ms wasm=${bytes.length} bytes`);
 }
});
