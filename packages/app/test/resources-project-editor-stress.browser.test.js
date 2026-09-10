import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
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
    // Keep fixture authentication valid beyond the test's 120-second deadline,
    // including slower CI hosts. Expiring mid-save is not an editor failure.
    iat: Date.now(), exp: Date.now() + 300_000 }, "local-preview-session-signing-key");

  const browser = await chromium.launch();
  t.after(async () => browser.close());
  const artifacts = process.env.MACCHIATO_TEST_ARTIFACTS || join(dataDir, "artifacts");
  await mkdir(artifacts, { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 },
    ...(process.env.MACCHIATO_TEST_ARTIFACTS ? { recordVideo: { dir: artifacts,
      size: { width: 1440, height: 900 } } } : {}),
  });
  const languageDownloads = [];
  page.on("request", request => {
    const name = new URL(request.url()).pathname.split("/").pop();
    if (/^project-editor-language-.*\.bin$/.test(name)) languageDownloads.push(name);
  });
  const errors = [];
  const oldEditorRequests = [];
  page.on("pageerror", (error) => errors.push(error.stack || error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("request", (request) => {
    if (/code-editor-use/i.test(request.url())) oldEditorRequests.push(request.url());
  });
  await page.context().addCookies([{ name: "resources_session", value: session,
    domain: "resources-edge.localhost", path: "/", httpOnly: true, sameSite: "Lax" }]);

  await page.goto(`http://resources-edge.localhost:${port}/projects/new`, { waitUntil: "networkidle" });
  const editor = page.locator("[data-project-editor]");
  const content = editor.locator(".cm-content");
  await content.waitFor().catch(async (error) => {
    t.diagnostic(JSON.stringify({ url: page.url(), errors,
      page: (await page.locator("body").innerText()).slice(-1500) }));
    throw error;
  });
  await page.waitForFunction(() => document.querySelector("[data-project-editor]")?.dataset.editorMachineState === "ready");
  await page.waitForFunction(() => document.querySelectorAll(".cm-line span[class]").length > 0);
  assert.deepEqual(languageDownloads, ["project-editor-language-html.bin"]);
  // The frontend is MicroQuickJS: this also catches guest-wrapper APIs that
  // work in full QuickJS but are absent from the smaller engine.
  for (const colorScheme of ["light", "dark", "light"]) {
    await page.emulateMedia({ colorScheme });
    await page.waitForFunction((expected) =>
      document.documentElement.dataset.theme === expected, colorScheme);
  }
  assert.ok(await editor.getAttribute("data-editor-machine-id"));
  // The default article grants *.wikipedia.org without a path suffix. The
  // iframe must enforce the same policy as the project configuration UI.
  const output = page.frameLocator("[data-project-preview] iframe.project-editor__output-frame");
  await output.getByRole("heading", { name: "A small article" }).waitFor();
  assert.equal(await output.locator('a[href^="https://en.wikipedia.org/"]').count(), 3);
  // Pointer capture must exist in the editor's MicroQuickJS guest, not only
  // in the output's QuickJS guest. Even hovering used to call a missing method.
  const splitter = editor.locator(".project-editor__splitter");
  const splitBox = await splitter.boundingBox();
  const splitX = splitBox.x + splitBox.width / 2;
  const splitY = splitBox.y + 80;
  await page.mouse.move(splitX, splitY);
  assert.deepEqual(errors, [], "hovering the divider must not fail the guest");
  for (const delta of [60, -60]) {
    const before = await splitter.boundingBox();
    await page.mouse.move(before.x + before.width / 2, splitY);
    await page.mouse.down();
    await page.mouse.move(before.x + delta, splitY, { steps: 8 });
    await page.mouse.up();
    const after = await splitter.boundingBox();
    assert.ok((after.x - before.x) * Math.sign(delta) > 40,
      "native pointer capture moves the divider in either direction");
  }
  assert.deepEqual(errors, [], "divider dragging leaves the editor usable");
  await page.getByLabel("Title", { exact: true }).fill("Editing Marathon");
  await page.getByLabel("Name", { exact: true }).fill("editing-marathon");

  const rows = Array.from({ length: 100 }, (_, index) =>
    `<p data-row="${index + 1}">Editable row ${String(index + 1).padStart(3, "0")}</p>`).join("\n");
  const source = `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>Editing Marathon</title>\n<style>\nbody { margin: 2rem; background: #e8f2ff; color: #17243a; font: 16px system-ui; }\nh1 { color: #315aa8; }\np:nth-child(3n) { color: #7b3fa1; }\n</style>\n</head>\n<body>\n<h1>Editing Marathon</h1>\n${rows}\n</body>\n</html>`;

  await content.fill(source);
  await page.waitForTimeout(1_200);
  assert.equal((await content.innerText()).trim(), source.trim());
  try {
    await output.locator("h1", { hasText: "Editing Marathon" }).waitFor();
  } catch (cause) {
    await page.screenshot({ path: join(artifacts, "output-failed.png") });
    throw new Error(JSON.stringify({ errors, state: await page.evaluate(() => ({
      root: { ...document.querySelector("[data-project-editor]").dataset },
      snapshot: document.querySelector("[data-project-snapshot]").value.slice(0, 300),
      frames: [...document.querySelectorAll("iframe")].map(frame => ({
        src: frame.src, connected: frame.isConnected, text: frame.contentDocument?.body?.innerText?.slice(0, 300),
      })),
    })) }), { cause });
  }
  assert.equal(await output.locator("p", { hasText: /Editable row/ }).count(), 100);
  await page.screenshot({ path: join(artifacts, "editor-light.png") });

  await page.keyboard.press("Control+z");
  await page.waitForFunction(() => !document.querySelector(".cm-content").textContent.includes("Editable row 100"));
  await page.keyboard.press("Control+y");
  await page.waitForFunction(() => document.querySelector(".cm-content").textContent.includes("Editable row 100"));
  assert.equal((await content.innerText()).trim(), source.trim());

  await page.keyboard.press("Control+End");
  await content.pressSequentially("\n<!-- typed correction -->", { delay: 2 });
  for (let index = 0; index < 80; index += 1) {
    await page.keyboard.insertText(`<!-- revision ${index + 1} -->`);
    await page.keyboard.press("Enter");
  }
  await page.waitForTimeout(1_200);
  const editedSnapshot = await page.locator("[data-project-snapshot]").inputValue();
  assert.match(editedSnapshot, /<!-- typed correction -->/);
  for (let index = 1; index <= 80; index++) assert.ok(editedSnapshot.includes(`<!-- revision ${index} -->`));
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
  await page.screenshot({ path: join(artifacts, "editor-scrolled.png") });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.waitForFunction(() => document.documentElement.dataset.theme === "dark");
  await page.screenshot({ path: join(artifacts, "editor-dark.png") });

  await page.getByRole("button", { name: "Create project" }).click();
  await page.getByRole("button", { name: "Save project" }).waitFor().catch(async cause => {
    await page.screenshot({ path: join(artifacts, "save-failed.png") });
    throw new Error(JSON.stringify({ errors, url: page.url(),
      page: (await page.locator("body").innerText()).slice(-1500) }), { cause });
  });
  assert.equal(new URL(page.url()).pathname, "/editor-stress/editing-marathon");
  assert.equal(await editor.getAttribute("data-persistence"), "stored", "the saved project is an authenticated owner view");
  await page.waitForFunction(() => document.querySelector("[data-project-editor]")?.dataset.editorMachineState === "ready");
  await page.reload({ waitUntil: "networkidle" });
  await page.locator(".cm-content").waitFor();
  await page.waitForFunction(() => document.querySelector("[data-project-editor]")?.dataset.editorMachineState === "ready");
  const restoredSnapshot = await page.locator("[data-project-snapshot]").inputValue();
  assert.equal(await editor.getAttribute("data-persistence"), "stored", "reload must not silently fall back to the public view");
  assert.match(restoredSnapshot, /Editable row 100/);
  assert.match(restoredSnapshot, /revision 80/);
  assert.deepEqual(oldEditorRequests, []);
  assert.deepEqual(errors, []);

  // The output's asynchronous failures belong beneath the output, not just
  // in its iframe's console or in the CodeMirror error channel.
  await page.locator(".cm-content").fill('<button id="fail">Fail later</button><script>' +
    'document.getElementById("fail").addEventListener("click", function () {' +
    'setTimeout(function () { throw new Error("output timer regression"); }, 10);' +
    '});</script>');
  await output.getByRole("button", { name: "Fail later" }).click();
  const errorMessage = page.getByText(/Output stopped:.*output timer regression/);
  await errorMessage.waitFor();
  assert.ok(await errorMessage.evaluate(node => Boolean(node.closest(".project-editor__preview"))));
  assert.equal(await editor.getAttribute("data-editor-machine-state"), "ready");
  assert.equal(await editor.getAttribute("data-output-machine-state"), "failed");
  await page.screenshot({ path: join(artifacts, "output-timer-error.png") });
  assert.ok(errors.every(error => /output timer regression/.test(error)), JSON.stringify(errors));
  await page.locator(".cm-content").fill("<h1>Recovered output</h1>");
  await output.getByRole("heading", { name: "Recovered output" }).waitFor();
  await errorMessage.waitFor({ state: "hidden" });
  assert.equal(await editor.getAttribute("data-output-machine-state"), "ready");

  // A phone has one content pane at a time. Resizing and toggling must not
  // recreate either machine or leave the output iframe at zero width.
  const editorIdentity = await editor.getAttribute("data-editor-machine-id");
  await content.evaluate(node => { window.retainedEditorContent = node; });
  const outputFrame = page.locator("iframe.project-editor__output-frame");
  await output.locator("h1").evaluate(node => { window.retainedHeading = node; });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => document.querySelector(".project-editor__workspace").dataset.view === "preview");
  assert.equal(await page.locator('[data-project-view="split"]').isVisible(), false);
  assert.equal(await page.locator(".project-editor__source").isVisible(), false);
  assert.ok((await outputFrame.boundingBox()).width >= 380);
  for (let cycle = 0; cycle < 3; cycle++) {
    await page.locator('[data-project-view="editor"]').click();
    await content.waitFor({ state: "visible" });
    assert.equal(await outputFrame.isVisible(), false);
    assert.equal(await page.locator("[data-project-file-trigger]").isVisible(), true);
    await page.locator('[data-project-view="preview"]').click();
    await outputFrame.waitFor({ state: "visible" });
    assert.equal(await content.isVisible(), false);
  }
  await page.locator('[data-project-view="details"]').click();
  await page.getByLabel("Title", { exact: true }).waitFor({ state: "visible" });
  assert.ok(await page.locator('[data-project-view="details"]').evaluate(node =>
    Boolean(node.closest(".project-fields__toolbar"))));
  assert.equal(await outputFrame.isVisible(), false);
  await page.locator('[data-project-view="details"]').click();
  await outputFrame.waitFor({ state: "visible" });
  assert.equal(await editor.getAttribute("data-editor-machine-id"), editorIdentity);
  assert.ok(await content.evaluate(node => node === window.retainedEditorContent));
  assert.ok(await output.locator("h1").evaluate(node => node === window.retainedHeading));
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: join(artifacts, "phone-output.png") });
  await page.locator('[data-project-view="editor"]').click();
  await content.waitFor({ state: "visible" });
  await page.screenshot({ path: join(artifacts, "phone-editor.png") });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForFunction(() => document.querySelector(".project-editor__workspace").dataset.view === "split");
  await outputFrame.waitFor({ state: "visible" });
  await content.waitFor({ state: "visible" });
  assert.ok(errors.every(error => /output timer regression/.test(error)), JSON.stringify(errors));

  // Exercise both CodeMirror's paste handler and native bulk text insertion.
  // The latter exposed repeated full-page grid sizing, despite normal typing
  // and direct editor mounts passing. Keep the large source inert in output.
  const moduleSource = await readFile(join(root, "packages/website/content-form-client.js"), "utf8");
  const large = `<!--\n${moduleSource.replaceAll("-->", "-- >")}\n-->\n<h1>Large input</h1>`;
  const mount = editor.locator(".project-editor__source > .project-editor__mount");
  assert.equal(await mount.evaluate(node => getComputedStyle(node).contain), "size");
  const originalSize = await mount.boundingBox();
  for (const native of [false, true]) {
    const text = large + (native ? "\n<!-- native insertion -->" : "");
    const before = JSON.parse(await page.locator("[data-project-snapshot]").inputValue()).files[0].content;
    await content.click();
    await page.keyboard.press("Control+a");
    const started = performance.now();
    if (native) await page.keyboard.insertText(text);
    else await content.evaluate((node, value) => {
      const data = new DataTransfer();
      data.setData("text/plain", value);
      const event = new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true });
      node.dispatchEvent(event);
      if (!event.defaultPrevented) throw new Error("Paste was not handled");
    }, text);
    t.diagnostic(`${native ? "native insertion" : "paste"}: ${text.length} characters in ${Math.round(performance.now() - started)} ms`);
    const snapshotText = () => page.locator("[data-project-snapshot]").inputValue()
      .then(value => JSON.parse(value).files[0].content);
    assert.equal(await snapshotText(), text);
    await output.getByRole("heading", { name: "Large input", exact: true }).waitFor();
    const size = await mount.boundingBox();
    assert.ok(Math.abs(size.width - originalSize.width) < 1 && Math.abs(size.height - originalSize.height) < 1);
    await content.click();
    await page.keyboard.press("Control+z");
    assert.equal(await snapshotText(), before, "undo restores the whole pre-insertion document");
    await page.keyboard.press("Control+Shift+z");
    assert.equal(await snapshotText(), text, "redo restores the whole insertion");
  }
  await page.screenshot({ path: join(artifacts, "large-input.png") });
  assert.ok(errors.every(error => /output timer regression/.test(error)), JSON.stringify(errors));

  const [guest, runtime] = await Promise.all([
    readFile(join(root, "packages/website/generated/project-editor-guest.js"), "utf8"),
    readFile(join(root, "packages/website/generated/project-editor-runtime.js"), "utf8"),
  ]);
  assert.doesNotMatch(guest, /code-editor-use|packages\/code-editor-use/i);
  assert.doesNotMatch(guest, /__codeEditorBeforeInput/);
  assert.doesNotMatch(runtime, /code-editor-use|packages\/code-editor-use/i);
});
