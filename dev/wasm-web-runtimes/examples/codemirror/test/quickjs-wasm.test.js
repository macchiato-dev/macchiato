import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";

const example = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
test("each CodeMirror demo initializes inside QuickJS Wasm", async (context) => {
 for (const [name, expected] of [["simple", /^CodeMirror:simple:5$/],
   ["full", /^CodeMirror:typescript=20:nodes=\d+:listeners=\d+$/],
   ["large", /^CodeMirror:large:5000$/]]) {
  const wasm = path.join(example, `generated/codemirror-${name}.wasm`);
  const bytes = await readFile(wasm);
  const messages = [];
  let memory;
  let started;
  const { instance } = await WebAssembly.instantiate(bytes, { host: {
    msg(offset, length) {
      if (length) messages.push({ at: performance.now() - started,
        text: new TextDecoder().decode(new Uint8Array(memory.buffer, offset, length)) });
      return 0;
    },
  } });
  memory = instance.exports.memory;
  started = performance.now();
  instance.exports.onmsg(0);

  assert.match(messages[0].text, expected);
  assert.match(messages.find(({ text }) => text.startsWith("WWC_DOM:")).text,
    /^WWC_DOM:\{/);
  assert.match(messages.at(-1).text,
    /^QuickJS:objects=\d+:properties=\d+:atoms=\d+:bytes=\d+$/);
  assert.equal(messages.some(({ text }) => /error|crashed/i.test(text)), false);
  context.diagnostic(`${name}: initialize=${messages[0].at.toFixed(1)}ms wasm=${bytes.length} bytes`);
 }
});
