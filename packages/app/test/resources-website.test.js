import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { chromium } from "playwright";

import { resourcesWebsiteHandler } from "../../../examples/resources-website/handler.js";

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

function tempDir() {
  return mkdtemp(join(tmpdir(), "macchiato-resources-test-"));
}

function startApp(port, dataDir) {
  const child = spawn(process.execPath, [
    appCli,
    "--data-dir",
    dataDir,
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

test("resources website serves the static home page", async () => {
  const response = await resourcesWebsiteHandler(new Request("http://resources-website.localhost/"));
  const text = await response.text();

  assert.equal(response.status, 200);
  assert.match(text, /<title>Resources\.co<\/title>/);
  assert.match(text, /Infrastructure you own, composed from parts\./);
  assert.match(text, /Featured collections/);
  assert.match(text, /<link rel="stylesheet" href="styles\.css">/);
  assert.doesNotMatch(text, /<script\b/i);
  assert.doesNotMatch(text, /__bundler/i);
  assert.doesNotMatch(text, /https?:\/\//i);
});

test("resources website is mounted on resources-website.localhost", async (t) => {
  const port = await getPort();
  const dataDir = await tempDir();
  const app = startApp(port, dataDir);
  t.after(async () => {
    await stopChild(app.child);
    await rm(dataDir, { recursive: true, force: true });
  });

  await app.waitForReady;
  const response = await fetch(`http://resources-website.localhost:${port}/`);
  const text = await response.text();

  assert.equal(response.status, 200);
  assert.match(text, /Self-hosted building blocks/);

  const stylesheet = await fetch(`http://resources-website.localhost:${port}/styles.css`);
  assert.equal(stylesheet.status, 200);
  assert.match(await stylesheet.text(), /--accent: #30D5C8;/);

  const font = await fetch(`http://resources-website.localhost:${port}/-/fonts/resourcesco-space-grotesk/space-grotesk-latin.woff2`);
  assert.equal(font.status, 200);
  assert.equal(font.headers.get("content-type"), "font/woff2");
  assert.equal(font.headers.get("x-content-type-options"), "nosniff");
});

test("resources website no longer exposes Claude export bundle routes", async () => {
  const exportIndex = await resourcesWebsiteHandler(new Request("http://resources-website.localhost/export/index.html"));
  const loader = await resourcesWebsiteHandler(new Request("http://resources-website.localhost/export/loader.js"));

  assert.equal(exportIndex.status, 404);
  assert.equal(loader.status, 404);
});

test("resources website renders its index in a real browser", async (t) => {
  const port = await getPort();
  const dataDir = await tempDir();
  const app = startApp(port, dataDir);
  t.after(async () => {
    await stopChild(app.child);
    await rm(dataDir, { recursive: true, force: true });
  });

  await app.waitForReady;
  const browser = await chromium.launch();
  t.after(async () => browser.close());
  const page = await browser.newPage();
  const errors = [];
  const consoleErrors = [];
  const failedRequests = [];
  const badResponses = [];

  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("requestfailed", (request) => {
    failedRequests.push(`${request.url()} ${request.failure()?.errorText || ""}`.trim());
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      badResponses.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.goto(`http://resources-website.localhost:${port}/`, { waitUntil: "networkidle" });
  const loadedFonts = await page.evaluate(async () => {
    const weights = ["400", "500", "600", "700"];
    await Promise.all(weights.map((weight) => document.fonts.load(`${weight} 16px "Space Grotesk"`, "Resources.co")));
    await document.fonts.ready;
    return weights.map((weight) => ({
      weight,
      loaded: document.fonts.check(`${weight} 16px "Space Grotesk"`, "Resources.co"),
    }));
  });

  await assert.doesNotReject(page.locator("h1", { hasText: "Infrastructure you own, composed from parts." }).waitFor());
  await assert.doesNotReject(page.locator("text=resources/containers").waitFor());
  assert.deepEqual(errors, []);
  assert.deepEqual(consoleErrors, []);
  assert.deepEqual(failedRequests, []);
  assert.deepEqual(badResponses, []);
  assert.deepEqual(loadedFonts, [
    { weight: "400", loaded: true },
    { weight: "500", loaded: true },
    { weight: "600", loaded: true },
    { weight: "700", loaded: true },
  ]);
  assert.equal(await page.locator("#__bundler_err").count(), 0);
  assert.equal(await page.locator(".crumb").count(), 0);
  assert.equal(await page.locator("script").count(), 0);
});
