import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
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

function startApp(port, dataDir) {
  const child = spawn(process.execPath, [
    appCli,
    "--host",
    "127.0.0.1",
    "--port",
    String(port),
    "--data-dir",
    dataDir,
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

test("code notes exposes git-visible module code and annotation workflow", { timeout: 60000 }, async (t) => {
  const port = await getPort();
  const dataDir = await mkdtemp(join(tmpdir(), "macchiato-code-notes-"));
  const app = startApp(port, dataDir);
  let browser;
  t.after(async () => {
    await browser?.close();
    await stopChild(app.child);
    await rm(dataDir, { recursive: true, force: true });
  });

  await app.waitForReady;

  const directory = await fetch(`http://apps.localhost:${port}/`);
  assert.match(await directory.text(), /code-notes\.localhost/);

  const manifestResponse = await fetch(`http://code-notes.localhost:${port}/api/manifest`);
  const manifest = await manifestResponse.json();
  assert.equal(manifestResponse.status, 200);
  assert.equal(manifest.type, "git-visible-code-modules");
  assert.ok(manifest.modules.some((mod) => mod.dir === "packages/app"));

  const denied = await fetch(`http://code-notes.localhost:${port}/api/file?path=${encodeURIComponent("package.json")}`);
  assert.equal(denied.status, 404);

  const file = await fetch(`http://code-notes.localhost:${port}/api/file?path=${encodeURIComponent("packages/app/src/code-annotator.js")}`);
  const fileJson = await file.json();
  assert.equal(file.status, 200);
  assert.match(fileJson.content, /codeAnnotatorHandler/);

  browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  const badResponses = [];
  page.on("pageerror", (err) => errors.push(err.message));
  page.on("response", (response) => {
    if (response.status() >= 400 && !response.url().includes("/api/file?path=package.json")) {
      badResponses.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.goto(`http://code-notes.localhost:${port}/`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.removeItem("code-annotator-markdown"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await assert.doesNotReject(page.locator(".source").first().waitFor());
  assert.equal(await page.getByText("Select a file to load its code").count(), 0);
  await page.getByRole("button", { name: "Choose package" }).click();
  await assert.doesNotReject(page.getByRole("menu").waitFor());
  await page.getByRole("menu").getByRole("button", { name: /^@macchiato-dev\/app packages\// }).click();
  await assert.doesNotReject(page.locator(".source").first().waitFor());
  await page.getByRole("button", { name: /src\/code-annotator\.js/ }).click();
  await assert.doesNotReject(page.getByRole("heading", { name: "code-annotator.js" }).waitFor());
  await assert.doesNotReject(page.getByText("packages/app/src").waitFor());

  const firstLine = page.locator("[data-line='1']");
  const firstBox = await firstLine.boundingBox();
  assert.ok(firstBox);
  await page.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2);
  await page.mouse.down();
  const thirdBox = await page.locator("[data-line='3']").boundingBox();
  assert.ok(thirdBox);
  await page.mouse.move(thirdBox.x + thirdBox.width / 2, thirdBox.y + thirdBox.height / 2, { steps: 5 });
  await page.mouse.up();
  assert.equal(await page.getByLabel("Start line").inputValue(), "1");
  assert.equal(await page.getByLabel("End line").inputValue(), "3");
  await page.getByLabel("Annotation note").fill("This module powers the code notes app.");
  await page.getByRole("button", { name: "Add" }).click();
  await assert.doesNotReject(page.locator(".notes-panel").getByText("This module powers the code notes app.").waitFor());
  await assert.doesNotReject(page.locator(".inline-box").getByText("This module powers the code notes app.").waitFor());
  assert.match(await page.evaluate(() => localStorage.getItem("code-annotator-markdown")), /- packages\/app\/src\/code-annotator\.js#L1-L3/);

  await page.getByLabel("Show inline").uncheck();
  assert.equal(await page.locator(".inline-box").count(), 0);
  await page.getByLabel("Show inline").check();
  await assert.doesNotReject(page.locator(".inline-box").waitFor());

  await page.getByLabel("Select multiple ranges").check();
  const fifthBox = await page.locator("[data-line='5']").boundingBox();
  const sixthBox = await page.locator("[data-line='6']").boundingBox();
  assert.ok(fifthBox);
  assert.ok(sixthBox);
  await page.mouse.move(fifthBox.x + fifthBox.width / 2, fifthBox.y + fifthBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(sixthBox.x + sixthBox.width / 2, sixthBox.y + sixthBox.height / 2, { steps: 3 });
  await page.mouse.up();
  await page.getByRole("button", { name: "Add" }).click();
  assert.match(await page.evaluate(() => localStorage.getItem("code-annotator-markdown")), /#L5-L6/);

  await page.getByRole("button", { name: "Pencil" }).click();
  await assert.doesNotReject(page.locator(".mode-bar").getByText("Drag line numbers to select a new range for the selected annotation.").waitFor());
  await page.getByRole("button", { name: "Cancel" }).click();

  await page.getByRole("button", { name: "Search" }).click();
  await page.getByLabel("Search query").fill("function");
  await page.getByLabel("Before context").fill("1");
  await page.getByLabel("After context").fill("1");
  await page.getByRole("button", { name: "Find" }).click();
  await assert.doesNotReject(page.locator(".search-bar").getByText(/matches/).waitFor());

  assert.equal(await page.getByLabel("Import markdown").count(), 0);
  await page.getByRole("button", { name: "Markdown", exact: true }).click();
  await assert.doesNotReject(page.getByRole("dialog", { name: "Markdown tools" }).waitFor());
  await page.getByLabel("Import markdown").fill("# Code annotations\n\n### packages/app/src/index.js#L1\n\nImported note");
  await page.getByRole("button", { name: "Import markdown" }).click();
  await assert.doesNotReject(page.getByText("Imported note").waitFor());

  await page.getByRole("button", { name: "Markdown", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download markdown" }).click();
  assert.equal((await download).suggestedFilename(), "code-annotations.md");

  assert.equal(await page.locator("#app[data-status='error']").count(), 0);
  assert.deepEqual(errors, []);
  assert.deepEqual(badResponses, []);
});
