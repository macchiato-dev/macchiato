import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { chromium } from "@playwright/test";
import { wasmWebContainerExampleHandler } from "../examples/handler.js";

test("SQLite reader routes inside its Wasm artifact", async (context) => {
  const server = createServer(async (request, response) => {
    try {
      const routedUrl = request.url.replace(/^\/project-name(?=\/|$)/, "") || "/";
      const result = await wasmWebContainerExampleHandler(new Request(
        `http://wasm-web-container.localhost${routedUrl}`,
        { method: request.method }
      ));
      response.writeHead(result.status, Object.fromEntries(result.headers));
      response.end(Buffer.from(await result.arrayBuffer()));
    } catch (error) {
      response.writeHead(500);
      response.end(String(error));
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(() => new Promise((resolve) => server.close(resolve)));

  const browser = await chromium.launch({ headless: true });
  context.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  const remoteRequests = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("request", (request) => {
    if (new URL(request.url()).hostname !== "127.0.0.1") remoteRequests.push(request.url());
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  await page.goto(origin + "/project-name/sqlite-book/");

  await page.getByRole("heading", {
    name: "SQLite: selected technical documentation"
  }).waitFor();
  assert.equal(await page.locator(".page-list a").count(), 9);
  const chapterNames = await page.locator(".page-list a").allTextContents();
  for (const name of chapterNames) {
    await page.getByRole("link", { name, exact: true }).click();
    await page.getByRole("heading", { name, exact: true }).waitFor();
    await page.getByRole("link", { name: "All chapters" }).click();
    await page.getByRole("heading", {
      name: "SQLite: selected technical documentation"
    }).waitFor();
  }
  await page.getByRole("link", { name: "Write-Ahead Logging" }).click();
  assert.equal(new URL(page.url()).hash, "#/wal.html");
  await page.getByRole("heading", { name: "Write-Ahead Logging" }).waitFor();

  await page.getByRole("link", { name: "2.1. Checkpointing" }).click();
  await page.waitForTimeout(50);
  assert.equal(new URL(page.url()).hash, "#/wal.html#checkpointing");
  assert.ok(await page.evaluate(() => scrollY) > 0);
  await page.goBack();
  assert.equal(new URL(page.url()).hash, "#/wal.html");

  await page.getByRole("button", { name: "View the original on sqlite.org" }).click();
  assert.equal(await page.locator(".modal textarea").inputValue(), "https://sqlite.org/wal.html");
  assert.equal(await page.locator(".modal textarea").getAttribute("readonly"), "");
  assert.equal(await page.locator('a[href^="http"]').count(), 0);
  assert.deepEqual(remoteRequests, []);
  assert.deepEqual(errors, []);
  await page.getByRole("button", { name: "Close" }).click();
  assert.equal(await page.locator(".modal").count(), 0);
});
