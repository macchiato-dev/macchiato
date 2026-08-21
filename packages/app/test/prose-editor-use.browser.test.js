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

function startApp(port, dataDir, plugin = "prose-editor-use") {
  const child = spawn(process.execPath, [
    appCli, "--data-dir", dataDir, "--host", "127.0.0.1", "--port", String(port),
    "--app-plugin", plugin,
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

test("prose-editor-use runs a constrained ProseMirror composer with a QuickJS controller", async (t) => {
  const port = await getPort();
  const dataDir = await mkdtemp(join(tmpdir(), "macchiato-prose-editor-"));
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
  const response = await page.goto(`http://prose-editor-use.localhost:${port}/`, { waitUntil: "networkidle" });
  await page.locator("body[data-ready='true']").waitFor();
  assert.equal(response.status(), 200);
  assert.match(response.headers()["content-security-policy"], /wasm-unsafe-eval/);
  assert.equal(await page.locator(".ProseMirror").count(), 1);
  assert.match(await page.locator("#status").textContent(), /QuickJS observed \d+ characters across 1 paragraph/);
  await page.screenshot();
  assert.equal(await page.locator(".ProseMirror").count(), 1, "visual capture must not violate the editor surface");
  assert.doesNotMatch(await page.locator("#status").textContent(), /stopped/i);

  const editor = page.locator(".ProseMirror");
  await editor.click();
  await page.keyboard.press("Control+a");
  await page.keyboard.type("A useful comment");
  await page.getByRole("button", { name: "Bold" }).click();
  await page.keyboard.type(" in bold");
  await page.getByRole("button", { name: "Bold" }).click();
  assert.equal((await editor.locator("strong").textContent()).replace("\u00a0", " "), " in bold");
  await page.keyboard.press("Enter");
  await page.keyboard.type("with a second paragraph");
  await page.keyboard.press("Control+i");
  await page.keyboard.type(" in italics");
  assert.equal((await editor.locator("em").textContent()).replace("\u00a0", " "), " in italics");
  await page.keyboard.press("Control+z");
  assert.equal(await editor.getByText("in italics").count(), 0);
  await page.keyboard.press("Control+Shift+z");
  await page.getByRole("button", { name: "Send message" }).click();
  assert.match((await page.locator("#sent").textContent()).replaceAll("\u00a0", " "), /A useful comment in bold\n\nwith a second paragraph in italics/);
  assert.match(await page.locator("#status").textContent(), /across 2 paragraphs/);
  assert.deepEqual(errors, []);

  await editor.evaluate((node) => node.setAttribute("onclick", "alert(1)"));
  await assert.doesNotReject(page.getByText(/Editor stopped: DOM shape rejected attribute: onclick/).waitFor());
  assert.equal(await page.locator(".ProseMirror").count(), 0);
});

test("the same message editor host swaps to Wordgard through QuickJS controller code", async (t) => {
  const port = await getPort();
  const dataDir = await mkdtemp(join(tmpdir(), "macchiato-wordgard-editor-"));
  const app = startApp(port, dataDir, "wordgard-editor-use");
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
  await page.goto(`http://wordgard-editor-use.localhost:${port}/`, { waitUntil: "networkidle" });
  await page.locator("body[data-ready='true']").waitFor();
  assert.match(await page.locator("#status").textContent(), /^Wordgard via QuickJS observed/);
  assert.equal(await page.locator("wordgard-editor").count(), 1);
  assert.equal(await page.locator("wg-content").evaluate((node) => getComputedStyle(node).minHeight), "190px");

  const editor = page.locator("wg-content");
  await editor.click();
  await page.keyboard.press("Control+a");
  await page.waitForTimeout(30);
  await page.keyboard.type("A Wordgard message", { delay: 10 });
  await page.keyboard.press("Control+b");
  await page.keyboard.type(" in bold", { delay: 10 });
  await page.keyboard.press("Control+b");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Second paragraph", { delay: 10 });
  await page.getByRole("button", { name: "Undo" }).click();
  await page.getByRole("button", { name: "Redo" }).click();
  await page.getByRole("button", { name: "Send message" }).click();
  assert.match((await page.locator("#sent").textContent()).replaceAll("\u00a0", " "), /A Wordgard message in bold\n\nSecond paragraph/);
  assert.match(await page.locator("#status").textContent(), /across 2 paragraphs/);
  await page.screenshot({ caret: "initial" });
  assert.equal(await page.locator("wordgard-editor").count(), 1, "visual capture must not violate the editor surface");
  assert.doesNotMatch(await page.locator("#status").textContent(), /stopped/i);
  assert.deepEqual(errors, []);

  await editor.evaluate((node) => node.setAttribute("onclick", "alert(1)"));
  await assert.doesNotReject(page.getByText(/Editor stopped: DOM shape rejected attribute: onclick/).waitFor());
  assert.equal(await page.locator("wordgard-editor").count(), 0);
});
