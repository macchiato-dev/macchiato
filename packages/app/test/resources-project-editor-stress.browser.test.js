import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { appendFileSync } from "node:fs";
import { createServer } from "node:net";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { chromium } from "playwright";
import { build } from "esbuild";

import { createAccountStore } from "@macchiato-dev/hub/accounts";
import { createContentStore } from "../../hub/src/content.js";
import { seal } from "../../../packages/website/auth/session.js";
import { createNodeSqliteClient } from "../../../packages/website/adapters/node-sqlite-client.js";

const root = resolve(new URL("../../..", import.meta.url).pathname);
const appCli = join(root, "packages/app/src/index.js");

function editorSurface(page) {
  return page.frameLocator("iframe.project-editor__code-frame");
}

test("Resources framed editor integrates with the site and running output", { timeout: 90_000 }, async t => {
  const work = resolve(root, "../macchiato-work");
  await mkdir(work, { recursive: true });
  const [port, dataDir] = await Promise.all([freePort(), mkdtemp(join(work, "resources-editor-frame-"))]);
  const app = startApp(port, dataDir);
  t.after(async () => { await stopApp(app.child); await rm(dataDir, { recursive: true, force: true }); });
  await app.ready;
  const db = new DatabaseSync(join(dataDir, "macchiato.sqlite3"));
  const client = createNodeSqliteClient(db);
  const account = await createAccountStore(client).authenticateIdentity({
    provider: "github", providerUserId: "editor-frame", login: "editor-frame",
    name: "Editor Frame", email: "frame@example.test", emailVerified: true,
  });
  const source = '<!doctype html>\n<html><head><title>Frame fixture</title></head><body>\n' +
    '<h1>Frame fixture</h1>\n<button id="count">0</button>\n' +
    '<script>document.getElementById("count").addEventListener("click", function () {' +
    ' this.textContent = String(Number(this.textContent) + 1); });</script>\n</body></html>';
  await createContentStore(client).createProject(account.id, {
    namespace: "user", userSlug: account.login, slug: "surface", name: "Surface",
    description: "", visibility: "private", template: "html",
    snapshot: { files: [{ path: "index.html", content: source },
      { path: "style.css", content: "h1 { color: rebeccapurple; }" }],
      config: { entry: "index.html", editorTabs: ["index.html", "style.css"] } },
  });
  db.close();
  const session = await seal({ v: 1, sub: account.id, login: account.login, name: account.name,
    iat: Date.now(), exp: Date.now() + 180_000 }, "local-preview-session-signing-key");
  // Exercise the opt-in path without changing the production default. All
  // other controller code, guests, services and server routes are real.
  const controllerFile = join(root, "packages/website/frontend/controller.ts");
  const controllerSource = await readFile(controllerFile, "utf8");
  const editorFrame = process.env.MACCHIATO_TEST_EDITOR_FRAME !== "0";
  assert.ok(controllerSource.includes("startResourcesMachineController().catch"));
  const controller = (await build({
    stdin: { contents: controllerSource.replace("startResourcesMachineController().catch",
      `startResourcesMachineController({ editorFrame: ${editorFrame} }).catch`), loader: "ts",
      resolveDir: join(root, "packages/website/frontend"), sourcefile: "controller.ts" },
    bundle: true, write: false, format: "esm", platform: "browser", external: ["./machine.js"],
    plugins: [{ name: "test-machine", setup(builder) {
      builder.onResolve({ filter: /dev\/wasm-web-machine\/dist\/module\/wasm-web-machine\.js$/ },
        () => ({ path: "./machine.js", external: true }));
    } }],
  })).outputFiles[0].text;
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: "light" });
  await page.addInitScript(() => {
    if (window !== top) return;
    window.editorAppearanceMismatches = [];
    let samples = 0;
    function sample() {
      const frame = document.querySelector("iframe.project-editor__code-frame");
      const code = frame?.contentDocument?.querySelector(".cm-editor");
      if (code && frame.getBoundingClientRect().width && getComputedStyle(frame).visibility === "visible") {
        const expected = document.documentElement.dataset.theme === "light" ? "rgb(217, 225, 227)" : "rgb(29, 32, 32)";
        const actual = frame.contentWindow.getComputedStyle(code).backgroundColor;
        if (actual !== expected) editorAppearanceMismatches.push({ actual, expected });
      }
      if (++samples < 1200) requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
  });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  page.on("response", response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  await page.context().addCookies([{ name: "resources_session", value: session,
    domain: "resources-edge.localhost", path: "/", httpOnly: true, sameSite: "Lax" }]);
  await page.route("**/-/resources-site/controller.js*", route =>
    route.fulfill({ contentType: "text/javascript", body: controller }));
  const origin = `http://resources-edge.localhost:${port}`;
  await page.goto(`${origin}/${account.login}/surface`);
  const editor = editorFrame ? page.frameLocator("iframe.project-editor__code-frame")
    : page.locator("[data-project-editor-mount]");
  const content = editor.locator(".cm-content");
  const output = page.frameLocator("iframe.project-editor__output-frame:not([inert])");
  try {
    await content.waitFor({ timeout: 15000 });
    await output.getByRole("heading", { name: "Frame fixture" }).waitFor();
    await output.getByRole("button", { name: "0", exact: true }).click();
    assert.equal(await output.locator("#count").textContent(), "1");
    await content.click();
    await page.keyboard.press("Control+Home");
    await page.keyboard.press("End");
    await page.keyboard.type("\n<!-- framd");
    await page.keyboard.press("Backspace");
    await page.keyboard.type("e -->");
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => JSON.parse(document.querySelector("[data-project-snapshot]").value)
      .files[0].content.includes("<!-- frame -->"));
    await output.getByRole("button", { name: "0", exact: true }).waitFor();
    await output.getByRole("button", { name: "0", exact: true }).click();
    await page.getByRole("tab", { name: "style.css", exact: true }).click();
    await content.filter({ hasText: "rebeccapurple" }).waitFor();
    await page.getByRole("tab", { name: "index.html", exact: true }).click();
    await content.filter({ hasText: "<!-- frame -->" }).waitFor();
    assert.equal(await output.locator("#count").textContent(), "1", "switching files doesn't reset output");
    for (const theme of ["dark", "light", "dark", "light"]) {
      await page.emulateMedia({ colorScheme: theme });
      await page.waitForFunction(theme => document.documentElement.dataset.theme === theme, theme);
      const color = theme === "dark" ? "rgb(29, 32, 32)" : "rgb(217, 225, 227)";
      await editor.locator(".cm-editor").evaluate((node, expected) => {
        if (getComputedStyle(node).backgroundColor !== expected) throw new Error("Editor theme didn't follow the site");
      }, color);
    }
    for (const view of ["editor", "split", "preview", "split"]) {
      await page.locator(`[data-project-view="${view}"]`).click();
      if (view !== "preview") await content.waitFor();
    }
    await page.locator("[data-project-present]").click();
    const expanded = await page.locator("iframe.project-editor__output-frame:not([inert])").boundingBox();
    assert.ok(expanded.width > 1430 && expanded.height > 890);
    await page.locator("[data-project-present-close]").click();
    assert.equal(await output.locator("#count").textContent(), "1");
    for (const width of [1000, 1920, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const bounds = await (editorFrame ? page.locator("iframe.project-editor__code-frame")
        : editor.locator(".cm-editor")).boundingBox();
      assert.ok(bounds.width > 200 && bounds.height > 700, "the editor follows its resized pane");
    }
    const beforeShortcut = await content.textContent();
    await content.click();
    await page.keyboard.press("Control+k");
    await page.locator("[data-command-dialog][open]").waitFor({ timeout: 3000 });
    await page.keyboard.press("Escape");
    assert.equal(await content.textContent(), beforeShortcut, "the site shortcut doesn't edit the source");
    assert.deepEqual(await page.evaluate(() => editorAppearanceMismatches), [], "no wrong-theme editor paints");
    await page.screenshot({ path: join(work, `editor-surface-full-site-${editorFrame ? "frame" : "direct"}.png`) });
    assert.deepEqual(errors, []);
    await page.locator('a[href="/"]').first().click();
    await page.waitForURL(origin + "/");
    assert.equal(await page.locator("iframe.project-editor__code-frame").count(), 0);
    await page.goBack();
    await content.waitFor();
    await output.getByRole("heading", { name: "Frame fixture" }).waitFor();
    assert.deepEqual(errors, []);
    await page.goto(origin + "/");
    let releaseDownload, downloadStarted;
    const gate = new Promise(resolve => { releaseDownload = resolve; });
    const started = new Promise(resolve => { downloadStarted = resolve; });
    const runtimePattern = "**/project-editor-quickjs-runtime.wasm";
    const delayRuntime = async route => { downloadStarted(); await gate; await route.fallback(); };
    await page.route(runtimePattern, delayRuntime);
    try {
      await page.goto(`${origin}/${account.login}/surface`, { waitUntil: "domcontentloaded" });
      await started;
      await output.getByRole("heading", { name: "Frame fixture" }).waitFor();
      assert.equal(await content.count(), 0, "the editor download is deliberately held");
      await page.goto(origin + "/");
    } finally {
      releaseDownload();
      await page.unroute(runtimePattern, delayRuntime);
    }
    await page.waitForFunction(() => document.documentElement.dataset.resourcesFrontendMachineState === "ready");
    assert.equal(await page.locator("iframe.project-editor__code-frame").count(), 0);
    await page.goto(`${origin}/${account.login}/surface`);
    await content.waitFor();
    assert.deepEqual(errors, []);
  } catch (error) {
    t.diagnostic(JSON.stringify({ errors, url: page.url(),
      state: await page.locator('[data-project-editor]').evaluate(node => ({
        editor: node.dataset.editorMachineState, output: node.dataset.outputMachineState,
        error: node.dataset.editorMachineError })),
      frames: page.frames().map(frame => frame.url()),
      text: (await page.locator("body").innerText()).slice(-2000) }));
    await page.screenshot({ path: join(work, "editor-surface-full-site-failure.png") });
    throw error;
  }
});

