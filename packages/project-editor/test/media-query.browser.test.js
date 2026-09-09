import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { build } from "esbuild";
import { chromium } from "playwright";

test("guest media queries follow browser changes without resize or polling", async (t) => {
  // Exercise the actual QuickJS environment used by project output, not a
  // browser-only mock of the guest's DOM wrappers.
  const runtime = await readFile(new URL("../../website/generated/project-quickjs-runtime.wasm", import.meta.url));
  const machine = await build({
    entryPoints: [new URL("../../../dev/wasm-web-machine/src/wasm-web-machine.ts", import.meta.url).pathname],
    bundle: true, write: false, format: "esm", platform: "browser",
  });
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage({ colorScheme: "light" });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("http://media.test/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    return route.fulfill(path === "/machine.js"
      ? { contentType: "text/javascript", body: machine.outputFiles[0].text }
      : path === "/runtime.wasm"
      ? { contentType: "application/wasm", body: runtime }
      : { contentType: "text/html", body: '<div id="guest"></div>' });
  });
  await page.goto("http://media.test/");
  await page.evaluate(async () => {
    const { default: WasmWebMachine } = await import("/machine.js");
    window.messages = [];
    window.machine = new WasmWebMachine(
      await WebAssembly.compileStreaming(fetch("/runtime.wasm")),
      document.querySelector("#guest"),
      { onMessage: (message) => window.messages.push(message) },
    );
    await window.machine.onmsg(0);
    window.runGuest = async (source) => {
      const text = new TextEncoder().encode(source);
      const bytes = new Uint8Array(text.length + 1);
      bytes[0] = 1;
      bytes.set(text, 1);
      await window.machine.onmsg(bytes);
    };
  });
  await page.evaluate(() => window.runGuest(`
    var query = matchMedia('(prefers-color-scheme: light)');
    var passive = matchMedia('(prefers-color-scheme: light)');
    function changed(event) {
      __wwcPostMessage('change:' + event.matches + ':' +
        (this === query) + ':' + (event.media === query.media));
    }
    query.addEventListener('change', changed);
    __wwcPostMessage('initial:' + query.matches);
  `));
  assert.deepEqual(await page.evaluate(() => window.messages), ["initial:true"]);
  await page.emulateMedia({ colorScheme: "dark" });
  await page.waitForFunction(() => window.messages.includes("change:false:true:true"));
  await page.evaluate(() => window.runGuest("__wwcPostMessage('passive:' + passive.matches);"));
  assert.ok((await page.evaluate(() => window.messages)).includes("passive:false"));
  await page.emulateMedia({ colorScheme: "light" });
  await page.waitForFunction(() => window.messages.includes("change:true:true:true"));
  await page.evaluate(() => window.runGuest(`
    query.removeEventListener('change', changed);
    query.onchange = function (event) { __wwcPostMessage('property:' + event.matches); };
  `));
  await page.emulateMedia({ colorScheme: "dark" });
  await page.waitForFunction(() => window.messages.includes("property:false"));
  assert.equal((await page.evaluate(() => window.messages)).filter((m) => m === "change:false:true:true").length, 1);
  await page.evaluate(() => window.runGuest("query.onchange = null;"));
  const before = await page.evaluate(() => window.messages.length);
  await page.emulateMedia({ colorScheme: "light" });
  await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => window.messages.length), before);
  await page.evaluate(() => window.runGuest("query.addListener(changed);"));
  await page.emulateMedia({ colorScheme: "dark" });
  await page.waitForFunction((n) => window.messages.length > n, before);
  await page.evaluate(() => window.runGuest("query.removeListener(changed);"));
  await page.evaluate(() => window.machine.destroy());
  await page.emulateMedia({ colorScheme: "light" });
  assert.deepEqual(errors, []);
});
