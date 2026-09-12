import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { chromium } from "playwright";

test("MicroQuickJS's node identity cache does not retain unreachable removed wrappers", {
  timeout: 30_000,
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
    const held = new Set(), leases = new Map(), notices = [], mount = document.getElementById("mount");
    const machine = new Machine(module, mount, {
      stamp: new Uint8Array(WebAssembly.Module.customSections(module, "wasm-web-machine")[0]),
      onReferenceLease(id, count, object) {
        if (count) { held.add(id); leases.set(id, { count, kind: object.constructor.name }); }
        else { held.delete(id); leases.delete(id); }
      },
      onMessage: message => notices.push(JSON.parse(message)),
    });
    try {
      await machine.onmsg(0);
      const call = value => machine.onmsg(new TextEncoder().encode("\u0002churnNodes\0" + value));
      await call(false);
      const baseline = held.size, samples = [];
      const check = value => machine.onmsg(new TextEncoder().encode("\u0002checkNodeCache\0" + JSON.stringify(value)));
      await check("invalid");
      for (let round = 0; round < 20; round++) {
        await call(true); await call(false);
        samples.push({ growth: held.size - baseline, elements: mount.children.length, cached: notices.at(-1).cached });
      }
      await check("hold");
      for (let round = 0; round < 5; round++) { await call(true); await check("verify"); }
      const whileRetained = held.size - baseline;
      await check("release"); await check("released");
      return { baseline, samples, whileRetained, afterRelease: held.size - baseline,
        retainedSample: Array.from(leases).slice(-5),
        checked: notices.filter(notice => notice.checked).map(notice => notice.checked) };
    } finally { machine.destroy(); }
  });
  t.diagnostic(JSON.stringify(result));
  assert.ok(result.samples.every(sample => sample.elements === 0), "the nodes were removed from the real DOM");
  assert.ok(result.samples.every(sample => sample.growth <= 2), "removed wrappers should release their leases after collection");
  assert.ok(result.samples.every(sample => sample.cached <= 202),
    "empty cache cells must not accumulate as monotonically allocated host IDs increase");
  assert.ok(result.whileRetained > 0, "live detached wrappers still own host leases");
  assert.ok(result.afterRelease <= 2, "releasing the retained subtree releases its leases");
  assert.deepEqual(result.checked, ["invalid", "hold", ...Array(5).fill("verify"), "release", "released"]);
  assert.deepEqual(errors, []);
});