test("Resources preserves first-paint appearance through frontend startup and navigation", { timeout: 180_000 }, async t => {
  const [port, dataDir] = await Promise.all([freePort(), mkdtemp(join(tmpdir(), "resources-hydration-theme-"))]);
  const app = startApp(port, dataDir);
  t.after(async () => { await stopApp(app.child); await rm(dataDir, { recursive: true, force: true }); });
  await app.ready;
  const db = new DatabaseSync(join(dataDir, "macchiato.sqlite3"));
  const account = await createAccountStore(createNodeSqliteClient(db)).authenticateIdentity({
    provider: "github", providerUserId: "hydration-theme", login: "hydration-theme",
    name: "Theme Fixture", email: "theme@example.test", emailVerified: true,
  });
  db.close();
  const session = await seal({ v: 1, sub: account.id, login: account.login, name: account.name,
    iat: Date.now(), exp: Date.now() + 300_000 }, "local-preview-session-signing-key");
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const origin = `http://resources-edge.localhost:${port}`;
  for (const mobile of [false, true]) for (const [system, choice, expected] of [
    ["light", "system", "light"], ["dark", "system", "dark"],
    ["light", "dark", "dark"], ["dark", "light", "light"],
  ]) await t.test(`${mobile ? "phone" : "desktop"}: ${choice}, system ${system}`, async () => {
    const context = await browser.newContext({ colorScheme: system,
      viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 } });
    try {
      if (process.env.MACCHIATO_TEST_ASSETS_DIRECTORY) {
        const directory = resolve(process.env.MACCHIATO_TEST_ASSETS_DIRECTORY);
        await context.route("**/-/resources-site/**", async route => {
          const name = new URL(route.request().url()).pathname.slice("/-/resources-site/".length);
          await route.fulfill({ body: await readFile(join(directory, name)),
            contentType: name.endsWith(".js") ? "text/javascript" : name.endsWith(".html") ? "text/html"
              : name.endsWith(".wasm") ? "application/wasm" : "application/octet-stream" });
        });
      }
      await context.addInitScript(choice => {
        if (window !== top) return;
        localStorage.setItem("macchiato-theme", choice);
        window.themePaints = [];
        const sample = () => {
          if (document.body) {
            const root = document.documentElement;
            const style = getComputedStyle(root);
            themePaints.push({ theme: root.dataset.theme, choice: root.dataset.themeChoice,
              color: style.getPropertyValue("--bg-color").trim(),
              state: root.dataset.resourcesFrontendMachineState || "before-guest" });
          }
          if (themePaints.length < 600) requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      }, choice);
      const page = await context.newPage(), errors = [];
      page.on("pageerror", error => errors.push(error.message));
      async function check() {
        await page.waitForFunction(() => document.documentElement.dataset.resourcesFrontendMachineState === "ready");
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const paints = await page.evaluate(() => themePaints);
        assert.ok(paints.length > 0);
        assert.ok(paints.some(paint => paint.state === "ready"), "sampled the hydrated frontend");
        const wrong = paints.filter(paint => paint.theme !== expected || paint.choice !== choice ||
          paint.color !== (expected === "light" ? "#e7ecff" : "#1a1aa2"));
        assert.deepEqual(wrong, [], `wrong appearance at ${page.url()}`);
      }
      await page.goto(origin + "/");
      await check();
      await page.locator('a[href="/blog"]').first().click();
      await page.waitForURL(origin + "/blog");
      await check();
      const article = page.locator('a[href^="/blog/"]').first();
      await article.click();
      await page.waitForURL(/\/blog\/.+/);
      await check();
      await page.reload();
      await check();
      await context.addCookies([{ name: "resources_session", value: session,
        domain: "resources-edge.localhost", path: "/", httpOnly: true, sameSite: "Lax" }]);
      await page.goto(origin + "/");
      await check();
      await page.goto(origin + "/projects/new");
      await editorSurface(page).locator(".cm-content").waitFor({ state: mobile ? "attached" : "visible" });
      await page.waitForFunction(() => document.querySelector('[data-project-editor]').dataset.outputMachineState === 'ready');
      await check();
      if (process.env.MACCHIATO_TEST_ARTIFACTS) {
        await mkdir(process.env.MACCHIATO_TEST_ARTIFACTS, { recursive: true });
        await page.screenshot({ path: join(process.env.MACCHIATO_TEST_ARTIFACTS,
          `hydrated-theme-${mobile ? "phone" : "desktop"}-${system}-${choice}.png`) });
      }
      if (choice === "system" && system === "light") {
        const identity = await page.locator('[data-project-editor]').getAttribute('data-editor-machine-id');
        const output = await page.locator('iframe.project-editor__output-frame').elementHandle();
        const editorColors = new Map();
        let previous = expected;
        async function transition(next, action) {
          await page.evaluate(() => { themePaints.length = 0; });
          await action();
          await page.waitForFunction(next => document.documentElement.dataset.theme === next, next);
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          const paints = await page.evaluate(() => themePaints);
          let changed = false;
          for (const paint of paints) {
            if (paint.theme === next) changed = true;
            else assert.ok(!changed && paint.theme === previous, 'appearance must not revert after switching');
          }
          assert.ok(changed);
          const color = await editorSurface(page).locator('.cm-content').evaluate(node => getComputedStyle(node).color);
          if (editorColors.has(next)) assert.equal(color, editorColors.get(next), 'editor theme survives repeated switches');
          else editorColors.set(next, color);
          previous = next;
        }
        for (let cycle = 0; cycle < 2; cycle++) {
          for (const [nextChoice, nextTheme] of [["dark", "dark"], ["light", "light"], ["system", "light"]]) {
            const menu = page.locator('.edge-user-menu:has(> summary[aria-label="Account menu"])');
            if (await menu.getAttribute('open') === null) await menu.locator('summary').click();
            await transition(nextTheme, () => page.locator(`button[data-theme-choice="${nextChoice}"]`).click());
            assert.equal(await page.locator('html').getAttribute('data-theme-choice'), nextChoice);
          }
          await transition('dark', () => page.emulateMedia({ colorScheme: 'dark' }));
          await transition('light', () => page.emulateMedia({ colorScheme: 'light' }));
        }
        assert.notEqual(editorColors.get('light'), editorColors.get('dark'));
        assert.equal(await page.locator('[data-project-editor]').getAttribute('data-editor-machine-id'), identity);
        assert.equal(await output.evaluate(node => node.isConnected), true, 'appearance does not restart the output');
        await output.dispose();
      }
      assert.deepEqual(errors, []);
    } finally { await context.close(); }
  });
});

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

