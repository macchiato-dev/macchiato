import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";

test("xterm runs in QuickJS through the constrained terminal surface", async (t) => {
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
  assert.equal(await page.evaluate(() => typeof globalThis.Terminal), "undefined");
  await page.locator("#terminal textarea").focus();
  await page.keyboard.type("hello");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(100);
  const inspection = await page.evaluate(() => globalThis.__terminalBridge.inspect());
  assert.equal(inspection.columns, 80);
  assert.equal(inspection.rows, 24);
  assert.ok(inspection.surface.elements <= inspection.surface.limits.elements);
  assert.ok(inspection.surface.operations.peakWindow < inspection.surface.limits.operations);
  assert.deepEqual(errors, []);
});
