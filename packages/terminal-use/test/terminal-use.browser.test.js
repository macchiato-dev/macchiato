import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";

test("xterm Pong runs ANSI output and keyboard input inside QuickJS", async (t) => {
  const child = spawn(process.execPath, ["packages/terminal-use/examples/basic/server.js"], { cwd: new URL("../../..", import.meta.url), stdio: ["ignore", "pipe", "pipe"] });
  t.after(() => child.kill());
  const url = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("terminal-use server did not start")), 10_000);
    child.once("error", reject);
    child.stdout.on("data", (chunk) => {
      const match = String(chunk).match(/http:\/\/127\.0\.0\.1:\d+/);
      if (match) { clearTimeout(timer); resolve(match[0]); }
    });
  });
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(url, { waitUntil: "networkidle" });
  await page.locator("body[data-ready=true]").waitFor();
  await page.getByText(/Pong running/).waitFor();
  assert.equal((await page.request.get(`${url}/terminal-guest.js`)).headers()["cache-control"], "no-store");
  assert.equal(await page.evaluate(() => typeof globalThis.Terminal), "undefined");
  await page.locator(".terminal-shell").click({ position: { x: 300, y: 180 } });
  assert.equal(await page.evaluate(() => document.activeElement?.classList.contains("xterm-helper-textarea")), true);
  const initial = await page.evaluate(() => globalThis.__terminalBridge.inspect());
  await page.keyboard.press("ArrowUp");
  await page.waitForTimeout(1_400);
  const inspection = await page.evaluate(() => globalThis.__terminalBridge.inspect());
  assert.equal(inspection.columns, 80);
  assert.equal(inspection.rows, 24);
  assert.ok(inspection.pong.frames > initial.pong.frames, "the QuickJS game loop should advance");
  assert.ok(inspection.pong.playerY < initial.pong.playerY, "xterm should deliver the arrow escape sequence to Pong");
  await page.keyboard.press("Space");
  await page.waitForTimeout(50);
  assert.equal((await page.evaluate(() => globalThis.__terminalBridge.inspect())).pong.paused, true);
  await page.evaluate(() => {
    globalThis.__terminalBridge.stopPong();
    globalThis.__terminalBridge.write("\u001b[1;36mBounded terminal stream\u001b[0m\r\nready> ");
  });
  await page.getByText("Bounded terminal stream").waitFor();
  await page.keyboard.type("status");
  assert.equal(await page.evaluate(() => globalThis.__terminalBridge.input()), "status");
  const streamInspection = await page.evaluate(() => globalThis.__terminalBridge.inspect());
  assert.equal(streamInspection.pong, null);
  assert.equal(streamInspection.columns, 80);
  assert.equal(streamInspection.rows, 24);
  assert.ok(inspection.surface.elements <= inspection.surface.limits.elements);
  assert.ok(inspection.surface.operations.peakWindow < inspection.surface.limits.operations);
  assert.deepEqual(errors, []);

  const macContext = await browser.newContext({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36",
  });
  const macPage = await macContext.newPage();
  const macErrors = [];
  macPage.on("pageerror", (error) => macErrors.push(error.message));
  await macPage.addInitScript(() => Object.defineProperty(navigator, "platform", { configurable: true, value: "MacIntel" }));
  await macPage.goto(url, { waitUntil: "networkidle" });
  await macPage.getByText(/Pong running/).waitFor();
  assert.equal(await macPage.locator("#terminal .xterm-scrollable-element.mac").count(), 1);
  await macPage.locator(".terminal-shell").click({ position: { x: 300, y: 180 } });
  const macBefore = await macPage.evaluate(() => globalThis.__terminalBridge.inspect().pong.playerY);
  await macPage.keyboard.press("ArrowUp");
  await macPage.waitForTimeout(50);
  assert.equal(await macPage.evaluate(() => globalThis.__terminalBridge.inspect().pong.playerY), macBefore - 1);
  assert.deepEqual(macErrors, []);

  const violationPage = await browser.newPage();
  await violationPage.goto(url, { waitUntil: "networkidle" });
  await violationPage.getByText(/Pong running/).waitFor();
  await violationPage.locator("#terminal .xterm").evaluate((element) => element.classList.add("undeclared-terminal-shape"));
  await violationPage.getByText(/Terminal blocked: DOM shape rejected class: undeclared-terminal-shape/).waitFor();
});