test("Resources creates and heavily edits a project without code-editor-use", { timeout: 180_000 }, async (t) => {
  const started = performance.now();
  const report = message => {
    t.diagnostic(message);
    // Optional external evidence survives termination before Node prints results.
    if (process.env.MACCHIATO_TEST_PROGRESS_FILE) {
      appendFileSync(process.env.MACCHIATO_TEST_PROGRESS_FILE, message + "\n");
    }
  };
  const checkpoint = name => report(`${name}: ${Math.round(performance.now() - started)} ms`);
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
    // Keep fixture authentication valid beyond the test's 180-second deadline,
    // including slower CI hosts. Expiring mid-save is not an editor failure.
    iat: Date.now(), exp: Date.now() + 300_000 }, "local-preview-session-signing-key");

  const profilePath = process.env.MACCHIATO_TEST_CPU_PROFILE;
  let profiler;
  const browser = await chromium.launch();
  t.after(async () => {
    try {
      if (profiler) {
        const { profile } = await profiler.send("Profiler.stop");
        await writeFile(profilePath, JSON.stringify(profile));
        await profiler.detach();
      }
    } finally { await browser.close(); }
  });
  const artifacts = process.env.MACCHIATO_TEST_ARTIFACTS || join(dataDir, "artifacts");
  await mkdir(artifacts, { recursive: true });
  // Retain screenshots without video-encoding overhead in timing runs.
  const recordVideo = process.env.MACCHIATO_TEST_ARTIFACTS && process.env.MACCHIATO_TEST_VIDEO !== "0";
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 },
    ...(recordVideo ? { recordVideo: { dir: artifacts,
      size: { width: 1440, height: 900 } } } : {}),
  });
  // Optional DevTools sampling stays outside the machine and guest runtimes.
  // Keep it off for timing comparisons; this profile is for attribution.
  if (profilePath) {
    profiler = await page.context().newCDPSession(page);
    await profiler.send("Profiler.enable");
    await profiler.send("Profiler.setSamplingInterval", { interval: 10_000 });
    await profiler.send("Profiler.start");
  }
  // Swap a complete exported host/guest pair for regression comparisons.
  // Mixing an older host with newer guest calls is not a valid baseline.
  if (process.env.MACCHIATO_TEST_ASSETS_DIRECTORY) {
    const directory = resolve(process.env.MACCHIATO_TEST_ASSETS_DIRECTORY);
    await page.route("**/-/resources-site/**", async route => {
      const name = new URL(route.request().url()).pathname.slice("/-/resources-site/".length);
      const body = await readFile(join(directory, name));
      const contentType = name.endsWith(".js") ? "text/javascript"
        : name.endsWith(".html") ? "text/html" : name.endsWith(".wasm") ? "application/wasm"
        : "application/octet-stream";
      await route.fulfill({ body, contentType });
    });
  }
  // Diagnostic A/B runs can substitute a prior host without rebuilding guests
  // or changing the workspace actions. The ordinary regression uses the build.
  if (process.env.MACCHIATO_TEST_MACHINE_FILE) {
    const body = await readFile(process.env.MACCHIATO_TEST_MACHINE_FILE);
    await page.route("**/-/resources-site/machine.js*", route =>
      route.fulfill({ body, contentType: "text/javascript" }));
  }
  const languageDownloads = [];
  if (process.env.MACCHIATO_TEST_BUILDER_FILE) {
    const body = await readFile(process.env.MACCHIATO_TEST_BUILDER_FILE);
    await page.route("**/project-builder-quickjs-runtime.wasm*", route =>
      route.fulfill({ body, contentType: "application/wasm" }));
  }
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

  let releaseEditor;
  const editorDownload = new Promise(resolve => { releaseEditor = resolve; });
  const editorArtifact = process.env.MACCHIATO_TEST_EDITOR_FILE
    ? await readFile(process.env.MACCHIATO_TEST_EDITOR_FILE) : null;
  await page.route("**/project-editor-quickjs-runtime.wasm*", async route => {
    await editorDownload;
    if (!page.isClosed()) {
      if (editorArtifact) await route.fulfill({ body: editorArtifact, contentType: "application/wasm" });
      else await route.fallback();
    }
  });
  await page.goto(`http://resources-edge.localhost:${port}/projects/new`, { waitUntil: "domcontentloaded" });
  const editor = page.locator("[data-project-editor]");
  const content = editorSurface(page).locator(".cm-content");
  let earlyOutput;
  try {
    await page.waitForFunction(() => document.querySelector('[data-project-editor]').dataset.outputMachineState === 'ready');
    assert.equal(await content.count(), 0, "the editor download is still pending");
    earlyOutput = await page.locator('iframe.project-editor__output-frame').elementHandle();
    await editor.locator('[data-project-present]').click();
    await page.waitForFunction(() => document.querySelector('[data-project-editor]').dataset.presenting === 'true', null, { timeout: 5000 });
    await page.waitForFunction(() => {
      const frame = document.querySelector('iframe.project-editor__output-frame');
      return document.activeElement === frame &&
        frame.contentDocument.activeElement === frame.contentDocument.body;
    }, null, { timeout: 5000 });
    const bounds = await earlyOutput.boundingBox();
    assert.ok(bounds.width > 1435 && bounds.height > 895, "output expands without waiting for CodeMirror");
    await page.screenshot({ path: join(artifacts, 'output-before-editor.png') });
    await editor.locator('[data-project-present-close]').click();
    assert.equal(await editor.getAttribute('data-presenting'), null);
    assert.ok(await earlyOutput.evaluate(node => node === document.querySelector('iframe.project-editor__output-frame')),
      "early expand/close preserves the output frame");
    await editor.locator('[data-project-present]').click();
  } finally { releaseEditor(); }
  await page.waitForFunction(() => document.querySelector('[data-project-editor]').dataset.editorMachineStage === 'ready');
  assert.equal(await editor.getAttribute('data-presenting'), 'true', "editor startup preserves expanded output");
  assert.ok(await earlyOutput.evaluate(node => node === document.querySelector('iframe.project-editor__output-frame')));
  await editor.locator('[data-project-present-close]').click();
  await earlyOutput.dispose();
  await content.waitFor().catch(async (error) => {
    t.diagnostic(JSON.stringify({ url: page.url(), errors,
      page: (await page.locator("body").innerText()).slice(-1500) }));
    throw error;
  });
  await page.waitForFunction(() => document.querySelector("[data-project-editor]")?.dataset.editorMachineState === "ready");
  await page.waitForFunction(() => document.querySelector("[data-project-editor]")?.dataset.outputMachineState === "ready");
  await content.locator(".cm-line span[class]").first().waitFor();
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
  const output = page.frameLocator("[data-project-preview] iframe.project-editor__output-frame:not([inert])");
  await output.getByRole("heading", { name: "A small article" }).waitFor();
  assert.equal(await output.locator('a[href^="https://en.wikipedia.org/"]').count(), 3);
  // Pointer capture must exist in the editor's MicroQuickJS guest, not only
  // in the output's QuickJS guest. Even hovering used to call a missing method.
  const splitter = editor.locator(".project-editor__splitter");
  async function assertDividersAligned(stage) {
    const positions = await editor.evaluate(root => {
      const toolbar = root.querySelector('.project-editor__toolbar-split').getBoundingClientRect();
      const workspace = root.querySelector('.project-editor__splitter').getBoundingClientRect();
      return { toolbar: { x: toolbar.x, width: toolbar.width }, workspace: { x: workspace.x, width: workspace.width } };
    });
    assert.ok(Math.abs(positions.toolbar.x - positions.workspace.x) < 0.1 &&
      Math.abs(positions.toolbar.width - positions.workspace.width) < 0.1,
      `${stage}: the toolbar and workspace share the same divider column: ${JSON.stringify(positions)}`);
  }
  await assertDividersAligned("initial split");
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
    await assertDividersAligned("pointer resize");
  }
  await splitter.focus();
  for (const key of ["ArrowRight", "ArrowLeft"]) {
    const before = await splitter.boundingBox();
    await page.keyboard.press(key);
    const after = await splitter.boundingBox();
    assert.ok((after.x - before.x) * (key === "ArrowRight" ? 1 : -1) > 40,
      "keyboard resizing moves the shared divider");
    await assertDividersAligned("keyboard resize");
  }
  assert.deepEqual(errors, [], "divider dragging leaves the editor usable");
  await page.getByLabel("Title", { exact: true }).fill("Editing Marathon");
  assert.equal(await page.getByLabel("Name", { exact: true }).inputValue(), "editing-marathon",
    "the project title field still generates a name with field-scoped input listeners");
  await page.getByLabel("Name", { exact: true }).fill("editing-marathon");

  const rows = Array.from({ length: 100 }, (_, index) =>
    `<p data-row="${index + 1}">Editable row ${String(index + 1).padStart(3, "0")}</p>`).join("\n");
  const source = `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>Editing Marathon</title>\n<style>\nbody { margin: 2rem; background: #e8f2ff; color: #17243a; font: 16px system-ui; }\nh1 { color: #315aa8; }\np:nth-child(3n) { color: #7b3fa1; }\n</style>\n</head>\n<body>\n<h1>Editing Marathon</h1>\n${rows}\n</body>\n</html>`;

  await page.evaluate(() => {
    window.outputBuilds = 0;
    window.outputLoadingOverlays = [];
    window.outputBuildObserver = new MutationObserver(records => {
      for (const record of records) if (record.oldValue === 'build') outputBuilds++;
      const root = document.querySelector('[data-project-editor]');
      if (['starting', 'updating'].includes(root.dataset.outputMachineState)) {
        outputLoadingOverlays.push(getComputedStyle(root.querySelector('.project-editor__preview > .project-editor__pane-loading')).display);
      }
    });
    outputBuildObserver.observe(document.querySelector('[data-project-editor]'), {
      attributes: true, attributeOldValue: true, attributeFilter: ['data-output-machine-stage', 'data-output-machine-state'],
    });
  });
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
  assert.equal(await output.locator("html").getAttribute("lang"), "en",
    "compiled document attributes survive the editor/controller handoff");
  assert.equal(await output.locator("html").count(), 1,
    "whole-page output uses its real document root, not a nested HTML subtree");
  assert.equal(await output.locator("iframe").count(), 0,
    "replacement rendering must not add another frame");
  await page.waitForTimeout(1_200);
  assert.equal(await page.evaluate(() => outputBuilds), 1,
    'one editing burst must cause one output build, not competing debounce timers');
  const overlays = await page.evaluate(() => outputLoadingOverlays);
  assert.ok(overlays.length > 0, 'observed replacement preparation');
  assert.ok(overlays.every(display => display === 'none'),
    'the initial spinner must not cover the running output during replacement');
  await page.evaluate(() => outputBuildObserver.disconnect());
  await assertDividersAligned("output refresh");
  await page.screenshot({ path: join(artifacts, "editor-light.png") });
  checkpoint("light editor and output");

  const expandedFrame = await page.locator("iframe.project-editor__output-frame").elementHandle();
  const outputHeading = await output.locator("h1").elementHandle();
  await editor.locator("[data-project-present]").click();
  await page.waitForFunction(() => document.querySelector("[data-project-editor]").dataset.presenting === "true");
  const expanded = await expandedFrame.boundingBox();
  assert.ok(expanded.x < 3 && expanded.y < 3 && expanded.width > 1435 && expanded.height > 895,
    "expanded output covers the app bar and full viewport");
  await page.screenshot({ path: join(artifacts, "output-expanded.png") });
  await editor.locator("[data-project-present-close]").click();
  assert.ok(await expandedFrame.evaluate(node => node === document.querySelector("iframe.project-editor__output-frame")),
    "expanded view preserves the iframe");
  assert.ok(await outputHeading.evaluate(node => node === document.querySelector("h1")),
    "expanded view preserves the live output document");
  await expandedFrame.dispose();
  await outputHeading.dispose();
  await assertDividersAligned("restored expanded view");
  checkpoint("expanded output restored");
  await content.click();

  await page.keyboard.press("Control+z");
  await content.filter({ hasText: "Editable row 100" }).waitFor({ state: "hidden" });
  await page.keyboard.press("Control+y");
  await content.filter({ hasText: "Editable row 100" }).waitFor();
  assert.equal((await content.innerText()).trim(), source.trim());
  checkpoint("undo/redo restored source");

  await page.keyboard.press("Control+End");
  await content.pressSequentially("\n<!-- typed correction -->", { delay: 2 });
  for (let index = 0; index < 80; index += 1) {
    await page.keyboard.insertText(`<!-- revision ${index + 1} -->`);
    await page.keyboard.press("Enter");
  }
  checkpoint("80-edit burst completed");
  await page.waitForTimeout(1_200);
  const editedSnapshot = await page.locator("[data-project-snapshot]").inputValue();
  assert.match(editedSnapshot, /<!-- typed correction -->/);
  for (let index = 1; index <= 80; index++) assert.ok(editedSnapshot.includes(`<!-- revision ${index} -->`));
  assert.match(await content.innerText(), /revision 80/);
  const scroller = editorSurface(page).locator(".cm-scroller");
  await scroller.evaluate((node) => { node.scrollTop = 0; node.dispatchEvent(new Event("scroll")); });
  await page.waitForTimeout(100);
  await scroller.evaluate((node) => { node.scrollTop = node.scrollHeight; node.dispatchEvent(new Event("scroll")); });
  await page.waitForTimeout(100);
  const renderedLineNumbers = (await editorSurface(page).locator(".cm-lineNumbers .cm-gutterElement").allTextContents())
    .map(Number).filter(Number.isFinite);
  assert.ok(Math.max(...renderedLineNumbers) > 170);
  assert.match(await content.innerText(), /revision 80/);
  await page.screenshot({ path: join(artifacts, "editor-scrolled.png") });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.waitForFunction(() => document.documentElement.dataset.theme === "dark");
  await page.screenshot({ path: join(artifacts, "editor-dark.png") });
  checkpoint("typing, scrolling, undo/redo, and dark theme");

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
  await editorSurface(page).locator(".cm-content").waitFor();
  await page.waitForFunction(() => document.querySelector("[data-project-editor]")?.dataset.editorMachineState === "ready");
  const restoredSnapshot = await page.locator("[data-project-snapshot]").inputValue();
  assert.equal(await editor.getAttribute("data-persistence"), "stored", "reload must not silently fall back to the public view");
  assert.match(restoredSnapshot, /Editable row 100/);
  assert.match(restoredSnapshot, /revision 80/);
  assert.equal(await page.getByRole("button", { name: "Save project", exact: true }).isDisabled(), true,
    "the native Save button is disabled after loading a saved version");
  assert.deepEqual(oldEditorRequests, []);
  assert.deepEqual(errors, []);

  // The output's asynchronous failures belong beneath the output, not just
  // in its iframe's console or in the CodeMirror error channel.
  checkpoint("saved project reloaded");
  await editorSurface(page).locator(".cm-content").fill('<button id="fail">Fail later</button><script>' +
    'document.getElementById("fail").addEventListener("click", function () {' +
    'setTimeout(function () { throw new Error("output timer regression"); }, 10);' +
    '});</script>');
  assert.equal(await page.getByRole("button", { name: "Save project", exact: true }).isDisabled(), false,
    "editing re-enables the native Save button");
  await output.getByRole("button", { name: "Fail later" }).click();
  const errorMessage = page.getByText(/Output stopped:.*output timer regression/);
  await errorMessage.waitFor();
  assert.ok(await errorMessage.evaluate(node => Boolean(node.closest(".project-editor__preview"))));
  assert.equal(await editor.getAttribute("data-editor-machine-state"), "ready");
  assert.equal(await editor.getAttribute("data-output-machine-state"), "failed");
  await page.screenshot({ path: join(artifacts, "output-timer-error.png") });
  assert.ok(errors.every(error => /output timer regression/.test(error)), JSON.stringify(errors));
  await editorSurface(page).locator(".cm-content").fill("<h1>Recovered output</h1><!-- Español: 🀄 -->");
  assert.ok(await page.evaluate(() => {
    const root = document.querySelector('[data-project-editor]');
    return sessionStorage.getItem('resources_project_pending_v1:' + root.dataset.projectId) ===
      root.querySelector('[data-project-snapshot]').value;
  }), 'session recovery immediately retains the exact form snapshot, including Unicode');
  await output.getByRole("heading", { name: "Recovered output" }).waitFor();
  await errorMessage.waitFor({ state: "hidden" });
  assert.equal(await editor.getAttribute("data-output-machine-state"), "ready");

  // Reading history changes both the code and output, without requiring an
  // edit to trigger the output scheduler. Returning to current restores both.
  await page.waitForFunction(() => document.querySelector('[data-project-editor]').dataset.draftState === 'saved');
  // Establish a second checkpoint in this disposable fixture. Autosave needn't
  // create one within five minutes, and Save is disabled once already saved.
  const checkpointDb = new DatabaseSync(join(dataDir, 'macchiato.sqlite3'));
  try {
    await createContentStore(createNodeSqliteClient(checkpointDb)).saveProjectSnapshot(
      account.id, await editor.getAttribute('data-project-id'),
      JSON.parse(await page.locator('[data-project-snapshot]').inputValue()),
      { reason: 'manual' });
  } finally {
    checkpointDb.close();
  }
  const historyButton = page.locator('[data-project-versions-proxy]');
  await historyButton.click();
  await page.locator('[data-project-history] [data-version-sequence="1"]').click();
  await output.getByRole('heading', { name: 'Editing Marathon', exact: true }).waitFor();
  assert.match(await page.locator('[data-project-snapshot]').inputValue(), /Editable row 100/);
  const selectedVersionTime = await page.locator('[data-current-version]').getAttribute('data-version-time');
  await historyButton.click();
  const storedChoices = page.locator('[data-project-history] [data-version-sequence]');
  await storedChoices.first().waitFor();
  assert.ok(await storedChoices.count() >= 2, 'there are multiple saved versions to browse');
  assert.equal(await page.locator('[data-current-version]').getAttribute('data-version-time'), selectedVersionTime);
  assert.equal(await page.locator('[data-project-history] [aria-current="true"]').getAttribute('data-version-sequence'), '1');
  await page.screenshot({ path: join(artifacts, 'history-selected.png') });
  await page.locator('[data-project-history] [data-version-sequence="2"]').click();
  await output.getByRole('heading', { name: 'Recovered output', exact: true }).waitFor();
  await historyButton.click();
  await page.locator('[data-project-history] [aria-current="true"]').click();
  await output.getByRole('heading', { name: 'Recovered output', exact: true }).waitFor();

  async function publishSelection() {
    const submittedSequence = await page.locator('input[name="selectedVersion"]').inputValue();
    assert.match(submittedSequence, /^[1-9][0-9]*$/);
    await page.locator('[data-project-submit]').click();
    try {
      await page.waitForFunction(() => document.querySelector('[data-project-editor]')?.dataset.editorMachineState === 'ready' &&
        document.querySelector('[data-project-editor]')?.dataset.outputMachineState === 'ready');
    } catch (error) {
      await page.screenshot({ path: join(artifacts, 'history-save-failed.png') });
      t.diagnostic(JSON.stringify({ submittedSequence, url: page.url(), errors,
        state: await editor.evaluate(node => ({ ...node.dataset })).catch(() => null),
        text: (await page.locator('body').innerText()).slice(-1500) }));
      throw error;
    }
    await content.waitFor();
    assert.equal(await page.locator('[data-project-submit]').isDisabled(), true,
      'the selected saved version is clean after publication and reload');
  }
  await publishSelection();
  await historyButton.click();
  await page.locator('[data-project-history] [data-version-sequence="1"]').click();
  await output.getByRole('heading', { name: 'Editing Marathon', exact: true }).waitFor();
  await publishSelection();
  await historyButton.click();
  await storedChoices.first().waitFor();
  assert.equal(await storedChoices.first().getAttribute('data-version-sequence'), '1');
  assert.equal(await storedChoices.first().locator('.project-editor__latest').count(), 1);
  assert.equal(await page.locator('[data-project-history] .project-editor__latest').count(), 1);
  assert.equal(await storedChoices.count(), 2, 'saving an older selection promotes it without duplicating it');
  await page.screenshot({ path: join(artifacts, 'history-promoted.png') });
  await page.locator('[data-project-history] [data-version-sequence="2"]').click();
  await output.getByRole('heading', { name: 'Recovered output', exact: true }).waitFor();
  checkpoint('history selection and republishing an older version');
  assert.match(await content.innerText(), /Recovered output/);

  // Quoting a font family is valid CSS. An unfinished quote while editing is
  // not: keep the working iframe interactive, then swap after a valid edit.
  const fontFrame = await page.locator("iframe.project-editor__output-frame").elementHandle();
  const fontEditorId = await editor.getAttribute("data-editor-machine-id");
  const fontSource = (family, revision) => `<style>h1 { font-family: ${family}; }</style>
    <h1>Font revision ${revision}</h1><button>0</button><script>
      var count = 0;
      document.querySelector('button').addEventListener('click', function () {
        this.textContent = String(++count);
      });
    </script>`;
  for (const [revision, family] of ["monospace", '"monospace"', "serif"].entries()) {
    await content.fill(fontSource(family, revision));
    assert.equal(await page.locator('input[name="selectedVersion"]').inputValue(), '',
      'the first actual content edit leaves the selected historical version');
    const heading = output.getByRole("heading", { name: `Font revision ${revision}`, exact: true });
    await heading.waitFor();
    assert.equal(await heading.evaluate(node => getComputedStyle(node).fontFamily), family,
      "font-family changes reach the rendered output, including a quoted family");
    const workingHeading = await heading.elementHandle();
    await content.fill(fontSource('"monospace', revision + 1));
    const warning = page.getByText(/Output stopped:.*CSS declaration is incomplete/);
    await warning.waitFor();
    assert.ok(await warning.evaluate(node => Boolean(node.closest(".project-editor__preview"))));
    if (revision === 0) await page.screenshot({ path: join(artifacts, "font-edit-incomplete.png") });
    assert.ok(await workingHeading.evaluate(node => node.isConnected), "invalid CSS preserves the live document");
    assert.equal(await workingHeading.evaluate(node => getComputedStyle(node).fontFamily), family,
      "a rejected replacement also preserves the working stylesheet");
    await output.getByRole("button", { name: "0", exact: true }).click();
    await output.getByRole("button", { name: "1", exact: true }).waitFor();
    await workingHeading.dispose();
  }
  await content.fill(fontSource("system-ui", "recovered"));
  await output.getByRole("heading", { name: "Font revision recovered", exact: true }).waitFor();
  await page.getByText(/Output stopped:.*CSS declaration is incomplete/).waitFor({ state: "hidden" });
  assert.equal(await editor.getAttribute("data-editor-machine-id"), fontEditorId);
  assert.equal(await fontFrame.evaluate(node => node.isConnected), false,
    "valid edits replace the output frame, not the editor machine");
  assert.equal(await page.locator("iframe.project-editor__output-frame").count(), 1);
  await fontFrame.dispose();
  await page.screenshot({ path: join(artifacts, "font-edit-recovered.png") });
  checkpoint("repeated font-edit recovery without reload");

  await page.evaluate(() => {
    const root = document.querySelector('[data-project-editor]');
    const snapshot = JSON.parse(root.querySelector('[data-project-snapshot]').value);
    snapshot.files[0].content = '<h1>Recovered session draft</h1>';
    sessionStorage.setItem('resources_project_pending_v1:' + root.dataset.projectId, JSON.stringify(snapshot));
  });
  await page.reload();
  await output.getByRole('heading', { name: 'Recovered session draft', exact: true }).waitFor();
  assert.match(await content.innerText(), /Recovered session draft/);

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
  checkpoint("output recovery and phone views");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForFunction(() => document.querySelector(".project-editor__workspace").dataset.view === "split");
  await outputFrame.waitFor({ state: "visible" });
  await content.waitFor({ state: "visible" });
  assert.ok(errors.every(error => /output timer regression/.test(error)), JSON.stringify(errors));

  // Exercise both CodeMirror's paste handler and native bulk text insertion.
  // The latter exposed repeated full-page grid sizing, despite normal typing
  // and direct editor mounts passing. Keep the large source inert in output.
  const moduleSource = await readFile(process.env.MACCHIATO_TEST_SOURCE_FILE ||
    join(root, "packages/website/content-form-client.js"), "utf8");
  const inertSource = source => `<!--\n${source.replaceAll("-->", "-- >")}\n-->\n<h1>Large input</h1>`;
  const large = inertSource(moduleSource);
  // Native insertText emits thousands of input events, unlike paste. Cover
  // the full file in both paths: event-cache cleanup must not exhaust timer
  // callbacks in a single input operation. Native layout latency is measured
  // separately; this test checks data, undo/redo, and error-free recovery.
  const nativeSource = large + "\n<!-- native insertion -->";
  const mount = editor.locator(".project-editor__source > .project-editor__mount");
  if (process.env.MACCHIATO_DIRECT_LAYOUT_SELECTORS) {
    const changed = await page.evaluate(() => {
      let changed = 0;
      function narrow(rules) {
        for (const rule of rules) {
          if (rule.selectorText) {
            const previous = rule.selectorText;
            const next = previous
              .replaceAll("html:has(.focused-view)", "html:has(> body > .focused-view)")
              .replaceAll("body:has(.focused-view)", "body:has(> .focused-view)")
              .replaceAll(".project-editor:has(.project-editor__workspace", ".project-editor:has(> .project-editor__workspace");
            if (next !== previous) { rule.selectorText = next; changed++; }
          }
          if (rule.cssRules) narrow(rule.cssRules);
        }
      }
      for (const sheet of document.styleSheets) narrow(sheet.cssRules);
      return changed;
    });
    assert.ok(changed > 0, "the experimental layout selector rewrite must not silently do nothing");
    t.diagnostic(`narrowed ${changed} layout selectors`);
  }
  if (process.env.MACCHIATO_EDITOR_CONTAIN) {
    await mount.evaluate((node, contain) => { node.style.contain = contain; }, process.env.MACCHIATO_EDITOR_CONTAIN);
  }
  if (process.env.MACCHIATO_EDITOR_STATIC_LAYOUT) {
    await mount.evaluate((node, mode) => {
      if (mode === "grid-absolute") {
        Object.assign(node.style, { position: "absolute", inset: "0", gridRow: "1 / 2", gridColumn: "1", height: "auto" });
        return;
      }
      if (mode === "absolute") {
        node.style.position = "relative";
        Object.assign(node.querySelector(".project-editor__code-frame, .cm-editor").style,
          { position: "absolute", inset: "0" });
        return;
      }
      const box = node.getBoundingClientRect();
      Object.assign(node.style, { position: "fixed", left: `${box.left}px`, top: `${box.top}px`,
        width: `${box.width}px`, height: `${box.height}px` });
    }, process.env.MACCHIATO_EDITOR_STATIC_LAYOUT);
  }
  assert.equal(await mount.evaluate(node => getComputedStyle(node).contain), process.env.MACCHIATO_EDITOR_CONTAIN || "size");
  const originalSize = await mount.boundingBox();
  for (const native of [false, true]) {
    const text = native ? nativeSource : large;
    const before = JSON.parse(await page.locator("[data-project-snapshot]").inputValue()).files[0].content;
    await content.click();
    await page.keyboard.press("Control+a");
    const profileDirectory = process.env.MACCHIATO_CPU_PROFILE_DIR;
    const profiler = profileDirectory ? await page.context().newCDPSession(page) : null;
    if (profiler) {
      await profiler.send("Profiler.enable");
      await profiler.send("Profiler.start");
      await profiler.send("Tracing.start", { categories: "devtools.timeline", transferMode: "ReturnAsStream" });
    }
    const started = performance.now();
    checkpoint(native ? "starting native insertion" : "starting paste");
    if (native) await page.keyboard.insertText(text);
    else await content.evaluate((node, value) => {
      const data = new DataTransfer();
      data.setData("text/plain", value);
      const event = new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true });
      node.dispatchEvent(event);
      if (!event.defaultPrevented) throw new Error("Paste was not handled");
    }, text);
    report(`${native ? "native insertion" : "paste"}: ${text.length} characters in ${Math.round(performance.now() - started)} ms`);
    if (profiler) {
      const { profile } = await profiler.send("Profiler.stop");
      await mkdir(profileDirectory, { recursive: true });
      await writeFile(join(profileDirectory, `workspace-${native ? "insertText" : "paste"}.cpuprofile`), JSON.stringify(profile));
      const completed = new Promise(resolve => profiler.once("Tracing.tracingComplete", resolve));
      await profiler.send("Tracing.end");
      const { stream } = await completed;
      let trace = "";
      for (;;) {
        const part = await profiler.send("IO.read", { handle: stream });
        trace += part.data;
        if (part.eof) break;
      }
      await profiler.send("IO.close", { handle: stream });
      await writeFile(join(profileDirectory, `workspace-${native ? "insertText" : "paste"}.trace.json`), trace);
      await profiler.detach();
    }
    const snapshotText = () => page.locator("[data-project-snapshot]").inputValue()
      .then(value => JSON.parse(value).files[0].content);
    assert.equal(await snapshotText(), text);
    await output.getByRole("heading", { name: "Large input", exact: true }).waitFor();
    const size = await mount.boundingBox();
    assert.ok(Math.abs(size.width - originalSize.width) < 1 && Math.abs(size.height - originalSize.height) < 1);
    await content.click();
    await page.keyboard.press("Control+z");
    assert.equal(await snapshotText(), before, "undo restores the whole pre-insertion document");
    await page.keyboard.press("Control+y");
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

