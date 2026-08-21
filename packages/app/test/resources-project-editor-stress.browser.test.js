import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { chromium } from "playwright";

import { createAccountStore } from "@macchiato-dev/hub/accounts";
import { seal } from "../../../packages/website/auth/session.js";
import { createNodeSqliteClient } from "../../../packages/website/adapters/node-sqlite-client.js";

const root = resolve(new URL("../../..", import.meta.url).pathname);
const appCli = join(root, "packages/app/src/index.js");

function freePort() {
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
  const child = spawn(process.execPath, [appCli, "--data-dir", dataDir,
    "--host", "127.0.0.1", "--port", String(port), "--app-plugin", "development"], {
    cwd: root,
    env: { ...process.env, RESOURCES_PREVIEW_SIGNUPS_ENABLED: "true" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  const ready = new Promise((resolveReady, reject) => {
    const timer = setTimeout(() => reject(new Error(`Server did not start\n${output}`)), 30_000);
    const append = (chunk) => {
      output += chunk;
      if (output.includes("Server running")) { clearTimeout(timer); resolveReady(); }
    };
    child.stdout.on("data", append); child.stderr.on("data", append); child.on("error", reject);
  });
  return { child, ready };
}

async function stopApp(child) {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolveExit) => child.once("exit", resolveExit)),
    new Promise((resolveWait) => setTimeout(resolveWait, 1_000)),
  ]);
  if (child.exitCode === null) child.kill("SIGKILL");
}

test("Resources creates and heavily edits a project without code-editor-use", { timeout: 120_000 }, async (t) => {
  const [port, dataDir] = await Promise.all([freePort(), mkdtemp(join(tmpdir(), "resources-editor-stress-"))]);
  const app = startApp(port, dataDir);
  t.after(async () => { await stopApp(app.child); await rm(dataDir, { recursive: true, force: true }); });
  await app.ready;

  const db = new DatabaseSync(join(dataDir, "macchiato.sqlite3"));
  const account = await createAccountStore(createNodeSqliteClient(db)).authenticateIdentity({
    provider: "github", providerUserId: "editor-stress", login: "editor-stress",
    name: "Editor Stress", email: "editor-stress@example.test", emailVerified: true,
  });
  db.close();
  const session = await seal({ v: 1, sub: account.id, login: account.login, name: account.name,
    iat: Date.now(), exp: Date.now() + 60_000 }, "local-preview-session-signing-key");

  const browser = await chromium.launch();
  t.after(async () => browser.close());
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  const oldEditorRequests = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (/code-editor-use/i.test(request.url())) oldEditorRequests.push(request.url());
  });
  await page.context().addCookies([{ name: "resources_session", value: session,
    domain: "resources-edge.localhost", path: "/", httpOnly: true, sameSite: "Lax" }]);

  await page.goto(`http://resources-edge.localhost:${port}/projects/new`, { waitUntil: "networkidle" });
  const editor = page.locator("[data-project-editor]");
  const content = editor.locator(".cm-content");
  await content.waitFor();
  await page.waitForFunction(() => document.querySelector("[data-project-editor]")?.dataset.editorMachineState === "ready");
  assert.ok(await editor.getAttribute("data-editor-machine-id"));
  await page.getByLabel("Title", { exact: true }).fill("Editing Marathon");
  await page.getByLabel("Name", { exact: true }).fill("editing-marathon");

  const rows = Array.from({ length: 100 }, (_, index) =>
    `<p data-row="${index + 1}">Editable row ${String(index + 1).padStart(3, "0")}</p>`).join("\n");
  const source = `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>Editing Marathon</title>\n<style>\nbody { margin: 2rem; background: #e8f2ff; color: #17243a; font: 16px system-ui; }\nh1 { color: #315aa8; }\np:nth-child(3n) { color: #7b3fa1; }\n</style>\n</head>\n<body>\n<h1>Editing Marathon</h1>\n${rows}\n</body>\n</html>`;

  await content.fill(source);
  await page.waitForTimeout(1_200);
  assert.equal((await content.innerText()).trim(), source.trim());
  const output = page.frameLocator("[data-project-preview] iframe.project-editor__preview-surface");
  await assert.doesNotReject(output.locator("h1", { hasText: "Editing Marathon" }).waitFor());
  assert.equal(await output.locator("p", { hasText: /Editable row/ }).count(), 100);

  await page.keyboard.press("Control+z");
  assert.notEqual((await content.innerText()).trim(), source.trim());
  await page.keyboard.press("Control+Shift+z");
  assert.equal((await content.innerText()).trim(), source.trim());

  await page.keyboard.press("Control+End");
  await content.pressSequentially("\n<!-- typed correction -->", { delay: 2 });
  for (let index = 0; index < 80; index += 1) {
    await page.keyboard.insertText(`<!-- revision ${index + 1} -->`);
    await page.keyboard.press("Enter");
  }
  await page.waitForTimeout(1_200);
  assert.match(await content.innerText(), /revision 80/);
  const scroller = editor.locator(".cm-scroller");
  await scroller.evaluate((node) => { node.scrollTop = 0; node.dispatchEvent(new Event("scroll")); });
  await page.waitForTimeout(100);
  await scroller.evaluate((node) => { node.scrollTop = node.scrollHeight; node.dispatchEvent(new Event("scroll")); });
  await page.waitForTimeout(100);
  const renderedLineNumbers = (await editor.locator(".cm-lineNumbers .cm-gutterElement").allTextContents())
    .map(Number).filter(Number.isFinite);
  assert.ok(Math.max(...renderedLineNumbers) > 170);
  assert.match(await content.innerText(), /revision 80/);
  await page.screenshot({ path: "/tmp/resources-project-editor-stress.png" });

  await page.getByRole("button", { name: "Create project" }).click();
  await page.getByRole("button", { name: "Save project" }).waitFor();
  assert.equal(new URL(page.url()).pathname, "/editor-stress/editing-marathon");
  await page.reload({ waitUntil: "networkidle" });
  await page.locator(".cm-content").waitFor();
  const restoredSnapshot = await page.locator("[data-project-snapshot]").inputValue();
  assert.match(restoredSnapshot, /Editable row 100/);
  assert.match(restoredSnapshot, /revision 80/);
  assert.deepEqual(oldEditorRequests, []);
  assert.deepEqual(errors, []);

  const [guest, runtime] = await Promise.all([
    readFile(join(root, "packages/website/generated/project-editor-guest.js"), "utf8"),
    readFile(join(root, "packages/website/generated/project-editor-runtime.js"), "utf8"),
  ]);
  assert.doesNotMatch(guest, /code-editor-use|packages\/code-editor-use/i);
  assert.doesNotMatch(runtime, /code-editor-use|packages\/code-editor-use/i);
});
