import assert from "node:assert/strict";
import test from "node:test";
import WasmWebContainer from "../src/wasm-web-container.js";
import { decodeResourceBundle, encodeResourceBundle } from "../src/resource-bundle.js";

test("resource bundles use a bounded filename and length header", () => {
  const encoded = encodeResourceBundle(new Map([
    ["index.js", new TextEncoder().encode("print('hello')")],
    ["images/tile.bin", Uint8Array.of(3, 1, 4, 1, 5)],
  ]));
  const files = decodeResourceBundle(encoded);
  assert.equal(new TextDecoder().decode(files.get("index.js")), "print('hello')");
  assert.deepEqual([...files.get("images/tile.bin")], [3, 1, 4, 1, 5]);
  assert.throws(() => decodeResourceBundle(encoded.subarray(0, -1)), /truncated/);
});

test("the container loads source or a binary file set into a selected runtime", async () => {
  const calls = [];
  const container = new WasmWebContainer({ runtime: {
    loadJavaScript(source, context) { calls.push(["javascript", source, context]); },
    loadBundle(files, context) { calls.push(["bin", [...files], context]); },
  } });
  await container.load({ type: "javascript", source: "globalThis.answer = 42" });
  await container.load({ type: "bin", bytes: encodeResourceBundle({
    "main.js": new TextEncoder().encode("start()"),
  }) });
  assert.equal(calls[0][0], "javascript");
  assert.equal(calls[0][1], "globalThis.answer = 42");
  assert.equal(calls[1][0], "bin");
  assert.equal(calls[1][1][0][0], "main.js");
});