test("Resources loads language bytecode on demand without replacing the editing session", { timeout: 90_000 }, async (t) => {
  const [port, dataDir] = await Promise.all([freePort(), mkdtemp(join(tmpdir(), "resources-editor-languages-"))]);
  const app = startApp(port, dataDir);
  t.after(async () => { await stopApp(app.child); await rm(dataDir, { recursive: true, force: true }); });
  await app.ready;
  const db = new DatabaseSync(join(dataDir, "macchiato.sqlite3"));
  const client = createNodeSqliteClient(db);
  const account = await createAccountStore(client).authenticateIdentity({
    provider: "github", providerUserId: "editor-languages", login: "editor-languages",
    name: "Editor Languages", email: "editor-languages@example.test", emailVerified: true,
  });
  const files = [
    { path: "index.html", content: "<h1>Language fixture</h1>" },
    { path: "notes.txt", content: "Plain text needs no parser." },
    { path: "main.rs", content: "fn main() {\n    let answer = 42;\n}\n" },
    { path: "main.py", content: "def answer():\n    return 42\n" },
    { path: "app.js", content: "const answer = 42;\n" },
    { path: "types.ts", content: "interface Answer { value: number }\n" },
    { path: "style.css", content: ".answer { color: red; }\n" },
    { path: "data.json", content: '{ "answer": true }\n' },
    { path: "README.md", content: "# Answer\n\n**Forty-two**\n" },
    { path: "query.sql", content: "SELECT answer FROM questions;\n" },
    { path: "config.yaml", content: "answer: true\n" },
    { path: "main.cpp", content: "int main() { return 42; }\n" },
    { path: "App.vue", content: "<template><h1>Answer</h1></template>\n" },
    { path: "App.svelte", content: "<h1>Answer</h1>\n" },
  ];
  await createContentStore(client).createProject(account.id, {
    namespace: "user", userSlug: account.login, slug: "languages", name: "Languages",
    description: "", visibility: "private", template: "html",
    snapshot: { files, config: { entry: "index.html" } },
  });
  db.close();
  const session = await seal({ v: 1, sub: account.id, login: account.login, name: account.name,
    iat: Date.now(), exp: Date.now() + 180_000 }, "local-preview-session-signing-key");
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const artifacts = process.env.MACCHIATO_TEST_ARTIFACTS;
  if (artifacts) await mkdir(artifacts, { recursive: true });
  await page.context().addCookies([{ name: "resources_session", value: session,
    domain: "resources-edge.localhost", path: "/", httpOnly: true, sameSite: "Lax" }]);
  if (process.env.MACCHIATO_TEST_ASSETS_DIRECTORY) {
    const directory = resolve(process.env.MACCHIATO_TEST_ASSETS_DIRECTORY);
    await page.route("**/-/resources-site/**", async route => {
      const name = new URL(route.request().url()).pathname.slice("/-/resources-site/".length);
      await route.fulfill({ body: await readFile(join(directory, name)),
        contentType: name.endsWith(".js") ? "text/javascript" : name.endsWith(".html") ? "text/html"
          : name.endsWith(".wasm") ? "application/wasm" : "application/octet-stream" });
    });
  }
  const downloads = [], errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => {
    const name = new URL(request.url()).pathname.split("/").pop();
    if (/^project-editor-language-.*\.bin$/.test(name)) downloads.push(name);
  });
  let releaseRust;
  const rustDownload = new Promise(resolve => { releaseRust = resolve; });
  t.after(releaseRust);
  await page.route("**/project-editor-language-rust.bin", async route => {
    await rustDownload;
    if (!page.isClosed()) await route.fallback();
  });
  let pythonAttempts = 0;
  await page.route("**/project-editor-language-python.bin", async route => {
    if (++pythonAttempts === 1) await route.fulfill({ status: 503, body: "Temporary parser outage" });
    else await route.fallback();
  });
  await page.goto(`http://resources-edge.localhost:${port}/${account.login}/languages`);
  const editor = page.locator("[data-project-editor]"), content = editorSurface(page).locator(".cm-content");
  await content.waitFor();
  const editorId = await editor.getAttribute("data-editor-machine-id");
  async function openFile(path) {
    await page.locator("[data-project-file-trigger]").click();
    await page.locator(`[data-project-file-options] [data-project-file="${path}"]`).click();
    assert.equal(await editor.getAttribute("data-editor-machine-id"), editorId);
  }
  async function highlighted(word) {
    await content.locator(".cm-line span[class]").filter({ hasText: word }).first()
      .waitFor({ timeout: 5000 }).catch(async error => {
        t.diagnostic(JSON.stringify({ word, downloads, errors,
          text: await content.innerText(),
          status: await page.locator("[data-project-status]").allTextContents(),
          selected: await page.locator('[role="tab"][aria-selected="true"]').allTextContents(),
          spans: await content.locator(".cm-line span").evaluateAll(nodes => nodes.map(node =>
            ({ text: node.textContent, class: node.className }))) }));
        await page.screenshot({ path: join(root, "../macchiato-work/editor-language-failure.png") });
        throw error;
      });
  }
  await highlighted("h1");
  assert.deepEqual(downloads, ["project-editor-language-html.bin"]);
  await openFile("notes.txt");
  assert.equal(downloads.length, 1, "plain text doesn't download a parser");
  await openFile("main.rs");
  await content.click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type("// kept while loading");
  const editedRust = await content.innerText();
  assert.match(editedRust, /kept while loading/);
  // The delayed Rust result must not change the active JavaScript language.
  await openFile("app.js");
  await highlighted("const");
  releaseRust();
  await page.waitForTimeout(300);
  await highlighted("const");
  await openFile("main.rs");
  await highlighted("fn");
  assert.equal(await content.innerText(), editedRust);
  await content.click();
  await page.keyboard.press("Control+z");
  assert.doesNotMatch(await content.innerText(), /kept while loading/);
  await page.keyboard.press("Control+y");
  assert.equal(await content.innerText(), editedRust, "loading the parser preserves undo/redo");
  await openFile("types.ts");
  await highlighted("interface");
  assert.equal(downloads.filter(name => name.includes("javascript")).length, 1,
    "TypeScript and JavaScript share one downloaded package");
  await openFile("main.py");
  await page.getByText("Syntax highlighting unavailable for python.", { exact: false }).waitFor();
  assert.equal(await page.locator("[data-editor-machine-error]").count(), 0,
    "the parser failure is not reported as a machine failure to the outer page");
  await content.click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type("# still editable");
  assert.match(await content.innerText(), /still editable/);
  await openFile("notes.txt");
  await openFile("main.py");
  await highlighted("def");
  assert.equal(pythonAttempts, 2, "a failed parser download can be retried without reloading");
  assert.match(await content.innerText(), /still editable/);
  assert.doesNotMatch(await page.locator("body").innerText(), /Editor stopped:/);
  assert.equal(await page.getByText("Syntax highlighting unavailable for python.", { exact: false }).isVisible(), false);
  for (const [path, token] of [["style.css", "red"], ["data.json", "true"], ["README.md", "Answer"],
    ["query.sql", "SELECT"], ["config.yaml", "answer"], ["main.cpp", "int"],
    ["App.vue", "h1"], ["App.svelte", "h1"]]) {
    await openFile(path);
    await highlighted(token);
    // innerText adds a browser-dependent extra break for CodeMirror's final
    // empty contenteditable line. Read its actual line nodes instead.
    assert.equal((await content.locator(".cm-line").allTextContents()).join("\n"),
      files.find(file => file.path === path).content);
    if (path === "data.json" || path === "README.md") {
      for (const theme of ["light", "dark"]) {
        await page.emulateMedia({ colorScheme: theme });
        await page.waitForFunction(theme => document.documentElement.dataset.theme === theme, theme);
        const styles = await content.evaluate((node, token) => {
          const span = [...node.querySelectorAll(".cm-line span")].find(span => span.textContent.includes(token));
          const style = getComputedStyle(span);
          return { color: style.color, plain: getComputedStyle(node).color, weight: style.fontWeight };
        }, token);
        assert.notEqual(styles.color, styles.plain, `${path} token is colored in ${theme} mode`);
        if (path === "README.md") assert.equal(styles.weight, "700", "Markdown headings remain bold");
        if (artifacts) await page.screenshot({ path: join(artifacts, `${path === "data.json" ? "json" : "markdown"}-${theme}.png`) });
      }
    }
  }
  assert.deepEqual(downloads.sort(), ["html", "javascript", "python", "python", "rust", "css", "json",
    "markdown", "sql", "yaml", "cpp", "vue", "svelte"]
    .map(name => `project-editor-language-${name}.bin`).sort());
  const tabs = page.locator("[data-project-tabs]");
  const back = page.getByRole("button", { name: "Scroll tabs left" });
  const forward = page.getByRole("button", { name: "Scroll tabs right" });
  async function selectedTabVisible() {
    await page.waitForFunction(() => {
      const list = document.querySelector("[data-project-tabs]");
      const selected = list.querySelector('[aria-selected="true"]').parentElement.getBoundingClientRect();
      const viewport = list.getBoundingClientRect();
      return selected.left >= viewport.left - 1 && selected.right <= viewport.right + 1;
    }, null, { timeout: 5000 }).catch(async error => {
      t.diagnostic(JSON.stringify({ errors, tabs: await tabs.evaluate(list => ({
        count: list.children.length, scroll: list.scrollLeft, width: list.clientWidth,
        total: list.scrollWidth, viewport: list.getBoundingClientRect().toJSON(),
        selected: list.querySelector('[aria-selected="true"]').parentElement.getBoundingClientRect().toJSON(),
      })) }));
      await page.screenshot({ path: join(root, "../macchiato-work/editor-tabs-failure.png") });
      throw error;
    });
  }
  await selectedTabVisible();
  assert.equal(await back.isVisible(), true, "newly opened tabs reveal the overflow controls");
  assert.equal(await forward.isDisabled(), true, "the last selected tab is at the right edge");
  const rightOffset = await tabs.evaluate(node => node.scrollLeft);
  await back.click();
  await page.waitForFunction(right => document.querySelector("[data-project-tabs]").scrollLeft < right - 20, rightOffset);
  assert.equal(await forward.isEnabled(), true);
  await openFile("index.html");
  await selectedTabVisible();
  assert.equal(await back.isDisabled(), true);
  await openFile("App.svelte");
  for (const width of [1000, 1920, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await selectedTabVisible();
  }
  // Closing the active end of the strip eventually removes the arrows. The
  // controls must not keep themselves visible by consuming the available room.
  while (await tabs.locator('[role="tab"]').count() > 1) {
    await tabs.locator("[data-close-tab]").click();
    await selectedTabVisible();
  }
  assert.equal(await back.isVisible(), false);
  assert.equal(await forward.isVisible(), false);
  assert.equal(await editor.getAttribute("data-editor-machine-id"), editorId);
  assert.deepEqual(errors, []);
  if (artifacts) await page.screenshot({ path: join(artifacts, "languages-recovered.png") });
});
