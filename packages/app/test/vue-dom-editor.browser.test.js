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

function startApp(port, dataDir) {
  const child = spawn(process.execPath, [appCli, "--data-dir", dataDir, "--host", "127.0.0.1", "--port", String(port), "--app-plugin", "vue-dom-editor"], { cwd: repoRoot, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  const ready = new Promise((resolveReady, reject) => {
    const timer = setTimeout(() => reject(new Error(output)), 30_000);
    const onData = (data) => { output += data; if (output.includes("Server running")) { clearTimeout(timer); resolveReady(); } };
    child.stdout.on("data", onData); child.stderr.on("data", onData); child.on("error", reject);
  });
  return { child, ready };
}

async function stop(child) {
  if (child.exitCode !== null) return;
  await new Promise((resolveStop) => { child.once("exit", resolveStop); child.kill("SIGTERM"); });
}

test("vue-dom editor mirrors guest reactive transitions into a host Vue component", async (t) => {
  const port = await getPort();
  const dataDir = await mkdtemp(join(tmpdir(), "macchiato-vue-dom-"));
  const app = startApp(port, dataDir);
  t.after(async () => { await stop(app.child); await rm(dataDir, { recursive: true, force: true }); });
  await app.ready;

  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error" || message.type() === "warning") errors.push(message.text()); });
  const response = await page.goto(`http://vue-dom-editor.localhost:${port}/`);
  const editor = page.locator(".vue-editor__input");
  await editor.waitFor();
  assert.equal(response.status(), 200);
  assert.match(response.headers()["content-security-policy"], /wasm-unsafe-eval/);

  const initial = await editor.inputValue();
  await editor.press("Control+End");
  await editor.type("\nGuest transition");
  const changed = await editor.inputValue();
  assert.notEqual(changed, initial);
  assert.match(await page.locator(".vue-editor__status").textContent(), /Guest revision \d+ · \d+ stored transitions/);
  const transition = JSON.parse(await page.locator("#inspection").textContent());
  assert.equal(transition.action, "input");
  assert.ok(transition.patches.some((patch) => patch.path[0] === "content" && patch.value === changed));
  assert.equal("view" in transition, false);

  await page.getByRole("button", { name: "Undo" }).click();
  assert.notEqual(await editor.inputValue(), changed);
  await page.getByRole("button", { name: "Redo" }).click();
  assert.equal(await editor.inputValue(), changed);
  assert.deepEqual(errors, []);
});
