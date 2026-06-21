import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { resolve } from "node:path";
import test from "node:test";
import { chromium } from "@playwright/test";

const repoRoot = resolve(new URL("../../..", import.meta.url).pathname);
const appCli = resolve(repoRoot, "packages", "app", "src", "index.js");

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

function startApp(port) {
  const child = spawn(process.execPath, [
    appCli,
    "--host",
    "127.0.0.1",
    "--port",
    String(port),
  ], {
    cwd: repoRoot,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  const waitForReady = new Promise((resolveReady, reject) => {
    const timer = setTimeout(() => reject(new Error(`Server did not start\n${output}`)), 5000);
    const onData = (chunk) => {
      output += chunk;
      if (output.includes("Server running")) {
        clearTimeout(timer);
        resolveReady();
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("error", reject);
    child.on("exit", (code) => {
      if (!output.includes("Server running")) {
        clearTimeout(timer);
        reject(new Error(`Server exited before ready (${code})\n${output}`));
      }
    });
  });
  return { child, waitForReady };
}

async function stopChild(child) {
  if (child.exitCode !== null) return;
  await new Promise((resolveStop) => {
    child.once("exit", resolveStop);
    child.kill("SIGTERM");
    setTimeout(() => {
      if (child.exitCode === null) child.kill("SIGKILL");
    }, 1000).unref();
  });
}

test("todo-matrix runs in QuickJS and persists matrix state", { timeout: 60000 }, async (t) => {
  const port = await getPort();
  const app = startApp(port);
  let browser;

  t.after(async () => {
    await browser?.close();
    await stopChild(app.child);
  });

  await app.waitForReady;
  browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  const badResponses = [];

  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("response", (response) => {
    if (response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`);
  });

  await page.goto(`http://todo-matrix.localhost:${port}/`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.removeItem("todo-matrix-state"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator(".matrix-source").waitFor();
  assert.equal(await page.locator("#app[data-status='error']").count(), 0);

  await page.locator(".matrix-source").fill("Task\tDesign\tBuild\nHeader\t\t\nDocs\t\t");
  await page.getByRole("button", { name: "Go" }).click();
  await page.locator(".task-grid").waitFor();

  assert.deepEqual(await page.locator(".task-grid th").allTextContents(), ["", "Design", "Build", "Header", "Docs"]);
  assert.equal(await page.locator(".cell-toggle").count(), 4);
  assert.deepEqual(await page.locator(".cell-toggle").evaluateAll((nodes) => nodes.map((node) => node.textContent)), ["", "", "", ""]);

  await page.locator(".cell-toggle").first().click();
  assert.equal(await page.locator(".cell-toggle").first().getAttribute("data-state"), "doing");
  assert.equal(await page.locator(".cell-toggle").first().getAttribute("aria-pressed"), "true");
  assert.match(await page.locator(".cell-toggle").first().getAttribute("aria-label"), /Header \/ Design: under construction/);
  await page.locator(".cell-toggle").first().click();
  assert.equal(await page.locator(".cell-toggle").first().getAttribute("data-state"), "done");
  assert.match(await page.locator(".cell-toggle").first().getAttribute("aria-label"), /Header \/ Design: complete/);
  const firstBox = await page.locator(".cell-toggle").first().boundingBox();
  assert.ok(firstBox);
  assert.equal(Math.round(firstBox.width), Math.round(firstBox.height));
  assert.equal(await page.evaluate(() => Boolean(localStorage.getItem("todo-matrix-state"))), true);

  for (let i = 0; i < 20; i += 1) {
    await page.locator(".cell-toggle").first().click();
  }
  await page.locator(".cell-toggle").first().waitFor();
  const stateBeforeReload = await page.locator(".cell-toggle").first().getAttribute("data-state");
  assert.match(stateBeforeReload, /^(open|doing|done)$/);

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator(".task-grid").waitFor();
  assert.equal(await page.locator(".cell-toggle").first().getAttribute("data-state"), stateBeforeReload);

  const restart = page.getByRole("button", { name: "Start over" });
  await restart.hover();
  assert.equal(await page.locator(".restart-tip").textContent(), "Start over");
  await page.waitForFunction(() => getComputedStyle(document.querySelector(".restart-tip")).opacity === "1");
  assert.equal(await restart.getAttribute("title"), "Start over");
  await restart.click();
  await page.locator(".matrix-source").waitFor();
  assert.equal(await page.evaluate(() => localStorage.getItem("todo-matrix-state")), null);

  assert.deepEqual(errors, []);
  assert.deepEqual(badResponses, []);
});
