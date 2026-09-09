import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { build } from "esbuild";
import { chromium } from "playwright";

test("disposing a machine cancels pending work and ambient listeners", async t => {
  const runtime = await readFile(new URL("../../website/generated/project-quickjs-runtime.wasm", import.meta.url));
  const machine = await build({
    entryPoints: [new URL("../../../dev/wasm-web-machine/src/wasm-web-machine.ts", import.meta.url).pathname],
    bundle: true, write: false, format: "esm", platform: "browser",
  });
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage(), errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("http://dispose.test/**", route => {
    const path = new URL(route.request().url()).pathname;
    return route.fulfill(path === "/machine.js"
      ? { contentType: "text/javascript", body: machine.outputFiles[0].text }
      : path === "/runtime.wasm"
      ? { contentType: "application/wasm", body: runtime }
      : { contentType: "text/html", body: '<div id="guest"></div>' });
  });
  await page.goto("http://dispose.test/");
  await page.evaluate(async () => {
    const { default: Machine } = await import("/machine.js");
    const module = await WebAssembly.compileStreaming(fetch("/runtime.wasm"));
    window.messages = [];
    for (let index = 0; index < 10; index++) {
      const machine = new Machine(module, document.getElementById("guest"), {
        frameInterval: index % 2 ? 30 : 0,
        onMessage: message => messages.push(message),
      });
      await machine.onmsg(0);
      const code = new TextEncoder().encode(`
        function unexpected() { __wwcPostMessage('stale callback'); }
        setTimeout(unexpected, 30);
        setInterval(unexpected, 30);
        setImmediate(unexpected);
        requestAnimationFrame(unexpected);
        requestCleanupOpportunity(unexpected);
        addEventListener('resize', unexpected);
        addEventListener('keydown', unexpected);
        document.addEventListener('click', unexpected);
        matchMedia('(prefers-color-scheme: dark)').addEventListener('change', unexpected);
      `);
      const message = new Uint8Array(code.length + 1);
      message[0] = 1; message.set(code, 1);
      machine.onmsg(message);
      machine.destroy();
      machine.destroy();
    }
    dispatchEvent(new Event('resize'));
    dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    document.dispatchEvent(new MouseEvent('click'));
  });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.waitForTimeout(120);
  assert.deepEqual(await page.evaluate(() => messages), []);
  assert.deepEqual(errors, []);
});
