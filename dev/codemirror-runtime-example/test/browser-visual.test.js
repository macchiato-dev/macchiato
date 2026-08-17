import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { chromium } from "@playwright/test";
import test from "node:test";

const root = resolve(new URL("..", import.meta.url).pathname);
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript",
  ".wasm": "application/wasm" };

test("the demo index and each projected QuickJS editor work", async (context) => {
  const server = createServer(async (request, response) => {
    const pathname = new URL(request.url, "http://example.test").pathname;
    const relative = pathname === "/" ? "index.html"
      : pathname.endsWith("/") ? `${pathname.slice(1)}index.html` : pathname.slice(1);
    try {
      const body = await readFile(resolve(root, relative));
      response.writeHead(200, { "content-type": types[extname(relative)] || "application/octet-stream" });
      response.end(body);
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
  const index = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  await index.goto(base);
  assert.deepEqual(await index.locator("nav strong").allTextContents(),
    ["Simple editor", "Full UI", "Large document"]);
  await index.screenshot({ path: "/tmp/quickjs-codemirror-index.png" });
  await index.close();

  for (const name of ["simple", "full", "large"]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const started = performance.now();
    await page.goto(`${base}/${name}/`);
    await page.waitForSelector("body[data-ready]");
    context.diagnostic(`${name}: browser-ready=${(performance.now() - started).toFixed(1)}ms`);
    assert.equal(await page.locator(".cm-editor").count(), 1);
    assert.equal(Math.round((await page.locator(".cm-editor").boundingBox()).height), 900);
    assert.ok(await page.locator(".cm-lineNumbers .cm-gutterElement").count() > 1);
    assert.deepEqual(errors, []);
    await page.screenshot({ path: `/tmp/quickjs-codemirror-${name}.png` });
    await page.close();
  }

  const full = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await full.goto(`${base}/full/`);
  await full.waitForSelector("body[data-ready]");
  assert.ok(await full.locator(".cm-foldGutter .cm-gutterElement").count() > 1);
  assert.equal(await full.locator(".cm-search input").first().inputValue(), "URL");
  await full.locator('.cm-search button[name="close"]').click();
  await full.locator(".cm-search").waitFor({ state: "detached" });
  await full.screenshot({ path: "/tmp/quickjs-codemirror-full-mobile.png" });
  await full.close();
});
