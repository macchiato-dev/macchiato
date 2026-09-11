import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { chromium } from "playwright";

test("scope markers preserve app classes and independent detached/shared grants", async t => {
  const code = (await build({
    entryPoints: [new URL("../../../dev/wasm-web-machine/src/wasm-web-machine.ts", import.meta.url).pathname],
    bundle: true, write: false, format: "esm", platform: "browser",
  })).outputFiles[0].text;
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.route("http://scope-marker.test/**", route => route.fulfill(
    new URL(route.request().url()).pathname === "/machine.js"
      ? { body: code, contentType: "text/javascript" }
      : { body: "<!doctype html><title>Scope lifecycle</title>", contentType: "text/html" }));
  await page.goto("http://scope-marker.test/");
  const result = await page.evaluate(async () => {
    const { default: Machine } = await import("/machine.js");
    // No guest execution is needed to check grant allocation and cleanup.
    const module = new WebAssembly.Module(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]));
    const root = document.createElement("div"), portal = document.createElement("div");
    root.className = "app";
    portal.className = "portal";
    const nativeRandom = crypto.getRandomValues;
    let calls = 0;
    crypto.getRandomValues = array => { array.fill(calls++ < 2 ? 0 : calls); return array; };
    let first, second, replacement;
    try {
      first = new Machine(module, root, { portals: [portal] });
      const initial = root.getAttribute("data-wwm-scope");
      second = new Machine(module, root, { portals: [portal] });
      const shared = root.getAttribute("data-wwm-scope").split(" ");
      const portalShared = portal.getAttribute("data-wwm-scope").split(" ");
      first.destroy();
      const retained = root.getAttribute("data-wwm-scope");
      second.destroy();
      const cleaned = [root, portal].every(node => !node.hasAttribute("data-wwm-scope"));
      // Try the original identifier again after both machines are gone.
      calls = 0;
      replacement = new Machine(module, root);
      // Repeated cleanup must not strip a later machine's reused identifier.
      first.destroy();
      return { initial, shared, portalShared, retained, cleaned,
        reused: root.getAttribute("data-wwm-scope"),
        classes: [root.className, portal.className] };
    } finally {
      first?.destroy(); second?.destroy(); replacement?.destroy();
      crypto.getRandomValues = nativeRandom;
    }
  });
  assert.equal(result.initial, "wwm-00000");
  assert.equal(result.shared.length, 2);
  assert.equal(new Set(result.shared).size, 2, "detached grants still participate in collision checks");
  assert.deepEqual(result.portalShared, result.shared);
  assert.equal(result.retained, result.shared[1]);
  assert.equal(result.cleaned, true);
  assert.equal(result.reused, result.initial);
  assert.deepEqual(result.classes, ["app", "portal"]);
});
