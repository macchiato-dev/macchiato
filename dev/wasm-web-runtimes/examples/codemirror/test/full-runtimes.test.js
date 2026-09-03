import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { chromium } from "@playwright/test";
import test from "node:test";

const root = resolve(new URL("..", import.meta.url).pathname);
const machineModule = resolve(root,
  "../../../wasm-web-machine/dist/module/wasm-web-machine.js");
const contentTypes = {
  ".css": "text/css",
  ".html": "text/html",
  ".js": "text/javascript",
  ".wasm": "application/wasm",
};

async function serve() {
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
      response.writeHead(200, {
        "content-type": contentTypes[extname(relative)] || "application/octet-stream",
      });
      response.end(await readFile(resolve(root, relative)));
    } catch {
      response.writeHead(404).end();
    }
  }).listen(0, "127.0.0.1");
  await new Promise(resolveReady => server.once("listening", resolveReady));
  return server;
}

test("the full CodeMirror interaction works in all runtimes", { timeout: 120_000 },
async context => {
  const server = await serve();
  context.after(() => new Promise(resolveClosed => server.close(resolveClosed)));
  const base = `http://127.0.0.1:${server.address().port}`;

  const selectedRuntime = process.env.CODEMIRROR_RUNTIME;
  const runtimes = [
    ["quickjs", "/full/"],
    ["microquickjs", "/microquickjs/full/"],
  ];
  for (const [runtime, pathname] of runtimes
    .filter(([runtime]) => !selectedRuntime || runtime === selectedRuntime)) {
    const browser = await chromium.launch();
    try {
      context.diagnostic(`checking ${runtime}`);
      const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
      const errors = [];
      page.on("pageerror", error => errors.push(error.stack || error.message));
      await page.goto(`${base}${pathname}`);
      await page.waitForSelector("body[data-ready]", { timeout: 30_000 });

      const content = page.locator(".cm-content");
      const visibleNumbers = page.locator(
        ".cm-lineNumbers .cm-gutterElement:not([style*='visibility: hidden'])");
      assert.equal(await page.locator(".cm-editor").count(), 1, `${runtime} editor`);
      assert.equal(await visibleNumbers.count(), await page.locator(".cm-line").count(),
        `${runtime} line numbers`);

      await content.click();
      await page.keyboard.press("ControlOrMeta+End");
      await page.keyboard.press("Enter");
      await page.keyboard.type("f");
      const completion = page.locator(".cm-tooltip-autocomplete");
      await completion.waitFor({ state: "visible", timeout: 15_000 });
      assert.ok(await completion.getByRole("option").count() > 1,
        `${runtime} completion`);
      await page.keyboard.press("Escape");
      await page.keyboard.press("ControlOrMeta+z");

      await page.keyboard.press("ControlOrMeta+f");
      await page.keyboard.type("Project");
      try {
        await page.locator(".cm-searchMatch").first().waitFor({ timeout: 15_000 });
      } catch (error) {
        context.diagnostic(`${runtime} search state: ${JSON.stringify({
          dialogs: await page.locator(".cm-search").count(),
          query: await page.locator(".cm-search input").first().inputValue().catch(() => null),
          matches: await page.locator(".cm-searchMatch").count(),
          errors,
        })}`);
        throw error;
      }
      await page.keyboard.press("Escape");

      const foldMarker = page.locator('.cm-foldGutter span[title="Fold line"]:visible').first();
      const beforeFold = await page.locator(".cm-line").count();
      await foldMarker.click();
      assert.ok(await page.locator(".cm-line").count() < beforeFold,
        `${runtime} folding`);
      await page.locator('.cm-foldGutter span[title="Unfold line"]:visible').first().click();
      assert.equal(await page.locator(".cm-line").count(), beforeFold,
        `${runtime} unfolding`);

      assert.deepEqual(errors, [], `${runtime} browser errors`);
      await page.screenshot({
        path: `/root/macchiato-work/${runtime}-full-codemirror.png`,
      });
    } finally {
      await browser.close();
    }
  }
});
