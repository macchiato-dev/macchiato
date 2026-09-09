import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { build } from "esbuild";
import { transformAsync } from "@babel/core";
import presetEnv from "@babel/preset-env";
import { chromium } from "playwright";
import microQuickJSSyntax from "../../../dev/wasm-web-runtimes/examples/codemirror/babel-microquickjs.js";

test("incremental source accounting matches the baseline in MicroQuickJS", { timeout: 120_000 }, async t => {
  const root = new URL("../../../", import.meta.url).pathname;
  const working = resolve(root, "../macchiato-work");
  await mkdir(working, { recursive: true });
  const directory = await mkdtemp(resolve(working, "source-usage-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const examples = resolve(root, "dev/wasm-web-runtimes/examples");
  const runtime = resolve(examples, "microquickjs-suite/microquickjs-guest-runtime");
  const bundled = await build({ entryPoints: [new URL("fixtures/source-usage-benchmark.js", import.meta.url).pathname],
    bundle: true, format: "iife", platform: "neutral", write: false });
  const lowered = await transformAsync(bundled.outputFiles[0].text, {
    comments: false, compact: false, assumptions: { iterableIsArray: false },
    plugins: [microQuickJSSyntax],
    presets: [[presetEnv, { loose: true, modules: false, targets: { ie: "11" } }]],
  });
  const source = resolve(directory, "application.js"), bytecode = resolve(directory, "application.bin");
  await writeFile(source, lowered.code);
  execFileSync(resolve(runtime, "microquickjs/mqjs"), ["-m32", "-o", bytecode, source]);
  const output = resolve(directory, "benchmark.wasm");
  execFileSync(process.execPath, [resolve(examples, "microquickjs-suite/scripts/stamp-wasm.js"),
    resolve(runtime, "target/wasm32-unknown-unknown/release/wasm_web_container_example_runtime.wasm"), output,
    `runtime.bin=${resolve(examples, "codemirror/generated/microquickjs-runtime.bin")}`, `application.bin=${bytecode}`]);
  const wasm = await readFile(output);
  const host = await readFile(resolve(root, "dev/wasm-web-machine/dist/module/machine.js"));
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.route("http://usage.test/**", route => {
    const path = new URL(route.request().url()).pathname;
    return route.fulfill(path === "/machine.js" ? { body: host, contentType: "text/javascript" }
      : path === "/benchmark.wasm" ? { body: wasm, contentType: "application/wasm" }
      : { body: '<div id="guest"></div>', contentType: "text/html" });
  });
  await page.goto("http://usage.test/");
  const results = await page.evaluate(async () => {
    const { default: Machine } = await import("/machine.js");
    const module = await WebAssembly.compileStreaming(fetch("/benchmark.wasm"));
    const stamp = new Uint8Array(WebAssembly.Module.customSections(module, "wasm-web-machine")[0]);
    const messages = [];
    const machine = new Machine(module, document.querySelector("#guest"), { stamp,
      onMessage: message => messages.push(JSON.parse(message)) });
    await machine.onmsg(0);
    machine.destroy();
    return messages;
  });
  assert.equal(results.length, 1);
  assert.equal(results[0].beforeMs.length, 4);
  assert.equal(results[0].afterMs.length, 4);
  // Record timings, but don't turn machine load or scheduling noise into a
  // brittle CI performance threshold. The guest checks results and post-GC use.
  t.diagnostic(JSON.stringify(results[0]));
});
