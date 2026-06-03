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

test("dom-use-todos works in a real browser", async (t) => {
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

  await page.goto(`http://dom-use-todos.localhost:${port}/`);
  const oldWorkspaceModule = await page.request.get(
    `http://dom-use-todos.localhost:${port}/@macchiato-dev/dom-use/src/index.js`,
  );
  assert.equal(oldWorkspaceModule.status(), 404);

  const input = page.getByPlaceholder("What needs to be done?");
  await input.waitFor();
  assert.equal(await page.locator("#macchiato-loading-style").count(), 0);
  await input.click();
  assert.equal(await input.evaluate((node) => document.activeElement === node), true);
  await page.keyboard.type("Buy milk");
  await assert.equal(await input.inputValue(), "Buy milk");
  await page.keyboard.press("Enter");

  await assert.doesNotReject(async () => {
    await page.getByText("Buy milk").waitFor();
  });
  await page.locator(".destroy").click({ force: true });
  await assert.doesNotReject(async () => {
    await page.getByPlaceholder("What needs to be done?").waitFor();
  });
  assert.equal(await page.locator(".todoapp").count(), 1);
  assert.equal(await page.locator(".todo-item").count(), 0);

  await page.getByPlaceholder("What needs to be done?").fill("Make coffee");
  await page.getByRole("button", { name: "Add" }).click();
  await assert.doesNotReject(async () => {
    await page.getByText("Make coffee").waitFor();
  });
  await page.locator(".destroy").click({ force: true });
  assert.equal(await page.locator(".todo-item").count(), 0);

  await page.getByPlaceholder("What needs to be done?").fill("First");
  await page.keyboard.press("Enter");
  await page.getByPlaceholder("What needs to be done?").fill("Second");
  await page.keyboard.press("Enter");
  await page.getByText("First").waitFor();
  await page.getByText("Second").waitFor();

  await page.locator(".todo-item").nth(0).dragTo(page.locator(".todo-item").nth(1));
  assert.deepEqual(await page.locator(".todo-item label").allTextContents(), ["Second", "First"]);
  await page.locator(".destroy").first().click({ force: true });
  await page.locator(".destroy").first().click({ force: true });
  assert.equal(await page.locator(".todo-item").count(), 0);

  for (const item of ["Alpha", "Beta", "Gamma"]) {
    await page.getByPlaceholder("What needs to be done?").fill(item);
    await page.keyboard.press("Enter");
  }
  await page.getByText("Alpha").waitFor();
  await page.locator(".toggle").nth(0).check();
  await page.locator(".toggle").nth(1).check();

  for (let i = 0; i < 20; i += 1) {
    await page.locator(".filters a").filter({ hasText: "Active" }).click();
    await page.locator(".filters a").filter({ hasText: "Completed" }).click();
    await page.locator(".filters a").filter({ hasText: "All" }).click();
  }
  assert.equal(await page.locator("#app[data-status='error']").count(), 0);
  assert.deepEqual(await page.locator(".todo-item label").allTextContents(), ["Alpha", "Beta", "Gamma"]);
  await page.locator(".clear-completed:not(.hidden)").click();
  await page.locator(".destroy").click({ force: true });
  assert.equal(await page.locator(".todo-item").count(), 0);

  await page.getByPlaceholder("What needs to be done?").click();
  await page.keyboard.type("Buy milk");
  await page.keyboard.press("Enter");
  await page.getByText("Buy milk").waitFor();
  await page.locator(".toggle").check();
  await assert.doesNotReject(async () => {
    await page.locator(".todo-item.completed").waitFor();
  });

  const clearCompleted = page.locator(".clear-completed:not(.hidden)");
  await assert.doesNotReject(async () => {
    await clearCompleted.waitFor();
  });
  await clearCompleted.click();
  await assert.doesNotReject(async () => {
    await page.getByPlaceholder("What needs to be done?").waitFor();
  });
  assert.equal(await page.locator(".todoapp").count(), 1);
  assert.equal(await page.locator(".todo-item").count(), 0);
  assert.equal(await page.locator("#app[data-status='error']").count(), 0);
});
