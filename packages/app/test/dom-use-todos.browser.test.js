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
  await page.getByPlaceholder("What needs to be done?").fill("Buy milk");
  await page.keyboard.press("Enter");

  await assert.doesNotReject(async () => {
    await page.getByText("Buy milk").waitFor();
  });
  await page.locator(".toggle").check();
  await assert.doesNotReject(async () => {
    await page.locator(".todo-item.completed").waitFor();
  });
});
