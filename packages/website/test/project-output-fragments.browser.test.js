import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { build } from "esbuild";
import { chromium } from "playwright";
import { compileProjectFiles } from "../../project-editor/src/single-file-compiler.js";

test("compiled fragment links navigate the existing production output without opening another page", async t => {
  const code = (await build({ stdin: { contents: `
    export { default as Machine } from './dev/wasm-web-machine/src/wasm-web-machine.ts';
    export { ProjectOutput } from './packages/website/project-output-session.js';
  `, resolveDir: new URL("../../..", import.meta.url).pathname },
    bundle: true, write: false, format: "esm", platform: "browser" })).outputFiles[0].text;
  const wasm = await readFile(new URL("../generated/project-quickjs-runtime.wasm", import.meta.url));
  const shell = await readFile(new URL("../project-output-frame.html", import.meta.url), "utf8");
  const program = compileProjectFiles([{ path: "index.html", content: `
    <a href="#/chapter.html">Chapter</a> <a href="#details">Details</a>
    <button id="counter">0</button><div style="height:1000px"></div><h2 id="details">Details</h2>
    <script>
      var count = 0;
      document.getElementById('counter').addEventListener('click', function () {
        document.getElementById('counter').textContent = String(++count);
      });
      addEventListener('hashchange', function () { __wwcPostMessage(location.pathname); });
    </script>` }]);
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage(), errors = [], unexpected = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", route => {
    const url = new URL(route.request().url());
    if (url.origin === "http://fragments.test") {
      if (url.pathname === "/module.js") return route.fulfill({ body: code, contentType: "text/javascript" });
      if (url.pathname === "/runtime.wasm") return route.fulfill({ body: wasm, contentType: "application/wasm" });
      if (url.pathname === "/output") return route.fulfill({ body: shell, contentType: "text/html" });
      if (url.pathname === "/") return route.fulfill({ contentType: "text/html",
        body: '<!doctype html><iframe src="/output" style="width:600px;height:400px"></iframe>' });
    }
    unexpected.push(url.href);
    return route.abort();
  });
  await page.goto("http://fragments.test/");
  const frame = page.frames().find(frame => frame.url().endsWith("/output"));
  await frame.evaluate(async program => {
    const { Machine, ProjectOutput } = await import("/module.js");
    const module = await WebAssembly.compileStreaming(fetch("/runtime.wasm"));
    window.routes = [];
    window.originalDocument = document;
    window.output = new ProjectOutput(Machine, module, document.querySelector("#project-output-a"), () => ({
      allowNavigate: "fragment",
      services: { route: { get: () => location.hash.slice(1) || "/", search: () => "" } },
      onMessage: route => routes.push(route),
    }), error => { throw error; });
    await output.load(program);
  }, program);
  try {
    await frame.locator("#counter").click();
    await frame.locator('a[href="#/chapter.html"]').click();
    await frame.waitForFunction(() => routes.at(-1) === "/chapter.html");
    await frame.locator('a[href="#details"]').click();
    await frame.waitForFunction(() => routes.at(-1) === "details");
    assert.ok(await frame.evaluate(() => scrollY) > 400);
    await frame.evaluate(() => history.back());
    await frame.waitForFunction(() => routes.at(-1) === "/chapter.html");
    await frame.locator("#counter").click();
    assert.equal(await frame.locator("#counter").textContent(), "2");
    assert.equal(await frame.evaluate(() => document === originalDocument), true);
    assert.equal(page.url(), "http://fragments.test/");
    assert.equal(page.context().pages().length, 1);
    assert.deepEqual(await frame.evaluate(() => routes), ["/chapter.html", "details", "/chapter.html"]);
    assert.deepEqual(errors, []);
    assert.deepEqual(unexpected, []);
  } finally { await frame.evaluate(() => output.destroy()); }
});
