import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { chromium } from "@playwright/test";
import test from "node:test";

const root = resolve(new URL("..", import.meta.url).pathname);
const types = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm" };

test("projected QuickJS CodeMirror has bounded gutters, folding, and search", async (context) => {
  const server = createServer(async (request, response) => {
    const relative = request.url === "/" ? "index.html" : request.url.slice(1);
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
  for (const viewport of [{ name: "desktop", width: 1440, height: 900 },
    { name: "mobile", width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.waitForSelector("body[data-ready]");

    assert.equal(await page.locator(".cm-editor").count(), 1);
    assert.equal(Math.round((await page.locator(".cm-editor").boundingBox()).height), viewport.height);
    assert.ok(await page.locator(".cm-lineNumbers .cm-gutterElement").count() > 10);
    assert.ok(await page.locator(".cm-foldGutter .cm-gutterElement").count() > 1);
    assert.equal(await page.locator(".cm-foldPlaceholder").count(), 1);
    assert.equal(await page.locator(".cm-search").count(), 1);
    assert.equal(await page.locator(".cm-search input").first().inputValue(), "URL");
    assert.equal((await page.locator(".cm-line").filter({ hasText: "export const URL_" })
      .first().innerText()).includes("ATTRIBUTES_CAPABILITY"), false);
    await page.screenshot({ path: `/tmp/quickjs-codemirror-${viewport.name}.png` });
    await page.locator('.cm-search button[name="close"]').click();
    await page.locator(".cm-search").waitFor({ state: "detached" });
    await page.locator(".cm-content").focus();
    assert.equal(await page.locator(".cm-content").evaluate(element =>
      document.activeElement === element), true);
    assert.deepEqual(errors, []);
    await page.close();
  }
});
