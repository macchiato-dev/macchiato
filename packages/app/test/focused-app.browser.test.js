import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { chromium } from "playwright";

const repoRoot = resolve(new URL("../../..", import.meta.url).pathname);
const appCli = join(repoRoot, "packages/app/src/index.js");

function getPort() {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolvePort(port));
    });
  });
}

function startApp(port, dataDir) {
  const child = spawn(process.execPath, [
    appCli, "--data-dir", dataDir, "--host", "127.0.0.1", "--port", String(port),
    "--app-plugin", "focused-app",
  ], { cwd: repoRoot, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  const ready = new Promise((resolveReady, reject) => {
    const timer = setTimeout(() => reject(new Error(output)), 30_000);
    const onData = (data) => {
      output += data;
      if (output.includes("Server running")) {
        clearTimeout(timer);
        resolveReady();
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("error", reject);
  });
  return { child, ready };
}

async function stop(child) {
  if (child.exitCode !== null) return;
  await new Promise((resolveStop) => {
    child.once("exit", resolveStop);
    child.kill("SIGTERM");
  });
}

test("focused app runs a portable storage-explicit workspace", async (t) => {
  const port = await getPort();
  const dataDir = await mkdtemp(join(tmpdir(), "macchiato-focused-app-"));
  const app = startApp(port, dataDir);
  t.after(async () => {
    await stop(app.child);
    await rm(dataDir, { recursive: true, force: true });
  });
  await app.ready;

  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  const response = await page.goto(`http://app.localhost:${port}/`);
  await page.locator("body[data-ready=true]").waitFor();

  assert.equal(response.status(), 200);
  assert.match(response.headers()["content-security-policy"], /connect-src 'none'/);
  assert.equal(await page.locator(".topbar").count(), 0);
  assert.equal(await page.locator("#search").getAttribute("autocomplete"), "off");
  assert.equal(await page.locator("#search").getAttribute("type"), "text");
  assert.equal(await page.locator("#new-document").getAttribute("class"), await page.locator("#filter").getAttribute("class"));
  assert.match(await page.locator("#collection-trigger").textContent(), /Session Storage/);
  await page.locator("#collection-trigger").click();
  assert.deepEqual(await page.locator(".collection-option strong").allTextContents(), [
    "Session Storage", "Local Storage", "Memory", "Secure demo library",
  ]);
  assert.equal(await page.locator(".collection-menu-header").evaluate((node) => getComputedStyle(node).height), "36px");
  assert.equal(await page.locator("#new-collection").evaluate((node) => getComputedStyle(node).height), "30px");
  assert.equal(await page.locator(".collection-option").last().getAttribute("data-collection"), "library");
  await page.locator(".collection-option").first().locator(".storage-icon").hover();
  await page.waitForTimeout(150);
  assert.equal(await page.locator(".collection-option").first().locator(".storage-icon").evaluate((node) =>
    getComputedStyle(node, "::after").opacity), "1");
  await page.locator("main").click();

  assert.equal(await page.locator("#toggle-sidebar").evaluate((node) => getComputedStyle(node).width), "39px");
  assert.equal(await page.locator("#toggle-sidebar").getAttribute("title"), null);
  assert.deepEqual(await page.locator("#sidebar-control").evaluate((node) => {
    const style = getComputedStyle(node);
    return { background: style.backgroundColor, border: style.borderTopColor, shadow: style.boxShadow };
  }), { background: "rgba(0, 0, 0, 0)", border: "rgba(0, 0, 0, 0)", shadow: "none" });
  assert.equal(await page.locator("#sidebar-control-more").evaluate((node) => getComputedStyle(node).opacity), "0.3");
  await page.locator("#toggle-sidebar").click();
  assert.equal(await page.locator(".app").getAttribute("data-sidebar"), "hidden");
  await page.waitForTimeout(250);
  assert.equal(await page.locator(".sidebar").evaluate((node) => node.getBoundingClientRect().width), 0);
  await page.locator("#sidebar-control").hover();
  await page.waitForTimeout(900);
  assert.equal(await page.locator("#sidebar-control").evaluate((node) => Math.round(node.getBoundingClientRect().width)), 32);
  await page.waitForTimeout(500);
  assert.ok(await page.locator("#sidebar-control").evaluate((node) => node.getBoundingClientRect().width) > 85);
  await page.locator("main").hover();
  await page.waitForTimeout(1_050);
  assert.equal(await page.locator("#sidebar-control").evaluate((node) => Math.round(node.getBoundingClientRect().width)), 32);
  await page.locator("#sidebar-control").hover();
  await page.waitForTimeout(1_300);
  await page.locator("#sidebar-control-more").click();
  assert.deepEqual(await page.locator("#sidebar-control-menu").getByRole("menuitem").allTextContents(), ["Show", "Move to Right"]);
  const leftMenuBox = await page.locator("#sidebar-control-menu").boundingBox();
  assert.ok(leftMenuBox.x >= 0);
  assert.ok(leftMenuBox.x + leftMenuBox.width <= page.viewportSize().width);
  await page.locator("#sidebar-menu-side").click();
  assert.equal(await page.locator("#sidebar-control").getAttribute("data-side"), "right");
  assert.equal(await page.locator(".sidebar-control__layout").evaluate((node) => getComputedStyle(node).display), "block");
  await page.locator("#sidebar-control").hover();
  await page.locator("#sidebar-control-more").click();
  const rightMenuBox = await page.locator("#sidebar-control-menu").boundingBox();
  assert.ok(rightMenuBox.x >= 0);
  assert.ok(rightMenuBox.x + rightMenuBox.width <= page.viewportSize().width);
  await page.locator("#sidebar-control-more").click();
  const dragBox = await page.locator("#sidebar-control-drag").boundingBox();
  await page.mouse.move(dragBox.x + dragBox.width / 2, dragBox.y + dragBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(dragBox.x + dragBox.width / 2, 160);
  await page.mouse.up();
  assert.ok(await page.locator("#sidebar-control").evaluate((node) => node.getBoundingClientRect().y) > 100);
  await page.locator("#toggle-sidebar").click();
  const resizeX = await page.locator("#sidebar-resizer").evaluate((node) => node.getBoundingClientRect().x);
  await page.mouse.move(resizeX, 300);
  await page.mouse.down();
  await page.mouse.move(380, 300);
  await page.mouse.up();
  await page.waitForTimeout(250);
  assert.ok(await page.locator(".sidebar").evaluate((node) => node.getBoundingClientRect().width) > 370);

  await page.locator("#collection-trigger").click();
  await page.locator("#new-collection").click();
  await page.locator("#collection-form input[name=name]").fill("Private tools");
  await page.locator("#collection-form select[name=storage]").selectOption("local");
  await page.locator("#collection-form").getByRole("button", { name: "Create collection" }).click();
  assert.match(await page.locator("#collection-trigger").textContent(), /Private tools/);

  await page.locator("#new-document").click();
  assert.equal(await page.locator(".sidebar").getAttribute("data-tab"), "info");
  assert.equal(await page.locator("#info-title").textContent(), "Untitled app");
  assert.match(await page.locator("#info-storage").textContent(), /Local Storage/);
  assert.match(await page.locator("#info-sandbox").textContent(), /QuickJS WASM/);
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#download-document").click();
  assert.match((await downloadPromise).suggestedFilename(), /Untitled-app\.txt/);
  await page.locator("#editor").fill("A private calculator\n\nNo network required.");
  assert.match(await page.locator("#status").textContent(), /Saved to Local Storage/);
  await page.evaluate(() => {
    const key = "macchiato.focused-app.collections.v1";
    const collections = JSON.parse(localStorage.getItem(key));
    collections.find((collection) => collection.name === "Private tools").documents[0].sandbox.shortcuts.commandK = "app";
    localStorage.setItem(key, JSON.stringify(collections));
  });
  await page.reload();
  await page.locator("body[data-ready=true]").waitFor();
  await page.locator("#collection-trigger").click();
  await page.locator(".collection-option", { hasText: "Private tools" }).click();
  await page.keyboard.press("Control+k");
  assert.equal(await page.locator("#command-palette[open]").count(), 0);
  await page.keyboard.press("Control+Shift+k");
  await page.locator("#command-palette[open]").waitFor();
  await page.keyboard.press("Escape");
  await page.locator("#documents-tab").click();
  assert.equal(await page.locator(".document-open").count(), 1);
  assert.equal(await page.locator(".document-open").evaluate((node) => getComputedStyle(node).height), "92px");
  await page.locator(".document-menu").click();
  assert.deepEqual(await page.locator("#document-actions").getByRole("menuitem").allTextContents(), ["Hide"]);
  await page.locator("#document-hide-sidebar").click();
  assert.equal(await page.locator(".app").getAttribute("data-sidebar"), "hidden");

  await page.keyboard.press("Control+Shift+k");
  await page.locator("#command-palette[open]").waitFor();
  assert.equal(await page.locator("#command-palette .command-palette__surface").count(), 1);
  await page.locator("[data-command-input]").fill("missing");
  assert.equal(await page.locator("#command-show-sidebar").isHidden(), true);
  await page.locator("[data-command-input]").fill("show");
  assert.equal(await page.locator("#command-show-sidebar").isVisible(), true);
  await page.locator("#command-show-sidebar").click();
  assert.equal(await page.locator(".app").getAttribute("data-sidebar"), "visible");
  assert.equal(await page.locator("#command-palette[open]").count(), 0);

  await page.reload();
  await page.locator("body[data-ready=true]").waitFor();
  assert.equal(await page.locator("#sidebar-control").getAttribute("data-side"), "right");
  assert.ok(await page.locator("#sidebar-control").evaluate((node) => node.getBoundingClientRect().y) > 100);
  await page.locator("#collection-trigger").click();
  await page.locator(".collection-option", { hasText: "Private tools" }).click();
  assert.equal(await page.locator("#editor").inputValue(), "A private calculator\n\nNo network required.");

  await page.locator("#file").setInputFiles({
    name: "hello.md",
    mimeType: "text/markdown",
    buffer: Buffer.from("# Hello from a file"),
  });
  await page.locator("#import-dialog[open]").waitFor();
  await page.locator("#import-dialog").getByRole("button", { name: "Import" }).click();
  assert.equal(await page.locator("#document-title").textContent(), "hello");
  assert.equal(await page.locator("#editor").inputValue(), "# Hello from a file");
  assert.deepEqual(errors, []);
});
