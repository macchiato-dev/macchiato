import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";

const example = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspace = path.resolve(example, "../..");
const runtime = path.join(workspace, "dev/quickjs-guest-runtime");
const environment = path.join(example, "src/microquickjs-dom.js");
const application = path.join(example, "generated/codemirror-modern.js");
const wasm = path.join(runtime,
  "target/wasm32-unknown-unknown/release/wasm_web_container_quickjs_runtime.wasm");

test("CodeMirror initializes and edits real files inside QuickJS Wasm", async (context) => {
  execFileSync("node", ["build.js"], { cwd: example, stdio: "pipe" });
  execFileSync("cargo", ["build", "--release", "--target", "wasm32-unknown-unknown"], {
    cwd: runtime,
    env: { ...process.env, WWC_GUEST_ENVIRONMENT: environment,
      WWC_APPLICATION_SOURCE: application },
    stdio: "pipe",
  });

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

  assert.match(messages[0].text, /^CodeMirror:typescript=1065:nodes=\d+:listeners=\d+$/);
  assert.match(messages[1].text,
    /typescript=1065.*html=648.*css=692.*json=290.*markdown=408/);
  assert.match(messages[2].text, /^QuickJS:objects=\d+:properties=\d+:atoms=\d+:bytes=\d+$/);
  assert.equal(messages.some(({ text }) => /error|crashed/i.test(text)), false);
  context.diagnostic(`initialize=${messages[0].at.toFixed(1)}ms stress=${
    (messages[1].at - messages[0].at).toFixed(1)}ms wasm=${bytes.length} bytes`);
});
