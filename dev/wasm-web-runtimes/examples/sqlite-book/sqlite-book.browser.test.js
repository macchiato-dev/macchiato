import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { chromium } from "@playwright/test";
import { wasmWebContainerExampleHandler } from
  "../microquickjs-suite/handler.js";

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
  const browserContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await browserContext.newPage();
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
  assert.equal(await page.locator(".modal textarea").evaluate((field) =>
    document.activeElement === field && field.selectionStart === 0 &&
      field.selectionEnd === field.value.length), true);
  await page.evaluate(() => {
    window.copyEventCount = 0;
    document.addEventListener("copy", () => window.copyEventCount++);
  });
  await page.keyboard.press("Control+c");
  await page.keyboard.press("Control+Tab");
  await page.waitForTimeout(60);
  assert.equal(await page.locator(".modal").count(), 1);
  const otherPage = await page.context().newPage();
  await otherPage.bringToFront();
  const simulatedActivation = !await page.evaluate(() => document.hidden);
  if (simulatedActivation) await page.evaluate(() => dispatchEvent(new Event("blur")));
  assert.equal(await page.locator(".modal").count(), 1);
  await otherPage.close();
  await page.bringToFront();
  if (simulatedActivation) await page.evaluate(() => dispatchEvent(new Event("focus")));
  await page.locator(".modal-closing").waitFor();
  assert.equal(await page.locator(".modal-panel").isVisible(), false);
  await page.locator(".modal").waitFor({ state: "detached" });
  assert.equal(await page.evaluate(() => window.copyEventCount), 1);

  await page.getByRole("button", { name: "View the original on sqlite.org" }).click();
  await page.locator(".modal textarea").click();
  await page.locator(".modal textarea").press("End");
  await page.keyboard.press("Control+c");
  await page.waitForTimeout(60);
  assert.equal(await page.locator(".modal").count(), 1);
  await page.locator(".modal textarea").pressSequentially("-blocked");
  assert.equal(await page.locator(".modal textarea").inputValue(), "https://sqlite.org/wal.html");
  assert.equal(await page.locator(".modal textarea").evaluate((field) => field.selectionStart),
    "https://sqlite.org/wal.html".length);
  assert.equal(await page.locator('a[href^="http"]').count(), 0);
  assert.deepEqual(remoteRequests, []);
  assert.deepEqual(errors, []);
  await page.getByRole("button", { name: "Close" }).click();
  await page.locator(".modal").waitFor({ state: "detached" });

  await page.getByRole("button", { name: "View the original on sqlite.org" }).click();
  await page.locator(".modal-panel").click({ position: { x: 5, y: 5 } });
  assert.equal(await page.locator(".modal").evaluate((modal) =>
    document.activeElement === modal), true);
  await page.keyboard.press("Escape");
  await page.locator(".modal").waitFor({ state: "detached" });

  await page.getByRole("button", { name: "View the original on sqlite.org" }).click();
  await page.locator(".modal").click({ position: { x: 5, y: 5 } });
  await page.locator(".modal").waitFor({ state: "detached" });
});
