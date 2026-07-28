import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
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

function startApp(port, dataDir) {
  const child = spawn(process.execPath, [
    appCli,
    "--data-dir", dataDir,
    "--host", "127.0.0.1",
    "--port", String(port),
    "--app-plugin", "development",
  ], { cwd: repoRoot, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });
  return { child, output: () => output };
}

async function waitFor(url) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try { return await fetch(url); } catch { await new Promise((resolveWait) => setTimeout(resolveWait, 50)); }
  }
  throw new Error(`Server did not become ready: ${url}`);
}

async function stop(child) {
  if (child.exitCode !== null) return;
  await new Promise((resolveStop) => {
    child.once("exit", resolveStop);
    child.kill("SIGTERM");
    setTimeout(() => child.exitCode === null && child.kill("SIGKILL"), 1_000).unref();
  });
}

test("TODO history swaps Markdown and SQLite while replaying character edits", { timeout: 30_000 }, async (t) => {
  const port = await getPort();
  const dataDir = await mkdtemp(join(tmpdir(), "macchiato-todo-history-"));
  const app = startApp(port, dataDir);
  let browser;
  t.after(async () => {
    await browser?.close();
    await stop(app.child);
    await rm(dataDir, { recursive: true, force: true });
  });

  const origin = `http://todo-history.localhost:${port}`;
  await waitFor(origin);
  browser = await chromium.launch();
  const page = await browser.newPage();
  page.setDefaultTimeout(5_000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(origin);

  await page.getByLabel("New task").fill("Get mk");
  await page.getByRole("button", { name: "Add task" }).click();
  const sqliteTask = page.getByRole("listitem").filter({ hasText: "Get mk" });
  await sqliteTask.getByRole("button", { name: "Edit" }).click();
  const editor = page.locator(".edit-title");
  await editor.press("Home");
  for (let index = 0; index < 5; index += 1) await editor.press("ArrowRight");
  await editor.pressSequentially("il", { delay: 40 });
  await page.getByRole("button", { name: "Save edit" }).click();
  await page.getByText("Get milk", { exact: true }).waitFor();

  assert.ok(Number(await page.getByLabel("History timeline").getAttribute("max")) >= 4);
  await page.getByRole("button", { name: "Play history" }).click();
  await page.getByRole("button", { name: "Pause history" }).click();
  assert.match(await page.locator("#position").textContent(), /\/ [1-9]/);

  await page.getByLabel("Backend").selectOption("markdown");
  await page.getByText("No tasks in this backend yet.").waitFor();
  await page.getByLabel("New task").fill("Stored in Markdown");
  await page.getByRole("button", { name: "Add task" }).click();
  await page.getByText("Stored in Markdown", { exact: true }).waitFor();
  const markdown = await readFile(join(dataDir, "todo-history", "history.md"), "utf8");
  assert.match(markdown, /Dialect: `todo-history\/v1`/);
  assert.match(markdown, /## List\n\n- \[ \] Stored in Markdown/);
  assert.match(markdown, /- Title: Stored in Markdown/);
  assert.doesNotMatch(markdown, /```/);

  await page.getByLabel("Backend").selectOption("sqlite");
  await page.getByText("Get milk", { exact: true }).waitFor();
  await assert.doesNotReject(page.getByText("Stored in Markdown", { exact: true }).waitFor({ state: "detached" }));
  assert.deepEqual(errors, [], app.output());
});
