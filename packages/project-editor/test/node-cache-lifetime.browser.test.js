import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { chromium } from "playwright";

test("MicroQuickJS's node identity cache does not retain unreachable removed wrappers", {
  timeout: 30_000,
  todo: "replace the strong WeakRef fallback used by the node cache",
}, async t => {
  const root = new URL("../../../", import.meta.url).pathname;
  const work = resolve(root, "../macchiato-work");
  await mkdir(work, { recursive: true });
  const directory = await mkdtemp(resolve(work, "node-cache-lifetime-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const generated = resolve(root, "packages/website/generated");
  const suite = resolve(root, "dev/wasm-web-runtimes/examples/microquickjs-suite");
  const application = resolve(directory, "application.bin");
  execFileSync(resolve(suite, "microquickjs-guest-runtime/microquickjs/mqjs"),
    ["-m32", "-o", application, new URL("fixtures/node-cache-lifetime.js", import.meta.url).pathname]);
  execFileSync(process.execPath, [resolve(suite, "scripts/stamp-wasm.js"),
    resolve(generated, "project-editor-quickjs-runtime.wasm"), resolve(directory, "guest.wasm"),
    `runtime.bin=${resolve(generated, "project-editor-runtime.bin")}`, `application.bin=${application}`]);
  const wasm = await readFile(resolve(directory, "guest.wasm"));
  const host = await readFile(resolve(root, "dev/wasm-web-machine/dist/module/machine.js"));
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage(), errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("http://lifetimes.test/**", route => {
    const path = new URL(route.request().url()).pathname;
    return route.fulfill(path === "/machine.js" ? { body: host, contentType: "text/javascript" }
      : path === "/guest.wasm" ? { body: wasm, contentType: "application/wasm" }
      : { body: '<!doctype html><main id="mount"></main>', contentType: "text/html" });
  });
  await page.goto("http://lifetimes.test/");
  const result = await page.evaluate(async () => {
    const { default: Machine } = await import("/machine.js");
    const module = await WebAssembly.compileStreaming(fetch("/guest.wasm"));
    const held = new Set(), mount = document.getElementById("mount");
    const machine = new Machine(module, mount, {
      stamp: new Uint8Array(WebAssembly.Module.customSections(module, "wasm-web-machine")[0]),
      onReferenceLease(id, count) { if (count) held.add(id); else held.delete(id); },
    });
    try {
      await machine.onmsg(0);
      const call = value => machine.onmsg(new TextEncoder().encode("\u0002churnNodes\0" + value));
      await call(false);
      const baseline = held.size, samples = [];
      for (let round = 0; round < 5; round++) {
        await call(true); await call(false);
        samples.push({ growth: held.size - baseline, elements: mount.children.length });
      }
      return { baseline, samples };
    } finally { machine.destroy(); }
  });
  t.diagnostic(JSON.stringify(result));
  assert.ok(result.samples.every(sample => sample.elements === 0), "the nodes were removed from the real DOM");
  assert.ok(result.samples.every(sample => sample.growth <= 2), "removed wrappers should release their leases after collection");
  assert.deepEqual(errors, []);
});
