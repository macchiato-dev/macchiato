import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { chromium } from "@playwright/test";

const repoRoot = resolve(new URL("../../..", import.meta.url).pathname);
const appCli = resolve(repoRoot, "packages/app/src/index.js");

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

function start(command, args, cwd = repoRoot) {
  const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });
  return { child, output: () => output };
}

async function waitFor(url, options = {}) {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    try { return await fetch(url, options); } catch { await new Promise((resolveWait) => setTimeout(resolveWait, 50)); }
  }
  throw new Error(`Server did not become ready: ${url}`);
}

async function stop(child) {
  if (child.exitCode !== null) return;
  await new Promise((resolveStop) => {
    child.once("exit", resolveStop);
    child.kill("SIGTERM");
    setTimeout(() => child.exitCode === null && child.kill("SIGKILL"), 1000).unref();
  });
}

test("http-use example completes browser CRUD through the WASM backend", { timeout: 30000 }, async (t) => {
  const port = await getPort();
  const dataDir = await mkdtemp(join(tmpdir(), "macchiato-http-use-browser-"));
  const app = start(process.execPath, [appCli, "--data-dir", dataDir, "--host", "127.0.0.1", "--port", String(port)]);
  let browser;
  t.after(async () => { await browser?.close(); await stop(app.child); await rm(dataDir, { recursive: true, force: true }); });

  await waitFor(`http://sqlite-notes.localhost:${port}/`);
  browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  const apiBodies = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", async (response) => {
    if (response.url().includes("/api/notes") && response.ok()) apiBodies.push(await response.text());
  });
  await page.goto(`http://sqlite-notes.localhost:${port}/`);
  await page.getByText("Try the portable backend").waitFor();

  const input = page.getByPlaceholder("A small thing to remember");
  await input.fill("Playwright round trip");
  await page.getByRole("button", { name: "Add" }).click();
  const row = page.locator("li", { hasText: "Playwright round trip" });
  await row.waitFor();
  await row.getByRole("button", { name: "Done" }).click();
  await row.locator("span.done").waitFor();
  await row.getByRole("button", { name: "Delete" }).click();
  await assert.doesNotReject(row.waitFor({ state: "detached" }));

  assert.deepEqual(errors, []);
  assert.ok(apiBodies.length >= 4);
  assert.equal(apiBodies.some((body) => body.includes("internal_token")), false);
});

test("the same backend source runs directly under Node", { timeout: 15000 }, async (t) => {
  const port = await getPort();
  const directory = await mkdtemp(join(tmpdir(), "macchiato-http-use-native-"));
  const database = join(directory, "notes.sqlite3");
  const app = start(process.execPath, [resolve(repoRoot, "examples/http-sqlite-crud/server.js"), "--port", String(port), "--db", database]);
  t.after(async () => { await stop(app.child); await rm(directory, { recursive: true, force: true }); });

  await waitFor(`http://127.0.0.1:${port}/api/config`);
  const createdResponse = await fetch(`http://127.0.0.1:${port}/api/notes`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: "Native process", internal_token: "blocked" }),
  });
  const created = await createdResponse.json();
  assert.equal(createdResponse.status, 200);
  assert.equal(created.title, "Native process");
  assert.equal("internal_token" in created, false);
});
