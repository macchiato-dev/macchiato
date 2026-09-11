import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { build } from "esbuild";
import { chromium } from "playwright";
import { compileProjectFiles } from "../../project-editor/src/single-file-compiler.js";

for (const framed of [false, true]) test(`storage replies and subscription disposal work in QuickJS (${framed ? "iframe" : "direct"})`, async t => {
  const code = (await build({ stdin: { contents: `
    export { default as Machine } from './dev/wasm-web-machine/src/wasm-web-machine.ts';
    export { ProjectOutput } from './packages/website/project-output-session.js';
    export { ProjectOutputStorage } from './packages/website/project-output-storage.js';
    export { ResourcesStorageDevice } from './packages/website/resources-machine-devices.js';
  `, resolveDir: new URL("../../..", import.meta.url).pathname },
    bundle: true, write: false, format: "esm", platform: "browser" })).outputFiles[0].text;
  const wasm = await readFile(new URL("../generated/project-quickjs-runtime.wasm", import.meta.url));
  const program = compileProjectFiles([{ path: "index.html", content: `
    <button id="read">Read storage</button><p id="result"></p><script>
      function read() {
        try {
          var value = localStorage.getItem("large");
          localStorage.setItem("small", "still working");
          document.getElementById("result").textContent = value + ": " + localStorage.getItem("small");
        } catch (error) {
          document.getElementById("result").textContent = error.name + ": " + (error instanceof RangeError) + ": " + error.message;
        }
      }
      document.getElementById("read").addEventListener("click", read);
      read();
    </script>` }]);
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage(), errors = [], unexpected = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", route => {
    const url = new URL(route.request().url());
    if (url.origin !== "http://storage-reply.test") {
      unexpected.push(url.href); return route.abort();
    }
    if (url.pathname === "/module.js") return route.fulfill({ body: code, contentType: "text/javascript" });
    if (url.pathname === "/runtime.wasm") return route.fulfill({ body: wasm, contentType: "application/wasm" });
    return route.fulfill({ contentType: "text/html", body: '<!doctype html><title>Storage reply</title><main id="mount"></main>' });
  });
  await page.goto("http://storage-reply.test/");
  if (framed) await page.evaluate(async () => {
    const frame = document.createElement("iframe");
    frame.src = "/frame";
    const ready = new Promise(resolve => frame.onload = resolve);
    document.body.append(frame);
    await ready;
  });
  const target = framed ? page.frames().find(frame => new URL(frame.url()).pathname === "/frame") : page;
  await target.evaluate(async program => {
    const { Machine, ProjectOutput, ProjectOutputStorage } = await import("/module.js");
    const module = await WebAssembly.compileStreaming(fetch("/runtime.wasm"));
    window.storage = new ProjectOutputStorage(window, "reply-test");
    // Simulate storage written by an older host. It fits browser storage but
    // exceeds the wire limit after JSON escaping, not before it.
    localStorage.setItem(storage.key("large"), "\\".repeat(1100000));
    window.output = new ProjectOutput(Machine, module, document.querySelector("#mount"),
      () => ({ services: { storage } }), error => { throw error; });
    await output.load(program);
  }, program);
  assert.equal(await target.locator("#result").textContent(), "RangeError: true: Storage response exceeds its text limit");
  assert.equal(await target.evaluate(() => localStorage.getItem(storage.key("large")).length), 1100000);
  await target.evaluate(() => localStorage.setItem(storage.key("large"), "recovered"));
  await target.getByRole("button", { name: "Read storage", exact: true }).click();
  assert.equal(await target.locator("#result").textContent(), "recovered: still working");
  await target.evaluate(() => { output.destroy(); storage.destroy(); });
  const subscriptionProgram = compileProjectFiles([{ path: "index.html", content:
    '<script>localStorage.listen("settings", function () { __wwcPostMessage("changed"); });</script>' }]);
  const subscriptions = await target.evaluate(async program => {
    const { Machine, ProjectOutput, ResourcesStorageDevice } = await import("/module.js");
    const module = await WebAssembly.compileStreaming(fetch("/runtime.wasm"));
    const storage = new ResourcesStorageDevice(window), outputs = [], reports = [];
    try {
      for (let index = 0; index < 3; index++) {
        const mount = document.createElement("div");
        document.querySelector("#mount").append(mount);
        const output = new ProjectOutput(Machine, module, mount, () => ({
          services: { storage }, onMessage: message => reports.push([index, message]),
        }), error => { throw error; });
        outputs.push(output);
        await output.load(program);
      }
      const before = storage.listeners.get("local").size;
      outputs[0].destroy();
      const afterOne = storage.listeners.get("local").size;
      window.dispatchEvent(new StorageEvent("storage", { storageArea: localStorage, key: "settings" }));
      outputs[1].destroy(); outputs[2].destroy();
      window.dispatchEvent(new StorageEvent("storage", { storageArea: localStorage, key: "settings" }));
      return { before, afterOne, retained: storage.listeners.size, reports };
    } finally { outputs.forEach(output => output.destroy()); }
  }, subscriptionProgram);
  assert.deepEqual(subscriptions, { before: 3, afterOne: 2, retained: 0,
    reports: [[1, "changed"], [2, "changed"]] });
  assert.deepEqual(errors, []);
  assert.deepEqual(unexpected, []);
});
