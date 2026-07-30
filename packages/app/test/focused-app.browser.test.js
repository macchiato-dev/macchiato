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
  assert.equal(await page.locator("#collection").inputValue(), "session");
  assert.deepEqual(await page.locator("#collection option").allTextContents(), [
    "[B] Secure demo library", "[S] Session Storage", "[L] Local Storage", "[M] Memory",
  ]);

  await page.locator("#toggle-sidebar").click();
  assert.equal(await page.locator(".app").getAttribute("data-sidebar"), "hidden");
  await page.waitForTimeout(250);
  assert.equal(await page.locator(".sidebar").evaluate((node) => node.getBoundingClientRect().width), 0);
  await page.locator("#toggle-sidebar").click();

  await page.locator("#new-collection").click();
  await page.locator("#collection-form input[name=name]").fill("Private tools");
  await page.locator("#collection-form select[name=storage]").selectOption("local");
  await page.locator("#collection-form").getByRole("button", { name: "Create collection" }).click();
  assert.equal(await page.locator("#collection").locator("option:checked").textContent(), "[L] Private tools");

  await page.locator("#new-document").click();
  await page.locator("#editor").fill("A private calculator\n\nNo network required.");
  assert.match(await page.locator("#status").textContent(), /Saved to Local Storage/);
  assert.equal(await page.locator(".document-open").count(), 1);
  assert.equal(await page.locator(".document-open").evaluate((node) => getComputedStyle(node).height), "92px");
  await page.locator(".document-menu").click();
  assert.match(await page.locator("#status").textContent(), /sandbox config is shown/);

  await page.keyboard.press("Control+k");
  await page.locator("#command-palette[open]").waitFor();
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#command-palette[open]").count(), 0);

  await page.reload();
  await page.locator("body[data-ready=true]").waitFor();
  await page.locator("#collection").selectOption({ label: "[L] Private tools" });
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
