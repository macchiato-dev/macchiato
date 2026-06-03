import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { resolve } from "node:path";
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

test("resources website validates and serves through dom-use", async () => {
  const response = await resourcesWebsiteHandler(new Request("http://resources-website.localhost/"));
  const text = await response.text();

  assert.equal(response.status, 200);
  assert.match(text, /<title>Resources\.co<\/title>/);
  assert.match(text, /<h1>Resources<span>\.co<\/span><\/h1>/);
  assert.match(text, /<style>/);
  assert.doesNotMatch(text, /<script\b/i);
  assert.doesNotMatch(text, /https?:\/\//i);
});

test("resources website is mounted on resources-website.localhost", async (t) => {
  const port = await getPort();
  const app = startApp(port);
  t.after(async () => stopChild(app.child));

  await app.waitForReady;
  const response = await fetch(`http://resources-website.localhost:${port}/`);
  const text = await response.text();

  assert.equal(response.status, 200);
  assert.match(text, /Resources\.co/);

  const missing = await fetch(`http://resources-website.localhost:${port}/styles.css`);
  assert.equal(missing.status, 404);
});

test("resources website serves refactored Claude export assets", async () => {
  const loader = await resourcesWebsiteHandler(new Request("http://resources-website.localhost/export/loader.js"));
  const manifest = await resourcesWebsiteHandler(new Request("http://resources-website.localhost/export/manifest.json"));
  const template = await resourcesWebsiteHandler(new Request("http://resources-website.localhost/export/template.json"));
  const thumbnail = await resourcesWebsiteHandler(new Request("http://resources-website.localhost/export/thumbnail.svg"));
  const exportIndex = await resourcesWebsiteHandler(new Request("http://resources-website.localhost/export/index.html"));

  assert.equal(exportIndex.status, 404);
  assert.equal(loader.status, 200);
  assert.match(await loader.text(), /readBundleText\('manifest\.json'\)/);
  assert.equal(manifest.status, 200);
  assert.match(await manifest.text(), /1797e8fd-48fe-4348-b7e6-29f022c4c34f/);
  assert.equal(template.status, 200);
  assert.match(await template.text(), /Resources\.co/);
  assert.equal(thumbnail.status, 200);
  assert.match(await thumbnail.text(), /<tspan fill="#30D5C8">\.co<\/tspan>/);
});

test("resources website renders its index in a real browser", async (t) => {
  const port = await getPort();
  const app = startApp(port);
  t.after(async () => stopChild(app.child));

  await app.waitForReady;
  const browser = await chromium.launch();
  t.after(async () => browser.close());
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto(`http://resources-website.localhost:${port}/`, { waitUntil: "networkidle" });

  await assert.doesNotReject(page.locator("h1", { hasText: "Resources.co" }).waitFor());
  assert.deepEqual(errors, []);
  assert.equal(await page.locator("#__bundler_err").count(), 0);
});
