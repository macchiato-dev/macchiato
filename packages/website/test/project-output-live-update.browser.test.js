import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { build } from "esbuild";
import { chromium } from "playwright";
import { compileProjectFiles } from "../../project-editor/src/single-file-compiler.js";

test("guest live updates retain state; replacement reloads start a fresh lifetime without an iframe", async t => {
  const code = (await build({ stdin: { contents: `
    export { default as Machine } from './dev/wasm-web-machine/src/wasm-web-machine.ts';
    export { ProjectOutput } from './packages/website/project-output-session.js';
  `, resolveDir: new URL("../../..", import.meta.url).pathname },
    bundle: true, write: false, format: "esm", platform: "browser" })).outputFiles[0].text;
  const wasm = await readFile(new URL("../generated/project-quickjs-runtime.wasm", import.meta.url));
  const compile = label => compileProjectFiles([{ path: "index.html", content: `
    <button id="counter">${label}</button><p id="status">Ready</p>
    <script>
      var count = 0;
      document.getElementById('counter').addEventListener('click', function () {
        document.getElementById('counter').textContent = String(++count);
        __wwcPostMessage('count:' + count);
      });
    </script>` }]);
  const initial = compile("Start");
  const browser = await chromium.launch();
  t.after(() => browser.close());
  for (const grant of ["document", "element"]) await t.test(grant, async () => {
    const page = await browser.newPage(), errors = [], unexpected = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/*", route => {
      const url = new URL(route.request().url());
      if (url.origin === "http://live-update.test") {
        if (url.pathname === "/module.js") return route.fulfill({ body: code, contentType: "text/javascript" });
        if (url.pathname === "/runtime.wasm") return route.fulfill({ body: wasm, contentType: "application/wasm" });
        if (url.pathname === "/") return route.fulfill({ contentType: "text/html",
          body: '<!doctype html><div id="mount"></div>' });
      }
      unexpected.push(url.href);
      return route.abort();
    });
    try {
      await page.goto("http://live-update.test/");
      await page.evaluate(async ({ grant, initial }) => {
        const { Machine, ProjectOutput } = await import("/module.js");
        const module = await WebAssembly.compileStreaming(fetch("/runtime.wasm"));
        window.messages = [];
        window.originalDocument = document;
        window.output = new ProjectOutput(Machine, module,
          grant === "document" ? document : document.querySelector("#mount"),
          () => ({ onMessage: message => messages.push(message) }), error => { throw error; });
        await output.load(initial);
        window.originalButton = document.querySelector("#counter");
        window.originalSession = output.active.session;
        window.originalRuntime = output.runtime;
      }, { grant, initial });
      await page.locator("#counter").click();
      assert.equal(await page.locator("#counter").textContent(), "1");

      // This guest explicitly updates its existing view/code. Do not turn
      // these operations into a replacement load or rerun startup scripts.
      const retained = await page.evaluate(async () => {
        await output.run([{ code: "count += 10; document.getElementById('status').textContent = 'Live';" }]);
        return { node: originalButton === document.querySelector("#counter"),
          session: originalSession === output.active.session, document: document === originalDocument };
      });
      assert.deepEqual(retained, { node: true, session: true, document: true });
      assert.equal(await page.locator("#status").textContent(), "Live");
      await page.locator("#counter").click();
      assert.equal(await page.locator("#counter").textContent(), "12");

      // Ordinary source rebuilds use a fresh application lifetime, while
      // keeping the interpreter and browser Document. Old callbacks die.
      await page.evaluate(initial => output.load(initial), initial);
      const replaced = await page.evaluate(() => {
        originalButton.click();
        return { retired: originalSession.disposed, session: originalSession !== output.active.session,
          runtime: originalRuntime === output.runtime, document: document === originalDocument,
          frames: document.querySelectorAll("iframe").length, messages };
      });
      assert.deepEqual(replaced, { retired: true, session: true, runtime: true, document: true,
        frames: 0, messages: ["count:1", "count:12"] });
      await page.locator("#counter").click();
      assert.equal(await page.locator("#counter").textContent(), "1");

      const failure = await page.evaluate(async initial => {
        try { await output.load({ ...initial, scripts: [{ code: "throw new Error('broken edit');" }] }); }
        catch (error) { return error.message; }
      }, initial);
      assert.match(failure, /broken edit/);
      await page.evaluate(initial => output.load(initial), initial);
      await page.locator("#counter").click();
      assert.equal(await page.locator("#counter").textContent(), "1");
      assert.equal(await page.evaluate(() => output.runtime === originalRuntime), true);
      assert.deepEqual(errors, []);
      assert.deepEqual(unexpected, []);
    } finally {
      await page.evaluate(() => window.output?.destroy());
      await page.close();
    }
  });
});
