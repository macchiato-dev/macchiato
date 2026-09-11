import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { chromium } from "playwright";

for (const [fixture, expected] of [
  ["browser-timers", ["argument", "immediate", "interval", "timeout"]],
  ["promise-rejection", ["compile: invalid CSS"]],
  ["transient-messages", { requests: 24, serviceStrings: 0 }],
  ["transient-dom-values", { updates: 24, retained: 0 }],
  ["wire-numbers", { equal: true, denied: 3 }],
  ["wire-uint", { cases: 8, bounded: 23 }],
  ["wire-bytes", { bounded: 5, isolated: true, byteCalls: 1 }],
  ["wire-text", { cases: 8, denied: 5, subarray: true }],
  ["collection-callbacks", { entries: [[10, "one", true], [20, "two", true], [30, "three", true]],
    values: [["a", "a", true, true], ["b", "b", true, true]], copied: 2, count: 3 }],
  ["nested-callbacks", { normal: true, overflow: true, recovered: true, deep: true, semantics: true }],
  ["rom-string-keys", { before: true, after: true, same: true }],
  ["dom-removal", { before: 3, afterElement: [2, true, true, true],
    afterText: [1, true, true, true], reinserted: [2, true, true], remaining: 0 }],
  ["string-iteration", { counts: [0, 3, 1, 5], first: "😀", second: "x", done: true,
    mapped: [8, 13], closed: true, set: ["a", "b"], map: [["a", 1], ["b", 2]] }],
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
  const environment = resolve(directory, "runtime.bin");
  execFileSync(resolve(runtime, "microquickjs/mqjs"), ["-m32", "-o", environment,
    resolve(examples, "codemirror/generated/microquickjs-runtime.js")]);
  execFileSync(process.execPath, [resolve(examples, "microquickjs-suite/scripts/stamp-wasm.js"),
    resolve(root, "packages/website/generated/project-editor-quickjs-runtime.wasm"),
    output, `runtime.bin=${environment}`,
    `application.bin=${application}`]);
  const wasm = await readFile(output);
  const machine = await readFile(resolve(root, "dev/wasm-web-machine/dist/module/machine.js"));
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
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
      { stamp, onMessage: (message) => result.push(message),
        services: { call(name, payload) {
          if (name !== "echo") throw new Error("Unexpected test service");
          return payload;
        } } });
    await machine.onmsg(0);
    // Let actual browser timers deliver their guest callbacks before disposal.
    const deadline = performance.now() + 3000;
    while (!result.length && performance.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    machine.destroy();
    return result;
  });
  const parsed = messages.map((message) => JSON.parse(message));
  if (fixture === "wire-bytes") {
    t.diagnostic(`32 independent 64 KiB payload copies: ${parsed[0].copyMilliseconds} ms`);
    delete parsed[0].copyMilliseconds;
  }
  assert.deepEqual(parsed, [expected]);
  assert.deepEqual(errors, []);
});
