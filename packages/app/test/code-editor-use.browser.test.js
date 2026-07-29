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
  const child = spawn(process.execPath, [
    appCli, "--data-dir", dataDir, "--host", "127.0.0.1", "--port", String(port),
    "--app-plugin", "code-editor-use",
  ], { cwd: repoRoot, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  const ready = new Promise((resolveReady, reject) => {
    const timer = setTimeout(() => reject(new Error(output)), 30_000);
    const onData = (data) => {
      output += data;
      if (output.includes("Server running")) {
        clearTimeout(timer);
        resolveReady();
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("error", reject);
  });
  return { child, ready };
}

async function stop(child) {
  if (child.exitCode !== null) return;
  await new Promise((resolveStop) => {
    child.once("exit", resolveStop);
    child.kill("SIGTERM");
  });
}

test("code-editor-use runs CodeMirror through a QuickJS-observed constrained subtree", async (t) => {
  const port = await getPort();
  const dataDir = await mkdtemp(join(tmpdir(), "macchiato-code-editor-"));
  const app = startApp(port, dataDir);
  t.after(async () => {
    await stop(app.child);
    await rm(dataDir, { recursive: true, force: true });
  });
  await app.ready;

  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  const response = await page.goto(`http://code-editor-use.localhost:${port}/`, { waitUntil: "networkidle" });
  await page.locator("body[data-ready='true']").waitFor();
  assert.equal(response.status(), 200);
  assert.match(response.headers()["content-security-policy"], /wasm-unsafe-eval/);
  assert.equal(await page.locator(".cm-editor").count(), 1);
  assert.match(await page.locator("#status").textContent(), /QuickJS observed \d+ characters across 2 lines/);

  await page.locator(".cm-content").click();
  const cursorStyle = await page.locator(".cm-cursor-primary").evaluate((node) => {
    const style = getComputedStyle(node);
    const editorStyle = getComputedStyle(node.closest(".cm-editor"));
    return {
      color: style.borderLeftColor,
      editorBackground: editorStyle.backgroundColor,
      display: style.display,
      height: Number.parseFloat(style.height),
    };
  });
  assert.notEqual(cursorStyle.color, cursorStyle.editorBackground);
  assert.notEqual(cursorStyle.color, "rgba(0, 0, 0, 0)");
  assert.equal(cursorStyle.display, "block");
  assert.ok(cursorStyle.height > 10);

  await page.keyboard.press("Control+End");
  for (let index = 0; index < 12; index += 1) {
    await page.keyboard.type(`\nconst item${index} = ${index};`);
  }
  await assert.doesNotReject(page.getByText(/across 14 lines/).waitFor());
  assert.equal((await page.locator(".cm-line").allTextContents()).at(-1), "const item11 = 11;");

  await page.keyboard.press("Control+f");
  const search = page.locator(".cm-search input[name='search']");
  await search.fill("item8");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Escape");
  assert.equal(await page.locator(".cm-search").count(), 0);

  await page.locator(".cm-content").click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type("\ncon");
  await page.keyboard.press("Control+Space");
  await page.locator(".cm-tooltip-autocomplete").waitFor();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Control+z");
  await page.keyboard.press("Control+Shift+z");
  await page.locator("h1").click();
  await page.locator(".cm-content").click();
  assert.equal(await page.locator(".cm-focused").count(), 1);
  assert.deepEqual(errors, []);

  await page.locator(".cm-line").first().evaluate((node) => node.setAttribute("onclick", "alert(1)"));
  await assert.doesNotReject(page.getByText(/Editor stopped: DOM shape rejected attribute: onclick/).waitFor());
  assert.equal(await page.locator("#editor").getByRole("textbox").count(), 0);
});
