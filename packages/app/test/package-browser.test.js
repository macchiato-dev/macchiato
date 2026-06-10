import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { resolve } from "node:path";
import test from "node:test";
import { chromium } from "playwright";

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

test("packages app exposes only configured git-visible package files", async (t) => {
  const port = await getPort();
  const app = startApp(port);
  t.after(async () => stopChild(app.child));

  await app.waitForReady;

  const directory = await fetch(`http://apps.localhost:${port}/`);
  assert.match(await directory.text(), /packages\.localhost/);

  const response = await fetch(`http://packages.localhost:${port}/api/manifest`);
  const manifest = await response.json();

  assert.equal(response.status, 200);
  assert.equal(manifest.type, "git-visible-files");
  assert.equal(manifest.root, "packages");
  assert.ok(manifest.packages.some((pkg) => pkg.dir === "packages/app"));

  const files = manifest.packages.flatMap((pkg) => pkg.files);
  assert.ok(files.includes("packages/app/package.json"));
  assert.ok(files.every((file) => file.startsWith("packages/")));
  assert.ok(files.every((file) => !file.includes("/.git/")));
  assert.ok(files.every((file) => !file.includes("node_modules/")));
});

test("packages app runs browser UI inside the QuickJS wasm sandbox", async (t) => {
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
  page.on("response", (response) => {
    if (response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`);
  });

  await page.goto(`http://packages.localhost:${port}/`, { waitUntil: "networkidle" });
  await assert.doesNotReject(page.getByRole("heading", { name: "Packages" }).waitFor());
  await assert.doesNotReject(page.getByText("QuickJS WASM sandbox").waitFor());
  await assert.doesNotReject(page.getByRole("button", { name: /@macchiato-dev\/app/ }).waitFor());

  await page.getByRole("button", { name: /@macchiato-dev\/quickjs-emscripten-sandbox/ }).click();
  await assert.doesNotReject(page.getByRole("heading", { name: "@macchiato-dev/quickjs-emscripten-sandbox" }).waitFor());
  assert.equal(await page.locator("#app[data-status='error']").count(), 0);
  assert.deepEqual(errors, []);
  assert.deepEqual(badResponses, []);
});
