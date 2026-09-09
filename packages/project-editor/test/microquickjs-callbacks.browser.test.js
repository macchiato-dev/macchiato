import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { chromium } from "playwright";

for (const [fixture, expected] of [
  ["nested-callbacks", { normal: true, overflow: true, recovered: true, deep: true, semantics: true }],
  ["rom-string-keys", { before: true, after: true, same: true }],
]) test(`MicroQuickJS runtime regression: ${fixture}`, async (t) => {
  const root = new URL("../../../", import.meta.url).pathname;
  const working = resolve(root, "../macchiato-work");
  await mkdir(working, { recursive: true });
  const directory = await mkdtemp(resolve(working, "micro-callbacks-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const examples = resolve(root, "dev/wasm-web-runtimes/examples");
  const runtime = resolve(examples, "microquickjs-suite/microquickjs-guest-runtime");
  const application = resolve(directory, "application.bin");
  execFileSync(resolve(runtime, "microquickjs/mqjs"), ["-m32", "-o", application,
    new URL(`fixtures/${fixture}.js`, import.meta.url).pathname]);
  const output = resolve(directory, "callbacks.wasm");
  execFileSync(process.execPath, [resolve(examples, "microquickjs-suite/scripts/stamp-wasm.js"),
    resolve(runtime, "target/wasm32-unknown-unknown/release/wasm_web_container_example_runtime.wasm"),
    output, `runtime.bin=${resolve(examples, "codemirror/generated/microquickjs-runtime.bin")}`,
    `application.bin=${application}`]);
  const wasm = await readFile(output);
  const machine = await readFile(resolve(root, "dev/wasm-web-machine/dist/module/machine.js"));
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.route("http://callbacks.test/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    return route.fulfill(path === "/machine.js"
      ? { body: machine, contentType: "text/javascript" }
      : path === "/callbacks.wasm"
      ? { body: wasm, contentType: "application/wasm" }
      : { body: '<div id="guest"></div>', contentType: "text/html" });
  });
  await page.goto("http://callbacks.test/");
  const messages = await page.evaluate(async () => {
    const { default: WasmWebMachine } = await import("/machine.js");
    const result = [];
    const module = await WebAssembly.compileStreaming(fetch("/callbacks.wasm"));
    const stamp = new Uint8Array(WebAssembly.Module.customSections(module, "wasm-web-machine")[0]);
    const machine = new WasmWebMachine(module, document.querySelector("#guest"),
      { stamp, onMessage: (message) => result.push(message) });
    await machine.onmsg(0);
    machine.destroy();
    return result;
  });
  assert.deepEqual(messages.map((message) => JSON.parse(message)), [expected]);
});
