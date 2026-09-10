import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

test("the directly compiled MicroQuickJS example runtime remains valid source", async (t) => {
  const root = new URL("../../../", import.meta.url).pathname;
  const working = resolve(root, "../macchiato-work");
  await mkdir(working, { recursive: true });
  const directory = await mkdtemp(resolve(working, "microquickjs-source-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const runtime = resolve(root, "dev/wasm-web-runtimes/examples/microquickjs-suite/microquickjs-guest-runtime");
  const output = resolve(directory, "runtime.bin");
  // Unlike CodeMirror's generated environment, this canonical example goes
  // straight into mqjs without Babel. A cached Cargo result must not hide
  // incompatible syntax introduced while editing its shared DOM helpers.
  const log = execFileSync(resolve(runtime, "microquickjs/mqjs"), ["-m32", "-o", output,
    resolve(runtime, "guest-runtime.js")], { encoding: "utf8", stdio: "pipe" });
  // mqjs can report a parse error while exiting with status zero. Require a
  // fresh output, not merely successful process completion or an old .bin.
  const bytecode = await readFile(output).catch(error => {
    throw new Error(`MicroQuickJS produced no bytecode: ${log}`, { cause: error });
  });
  assert.ok(bytecode.length > 0);
});
