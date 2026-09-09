import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { chromium } from "playwright";
import { atomCatalogSource, bytecodeAtoms } from "../../../dev/wasm-web-runtimes/examples/microquickjs-suite/scripts/bytecode-atoms.js";

test("late MicroQuickJS bytecode shares registered atoms without replacing live editor state", async t => {
  const root = new URL("../../../", import.meta.url).pathname;
  const working = resolve(root, "../macchiato-work");
  await mkdir(working, { recursive: true });
  const directory = await mkdtemp(resolve(working, "late-bytecode-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const examples = resolve(root, "dev/wasm-web-runtimes/examples");
  const runtime = resolve(examples, "microquickjs-suite/microquickjs-guest-runtime");
  async function compile(name, source) {
    const path = resolve(directory, name + ".js"), output = resolve(directory, name + ".bin");
    await writeFile(path, source);
    execFileSync(resolve(runtime, "microquickjs/mqjs"), ["-m32", "-o", output, path]);
    return new Uint8Array(await readFile(output));
  }
  const first = await compile("first", `globalThis.shared.lateField += 1;
    globalThis.firstResult = function () { return globalThis.shared.lateField; };`);
  const second = await compile("second", `globalThis.shared.lateField += 2;
    globalThis.secondResult = function () { return globalThis.shared.lateField; };`);
  const unexpected = await compile("unexpected", "globalThis.notCatalogued = 1;");
  await compile("catalog", atomCatalogSource([first, second]));
  await compile("application", `
    globalThis.shared = {};
    shared[JSON.parse('"lateField"')] = 40;
    var dynamicKey = "dynamic-" + Date.now();
    shared[dynamicKey] = "retained";
    globalThis.control = function (name) {
      if (name === "close") closeGuest();
      else if (name !== "inspect") load(name);
      gc();
      __wwcPostMessage(JSON.stringify({
        value: shared[JSON.parse('"lateField"')], retained: shared[dynamicKey],
        first: typeof firstResult === "undefined" ? null : firstResult(),
        second: typeof secondResult === "undefined" ? null : secondResult()
      }));
      flush();
    };
    gc();
  `);
  const wasmPath = resolve(directory, "late.wasm");
  execFileSync(process.execPath, [resolve(examples, "microquickjs-suite/scripts/stamp-wasm.js"),
    resolve(runtime, "target/wasm32-unknown-unknown/release/wasm_web_container_example_runtime.wasm"),
    wasmPath, `runtime.bin=${resolve(examples, "codemirror/generated/microquickjs-runtime.bin")}`,
    `catalog.bin=${resolve(directory, "catalog.bin")}`, `application.bin=${resolve(directory, "application.bin")}`]);
  const wasm = await readFile(wasmPath);
  const host = await readFile(resolve(root, "dev/wasm-web-machine/dist/module/machine.js"));
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.route("http://late.test/**", route => {
    const path = new URL(route.request().url()).pathname;
    return route.fulfill(path === "/machine.js" ? { body: host, contentType: "text/javascript" }
      : path === "/late.wasm" ? { body: wasm, contentType: "application/wasm" }
      : { body: '<div id="guest"></div>', contentType: "text/html" });
  });
  await page.goto("http://late.test/");
  await page.evaluate(async () => {
    const { default: Machine } = await import("/machine.js");
    const module = await WebAssembly.compileStreaming(fetch("/late.wasm"));
    const stamp = new Uint8Array(WebAssembly.Module.customSections(module, "wasm-web-machine")[0]);
    window.messages = [];
    window.machine = new Machine(module, document.querySelector("#guest"), {
      stamp, onMessage: message => window.messages.push(message),
    });
    await window.machine.onmsg(0);
  });
  async function send(tag, name, bytes) {
    return page.evaluate(async ({ tag, name, bytes }) => {
      const header = new TextEncoder().encode(name + "\0");
      const packet = new Uint8Array(1 + header.length + bytes.length);
      packet[0] = tag; packet.set(header, 1); packet.set(bytes, 1 + header.length);
      window.messages.length = 0;
      try { await window.machine.onmsg(packet); }
      catch (error) { window.messages.push(error.message); }
      return window.messages;
    }, { tag, name, bytes: Array.from(bytes) });
  }
  const control = name => send(2, "control", new TextEncoder().encode(name));
  assert.deepEqual(await send(3, "first.bin", first), ["__wwcBytecode:first.bin"]);
  assert.deepEqual((await control("first.bin")).map(JSON.parse),
    [{ value: 41, retained: "retained", first: 41, second: null }]);
  assert.match((await send(3, "unexpected.bin", unexpected)).join("\n"), /atom is not registered/);
  assert.match((await send(3, "first.bin", first)).join("\n"), /installation is unavailable/);
  assert.deepEqual(await send(3, "second.bin", second), ["__wwcBytecode:second.bin"]);
  assert.deepEqual((await control("second.bin")).map(JSON.parse),
    [{ value: 43, retained: "retained", first: 43, second: 43 }]);
  await control("close");
  assert.match((await send(3, "closed.bin", second)).join("\n"), /installation is unavailable/);
  assert.deepEqual((await control("inspect")).map(JSON.parse),
    [{ value: 43, retained: "retained", first: 43, second: 43 }]);
  await page.evaluate(() => window.machine.destroy());
  assert.throws(() => bytecodeAtoms(first.subarray(0, 12)), /Unsupported/);
});
