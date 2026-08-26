import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { chromium } from "@playwright/test";
import test from "node:test";

const root = resolve(new URL("..", import.meta.url).pathname);
const machineModule = resolve(root,
  "../../../wasm-web-machine/dist/module/wasm-web-machine.js");
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript",
  ".wasm": "application/wasm" };

test("tabbed editors preserve state and search across files in both runtimes", async (context) => {
  const server = createServer(async (request, response) => {
    const pathname = new URL(request.url, "http://example.test").pathname;
    if (pathname === "/wasm-web-machine.js") {
      response.writeHead(200, { "content-type": "text/javascript" });
      response.end(await readFile(machineModule));
      return;
    }
    const relative = pathname.endsWith("/")
      ? `${pathname.slice(1)}index.html` : pathname.slice(1);
    try {
      response.writeHead(200, { "content-type": types[extname(relative)] ||
        "application/octet-stream" });
      response.end(await readFile(resolve(root, relative)));
    } catch {
      response.writeHead(404).end();
    }
  }).listen(0, "127.0.0.1");
  await new Promise(resolveReady => server.once("listening", resolveReady));
  const browser = await chromium.launch();
  context.after(async () => {
    await browser.close();
    await new Promise(resolveClosed => server.close(resolveClosed));
  });
  const base = `http://127.0.0.1:${server.address().port}`;

  const smoke = await browser.newPage();
  const smokeErrors = [];
  smoke.on("pageerror", error => smokeErrors.push(error.stack || error.message));
  await smoke.goto(`${base}/microesnext/`);
  await smoke.waitForSelector("body[data-ready]");
  assert.equal(await smoke.locator("#status").innerText(),
    "MicroESNext executed 40 + 2 in WebAssembly.");
  assert.deepEqual(smokeErrors, []);
  await smoke.close();

  for (const [runtime, path] of [
    ["quickjs", "/multi/"],
    ["microquickjs", "/microquickjs/multi/"],
  ]) {
    const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.stack || error.message));
    await page.goto(`${base}${path}`);
    await page.waitForSelector("body[data-ready]", { timeout: 30_000 });
    const editor = page.locator(".cm-editor:visible");
    assert.equal(await page.getByRole("tab").count(), 3);
    assert.equal(await editor.count(), 1);

    await page.getByRole("tab", { name: "example.css" }).click();
    assert.match(await editor.innerText(), /color-scheme/);
    await page.getByRole("tab", { name: "example.ts" }).click();
    await page.locator(".file-search input").fill("Project");
    await page.waitForFunction(() =>
      document.querySelectorAll(".search-results button").length > 0);
    assert.ok(await page.locator(".search-results button").count() >= 3);
    await page.locator(".search-results button").first().click();

    const content = editor.locator(".cm-content");
    await content.click();
    await page.keyboard.press("ControlOrMeta+End");
    await page.keyboard.type("\n// preserved");
    await page.getByRole("tab", { name: "example.html" }).click();
    await page.getByRole("tab", { name: "example.ts" }).click();
    assert.match(await content.innerText(), /\/\/ preserved/);
    assert.deepEqual(errors, []);
    await page.screenshot({ path: `/root/artifacts/${runtime}-multi-codemirror.png` });
    await page.close();
  }
});
