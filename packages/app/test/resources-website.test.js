import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { mkdir, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { DomUse } from "@macchiato-dev/dom-use";
import { decodeProjectArchive, encodeProjectArchive } from "@macchiato-dev/hub/project-archive";
import { chromium } from "playwright";

import { resourcesWebsiteHandler } from "../../../examples/resources-website/handler.js";
import { buildResourcesSiteRoutes, resourcesDomSchema, validateResourcesStylesheet } from "../../../packages/website/seed.js";
import { seal } from "../../../packages/website/auth/session.js";
import { themeBootstrapScript } from "../../../packages/website/theme-bootstrap.js";
import { createAccountStore } from "@macchiato-dev/hub/accounts";
import { createContentStore } from "../../hub/src/content.js";
import { createNodeSqliteClient } from "../../../packages/website/adapters/node-sqlite-client.js";

const repoRoot = resolve(new URL("../../..", import.meta.url).pathname);
const appCli = resolve(repoRoot, "packages", "app", "src", "index.js");
const resourcesSiteDir = resolve(repoRoot, "examples", "resources-site");

// Project controls live in the outer document; CodeMirror owns a separate
// rendering document. Keep selectors explicit rather than flattening frames.
function codeSurface(page) {
  return page.frameLocator("iframe.project-editor__code-frame");
}

async function codeDocument(page) {
  const element = await page.locator("iframe.project-editor__code-frame").elementHandle();
  const frame = await element.contentFrame();
  assert.ok(frame, "editor rendering document is available");
  return frame;
}

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

function tempDir() {
  return mkdtemp(join(tmpdir(), "macchiato-resources-test-"));
}

function startApp(port, dataDir, environment = {}) {
  const child = spawn(process.execPath, [
    appCli,
    "--data-dir",
    dataDir,
    "--host",
    "127.0.0.1",
    "--port",
    String(port),
    "--app-plugin",
    "development",
  ], {
    cwd: repoRoot,
    env: { ...process.env, RESOURCES_PREVIEW_SIGNUPS_ENABLED: "true", ...environment },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  const waitForReady = new Promise((resolveReady, reject) => {
    const timer = setTimeout(() => reject(new Error(`Server did not start\n${output}`)), 30000);
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

test("Resources Edge closes registration without adding social links to every page", async (t) => {
  const port = await getPort();
  const dataDir = await tempDir();
  const app = startApp(port, dataDir, { RESOURCES_PREVIEW_SIGNUPS_ENABLED: "false" });
  t.after(async () => { await stopChild(app.child); await rm(dataDir, { recursive: true, force: true }); });
  await app.waitForReady;
  const browser = await chromium.launch();
  t.after(async () => browser.close());
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(`http://resources-edge.localhost:${port}/`, { waitUntil: "networkidle" });
  await assert.doesNotReject(page.getByRole("complementary").filter({ hasText: "Follow Resources.co" }).waitFor());
  await page.getByLabel("Account menu").click();
  assert.equal(await page.getByRole("link", { name: "Sign up" }).count(), 0);
  await page.screenshot({ path: resolve(repoRoot, "../macchiato-work/resources-signups-disabled-home.png") });
  await page.goto(`http://resources-edge.localhost:${port}/about`, { waitUntil: "networkidle" });
  assert.equal(await page.getByText("Follow Resources.co", { exact: true }).count(), 0);
  await page.goto(`http://resources-edge.localhost:${port}/signup`, { waitUntil: "networkidle" });
  await assert.doesNotReject(page.getByRole("heading", { name: "Sign up is not currently enabled" }).waitFor());
  assert.equal(await page.getByRole("link", { name: "X", exact: true }).getAttribute("href"), "https://x.com/ResourcesCo");
  assert.equal(await page.getByRole("link", { name: "LinkedIn" }).getAttribute("href"), "https://www.linkedin.com/company/resources-co/");
  assert.equal(await page.getByRole("link", { name: /Continue with/ }).count(), 0);
});

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

test("resources website serves the static home page", async () => {
  const response = await resourcesWebsiteHandler(new Request("http://resources-website.localhost/"));
  const text = await response.text();

  assert.equal(response.status, 200);
  assert.match(text, /<title>Resources\.co<\/title>/);
  assert.match(text, /Infrastructure you own, composed from parts\./);
  assert.match(text, /Featured collections/);
  assert.match(text, /<link rel="stylesheet" href="styles\.css">/);
  assert.doesNotMatch(text, /<script\b/i);
  assert.doesNotMatch(text, /__bundler/i);
  assert.doesNotMatch(text, /https?:\/\//i);
});

test("resources website is mounted on resources-website.localhost", async (t) => {
  const port = await getPort();
  const dataDir = await tempDir();
  const app = startApp(port, dataDir);
  t.after(async () => {
    await stopChild(app.child);
    await rm(dataDir, { recursive: true, force: true });
  });

  await app.waitForReady;
  const response = await fetch(`http://resources-website.localhost:${port}/`);
  const text = await response.text();

  assert.equal(response.status, 200);
  assert.match(text, /Self-hosted building blocks/);

  const stylesheet = await fetch(`http://resources-website.localhost:${port}/styles.css`);
  assert.equal(stylesheet.status, 200);
  assert.match(await stylesheet.text(), /--accent: #30D5C8;/);

  const font = await fetch(`http://resources-website.localhost:${port}/-/fonts/resourcesco-space-grotesk/space-grotesk-latin.woff2`);
  assert.equal(font.status, 200);
  assert.equal(font.headers.get("content-type"), "font/woff2");
  assert.equal(font.headers.get("x-content-type-options"), "nosniff");
});

test("Resources.co edge profile is mounted locally through its storage adapter", async (t) => {
  const port = await getPort();
  const dataDir = await tempDir();
  const app = startApp(port, dataDir);
  t.after(async () => {
    await stopChild(app.child);
    await rm(dataDir, { recursive: true, force: true });
  });

  await app.waitForReady;
  const response = await fetch(`http://resources-edge.localhost:${port}/`);
  const text = await response.text();
  const config = await fetch(`http://apps.localhost:${port}/config/resources-edge`);
  const configText = await config.text();

  assert.equal(response.status, 200);
  assert.match(text, /--accent: #30d5c8/);
  assert.match(text, /Log in/);
  assert.doesNotMatch(text, /Edge safe/);
  assert.match(response.headers.get("content-security-policy"), /script-src 'self'/);
  assert.match(text, /resources-site\/controller\.js/);
  assert.doesNotMatch(text, /command-palette-use\/client\.js/);
  assert.equal(config.status, 200);
  assert.match(configText, /Resources\.co Edge Preview/);
  assert.match(configText, /in-memory export manifest/);
  assert.match(configText, /Bunny Storage/);

  const creditsResponse = await fetch(`http://resources-edge.localhost:${port}/credits`);
  const credits = await creditsResponse.text();
  assert.equal(creditsResponse.status, 200);
  assert.match(credits, />Credits</);
  for (const name of ["Lucide", "QuickJS", "CodeMirror", "Codex", "GPT", "Claude Code", "Claude Design", "Claude", "Kimi", "Kimi Code"]) {
    assert.match(credits, new RegExp(`>${name}<`));
  }
  assert.match(credits, /Terms of Use[\s\S]*Privacy Policy[\s\S]*Credits/);
});

test("Resources.co blog container examples render and surface schema errors in the status rail", async (t) => {
  const port = await getPort();
  const dataDir = await tempDir();
  const app = startApp(port, dataDir);
  t.after(async () => { await stopChild(app.child); await rm(dataDir, { recursive: true, force: true }); });
  await app.waitForReady;
  const browser = await chromium.launch();
  t.after(async () => browser.close());

  const examples = [
    ["article", "article", "article h1"],
    ["hello", "page", "h1"],
    ["clock", "page", "#time"],
    ["mark", "svg", "svg circle"],
    ["ball", "canvas", "canvas"],
  ];
  for (const [template, container, previewSelector] of examples) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(`http://resources-edge.localhost:${port}/try?template=${template}`, { waitUntil: "domcontentloaded" });
    await codeSurface(page).locator(".cm-editor").waitFor();
    const snapshot = JSON.parse(await page.locator("[data-project-snapshot]").inputValue());
    assert.equal(snapshot.config.container, container);
    assert.equal(await page.getByLabel("Template").inputValue(), template);
    assert.equal(await page.locator(".project-create__fields").isVisible(), true);
    assert.equal(await page.locator(".project-view__identity").count(), 0);
    const output = page.frameLocator("[data-project-output-mount] iframe:not([inert])");
    const surface = output.locator("body");
    const preview = surface.locator(previewSelector);
    await preview.waitFor();
    if (template === "mark") {
      await surface.getByRole("img", { name: "Logo mark" }).waitFor();
      assert.equal(await surface.locator("svg title").textContent(), "Logo mark");
      await page.screenshot({ path: resolve(repoRoot, "../macchiato-work/template-mark.png") });
    }
    assert.equal(await preview.count(), 1);
    assert.equal(await page.locator("[data-project-status]").getAttribute("data-state"), "normal");
    assert.equal(await page.locator("[data-project-status]").isHidden(), true);
    assert.equal(await page.locator("[data-project-save]").textContent(), "");
    if (template === "clock") {
      assert.equal(await surface.evaluate(node => getComputedStyle(node).backgroundColor), "rgb(23, 26, 26)",
        "the clock must load its own stylesheet through its HTML entry");
      assert.equal(await surface.locator("main").evaluate(node => getComputedStyle(node).textAlign), "center");
      // A real Document propagates the body's background to its canvas; its
      // body box need not stretch to viewport height to paint that background.
      const viewport = await surface.evaluate(() => ({ height: document.documentElement.scrollHeight, viewport: innerHeight }));
      assert.equal(viewport.height, viewport.viewport);
      const frameBox = await page.locator("[data-project-output-mount] iframe:not([inert])").boundingBox();
      const bottomPixel = await page.screenshot({ clip: {
        x: Math.floor(frameBox.x + frameBox.width / 2),
        // Stay above the project pane's inset bottom divider.
        y: Math.floor(frameBox.y + frameBox.height - 8), width: 1, height: 1,
      } });
      const background = await page.evaluate(async bytes => {
        const image = await createImageBitmap(new Blob([new Uint8Array(bytes)], { type: "image/png" }));
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 1;
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0); image.close();
        return [...context.getImageData(0, 0, 1, 1).data];
      }, [...bottomPixel]);
      assert.deepEqual(background, [23, 26, 26, 255], "the guest background paints the bottom of the viewport");
      await page.screenshot({ path: resolve(repoRoot, "../macchiato-work/template-clock.png") });
      await page.locator("[data-project-file-trigger]").click();
      await page.locator('[data-project-file="script.js"]').click();
      const scriptEditor = codeSurface(page).locator(".cm-content");
      await scriptEditor.press("Control+A");
      await scriptEditor.fill(snapshot.files.find((file) => file.path === "script.js").content.replace("1000", "5000") +
        '\ndocument.getElementById("time").setAttribute("data-tick-delay", "5000");');
      const clock = surface.locator('#time[data-tick-delay="5000"]');
      await clock.waitFor();
      const initialTime = await clock.textContent();
      await page.waitForTimeout(1_500);
      assert.equal(await clock.textContent(), initialTime);
      await page.waitForTimeout(4_200);
      assert.notEqual(await clock.textContent(), initialTime);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.getByRole("button", { name: "Output View", exact: true }).click();
      const frame = await (await page.locator("[data-project-output-mount] iframe:not([inert])").elementHandle()).contentFrame();
      const fillsViewport = () => {
        const node = document.querySelector("body");
        return node && getComputedStyle(node).backgroundColor === "rgb(23, 26, 26)" &&
          document.documentElement.scrollHeight === innerHeight;
      };
      await frame.waitForFunction(fillsViewport);
      await page.screenshot({ path: resolve(repoRoot, "../macchiato-work/template-clock-mobile.png") });
      await page.getByRole("button", { name: "Expanded view", exact: true }).click();
      await frame.waitForFunction(fillsViewport);
      await page.screenshot({ path: resolve(repoRoot, "../macchiato-work/template-clock-expanded.png") });
      await page.locator("[data-project-present-close]").click();
      await frame.waitForFunction(fillsViewport);
    }
    if (template === "article") {
      const sourceEditor = codeSurface(page).locator(".cm-content");
      await sourceEditor.press("Control+A");
      await sourceEditor.fill(snapshot.files.find((file) => file.path === "index.html").content.replace("A small article</h1>", "A changed article</h1>"));
      await surface.locator("h1", { hasText: "A changed article" }).waitFor();
      await page.locator("[data-project-file-trigger]").click();
      await page.locator('[data-project-file="style.css"]').click();
      await sourceEditor.press("Control+A");
      await sourceEditor.fill("body { background: rgb(12, 34, 56); color: rgb(240, 230, 220); } h1 { font-size: 41px; }");
      await page.waitForFunction(() => {
        const frame = document.querySelector("[data-project-output-mount] iframe:not([inert])");
        const active = frame?.contentDocument?.body;
        return active && frame.contentWindow.getComputedStyle(active).backgroundColor === "rgb(12, 34, 56)";
      });
      assert.equal(await surface.evaluate((node) => getComputedStyle(node).backgroundColor), "rgb(12, 34, 56)");
      assert.equal(await surface.locator("h1").evaluate((node) => getComputedStyle(node).fontSize), "41px");
      const editedArticle = JSON.parse(await page.locator("[data-project-snapshot]").inputValue());
      await page.locator("[data-project-output-mount] iframe:not([inert])").evaluate(frame => {
        frame.contentWindow.__templateUndoFrame = true;
      });
      await page.getByLabel("Template").selectOption("mark");
      await page.locator("[data-project-file-trigger]").click();
      await assert.doesNotReject(page.locator('[data-project-file="image.svg"]').waitFor());
      assert.equal(JSON.parse(await page.locator("[data-project-snapshot]").inputValue()).config.template, "mark");
      await page.waitForTimeout(1_700);
      assert.equal(await page.locator("[data-project-save]").textContent(), "");
      await page.locator("[data-project-file-trigger]").click();
      await surface.locator("svg circle").waitFor();
      await page.locator("[data-project-notice]").getByRole("button", { name: "Undo", exact: true }).click();
      assert.deepEqual(JSON.parse(await page.locator("[data-project-snapshot]").inputValue()), editedArticle);
      assert.equal(await page.getByLabel("Template").inputValue(), "article");
      await surface.locator("h1", { hasText: "A changed article" }).waitFor();
      assert.equal(await surface.evaluate(node => getComputedStyle(node).backgroundColor), "rgb(12, 34, 56)");
      assert.equal(await surface.locator("h1").evaluate(node => getComputedStyle(node).fontSize), "41px");
      assert.equal(await page.locator("[data-project-notice]").isHidden(), true);
      assert.equal(await page.locator("[data-project-output-mount] iframe:not([inert])").evaluate(frame =>
        frame.contentWindow.__templateUndoFrame), undefined, "template changes and undo start fresh output guests");
      assert.equal(await page.locator("[data-project-output-mount] iframe").count(), 1);
    }
    await page.close();
  }
});

test("Resources.co rejected documents retain the last output and recover on edit", async (t) => {
  const port = await getPort();
  const dataDir = await tempDir();
  const app = startApp(port, dataDir);
  t.after(async () => { await stopChild(app.child); await rm(dataDir, { recursive: true, force: true }); });
  await app.waitForReady;
  const browser = await chromium.launch();
  t.after(async () => browser.close());

  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(`http://resources-edge.localhost:${port}/try?template=article`, { waitUntil: "domcontentloaded" });
  const editor = codeSurface(page).locator(".cm-content");
  await editor.waitFor();
  const output = page.frameLocator("[data-project-output-mount] iframe:not([inert])");
  const surface = output.locator("body");
  await surface.locator("h1").waitFor();
  const originalHeading = await surface.locator("h1").textContent();
  await editor.click();
  await page.keyboard.press("Control+A");
  await editor.fill('<article><h1 id="allowed">Waiting</h1><iframe><p>Blocked subtree</p></iframe></article><script>document.getElementById("allowed").textContent = "Allowed guest code still runs";</script>');
  await page.locator("[data-project-status][data-state='error']").waitFor();
  // The compiler rejects the unsafe document as a whole and leaves the last
  // valid output alive; it does not execute a partially stripped document.
  assert.equal(await surface.locator("h1").textContent(), originalHeading);
  assert.equal(await output.locator("iframe").count(), 0);
  assert.equal(await surface.getByText("Blocked subtree").count(), 0);
  assert.match(await editor.innerText(), /<iframe>.*Blocked subtree.*<\/iframe>/s);
  assert.equal(await page.locator("[data-project-status]").getAttribute("data-state"), "error");
  assert.equal(await page.locator("[data-project-status]").evaluate((element) => element.parentElement.className), "project-editor__preview");
  await page.getByRole("button", { name: "Editor", exact: true }).click();
  assert.equal(await page.locator("[data-project-status]").evaluate((element) => element.parentElement.className), "project-editor__source");
  await page.getByRole("button", { name: "Split view", exact: true }).click();
  assert.equal(await page.locator("[data-project-status]").evaluate((element) => element.parentElement.className), "project-editor__preview");
  assert.equal(await page.locator("[data-project-tip-controls]").isVisible(), false);
  assert.match(await page.locator("[data-project-error]").textContent(), /Output stopped: build.compile:.*iframe/);
  await page.screenshot({ path: resolve(repoRoot, "../macchiato-work/template-output-error.png") });
  assert.equal(await page.locator("[data-project-save]").textContent(), "");
  await editor.fill('<article><h1 id="allowed">Waiting</h1></article><script>document.getElementById("allowed").textContent = "Allowed guest code still runs";</script>');
  await surface.locator("h1", { hasText: "Allowed guest code still runs" }).waitFor();
  assert.equal(await page.locator("[data-project-status]").isHidden(), true);
});

test("apps directory lists available app subdomains", async (t) => {
  const port = await getPort();
  const dataDir = await tempDir();
  const app = startApp(port, dataDir);
  t.after(async () => {
    await stopChild(app.child);
    await rm(dataDir, { recursive: true, force: true });
  });

  await app.waitForReady;
  const response = await fetch(`http://apps.localhost:${port}/`);
  const text = await response.text();

  assert.equal(response.status, 200);
  assert.match(text, /Macchiato Apps/);
  assert.match(text, /resources-co\.localhost/);
  assert.match(text, /resources-edge\.localhost/);
  assert.match(text, /resources-website\.localhost/);
  assert.match(text, /resources-design\.localhost/);
  assert.match(text, /raw site/);
  assert.match(text, /dom-use-todos\.localhost/);
  assert.match(text, /href="http:\/\/apps\.localhost:\d+\/config\/resources-co"/);
  assert.match(text, /href="http:\/\/apps\.localhost:\d+\/config\/resources-design"/);

  const rootResponse = await fetch(`http://127.0.0.1:${port}/`);
  const rootText = await rootResponse.text();
  assert.equal(rootResponse.status, 200);
  assert.match(rootText, /Macchiato Apps/);
});

test("resources design file is a SQLite raw file site with default security headers", async (t) => {
  const port = await getPort();
  const dataDir = await tempDir();
  const app = startApp(port, dataDir);
  t.after(async () => {
    await stopChild(app.child);
    await rm(dataDir, { recursive: true, force: true });
  });

  await app.waitForReady;
  const response = await fetch(`http://resources-design.localhost:${port}/`);
  const text = await response.text();
  const config = await fetch(`http://apps.localhost:${port}/config/resources-design`);
  const configText = await config.text();

  assert.equal(response.status, 200);
  assert.match(text, /Create a project/);
  assert.match(text, /Continue with GitLab/);
  assert.equal(response.headers.get("content-type"), "text/html; charset=utf-8");
  assert.match(response.headers.get("content-security-policy"), /default-src 'none'/);
  assert.match(response.headers.get("content-security-policy"), /script-src 'self' 'unsafe-inline' blob:/);
  assert.equal(response.headers.get("clear-site-data"), null);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("access-control-allow-origin"), "*");
  assert.equal(config.status, 200);
  assert.match(configText, /Resources\.co Design/);
  assert.match(configText, /raw site/);
  assert.doesNotMatch(configText, /clearSiteData/);
  assert.match(configText, /resourcesco-standalone-20260722\.html/);
  assert.match(configText, /&quot;cors&quot;: &quot;\*&quot;/);

  const preflight = await fetch(`http://resources-design.localhost:${port}/`, { method: "OPTIONS" });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("access-control-allow-origin"), "*");
  assert.equal(preflight.headers.get("access-control-allow-methods"), "GET, HEAD, OPTIONS");
});

test("apps directory exposes app configuration with schemas", async (t) => {
  const port = await getPort();
  const dataDir = await tempDir();
  const app = startApp(port, dataDir);
  t.after(async () => {
    await stopChild(app.child);
    await rm(dataDir, { recursive: true, force: true });
  });

  await app.waitForReady;
  const response = await fetch(`http://apps.localhost:${port}/config/resources-co`);
  const text = await response.text();

  assert.equal(response.status, 200);
  assert.match(text, /Resources\.co Configuration/);
  assert.match(text, /&quot;schemas&quot;/);
  assert.match(text, /&quot;dom&quot;/);
  assert.match(text, /&quot;css&quot;/);
  assert.match(text, /site-footer/);
  assert.match(text, /CSS property not allowed|useStyles|use-styles|definitions/);
});

test("apps directory renders in a real browser", async (t) => {
  const port = await getPort();
  const dataDir = await tempDir();
  const app = startApp(port, dataDir);
  t.after(async () => {
    await stopChild(app.child);
    await rm(dataDir, { recursive: true, force: true });
  });

  await app.waitForReady;
  const browser = await chromium.launch();
  t.after(async () => browser.close());
  const page = await browser.newPage();
  await page.emulateMedia({ colorScheme: "light" });
  const errors = [];
  const badResponses = [];

  page.on("pageerror", (err) => errors.push(err.message));
  page.on("response", (response) => {
    if (response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`);
  });

  await page.goto(`http://apps.localhost:${port}/`, { waitUntil: "networkidle" });
  await assert.doesNotReject(page.getByRole("heading", { name: "Macchiato Apps" }).waitFor());
  await assert.doesNotReject(page.getByRole("link", { name: "Resources.co", exact: true }).waitFor());
  await assert.doesNotReject(page.getByRole("link", { name: "Resources.co Design" }).waitFor());
  assert.deepEqual(errors, []);
  assert.deepEqual(badResponses, []);
});

test("Resources.co edge preview limits browser code to its host-owned machine controller", async (t) => {
  const port = await getPort();
  const dataDir = await tempDir();
  const app = startApp(port, dataDir);
  t.after(async () => {
    await stopChild(app.child);
    await rm(dataDir, { recursive: true, force: true });
  });

  await app.waitForReady;
  const browser = await chromium.launch();
  t.after(async () => browser.close());
  const page = await browser.newPage({ colorScheme: "dark" });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  async function checkBrowserScripts() {
    const scripts = await page.locator("script:not([type='application/json'])").evaluateAll(nodes =>
      nodes.map(node => ({ src: node.getAttribute("src"), type: node.type, text: node.textContent.trim() })));
    assert.deepEqual(scripts.filter(script => !script.src), [{ src: null, type: "", text: themeBootstrapScript.trim() }]);
    assert.equal(scripts.filter(script => script.src).length, 1);
    assert.equal(scripts.find(script => script.src).type, "module");
    assert.match(scripts.find(script => script.src).src, /^\/-\/resources-site\/controller\.js(?:\?|$)/);
  }

  const response = await page.goto(`http://resources-edge.localhost:${port}/`, { waitUntil: "networkidle" });
  await assert.doesNotReject(page.getByRole("heading", { name: /Web projects, under your control/ }).waitFor());
  await assert.doesNotReject(page.getByLabel("Notifications").waitFor());
  await assert.doesNotReject(page.getByLabel("Create").waitFor());
  assert.equal(await page.locator(".ub-btn").count(), 0);
  const notification = page.getByLabel("Notifications");
  const create = page.getByLabel("Create");
  assert.equal(await notification.locator("svg path").count(), 2);
  assert.equal(await create.locator("svg line").count(), 2);
  const notificationBox = await notification.boundingBox();
  const createBox = await create.boundingBox();
  assert.ok(notificationBox && createBox);
  assert.ok(Math.abs(createBox.x - notificationBox.x - notificationBox.width - 5) < 1);
  const restingBackground = await create.evaluate((node) => getComputedStyle(node).backgroundColor);
  await create.hover();
  await page.waitForTimeout(180);
  const hoverBackground = await create.evaluate((node) => getComputedStyle(node).backgroundColor);
  assert.notEqual(hoverBackground, restingBackground);
  const edgeTheme = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return [style.getPropertyValue("--accent").trim(), style.getPropertyValue("--active-bg").trim()];
  });
  assert.equal(response.status(), 200);
  await checkBrowserScripts();
  assert.equal(await page.locator("script[type='application/json']").count(), 1);
  assert.equal(await page.locator("html").getAttribute("lang"), "en");
  assert.deepEqual(edgeTheme, ["#fafaf8", "#fafaf8"]);
  assert.equal(await page.locator("html").getAttribute("data-theme-choice"), "system");
  await assert.doesNotReject(page.getByLabel("Account menu").waitFor());
  const accountTrigger = page.getByLabel("Account menu");
  const accountResting = await accountTrigger.evaluate((node) => {
    const style = getComputedStyle(node);
    return { background: style.backgroundColor, border: style.borderColor };
  });
  await accountTrigger.hover();
  await page.waitForTimeout(180);
  const accountHover = await accountTrigger.evaluate((node) => {
    const style = getComputedStyle(node);
    return { background: style.backgroundColor, border: style.borderColor };
  });
  assert.notEqual(accountHover.background, accountResting.background);
  assert.notEqual(accountHover.border, accountResting.border);
  assert.equal(await accountTrigger.evaluate((node) => getComputedStyle(node).borderRadius), "999px");
  for (const label of ["Notifications", "Create"]) {
    const trigger = page.getByLabel(label);
    await trigger.hover();
    await page.waitForTimeout(180);
    const hover = await trigger.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return { width: rect.width, height: rect.height, radius: style.borderRadius, border: style.borderColor, background: style.backgroundColor };
    });
    assert.deepEqual([hover.width, hover.height, hover.radius], [32, 32, "4px"]);
    assert.notEqual(hover.border, "rgba(0, 0, 0, 0)");
    assert.notEqual(hover.background, "rgba(0, 0, 0, 0)");
  }
  await page.getByLabel("Account menu").click();
  await assert.doesNotReject(page.getByRole("link", { name: "Settings" }).waitFor());
  assert.equal(await page.getByRole("link", { name: "Log in" }).count(), 1);
  await page.getByRole("button", { name: "Light" }).click();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "light");
  await page.locator(".main").click({ position: { x: 2, y: 2 } });
  assert.equal(await page.locator("details.edge-user-menu[open]").count(), 0);
  await page.keyboard.press(process.platform === "darwin" ? "Meta+k" : "Control+k");
  assert.deepEqual(errors, []);
  await assert.doesNotReject(page.getByRole("dialog", { name: "Search or jump to…" }).waitFor());
  await page.getByRole("searchbox", { name: "Search or jump to…" }).fill("settings");
  await assert.doesNotReject(page.getByRole("link", { name: "Settings" }).last().waitFor());
  await page.keyboard.press("Escape");
  await page.getByRole("dialog", { name: "Search or jump to…" }).waitFor({ state: "hidden" });
  await page.getByLabel("Account menu").click();
  await page.getByLabel("Language").selectOption("es");
  await assert.doesNotReject(page.getByRole("heading", { name: "Proyectos web, bajo tu control." }).waitFor());
  assert.equal(await page.locator("html").getAttribute("lang"), "es");
  await page.getByRole("link", { name: "Acerca de" }).click();
  await assert.doesNotReject(page.getByRole("heading", { name: "Acerca de Resources.co" }).waitFor());
  await page.getByLabel("Menú de cuenta").click();
  await page.getByLabel("Idioma").selectOption("en");
  await assert.doesNotReject(page.getByRole("heading", { name: "About Resources.co" }).waitFor());
  assert.equal(await page.locator("html").getAttribute("lang"), "en");

  await page.goto(`http://resources-edge.localhost:${port}/login`, { waitUntil: "networkidle" });
  await assert.doesNotReject(page.getByRole("link", { name: "Continue with GitHub" }).waitFor());
  await assert.doesNotReject(page.getByRole("link", { name: "Continue with GitLab" }).waitFor());
  await assert.doesNotReject(page.getByRole("heading", { name: "Log in to Resources.co" }).waitFor());
  await assert.doesNotReject(page.locator(".nav").waitFor());
  await assert.doesNotReject(page.locator(".footer").waitFor());
  await checkBrowserScripts();
  assert.equal(await page.locator("script[type='application/json']").count(), 1);
  const authCardWidth = await page.locator(".auth-card").evaluate((node) => node.getBoundingClientRect().width);
  assert.ok(authCardWidth >= 400 && authCardWidth <= 440);

  const db = new DatabaseSync(join(dataDir, "macchiato.sqlite3"));
  const account = await createAccountStore(createNodeSqliteClient(db)).authenticateIdentity({
    provider: "gitlab", providerUserId: "84", login: "latte-dev", name: "Latte Dev",
    email: "latte@example.test", emailVerified: true,
  });
  db.close();
  const session = await seal({
    v: 1,
    sub: account.id,
    login: "latte-dev",
    name: "Latte Dev",
    iat: Date.now(),
    exp: Date.now() + 60_000,
  }, "local-preview-session-signing-key");
  await page.context().addCookies([{
    name: "resources_session",
    value: session,
    domain: "resources-edge.localhost",
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
  }]);
  await page.goto(`http://resources-edge.localhost:${port}/`, { waitUntil: "networkidle" });
  assert.equal(await page.getByLabel("Account menu").locator(".ub-avatar").textContent(), "LA");
  const commandTrigger = await page.locator(".command-trigger").evaluate((node) => {
    const label = node.querySelector("span");
    return { buttonHeight: node.getBoundingClientRect().height, labelHeight: label.getBoundingClientRect().height };
  });
  assert.ok(commandTrigger.buttonHeight <= 42);
  assert.ok(commandTrigger.labelHeight <= 18);
  await page.getByLabel("Account menu").click();
  await assert.doesNotReject(page.getByText("@latte-dev", { exact: true }).waitFor());
  await assert.doesNotReject(page.getByRole("button", { name: "Sign out" }).waitFor());
  await page.getByRole("link", { name: "Your profile" }).click();
  await assert.doesNotReject(page.getByRole("heading", { name: "Your Resources.co profile" }).waitFor());
  assert.equal(await page.getByRole("link", { name: "Log in" }).count(), 0);

  await page.goto(`http://resources-co.localhost:${port}/`, { waitUntil: "networkidle" });
  const localTheme = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return [style.getPropertyValue("--accent").trim(), style.getPropertyValue("--active-bg").trim()];
  });
  assert.deepEqual(edgeTheme, localTheme);
  assert.deepEqual(errors, []);
});

test("Resources project workspace adapts to mobile without changing desktop", async (t) => {
  const port = await getPort();
  const dataDir = await tempDir();
  const app = startApp(port, dataDir);
  t.after(async () => {
    await stopChild(app.child);
    await rm(dataDir, { recursive: true, force: true });
  });
  await app.waitForReady;
  const browser = await chromium.launch();
  t.after(async () => browser.close());
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto(`http://resources-edge.localhost:${port}/try`, { waitUntil: "networkidle" });
  await codeSurface(page).locator(".cm-content").waitFor({ state: "attached" });
  assert.equal(await page.locator(".project-editor__workspace").getAttribute("data-view"), "preview");
  assert.equal(await page.getByRole("button", { name: "Output View" }).isVisible(), true);
  assert.equal(await page.locator(".project-editor__tabs").isVisible(), false);
  assert.equal(await page.locator("[data-project-file-picker]").isVisible(), false);
  assert.equal(await page.locator(".project-create__fields").isHidden(), true);
  assert.equal(await page.locator(".command-trigger [data-command-shortcut]").isHidden(), true);
  assert.equal(await page.locator(".command-trigger__icon").isVisible(), true);
  const mobileViewControls = page.locator(".project-editor__view-controls");
  const controlsBox = await mobileViewControls.boundingBox();
  assert.ok(controlsBox);
  await page.getByRole("button", { name: "Details" }).click();
  await page.getByLabel("Template").selectOption("clock");
  await page.waitForFunction(() => !document.querySelector("[data-project-editor]")?.dataset.editorLoading);
  await page.getByRole("button", { name: "Output View" }).click();
  await page.getByRole("button", { name: "Editor" }).click();
  const fileTrigger = page.locator("[data-project-file-trigger]");
  await fileTrigger.click();
  await page.getByRole("menuitemradio", { name: "script.js" }).click();
  assert.equal(await page.locator("[data-project-file-current]").textContent(), "script.js");
  await fileTrigger.click();
  await page.locator(".project-editor__preview-toolbar").click();
  assert.equal(await page.locator("[data-project-file-menu]").isHidden(), true);
  await page.getByRole("button", { name: "Output View" }).click();
  assert.equal(await page.locator(".project-editor__workspace").getAttribute("data-view"), "preview");
  assert.equal(await page.locator(".project-editor__source").isHidden(), true);
  await page.waitForFunction(() =>
    document.querySelector("[data-project-editor]")?.dataset.outputMachineState === "ready" &&
    document.querySelector("[data-project-output-mount] iframe:not([inert])")?.contentDocument?.body);
  await page.getByRole("button", { name: "Details" }).click();
  assert.equal(await page.locator(".project-create__layout").getAttribute("data-mobile-view"), "details");
  assert.equal(await page.locator(".project-editor__workspace").isHidden(), true);
  assert.equal(await page.locator(".project-create__fields").isVisible(), true);
  assert.equal(await page.getByLabel("Template").isVisible(), true);
  await page.getByRole("button", { name: "Editor" }).click();
  assert.equal(await page.locator(".project-create__layout").getAttribute("data-mobile-view"), null);
  assert.equal(await page.locator(".project-editor__workspace").getAttribute("data-view"), "editor");
  assert.deepEqual(await page.evaluate(() => ({
    viewport: document.documentElement.clientHeight,
    document: document.documentElement.scrollHeight,
  })), { viewport: 844, document: 844 });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.waitForFunction(() => document.querySelector(".project-editor__workspace")?.dataset.view === "split");
  assert.equal(await page.locator(".project-editor__workspace").getAttribute("data-view"), "split");
  assert.equal(await page.getByRole("button", { name: "Split view" }).isVisible(), true);
  assert.equal(await page.locator(".project-editor__tabs").isVisible(), true);
  assert.equal(await page.locator("[data-project-file-picker]").isVisible(), true);
  assert.equal(await page.locator(".project-create__fields").isVisible(), true);
  assert.equal(await page.locator(".command-trigger [data-command-shortcut]").isVisible(), true);
  assert.equal(await page.locator(".command-trigger__icon").isHidden(), true);
  assert.deepEqual(errors, []);
});

test("Resources project ZIP import accepts legacy container metadata", async (t) => {
  const port = await getPort();
  const dataDir = await tempDir();
  const app = startApp(port, dataDir);
  t.after(async () => {
    await stopChild(app.child);
    await rm(dataDir, { recursive: true, force: true });
  });
  await app.waitForReady;
  const browser = await chromium.launch();
  t.after(async () => browser.close());
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto(`http://resources-edge.localhost:${port}/try`, { waitUntil: "networkidle" });
  await codeSurface(page).locator(".cm-content").waitFor({ state: "attached" });
  const archive = encodeProjectArchive({
    files: [{ path: "index.html", content: "<!doctype html><title>Imported Mahjong</title><main>Mahjong</main>" }],
    config: {
      entry: "index.html", template: "html", container: "single-file-web-app",
      containerOptions: { allowedLinkPatterns: ["*.wikipedia.org"] },
    },
  });
  await page.locator("[data-project-archive-file]").setInputFiles({
    name: "mahjong.zip", mimeType: "application/zip", buffer: Buffer.from(archive),
  });
  await page.waitForFunction(() => document.querySelector("[data-project-save]")?.textContent === "ZIP imported");
  assert.match(await page.locator("[data-project-snapshot]").inputValue(), /Imported Mahjong/);
  assert.equal(await page.getByLabel("Template").inputValue(), "html");
  assert.equal(await page.getByLabel("Allowed Link URL Patterns").inputValue(), "*.wikipedia.org");

  await page.getByRole("button", { name: "Editor menu" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "Export ZIP" }).click();
  assert.equal((await downloadPromise).suggestedFilename(), "untitled-project.zip");
  assert.deepEqual(errors, []);
});

test("Mahjong ZIP drops round-trip a signed-in project's files and recover from invalid imports", { timeout: 90_000 }, async t => {
  const port = await getPort(), dataDir = await tempDir();
  const app = startApp(port, dataDir);
  t.after(async () => { await stopChild(app.child); await rm(dataDir, { recursive: true, force: true }); });
  await app.waitForReady;
  const files = [];
  const example = join(repoRoot, "examples/mahjong");
  for (const path of (await readdir(example, { recursive: true, withFileTypes: true }))) {
    if (!path.isFile()) continue;
    const fullPath = join(path.parentPath, path.name);
    const bytes = await readFile(fullPath);
    files.push({ path: fullPath.slice(example.length + 1), content: path.name.endsWith(".png")
      ? `data:image/png;base64,${bytes.toString("base64")}` : bytes.toString("utf8") });
  }
  const font = await readFile(join(repoRoot, "dev/wasm-web-runtimes/examples/microquickjs-suite/mahjong/assets/fonts/libre-baskerville-latin-wght-normal.woff2"));
  files.push({ path: "fonts/tiles.woff2", content: `data:font/woff2;base64,${font.toString("base64")}` });
  const snapshot = { files, config: { entry: "index.html", template: "html", container: "single-file-web-app" } };
  files.sort((a, b) => a.path.localeCompare(b.path));
  const db = new DatabaseSync(join(dataDir, "macchiato.sqlite3"));
  const client = createNodeSqliteClient(db);
  const account = await createAccountStore(client).authenticateIdentity({ provider: "github",
    providerUserId: "zip-player", login: "zip-player", name: "ZIP Player",
    email: "zip-player@example.test", emailVerified: true });
  await createContentStore(client).createProject(account.id, { userSlug: account.login,
    name: "classic-chinese-mahjong", slug: "classic-chinese-mahjong", snapshot });
  db.close();
  const session = await seal({ v: 1, sub: account.id, login: account.login, name: account.name,
    iat: Date.now(), exp: Date.now() + 300_000 }, "local-preview-session-signing-key");
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.context().addCookies([{ name: "resources_session", value: session,
    domain: "resources-edge.localhost", path: "/", httpOnly: true, sameSite: "Lax" }]);
  async function exportZip() {
    await page.getByRole("button", { name: "Editor menu" }).click();
    const downloading = page.waitForEvent("download");
    await page.getByRole("menuitem", { name: "Export ZIP" }).click();
    const download = await downloading;
    return { name: download.suggestedFilename(), bytes: await readFile(await download.path()) };
  }
  async function openImport() {
    await page.getByRole("button", { name: "Editor menu" }).click();
    await page.getByRole("menuitem", { name: "Import ZIP" }).click();
    await page.locator("[data-project-import-modal]").waitFor({ state: "visible" });
  }
  async function drop(bytes, count = 1) {
    const transfer = await page.evaluateHandle(({ bytes, count }) => {
      const data = new DataTransfer();
      for (let i = 0; i < count; i++) data.items.add(new File([new Uint8Array(bytes)], `mahjong-${i}.zip`, { type: "application/zip" }));
      return data;
    }, { bytes: [...bytes], count });
    await page.locator("[data-project-import-choose]").dispatchEvent("dragover", { dataTransfer: transfer });
    await page.locator("[data-project-import-choose]").dispatchEvent("drop", { dataTransfer: transfer });
    await transfer.dispose();
  }
  await page.goto(`http://resources-edge.localhost:${port}/zip-player/classic-chinese-mahjong`, { waitUntil: "networkidle" });
  await codeSurface(page).locator(".cm-content").waitFor();
  const exported = await exportZip();
  assert.equal(exported.name, "classic-chinese-mahjong.zip");
  const expected = await decodeProjectArchive(exported.bytes);
  assert.deepEqual(expected.files, snapshot.files);
  await page.goto(`http://resources-edge.localhost:${port}/projects/new`, { waitUntil: "networkidle" });
  await codeSurface(page).locator(".cm-content").waitFor();
  await openImport();
  const previous = await page.locator("[data-project-snapshot]").inputValue();
  await drop(new Uint8Array([1, 2, 3]));
  await page.waitForFunction(() => document.querySelector("[data-project-import-error]").textContent.includes("ZIP"));
  assert.equal(await page.locator("[data-project-snapshot]").inputValue(), previous);
  await drop(exported.bytes, 2);
  await page.waitForFunction(() => document.querySelector("[data-project-import-error]").textContent.includes("one project ZIP"));
  assert.equal(await page.locator("[data-project-snapshot]").inputValue(), previous);
  await page.screenshot({ path: resolve(repoRoot, "../macchiato-work/mahjong-import-dialog.png") });
  await drop(exported.bytes);
  await page.locator("[data-project-import-modal]").waitFor({ state: "hidden" });
  assert.equal(await page.locator("[data-project-error]").isHidden(), true);
  await page.waitForFunction(() => {
    const frames = [...document.querySelectorAll("[data-project-output-mount] iframe:not([inert])")];
    return frames.some(frame => frame.contentDocument?.querySelectorAll(".tile").length === 144);
  });
  await page.screenshot({ path: resolve(repoRoot, "../macchiato-work/mahjong-imported.png") });
  const roundTrip = await exportZip();
  assert.equal(roundTrip.name, "untitled-project.zip");
  assert.deepEqual(await decodeProjectArchive(roundTrip.bytes), expected);
  await openImport();
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("[data-project-import-modal]").isHidden(), true);
  await openImport();
  await page.locator("[data-project-import-modal]").click({ position: { x: 5, y: 5 } });
  assert.equal(await page.locator("[data-project-import-modal]").isHidden(), true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.getByRole("button", { name: "Editor", exact: true }).click();
  await openImport();
  await page.screenshot({ path: resolve(repoRoot, "../macchiato-work/mahjong-import-mobile.png") });
  const choosing = page.waitForEvent("filechooser");
  await page.locator("[data-project-import-choose]").click();
  await (await choosing).setFiles({ name: "mahjong.zip", mimeType: "application/zip", buffer: exported.bytes });
  await page.locator("[data-project-import-modal]").waitFor({ state: "hidden" });
  assert.deepEqual(errors, []);
});

test("every Resources starting point exports and imports without losing files or configuration", async (t) => {
  const port = await getPort();
  const dataDir = await tempDir();
  const app = startApp(port, dataDir);
  t.after(async () => {
    await stopChild(app.child);
    await rm(dataDir, { recursive: true, force: true });
  });
  await app.waitForReady;
  const browser = await chromium.launch();
  t.after(async () => browser.close());
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto(`http://resources-edge.localhost:${port}/try`, { waitUntil: "networkidle" });
  await codeSurface(page).locator(".cm-content").waitFor({ state: "attached" });
  const templateOptions = await page.getByLabel("Template").locator("option").evaluateAll((options) =>
    options.map((option) => option.value).filter(Boolean));
  async function exportSnapshot() {
    await page.getByRole("button", { name: "Editor menu" }).click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("menuitem", { name: "Export ZIP" }).click();
    const bytes = await readFile(await (await downloadPromise).path());
    return { bytes, snapshot: await decodeProjectArchive(bytes) };
  }

  for (const template of templateOptions) {
    await page.getByLabel("Template").selectOption(template);
    await page.waitForFunction((value) => {
      const snapshot = document.querySelector("[data-project-snapshot]")?.value;
      return snapshot && JSON.parse(snapshot).config.template === value;
    }, template);
    const expected = JSON.parse(await page.locator("[data-project-snapshot]").inputValue());
    const { bytes, snapshot: exported } = await exportSnapshot();
    assert.deepEqual(exported, expected, `${template} must survive archive encoding`);

    await page.getByLabel("Template").selectOption("blank");
    await page.locator("[data-project-archive-file]").setInputFiles({
      name: `${template}.zip`, mimeType: "application/zip", buffer: bytes,
    });
    await page.waitForFunction(() => document.querySelector("[data-project-save]")?.textContent === "ZIP imported");
    const imported = JSON.parse(await page.locator("[data-project-snapshot]").inputValue());
    assert.deepEqual(imported.config, expected.config, `${template} preserves configuration`);
    assert.deepEqual(imported.files.map(file => file.path), expected.files.map(file => file.path));
    // The editor deliberately receives opaque handles for imported assets.
    // Export again to verify the original bytes, not the handle representation.
    assert.deepEqual((await exportSnapshot()).snapshot, expected, `${template} must survive browser import`);
  }
  assert.deepEqual(errors, []);
});

test("project close uses its saved return path and otherwise returns home", async (t) => {
  const port = await getPort();
  const dataDir = await tempDir();
  const app = startApp(port, dataDir);
  t.after(async () => { await stopChild(app.child); await rm(dataDir, { recursive: true, force: true }); });
  await app.waitForReady;
  const browser = await chromium.launch();
  t.after(async () => browser.close());
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`http://resources-edge.localhost:${port}/try`);
  await page.waitForFunction(() => document.querySelector("[data-project-editor]")?.dataset.editorMachineStage === "ready");
  assert.equal(await page.locator(".project-close").getAttribute("href"), "/");
  await page.evaluate(() => sessionStorage.setItem("resources-project-close-stack", JSON.stringify(["/collections"])));
  await page.reload();
  await page.waitForFunction(() => document.querySelector("[data-project-editor]")?.dataset.editorMachineStage === "ready");
  assert.equal(await page.locator(".project-close").getAttribute("href"), "/collections");
  await page.locator(".project-close").click();
  await page.waitForURL(`http://resources-edge.localhost:${port}/collections`);
  assert.deepEqual(await page.evaluate(() => JSON.parse(sessionStorage.getItem("resources-project-close-stack"))), []);
  assert.deepEqual(errors, []);
});

test("a project build script runs with separate runtime and application inputs", async (t) => {
  const port = await getPort();
  const dataDir = await tempDir();
  const app = startApp(port, dataDir);
  t.after(async () => { await stopChild(app.child); await rm(dataDir, { recursive: true, force: true }); });
  await app.waitForReady;
  const browser = await chromium.launch();
  t.after(async () => browser.close());
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`http://resources-edge.localhost:${port}/try`, { waitUntil: "networkidle" });
  const archive = encodeProjectArchive({
    files: [
      { path: "component.txt", content: "Built in an isolated JavaScript context" },
      { path: "build-runtime.js", content: "module.exports = { escape: function (value) { return value.replace(/&/g, '&amp;').replace(/</g, '&lt;'); } };" },
      { path: "build.js", content: "module.exports = function (input) { var text = input.runtime.escape(input.application); return { files: [{ path: 'index.html', content: '<!doctype html><title>Built project</title><main><h1>' + text + '</h1></main>' }], config: { entry: 'index.html', template: 'blank' } }; };" },
    ],
    config: { entry: "component.txt", template: "blank", build: {
      runtime: "build-runtime.js", script: "build.js", application: "component.txt",
    } },
  });
  await page.locator("[data-project-archive-file]").setInputFiles({
    name: "built.zip", mimeType: "application/zip", buffer: Buffer.from(archive),
  });
  const output = page.frameLocator("[data-project-output-mount] iframe:not([inert])")
    .locator("body");
  await output.getByRole("heading", { name: "Built in an isolated JavaScript context" }).waitFor();
  assert.equal(await output.locator("h1").textContent(),
    "Built in an isolated JavaScript context");
  assert.deepEqual(errors, []);
});

test("Vue and Svelte starting points build and remain interactive in the output machine", async (t) => {
  const port = await getPort();
  const dataDir = await tempDir();
  const app = startApp(port, dataDir);
  t.after(async () => { await stopChild(app.child); await rm(dataDir, { recursive: true, force: true }); });
  await app.waitForReady;
  const browser = await chromium.launch();
  t.after(async () => browser.close());
  const page = await browser.newPage();
  const errors = [];
  const builderRequests = [];
  page.on("request", request => {
    if (/project-(?:framework-)?builder-quickjs-runtime\.wasm/.test(request.url())) {
      builderRequests.push(new URL(request.url()).pathname);
    }
  });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  await page.goto(`http://resources-edge.localhost:${port}/try`, { waitUntil: "networkidle" });
  await codeSurface(page).locator(".cm-content").waitFor();
  assert.deepEqual(builderRequests, ["/-/resources-site/project-builder-quickjs-runtime.wasm"],
    "ordinary HTML must not load framework tooling");

  for (const framework of ["vue", "svelte"]) {
    await page.getByLabel("Template").selectOption(framework);
    await codeSurface(page).locator(".cm-content span").first().waitFor({ timeout: 10_000 });
    const output = page.frameLocator("[data-project-output-mount] iframe:not([inert])")
      .locator("body");
    const button = output.getByRole("button", { name: "Count 0", exact: true });
    await button.waitFor({ timeout: 10_000 }).catch(async () => assert.fail(
      `${framework} did not render: ${await page.locator("body").innerText()}\n${errors.join("\n")}`));
    await button.click();
    await output.getByRole("button", { name: "Count 1", exact: true })
      .waitFor({ timeout: 10_000 }).catch(async () => assert.fail(
        `${framework} did not react: ${await page.locator("body").innerText()}\n${errors.join("\n")}`));
  }
  assert.equal(builderRequests.filter(path => path.includes("framework-builder")).length, 1,
    "explicit builds lazily share the framework artifact");
  assert.deepEqual(errors, []);
});

test("Markdown fenced code loads its matching CodeMirror language", async (t) => {
  const port = await getPort();
  const dataDir = await tempDir();
  const app = startApp(port, dataDir);
  t.after(async () => { await stopChild(app.child); await rm(dataDir, { recursive: true, force: true }); });
  await app.waitForReady;
  const browser = await chromium.launch();
  t.after(async () => browser.close());
  const page = await browser.newPage();
  await page.goto(`http://resources-edge.localhost:${port}/try`, { waitUntil: "networkidle" });
  const archive = encodeProjectArchive({
    files: [{ path: "README.md", content: "# Mixed languages\n\n```javascript\nconst answer = 42;\n```\n\n```vue\n<template><strong>{{ answer }}</strong></template>\n```\n" }],
    config: { entry: "README.md", template: "blank" },
  });
  await page.locator("[data-project-archive-file]").setInputFiles({
    name: "markdown-languages.zip", mimeType: "application/zip", buffer: Buffer.from(archive),
  });
  await (await codeDocument(page)).waitForFunction(() => [...document.querySelectorAll(".cm-content span")]
    .some((node) => node.textContent === "const"), null, { timeout: 10_000 }).catch(async () => assert.fail(
      `fenced JavaScript did not load:\n${await codeSurface(page).locator(".cm-content").innerHTML()}`));
  assert.ok(await codeSurface(page).locator(".cm-content span", { hasText: "answer" }).count() > 0);
});

test("Resources editor does not enforce the example line or line-length conventions", async (t) => {
  const port = await getPort();
  const dataDir = await tempDir();
  const app = startApp(port, dataDir);
  t.after(async () => { await stopChild(app.child); await rm(dataDir, { recursive: true, force: true }); });
  await app.waitForReady;
  const browser = await chromium.launch();
  t.after(async () => browser.close());
  const page = await browser.newPage();
  await page.goto(`http://resources-edge.localhost:${port}/try`, { waitUntil: "networkidle" });
  const source = [`const wide = "${"x".repeat(1_024)}";`,
    ...Array.from({ length: 600 }, (_, index) => `const line${index + 1} = ${index + 1};`)].join("\n");
  const archive = encodeProjectArchive({
    files: [{ path: "large.js", content: source }],
    config: { entry: "large.js", template: "blank" },
  });
  await page.locator("[data-project-archive-file]").setInputFiles({
    name: "large.zip", mimeType: "application/zip", buffer: Buffer.from(archive),
  });
  const editor = codeSurface(page).locator(".cm-content");
  await editor.waitFor();
  assert.equal(await page.locator(".project-editor__asset-view").count(), 0);
  await editor.click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type("\nconst accepted = true;");
  await page.waitForFunction(() => JSON.parse(document.querySelector("[data-project-snapshot]").value)
    .files[0].content.endsWith("const accepted = true;"));
});

test("Canvas, WebGL, WebGPU, and Three.js starting points draw through the project machine", async (t) => {
  const port = await getPort();
  const dataDir = await tempDir();
  const app = startApp(port, dataDir);
  t.after(async () => { await stopChild(app.child); await rm(dataDir, { recursive: true, force: true }); });
  await app.waitForReady;
  const browser = await chromium.launch({ args: ["--enable-unsafe-webgpu", "--use-angle=swiftshader"] });
  t.after(async () => browser.close());
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto(`http://resources-edge.localhost:${port}/try`, { waitUntil: "networkidle" });

  await page.getByLabel("Template").selectOption("paint");
  const output = page.frameLocator("[data-project-output-mount] iframe:not([inert])")
    .locator("body");
  let canvas = output.locator('canvas[aria-label="Click to paint colorful squares"]');
  await canvas.waitFor();
  await canvas.click({ position: { x: 100, y: 100 } });
  const painted = await canvas.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const x = Math.round(100 * element.width / box.width);
    const y = Math.round(100 * element.height / box.height);
    return [...element.getContext("2d").getImageData(x, y, 1, 1).data];
  });
  assert.ok(painted[1] > painted[0], `painted pixel should be teal: ${painted}`);

  await page.getByLabel("Template").selectOption("webgl");
  canvas = output.locator('canvas[aria-label="A triangle drawn with WebGL"]');
  await canvas.waitFor();
  const pixel = await canvas.evaluate((element) => {
    const gl = element.getContext("webgl");
    const value = new Uint8Array(4);
    gl.readPixels(element.width / 2, element.height / 2, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, value);
    return [...value];
  });
  assert.ok(pixel[1] > pixel[0] && pixel[3] === 255,
    `WebGL center pixel should be teal: ${pixel}\n${errors.join("\n")}\n${await page.locator("body").innerText()}`);

  await page.getByLabel("Template").selectOption("three");
  canvas = output.locator('canvas[aria-label="A triangle built with Three.js"]');
  await canvas.waitFor();
  const threePixel = await canvas.evaluate((element) => {
    const gl = element.getContext("webgl");
    const value = new Uint8Array(4);
    gl.readPixels(element.width / 2, element.height / 2, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, value);
    return [...value];
  });
  assert.ok(threePixel[0] > threePixel[1] && threePixel[3] === 255,
    `Three.js center pixel should be coral: ${threePixel}\n${errors.join("\n")}`);

  await page.getByLabel("Template").selectOption("webgpu");
  canvas = output.locator('canvas[aria-label="A triangle drawn with WebGPU"]');
  await canvas.waitFor();
  await canvas.and(output.locator('[data-webgpu-status="ready"]')).waitFor({ timeout: 15_000 }).catch(async () => assert.fail(
      `WebGPU did not render: ${await canvas.getAttribute("data-webgpu-status")}\n${errors.join("\n")}`));
});

test("a project opens its persisted successful output without loading a compiler", { timeout: 180_000 }, async t => {
  const port = await getPort(), dataDir = await tempDir(), app = startApp(port, dataDir);
  t.after(async () => { await stopChild(app.child); await rm(dataDir, { recursive: true, force: true }); });
  await app.waitForReady;
  const db = new DatabaseSync(join(dataDir, "macchiato.sqlite3"));
  t.after(() => db.close());
  const client = createNodeSqliteClient(db);
  const account = await createAccountStore(client).authenticateIdentity({ provider: "github",
    providerUserId: "output-test", login: "output-test", name: "Output Test",
    email: "output-test@example.test", emailVerified: true });
  const store = createContentStore(client);
  const project = await store.createProject(account.id, { userSlug: account.login,
    name: "Saved output", slug: "saved-output", template: "article",
    snapshot: { files: [{ path: "index.html", content:
      '<style>body {background:#e8f2ff;color:#17243a;padding:24px}</style>' +
      '<h1>Saved output</h1><button id="counter">Count 0</button>' +
      '<script>var n=0;document.getElementById("counter").onclick=function(){this.textContent="Count "+(++n)};</script>' }], config: {} } });
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const session = await seal({ v: 1, sub: account.id, login: account.login, name: account.name,
    iat: Date.now(), exp: Date.now() + 300_000 }, "local-preview-session-signing-key");
  async function open(blockCompiler) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.context().addCookies([{ name: "resources_session", value: session,
      domain: "resources-edge.localhost", path: "/", httpOnly: true, sameSite: "Lax" }]);
    const errors = [], compilers = [];
    page.on("pageerror", error => errors.push(error.message));
    if (blockCompiler) await page.route(/project-(?:framework-)?builder-quickjs-runtime\.wasm/, route => {
      compilers.push(route.request().url()); return route.abort();
    });
    const saved = blockCompiler ? null : page.waitForResponse(response =>
      response.url().endsWith(`/api/projects/${project.id}/output`) && response.request().method() === "POST");
    await page.goto(`http://resources-edge.localhost:${port}/output-test/saved-output`);
    const output = page.frameLocator("[data-project-output-mount] iframe:not([inert])");
    await output.getByRole("heading", { name: "Saved output" }).waitFor({ timeout: 30_000 });
    await output.getByRole("button", { name: "Count 0" }).click();
    await output.getByRole("button", { name: "Count 1" }).waitFor();
    await codeSurface(page).locator(".cm-content").waitFor();
    if (saved) {
      const response = await saved.catch(async error => {
        assert.fail(`${error.message}\n${errors.join("\n")}\n${await page.locator("body").innerText()}`);
      });
      assert.deepEqual(await response.json(), { saved: true });
      const updated = page.waitForResponse(async response =>
        response.url().endsWith(`/api/projects/${project.id}/output`) &&
        response.request().method() === "POST" && response.request().postData().includes("Updated build") &&
        response.status() === 200 && (await response.json()).saved).catch(error => ({ error }));
      await codeSurface(page).locator(".cm-content").press("ControlOrMeta+End");
      await page.keyboard.insertText("<p>Updated build</p>");
      await output.getByText("Updated build", { exact: true }).waitFor().catch(async error => {
        assert.fail(`${error.message}\n${errors.join("\n")}\n${await page.locator("body").innerText()}`);
      });
      const updateReply = await updated;
      assert.ok(!updateReply.error, `Updated output was not persisted: ${await page.locator("body").innerText()}`);
      assert.equal(db.prepare("SELECT count(*) AS n FROM resource_project_build_output WHERE project_id = ?").get(project.id).n, 1);
    }
    await output.getByText("Updated build", { exact: true }).waitFor();
    assert.deepEqual(compilers, [], "saved output starts without either compiler artifact");
    assert.deepEqual(errors, []);
    if (process.env.MACCHIATO_TEST_ARTIFACTS) {
      await mkdir(process.env.MACCHIATO_TEST_ARTIFACTS, { recursive: true });
      await page.screenshot({ path: join(process.env.MACCHIATO_TEST_ARTIFACTS,
        blockCompiler ? "saved-output-reopen.png" : "saved-output-first-build.png") });
    }
    await page.context().close();
  }
  await open(false);
  const initial = db.prepare("SELECT * FROM resource_project_state WHERE project_id = ?").get(project.id);
  await open(true);
  assert.deepEqual(db.prepare("SELECT * FROM resource_project_state WHERE project_id = ?").get(project.id), initial);
  // A later unsuccessful source need not destroy the one working output.
  await store.saveProjectSnapshot(account.id, project.id, {
    files: [{ path: "index.html", content: '<script>var incomplete = </script>' }], config: {} });
  await open(true);
  assert.equal(db.prepare("SELECT count(*) AS n FROM resource_project_build_output WHERE project_id = ?").get(project.id).n, 1);
});

test("saved project output keeps its backing while the editor is still loading", { timeout: 180_000 }, async t => {
  const artifacts = process.env.MACCHIATO_TEST_ARTIFACTS;
  if (artifacts) await mkdir(artifacts, { recursive: true });
  const port = await getPort(), dataDir = await tempDir(), app = startApp(port, dataDir);
  t.after(async () => { await stopChild(app.child); await rm(dataDir, { recursive: true, force: true }); });
  await app.waitForReady;
  const db = new DatabaseSync(join(dataDir, "macchiato.sqlite3"));
  const client = createNodeSqliteClient(db);
  const account = await createAccountStore(client).authenticateIdentity({ provider: "github",
    providerUserId: "paint-test", login: "paint-test", name: "Paint Test",
    email: "paint-test@example.test", emailVerified: true });
  await createContentStore(client).createProject(account.id, { userSlug: account.login, name: "Paint fixture", slug: "paint-fixture",
    template: "article", snapshot: { files: [{ path: "index.html", content:
      '<style>body { margin:32px; background:#e8f2ff; color:#17243a; } h1 { margin:0; }</style>' +
      '<h1>Paint fixture</h1><p id="scheme"></p><script>' +
      'var query = matchMedia("(prefers-color-scheme: dark)");' +
      'function showScheme() { document.getElementById("scheme").textContent = query.matches ? "dark" : "light"; }' +
      'query.addEventListener("change", showScheme); showScheme();</script>' }], config: {} } });
  db.close();
  const session = await seal({ v: 1, sub: account.id, login: account.login, name: account.name,
    iat: Date.now(), exp: Date.now() + 300_000 }, "local-preview-session-signing-key");
  const browser = await chromium.launch();
  t.after(() => browser.close());
  async function backing(page) {
    const output = page.frameLocator(".project-editor__output-frame");
    const frame = page.locator(".project-editor__output-frame"), box = await frame.boundingBox();
    // The guest's margin exposes the iframe canvas. Computed transparent CSS
    // alone cannot tell whether the browser paints an opaque canvas behind it.
    const png = await page.screenshot({ clip: { x: Math.floor(box.x + 8), y: Math.floor(box.y + 8), width: 1, height: 1 } });
    const pixel = await page.evaluate(async bytes => {
      const image = await createImageBitmap(new Blob([new Uint8Array(bytes)], { type: "image/png" }));
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0); image.close();
      return [...context.getImageData(0, 0, 1, 1).data];
    }, [...png]);
    return { pixel, outer: await frame.evaluate(node => getComputedStyle(node).colorScheme),
      inner: await output.locator(":root").evaluate(node => getComputedStyle(node).colorScheme) };
  }
  // A real Document propagates its body's background to the canvas, including
  // the margin. The fixture deliberately owns that color in either site theme.
  const fixtureCanvas = [232, 242, 255, 255];
  // DevTools media emulation overrides every frame independently. Test native
  // inheritance with emulation disabled, then test emulated system preferences
  // separately (without pretending an explicit choice overrides DevTools).
  for (const [emulated, choice] of [[null, "system"], [null, "dark"], [null, "light"], ["dark", "system"], ["light", "system"]]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: emulated });
    const system = await page.evaluate(() => matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const expected = choice === "system" ? system : choice;
    const label = `${emulated || "native"}-${choice}`;
    await page.context().addCookies([{ name: "resources_session", value: session,
      domain: "resources-edge.localhost", path: "/", httpOnly: true, sameSite: "Lax" }]);
    await page.addInitScript(({ choice, expected }) => {
      if (window !== window.top) return;
      localStorage.setItem("macchiato-theme", choice);
      const palette = expected === "light" ? "rgb(244, 243, 241)" : "rgb(36, 35, 33)";
      window.paintAudit = { frames: 0, violations: [], frontend: false, editor: false, output: false };
      function sample() {
        const audit = window.paintAudit;
        if (audit.stopped || audit.frames >= 2000) return;
        const root = document.documentElement;
        const workspace = document.querySelector('[data-project-editor]');
        const toolbar = document.querySelector('.project-editor__toolbar');
        if (toolbar) {
          audit.frames++;
          const wrong = [];
          if (root.dataset.theme !== expected) wrong.push(['theme', root.dataset.theme]);
          if (getComputedStyle(toolbar).backgroundColor !== palette)
            wrong.push(['toolbar', getComputedStyle(toolbar).backgroundColor]);
          for (const pane of document.querySelectorAll('.project-editor__pane-loading')) {
            if (pane.checkVisibility() && getComputedStyle(pane).backgroundColor !== palette)
              wrong.push(['loading pane', getComputedStyle(pane).backgroundColor]);
          }
          const frame = document.querySelector('.project-editor__output-frame');
          if (frame && getComputedStyle(frame).colorScheme !== expected)
            wrong.push(['iframe scheme', getComputedStyle(frame).colorScheme]);
          if (wrong.length && audit.violations.length < 10) audit.violations.push({ frame: audit.frames, wrong });
          audit.frontend ||= root.dataset.resourcesFrontendMachineState === 'ready';
          audit.editor ||= workspace?.dataset.editorMachineStage === 'ready';
          audit.output ||= workspace?.dataset.outputMachineState === 'ready';
        }
        requestAnimationFrame(sample);
      }
      requestAnimationFrame(sample);
    }, { choice, expected });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    let release = () => {}, delayed, releaseFrontend = () => {}, frontendDelayed;
    await page.route("**/resources-frontend-quickjs.wasm*", async route => {
      await frontendDelayed;
      if (!page.isClosed()) await route.continue();
    });
    await page.route("**/project-editor-quickjs-runtime.wasm*", async route => {
      await delayed;
      if (!page.isClosed()) await route.continue();
    });
    try {
      for (const reload of [false, true]) {
        delayed = new Promise(resolve => { release = resolve; });
        frontendDelayed = new Promise(resolve => { releaseFrontend = resolve; });
        if (reload) await page.reload();
        else await page.goto(`http://resources-edge.localhost:${port}/paint-test/paint-fixture`);
        await page.waitForFunction(() => window.paintAudit.frames >= 6);
        if (artifacts) await page.screenshot({ path: join(artifacts, `${label}-${reload ? "reload" : "first"}-before-frontend.png`) });
        releaseFrontend();
        const output = page.frameLocator(".project-editor__output-frame");
        await output.getByRole("heading", { name: "Paint fixture", exact: true }).waitFor();
        await output.locator("#scheme").filter({ hasText: expected }).waitFor();
        assert.equal(await page.evaluate(() => document.querySelector("iframe.project-editor__code-frame")
          ?.contentDocument?.querySelectorAll(".cm-editor").length || 0), 0, "output paints before CodeMirror loads");
        const before = await backing(page);
        if (artifacts) await page.screenshot({ path: join(artifacts, `${label}-${reload ? "reload" : "first"}-waiting.png`) });
        release();
        await page.waitForFunction(() => document.querySelector('[data-project-editor]').dataset.editorMachineStage === 'ready');
        await page.waitForFunction(() => window.paintAudit.frontend && window.paintAudit.editor && window.paintAudit.output);
        const audit = await page.evaluate(() => { window.paintAudit.stopped = true; return window.paintAudit; });
        assert.deepEqual(audit.violations, [], `${label}: every sampled frame through guest startup must use the chosen palette`);
        const after = await backing(page);
        if (artifacts) await page.screenshot({ path: join(artifacts, `${label}-${reload ? "reload" : "first"}-ready.png`) });
        t.diagnostic(JSON.stringify({ system, emulated, choice, reload, before, after, sampledFrames: audit.frames }));
        assert.deepEqual(before.pixel, fixtureCanvas, "initial canvas uses the guest document's background");
        assert.deepEqual(after.pixel, before.pixel, "editor startup must not change the output backing");
      }
      await page.evaluate(() => { window.paintFrame = document.querySelector(".project-editor__output-frame"); });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForFunction(() => document.querySelector('.project-editor__workspace').dataset.view === 'preview');
      assert.deepEqual((await backing(page)).pixel, fixtureCanvas, "phone output keeps the same backing");
      if (artifacts) await page.screenshot({ path: join(artifacts, `${label}-phone.png`) });
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.waitForFunction(() => document.querySelector('.project-editor__workspace').dataset.view === 'split');
      for (const selected of emulated ? [] : ["light", "dark", "system", "light", "system"]) {
        await page.locator(`[data-theme-choice="${selected}"]`).first().evaluate(button => button.click());
        const resolved = selected === "system" ? system : selected;
        await page.frameLocator(".project-editor__output-frame").locator("#scheme").filter({ hasText: resolved }).waitFor({ timeout: 5000 }).catch(async error => {
          t.diagnostic(JSON.stringify({ selected, resolved, errors, backing: await backing(page),
            outerTheme: await page.locator("html").getAttribute("data-theme"),
            nativeDark: await page.frameLocator(".project-editor__output-frame").locator(":root").evaluate(() => matchMedia("(prefers-color-scheme: dark)").matches),
            guest: await page.frameLocator(".project-editor__output-frame").locator("#scheme").textContent() }));
          throw error;
        });
        assert.deepEqual((await backing(page)).pixel, fixtureCanvas);
        assert.equal(await page.evaluate(() => window.paintFrame === document.querySelector(".project-editor__output-frame")), true);
      }
      if (emulated) {
        for (const next of ["light", "dark", "light"]) {
          await page.emulateMedia({ colorScheme: next });
          await page.frameLocator(".project-editor__output-frame").locator("#scheme").filter({ hasText: next }).waitFor();
          await page.waitForFunction(next => document.documentElement.dataset.theme === next, next);
          assert.deepEqual((await backing(page)).pixel, fixtureCanvas);
          assert.equal(await page.evaluate(() => window.paintFrame === document.querySelector(".project-editor__output-frame")), true);
        }
      }
      assert.deepEqual(errors, []);
    } finally { releaseFrontend(); release(); await page.close(); }
  }
});

test("Resources project CodeMirror follows repeated explicit and system theme changes", async (t) => {
  const port = await getPort();
  const dataDir = await tempDir();
  const app = startApp(port, dataDir);
  t.after(async () => {
    await stopChild(app.child);
    await rm(dataDir, { recursive: true, force: true });
  });
  await app.waitForReady;
  const browser = await chromium.launch();
  t.after(async () => browser.close());
  const page = await browser.newPage({ colorScheme: "dark" });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto(`http://resources-edge.localhost:${port}/try`, { waitUntil: "networkidle" });
  await codeSurface(page).locator(".cm-editor").waitFor({ state: "visible" });
  const choose = async (choice) => {
    await page.locator(`[data-theme-choice="${choice}"]`).first().evaluate((button) => button.click());
  };
  const colors = async () => ({
    ...await page.evaluate(() => ({ choice: document.documentElement.dataset.themeChoice,
      theme: document.documentElement.dataset.theme })),
    ...await codeSurface(page).locator(".cm-editor").evaluate(editor => ({
      editor: getComputedStyle(editor).backgroundColor,
      gutter: getComputedStyle(editor.querySelector(".cm-gutters")).backgroundColor,
    })),
  });
  // Match the shared --resources-editor-* palette, not CodeMirror One Dark's
  // default gutter. Resources uses a continuous neutral editing surface.
  const dark = { choice: "dark", theme: "dark", editor: "rgb(30, 29, 27)", gutter: "rgb(30, 29, 27)" };
  const light = { choice: "light", theme: "light", editor: "rgb(250, 250, 248)", gutter: "rgb(250, 250, 248)" };

  for (const expected of [light, dark, light, dark]) {
    await choose(expected.choice);
    assert.deepEqual(await colors(), expected);
  }
  await choose("system");
  assert.deepEqual(await colors(), { ...dark, choice: "system" });
  for (const expected of [light, dark, light]) {
    await page.emulateMedia({ colorScheme: expected.theme });
    await page.waitForFunction((theme) => document.documentElement.dataset.theme === theme, expected.theme);
    assert.deepEqual(await colors(), { ...expected, choice: "system" });
  }
  await choose("dark");
  await choose("system");
  await page.emulateMedia({ colorScheme: "dark" });
  await page.waitForFunction(() => document.documentElement.dataset.theme === "dark");
  assert.deepEqual(await colors(), { ...dark, choice: "system" });
  assert.deepEqual(errors, []);
});

test("project output fetches supplied files and rejects outside requests through its controller", async t => {
  const port = await getPort(), dataDir = await tempDir();
  const app = startApp(port, dataDir);
  t.after(async () => { await stopChild(app.child); await rm(dataDir, { recursive: true, force: true }); });
  await app.waitForReady;
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage();
  const errors = [], external = [], scripts = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => {
    if (new URL(request.url()).hostname === "assets.example") external.push(request.url());
    if (request.resourceType() === "script") scripts.push(new URL(request.url()).pathname);
  });
  await page.goto(`http://resources-edge.localhost:${port}/try`, { waitUntil: "networkidle" });
  const snapshot = { files: [
    { path: "index.html", content: `<p id="local">Waiting</p><p id="outside">Waiting</p><script>
      fetch("./message.txt").then(response => response.text()).then(text => {
        document.getElementById("local").textContent = text;
      });
      fetch("https://assets.example/probe.txt").then(() => {
        document.getElementById("outside").textContent = "Unexpected access";
      }).catch(error => { document.getElementById("outside").textContent = error.message; });
    </script>` },
    { path: "message.txt", content: "Fetched through the project machine" },
  ], config: { entry: "index.html", template: "html" } };
  await page.locator("[data-project-archive-file]").setInputFiles({ name: "fetch.zip",
    mimeType: "application/zip", buffer: Buffer.from(encodeProjectArchive(snapshot)) });
  const output = page.frameLocator("[data-project-output-mount] iframe:not([inert])");
  await output.getByText("Fetched through the project machine", { exact: true }).waitFor();
  await output.locator("#outside").getByText(/Fetch blocked for https:\/\/assets.example/).waitFor();
  assert.deepEqual(external, [], "the denied request must never reach the browser network");
  assert.equal(scripts.some(path => path.endsWith("project-editor-runtime.js")), false);
  assert.deepEqual(errors, []);
});

test("project guests catch storage failures without escaping their namespace", { timeout: 90000 }, async t => {
  const port = await getPort(), dataDir = await tempDir();
  const app = startApp(port, dataDir);
  t.after(async () => { await stopChild(app.child); await rm(dataDir, { recursive: true, force: true }); });
  await app.waitForReady;
  const browser = await chromium.launch();
  t.after(() => browser.close());
  for (const denied of [false, true]) {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(denied => {
      if (location.pathname.endsWith("/project-output-frame.html") && denied) {
        for (const name of ["localStorage", "sessionStorage"]) Object.defineProperty(window, name, {
          get() { throw new DOMException("Storage denied", "SecurityError"); },
        });
      } else if (window === top) localStorage.setItem("website-only", "not a project resource");
    }, denied);
    await page.goto(`http://resources-edge.localhost:${port}/try`, { waitUntil: "domcontentloaded" });
    await codeSurface(page).locator(".cm-content").waitFor();
    const source = `<h1 id="result">Waiting</h1><button id="again">Continue</button><script>
const results = [];
function attempt(action) {
  try { action(); results.push("unexpected success"); }
  catch (error) { results.push(error.name); }
}
if (${denied}) {
  attempt(() => localStorage.getItem("key"));
  attempt(() => sessionStorage.setItem("key", "value"));
  attempt(() => localStorage.removeItem("key"));
} else {
  results.push(String(localStorage.getItem("website-only")));
  localStorage.removeItem("website-only");
  localStorage.setItem("kept", "original");
  attempt(() => localStorage.setItem("kept", "é".repeat(4096)));
  attempt(() => sessionStorage.setItem("big", "x".repeat(128 * 1024)));
  attempt(() => localStorage.getItem("x".repeat(1025)));
  attempt(() => sessionStorage.setItem("huge", "x".repeat(3 * 1024 * 1024)));
  results.push(localStorage.getItem("kept"));
  localStorage.setItem("kept", "updated");
  results.push(localStorage.getItem("kept"));
  localStorage.removeItem("kept");
  results.push(String(localStorage.getItem("kept")));
}
document.getElementById("result").textContent = results.join(",");
document.getElementById("again").addEventListener("click", () => {
  try { localStorage.setItem("event", "x".repeat(9000)); }
  catch (error) { document.getElementById("result").textContent = "Still running: " + error.name; }
});
</script>`;
    await codeSurface(page).locator(".cm-content").fill(source);
    const output = page.frameLocator("[data-project-output-mount] iframe:not([inert])");
    await output.locator("#result").waitFor({ timeout: 10000 });
    assert.equal(await output.locator("#result").textContent(), denied
      ? "SecurityError,SecurityError,SecurityError"
      : "null,RangeError,RangeError,TypeError,RangeError,original,updated,null");
    // The long result overflows horizontally. Entering the iframe must not
    // focus-scroll its root and move this button before pointerup completes.
    const scrollBefore = await output.locator("#again").evaluate(() => window.scrollY);
    await output.getByRole("button", { name: "Continue", exact: true }).click();
    await output.getByRole("heading", { name: "Still running: " + (denied ? "SecurityError" : "RangeError"), exact: true })
      .waitFor({ timeout: 5000 });
    assert.equal(await output.locator("#again").evaluate(() => window.scrollY), scrollBefore);
    assert.equal(await page.evaluate(() => localStorage.getItem("website-only")), "not a project resource");
    assert.deepEqual(errors, []);
    await page.close();
  }
});

test("project inline styles match native precedence and reject external URLs", { timeout: 90000 }, async t => {
  const port = await getPort(), dataDir = await tempDir();
  const app = startApp(port, dataDir);
  t.after(async () => { await stopChild(app.child); await rm(dataDir, { recursive: true, force: true }); });
  await app.waitForReady;
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage();
  const errors = [], external = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => {
    if (new URL(request.url()).hostname === "inline-style.example") external.push(request.url());
  });
  const source = `<style>
.sample { color: green !important; padding: 20px; }
@keyframes pulse { from { opacity: 1; } to { opacity: 0.8; } }
</style>
<div id="sample" class="sample" style="color: red !important; color: blue; padding: 4px !important; padding: 9px; margin: 8px 12px; border: 2px solid black; width: 200px; height: 40px; animation: pulse 10s linear infinite;">Inline styles</div>
<button id="change">Change padding</button>
<script>
document.getElementById("change").addEventListener("click", () => {
  document.getElementById("sample").style.setProperty("padding", "6px");
});
</script>`;
  const native = await browser.newPage();
  await native.setContent(source);
  const appearance = node => {
    const style = getComputedStyle(node);
    return Object.fromEntries(["color", "paddingTop", "paddingRight", "marginTop", "marginRight",
      "borderTopWidth", "width", "height"].map(name => [name, style[name]]));
  };
  const expected = await native.locator("#sample").evaluate(appearance);
  await page.goto(`http://resources-edge.localhost:${port}/try`, { waitUntil: "domcontentloaded" });
  await codeSurface(page).locator(".cm-content").fill(source);
  const output = page.frameLocator("[data-project-output-mount] iframe:not([inert])");
  await output.locator("#sample").waitFor({ timeout: 10000 }).catch(async error => {
    throw new Error(JSON.stringify({ errors,
      status: await page.locator("[data-project-status]").textContent(),
      outputError: await page.locator("[data-project-editor]").getAttribute("data-output-machine-error"),
    }), { cause: error });
  });
  assert.deepEqual(await output.locator("#sample").evaluate(appearance), expected);
  assert.equal(await output.locator("#sample").evaluate(node => node.getAnimations().length), 1,
    "the inline animation resolves the scoped stylesheet keyframe");
  await output.locator("#change").click();
  await native.locator("#change").click();
  assert.deepEqual(await output.locator("#sample").evaluate(appearance),
    await native.locator("#sample").evaluate(appearance));
  await page.screenshot({ path: resolve(repoRoot, "../macchiato-work/project-inline-styles.png") });
  await codeSurface(page).locator(".cm-content").fill(source.replace("color: red !important;",
    "background: url('https://inline-style.example/pixel'); color: red !important;"));
  await page.waitForFunction(() => document.querySelector("[data-project-status]").textContent.includes("external URLs"),
    null, { timeout: 15000 });
  assert.equal(await output.locator("#sample").textContent(), "Inline styles",
    "invalid source does not replace the working output");
  assert.deepEqual(external, []);
  assert.deepEqual(errors, []);
});

test("project focus options preserve native scroll behavior", { timeout: 60000 }, async t => {
  const port = await getPort(), dataDir = await tempDir();
  const app = startApp(port, dataDir);
  t.after(async () => { await stopChild(app.child); await rm(dataDir, { recursive: true, force: true }); });
  await app.waitForReady;
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`http://resources-edge.localhost:${port}/try`, { waitUntil: "domcontentloaded" });
  await codeSurface(page).locator(".cm-content").fill(`<style>#destination { display: block; margin-top: 1200px; }</style>
<button id="still">Keep position</button>
<button id="scroll">Scroll to input</button><button id="default">Default focus</button>
<input id="destination">
<script>
const target = document.getElementById("destination");
document.getElementById("still").addEventListener("click", () => target.focus({ preventScroll: true }));
document.getElementById("scroll").addEventListener("click", () => target.focus({ preventScroll: false }));
document.getElementById("default").addEventListener("click", () => target.focus());
</script>`);
  const output = page.frameLocator("[data-project-output-mount] iframe:not([inert])");
  for (const [id, shouldScroll] of [["still", false], ["scroll", true], ["default", true]]) {
    await output.locator("#" + id).click();
    assert.equal(await output.locator("#destination").evaluate(node => document.activeElement === node), true);
    assert.equal(await output.locator("#destination").evaluate(() => window.scrollY > 500), shouldScroll, id);
  }
  assert.deepEqual(errors, []);
});

test("Resources editor remains usable when browser storage access is denied", { timeout: 60000 }, async t => {
  const port = await getPort(), dataDir = await tempDir();
  const app = startApp(port, dataDir);
  t.after(async () => { await stopChild(app.child); await rm(dataDir, { recursive: true, force: true }); });
  await app.waitForReady;
  const db = new DatabaseSync(join(dataDir, "macchiato.sqlite3"));
  const account = await createAccountStore(createNodeSqliteClient(db)).authenticateIdentity({
    provider: "github", providerUserId: "storage-denied", login: "storage-dev", name: "Storage Dev",
    email: "storage@example.test", emailVerified: true,
  });
  db.close();
  const session = await seal({ v: 1, sub: account.id, login: account.login, name: account.name,
    iat: Date.now(), exp: Date.now() + 300_000 }, "local-preview-session-signing-key");
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.context().addCookies([{ name: "resources_session", value: session, domain: "resources-edge.localhost",
    path: "/", httpOnly: true, sameSite: "Lax" }]);
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(() => {
    for (const name of ["localStorage", "sessionStorage"]) {
      Object.defineProperty(window, name, { configurable: true, get() {
        throw new DOMException("Browser storage access is denied", "SecurityError");
      } });
    }
  });
  await page.goto(`http://resources-edge.localhost:${port}/try`, { waitUntil: "domcontentloaded" });
  try { await codeSurface(page).locator(".cm-content").waitFor({ timeout: 10000 }); }
  catch (error) {
    const state = await page.evaluate(() => ({
      frontend: document.documentElement.dataset.resourcesFrontendMachineState,
      frontendError: document.documentElement.dataset.resourcesFrontendMachineError,
      editor: document.querySelector("[data-project-editor]")?.dataset.editorMachineState,
      editorError: document.querySelector("[data-project-editor]")?.dataset.editorMachineError,
      status: document.querySelector("[data-project-status]")?.textContent,
    }));
    throw new Error(`Editor failed with storage denied: ${JSON.stringify({ errors, state })}`, { cause: error });
  }
  await codeSurface(page).locator(".cm-content").fill("<h1>Editing without storage</h1>");
  await page.frameLocator("[data-project-output-mount] iframe:not([inert])").getByRole("heading", {
    name: "Editing without storage", exact: true,
  }).waitFor();
  await page.getByRole("button", { name: "Select a file or view" }).click();
  await page.getByRole("menuitemradio", { name: "style.css", exact: true }).click();
  await page.getByRole("tab", { name: "index.html", exact: true }).click();
  assert.match(await codeSurface(page).locator(".cm-content").innerText(), /Editing without storage/);
  for (const choice of ["dark", "light"]) {
    const button = page.locator(`button[data-theme-choice="${choice}"]`);
    if (!await button.isVisible()) await page.getByLabel("Account menu", { exact: true }).click();
    await button.click();
    assert.equal(await page.locator("html").getAttribute("data-theme"), choice);
    const expected = choice === "dark" ? "rgb(30, 29, 27)" : "rgb(250, 250, 248)";
    await (await codeDocument(page)).waitForFunction(expected => getComputedStyle(document.querySelector(".cm-editor")).backgroundColor === expected, expected);
  }
  await page.goto(`http://resources-edge.localhost:${port}/projects/new`, { waitUntil: "domcontentloaded" });
  await codeSurface(page).locator(".cm-content").waitFor();
  await codeSurface(page).locator(".cm-content").fill("<h1>Unsaved without storage</h1>");
  await page.frameLocator("[data-project-output-mount] iframe:not([inert])").getByRole("heading", {
    name: "Unsaved without storage", exact: true,
  }).waitFor();
  await page.locator("[data-project-status]").getByText(/Draft recovery could not be saved/).waitFor();
  assert.notEqual(await page.locator("[data-project-editor]").getAttribute("data-draft-state"), "saved");
  await page.getByRole("button", { name: "Editor menu", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "Export ZIP", exact: true }).click();
  const snapshot = await decodeProjectArchive(await readFile(await (await download).path()));
  assert.equal(snapshot.files.find(file => file.path === "index.html").content, "<h1>Unsaved without storage</h1>");
  await page.screenshot({ path: resolve(repoRoot, "../macchiato-work/storage-denied-draft.png") });
  // Reload takes the outer guest's recovery-presence path as well. It must
  // still open, without claiming the unavailable recovery record was read.
  await page.reload({ waitUntil: "domcontentloaded" });
  await codeSurface(page).locator(".cm-content").waitFor();
  await page.locator("[data-project-status]").getByText(/Draft recovery failed/).waitFor();
  await page.getByLabel("Title", { exact: true }).fill("Storage test");
  await page.getByRole("button", { name: "Create project", exact: true }).click();
  await page.getByRole("button", { name: "Save project", exact: true }).waitFor();
  await codeSurface(page).locator(".cm-content").waitFor();
  const saved = page.waitForResponse(response => response.request().method() === "POST" &&
    /\/api\/projects\/[^/]+\/snapshot$/.test(new URL(response.url()).pathname));
  await codeSurface(page).locator(".cm-content").fill("<h1>Saved without storage</h1>");
  assert.equal((await saved).status(), 200);
  await page.locator("[data-project-status]").getByText(/Draft saved on server, but local recovery could not be cleared/).waitFor();
  assert.equal(await page.locator("[data-project-editor]").getAttribute("data-draft-state"), "saved");
  await page.frameLocator("[data-project-output-mount] iframe:not([inert])").getByRole("heading", {
    name: "Saved without storage", exact: true,
  }).waitFor();
  assert.deepEqual(errors, []);
});

test("organization naming adopts input typed before the outer guest is ready", { timeout: 45000 }, async t => {
  const port = await getPort(), dataDir = await tempDir();
  const app = startApp(port, dataDir);
  t.after(async () => { await stopChild(app.child); await rm(dataDir, { recursive: true, force: true }); });
  await app.waitForReady;
  const db = new DatabaseSync(join(dataDir, "macchiato.sqlite3"));
  const account = await createAccountStore(createNodeSqliteClient(db)).authenticateIdentity({
    provider: "github", providerUserId: "early-name", login: "early-dev", name: "Early Dev",
    email: "early@example.test", emailVerified: true,
  });
  db.close();
  const session = await seal({ v: 1, sub: account.id, login: account.login, name: account.name,
    iat: Date.now(), exp: Date.now() + 300_000 }, "local-preview-session-signing-key");
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const context = await browser.newContext();
  await context.addCookies([{ name: "resources_session", value: session, domain: "resources-edge.localhost",
    path: "/", httpOnly: true, sameSite: "Lax" }]);
  for (const manual of [false, true]) {
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    let release, requested;
    const gate = new Promise(resolve => { release = resolve; });
    const loading = new Promise(resolve => { requested = resolve; });
    await page.route(url => url.pathname.endsWith("/resources-frontend-quickjs.wasm"), async route => {
      requested();
      await gate;
      await route.continue();
    });
    try {
      await page.goto(`http://resources-edge.localhost:${port}/organizations/new`, { waitUntil: "commit" });
      let timer;
      try {
        await Promise.race([loading, new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error("Outer runtime request was not intercepted")), 5000);
        })]);
      } finally { clearTimeout(timer); }
      await page.screenshot({ path: resolve(repoRoot, "../macchiato-work/early-name-before-hydration.png") });
      await page.getByLabel("Title", { exact: true }).fill("Early tools");
      if (manual) await page.getByLabel("Name", { exact: true }).fill("my-tools");
      assert.equal(await page.getByLabel("Name", { exact: true }).inputValue(), manual ? "my-tools" : "");
      release();
      await page.waitForFunction(() => document.documentElement.dataset.resourcesFrontendMachineState === "ready");
      assert.equal(await page.getByLabel("Name", { exact: true }).inputValue(), manual ? "my-tools" : "early-tools");
      await page.getByLabel("Title", { exact: true }).fill("Later tools");
      assert.equal(await page.getByLabel("Name", { exact: true }).inputValue(), manual ? "my-tools" : "later-tools");
      assert.deepEqual(errors, []);
    } finally { release(); await page.close(); }
  }
});

test("Resources.co edge account creates organizations and projects in a real browser", async (t) => {
  const port = await getPort();
  const dataDir = await tempDir();
  const app = startApp(port, dataDir);
  t.after(async () => {
    await stopChild(app.child);
    await rm(dataDir, { recursive: true, force: true });
  });
  await app.waitForReady;

  const db = new DatabaseSync(join(dataDir, "macchiato.sqlite3"));
  const account = await createAccountStore(createNodeSqliteClient(db)).authenticateIdentity({
    provider: "github",
    providerUserId: "content-test",
    login: "latte-dev",
    name: "Latte Dev",
    email: "latte@example.test",
    emailVerified: true,
  });
  db.close();
  const session = await seal({
    v: 1,
    sub: account.id,
    login: account.login,
    name: account.name,
    iat: Date.now(),
    exp: Date.now() + 300_000,
  }, "local-preview-session-signing-key");

  const browser = await chromium.launch();
  t.after(async () => browser.close());
  const page = await browser.newPage();
  await page.context().addCookies([{
    name: "resources_session",
    value: session,
    domain: "resources-edge.localhost",
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
  }]);
  const projectErrors = [];
  page.on("pageerror", (error) => projectErrors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") projectErrors.push(message.text()); });
  page.on("response", (response) => { if (response.status() >= 500) projectErrors.push(`${response.status()} ${response.url()}`); });
  await page.goto(`http://resources-edge.localhost:${port}/`, { waitUntil: "networkidle" });
  await assert.doesNotReject(page.getByRole("heading", { name: "Your projects", exact: true }).waitFor());
  assert.equal(new URL(page.url()).pathname, "/");
  assert.equal(await page.getByRole("link", { name: "View all projects" }).getAttribute("href"), "/projects");
  assert.equal(await page.locator(".footer").isVisible(), true);

  await page.getByRole("link", { name: "New organization" }).first().click();
  assert.equal(await page.locator("main.layout").getAttribute("data-view"), "standard");
  assert.equal(await page.locator(".layout > .nav").isVisible(), true);
  assert.equal(await page.locator(".create-form").getByRole("link", { name: "Your projects" }).count(), 0);
  await page.getByLabel("Title", { exact: true }).fill("Tiny Tools");
  assert.equal(await page.getByLabel("Name", { exact: true }).inputValue(), "tiny-tools");
  await page.getByLabel("Description (optional)").fill("Small, focused tools.");
  await page.getByRole("button", { name: "Create organization" }).click();
  await assert.doesNotReject(page.getByRole("heading", { name: "Tiny Tools" }).waitFor());

  await page.getByRole("link", { name: "New Project" }).first().click();
  assert.equal(await page.getByRole("link", { name: "Your projects" }).count(), 0);
  assert.deepEqual(projectErrors, []);
  await page.locator("[data-project-file]").first().waitFor({ state: "attached" });
  const newEditor = page.locator(".project-editor");
  async function selectProjectFile(name) {
    await newEditor.locator("[data-project-file-trigger]").click();
    await newEditor.getByRole("menuitemradio", { name, exact: true }).click();
  }
  assert.equal(await newEditor.locator("[data-project-save]").textContent(), "");
  assert.equal(await page.locator("[data-draft-actions]").isHidden(), true);
  await page.getByLabel("Title", { exact: true }).fill("Digital Clock");
  await page.waitForTimeout(50);
  assert.deepEqual(projectErrors, []);
  assert.equal(await page.getByLabel("Name", { exact: true }).inputValue(), "digital-clock");
  await page.getByLabel("Name", { exact: true }).fill("Digital Clock");
  assert.equal(await page.getByLabel("Name", { exact: true }).getAttribute("aria-invalid"), "true");
  await assert.doesNotReject(page.getByText("Use lowercase letters, numbers, and single hyphens.").waitFor());
  await page.getByLabel("Name", { exact: true }).fill("digital-clock");
  assert.equal(await page.getByLabel("Name", { exact: true }).getAttribute("aria-invalid"), "false");
  const description = page.getByLabel("Description (optional)");
  const descriptionOneLineHeight = await description.evaluate((element) => element.getBoundingClientRect().height);
  await description.fill("First line\nSecond line");
  assert.ok(await description.evaluate((element) => element.getBoundingClientRect().height) > descriptionOneLineHeight);
  await description.fill("A small HTML clock.");
  await page.getByLabel("Namespace").selectOption({ label: "Tiny Tools" });
  assert.equal(await page.locator("main.layout").getAttribute("data-view"), "focused");
  assert.equal(await page.locator(".layout.focused-view > .nav").isHidden(), true);
  assert.equal(await page.locator(".layout.focused-view > .footer").isHidden(), true);
  const template = page.getByLabel("Template");
  assert.deepEqual(await template.locator("option").allTextContents(), ["Article", "Hello, HTML", "Single-file document", "Digital clock", "Logo mark", "Bar chart", "Bouncing ball", "Starfield", "Canvas paint", "WebGL triangle", "WebGPU triangle", "Three.js triangle", "Presentation", "Vue SFC", "Svelte", "Blank project"]);
  assert.equal(await template.inputValue(), "article");
  assert.equal(await page.getByLabel("Container").count(), 0);
  assert.equal(await page.locator("[data-container-outline]").count(), 0);
  const linkPatterns = page.getByLabel("Allowed Link URL Patterns");
  assert.equal(await linkPatterns.inputValue(), "*.wikipedia.org");
  const linkPatternsHeight = await linkPatterns.evaluate((element) => element.getBoundingClientRect().height);
  assert.ok(linkPatternsHeight <= 52, `Expected a one-line URL pattern field, got ${linkPatternsHeight}px`);
  await linkPatterns.fill("*.wikipedia.org\n`https://example.test/specific`");
  assert.ok(await linkPatterns.evaluate((element) => element.getBoundingClientRect().height) > linkPatternsHeight);
  await linkPatterns.fill("*.wikipedia.org");
  const initialSnapshot = JSON.parse(await page.locator("[data-project-snapshot]").inputValue());
  assert.equal(initialSnapshot.config.container, "article");
  assert.deepEqual(initialSnapshot.config.containerOptions.allowedLinkPatterns, ["*.wikipedia.org"]);
  await page.getByLabel(/One pattern per line/).hover();
  await assert.doesNotReject(page.getByRole("tooltip").waitFor({ state: "visible" }));
  assert.match(await page.getByRole("tooltip").textContent(), /specific path.*backquotes.*regular expression.*forward slashes/i);
  assert.equal(await page.locator(".project-editor__source iframe.project-editor__code-frame").count(), 1);
  assert.equal(await page.locator("[data-project-output-mount] iframe:not([inert])").count(), 1);
  assert.equal(await page.locator("script[src^='/\-/resources-site/content-form.js?v=']").count(), 0);
  assert.equal(await page.locator("script[src^='/\-/resources-site/controller.js?v=']").count(), 1);
  await assert.doesNotReject(codeSurface(page).locator(".cm-content").waitFor());
  assert.ok(await codeSurface(page).locator(".cm-content span").count() > 10, "HTML syntax should be tokenized");
  const selectionStart = await codeSurface(page).locator(".cm-line").nth(1).boundingBox();
  const selectionEnd = await codeSurface(page).locator(".cm-line").nth(4).boundingBox();
  await page.mouse.move(selectionStart.x + 25, selectionStart.y + selectionStart.height / 2);
  await page.mouse.down();
  await page.mouse.move(selectionEnd.x + 110, selectionEnd.y + selectionEnd.height / 2, { steps: 10 });
  await page.mouse.up();
  const selectionLayers = await codeSurface(page).locator(".cm-selectionBackground").count();
  const nativeSelection = await codeSurface(page).locator("html").evaluate(() => String(getSelection()));
  assert.ok(selectionLayers >= 2 || nativeSelection.includes("\n"), "multiline selection should remain visible after mouseup");
  assert.notEqual(await codeSurface(page).locator(".cm-line").nth(2).evaluate((element) => getComputedStyle(element.firstElementChild, "::selection").backgroundColor), "rgba(0, 0, 0, 0)");
  await assert.doesNotReject(newEditor.getByRole("button", { name: "Split view" }).waitFor());
  await page.waitForTimeout(500);
  const projectOutput = page.frameLocator("[data-project-output-mount] iframe:not([inert])");
  await assert.doesNotReject(projectOutput.getByRole("link", { name: "Hypertext" }).waitFor());
  await assert.doesNotReject(projectOutput.getByRole("link", { name: "WebAssembly" }).waitFor());
  await assert.doesNotReject(projectOutput.getByRole("link", { name: "Capability-based security" }).waitFor());
  assert.deepEqual(await projectOutput.locator("a").evaluateAll((links) => links.map((link) => link.target)), ["_blank", "_blank", "_blank"]);
  await page.waitForFunction(() => {
    const root = document.querySelector("[data-project-editor]");
    const frame = document.querySelector("[data-project-output-mount] iframe:not([inert])");
    return root?.dataset.editorMachineId && frame?.contentDocument?.querySelector("h1");
  });
  const initialMachines = await page.evaluate(() => ({
    frontend: document.documentElement.dataset.resourcesFrontendMachineId,
    frontendState: document.documentElement.dataset.resourcesFrontendMachine,
    editor: document.querySelector("[data-project-editor]").dataset.editorMachineId,
    editorReason: document.querySelector("[data-project-editor]").dataset.editorMachineReason,
  }));
  assert.equal(initialMachines.frontendState, "quickjs");
  assert.ok(initialMachines.frontend, "site frontend machine should publish its diagnostic identity");
  assert.notEqual(initialMachines.frontend, initialMachines.editor);
  await page.evaluate(() => { window.initialProjectFrame = document.querySelector("[data-project-output-mount] iframe:not([inert])"); });
  assert.equal(initialMachines.editorReason, "project-open");
  assert.equal(await newEditor.locator("[data-preview-title]").textContent(), "Output View");
  assert.equal(await projectOutput.locator("h1").textContent(), "A small article");
  assert.equal((await newEditor.locator("[data-project-snapshot]").inputValue()).includes("</html>\\n"), false);
  assert.equal(await page.getByRole("button", { name: "Add file" }).count(), 0);
  assert.equal(await page.getByRole("button", { name: "Remove selected file" }).count(), 0);
  const versionPlacement = await page.evaluate(() => {
    const source = document.querySelector(".project-editor__source-toolbar").getBoundingClientRect();
    const versions = document.querySelector("[data-project-versions-proxy]").getBoundingClientRect();
    return { versionsLeft: versions.left, sourceLeft: source.left, sourceRight: source.right };
  });
  assert.ok(versionPlacement.versionsLeft >= versionPlacement.sourceLeft && versionPlacement.versionsLeft < versionPlacement.sourceRight);
  const editorScrollModel = await newEditor.evaluate(() => ({
    documentHeight: document.documentElement.scrollHeight,
    viewportHeight: document.documentElement.clientHeight,
    sourceOverflow: getComputedStyle(document.querySelector(".project-editor__source")).overflow,
    previewOverflow: getComputedStyle(document.querySelector(".project-editor__preview")).overflow,
    outputOverflow: getComputedStyle(document.querySelector("[data-project-preview]")).overflow,
  }));
  editorScrollModel.codeOverflow = await codeSurface(page).locator(".cm-scroller")
    .evaluate(node => getComputedStyle(node).overflow);
  assert.equal(editorScrollModel.documentHeight, editorScrollModel.viewportHeight);
  assert.equal(editorScrollModel.sourceOverflow, "hidden");
  assert.equal(editorScrollModel.previewOverflow, "hidden");
  assert.equal(editorScrollModel.outputOverflow, "auto");
  assert.equal(editorScrollModel.codeOverflow, "auto");
  const topBarHeights = await page.locator(".focused-header, .layout.focused-view > .userbar").evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().height));
  assert.deepEqual(topBarHeights, [54, 54]);
  const focusedGeometry = await page.evaluate(() => {
    const header = document.querySelector(".focused-header").getBoundingClientRect();
    const breadcrumb = document.querySelector(".focused-header .crumb").getBoundingClientRect();
    return {
      viewportHeight: innerHeight,
      documentHeight: document.documentElement.scrollHeight,
      bodyHeight: document.body.scrollHeight,
      breadcrumbCenter: breadcrumb.top + breadcrumb.height / 2,
      headerCenter: header.top + header.height / 2,
    };
  });
  assert.equal(focusedGeometry.documentHeight, focusedGeometry.viewportHeight);
  assert.equal(focusedGeometry.bodyHeight, focusedGeometry.viewportHeight);
  assert.ok(Math.abs(focusedGeometry.breadcrumbCenter - focusedGeometry.headerCenter) < 1);
  await page.locator("[data-project-versions-proxy]").click();
  assert.match(await page.locator("[data-project-version-list] [aria-current='true'] [data-version-time]").textContent(), /^\d+ seconds? ago$/);
  assert.equal(await page.locator("[data-project-history]").isVisible(), true);
  await page.locator("[data-project-versions-proxy]").click();
  assert.equal(await page.locator("[data-project-history]").isHidden(), true);
  await template.selectOption("ball");
  const templateNotice = page.locator("[data-project-notice]");
  await assert.doesNotReject(templateNotice.getByRole("button", { name: "Undo" }).waitFor());
  assert.match(await templateNotice.textContent(), /Template replaced the project/);
  assert.equal(await page.locator("[data-project-status]").getAttribute("data-state"), "warning");
  assert.equal(await page.locator("[data-project-status]").evaluate((element) => element.parentElement.className), "project-editor__source");
  await templateNotice.getByRole("button", { name: "Undo" }).click();
  assert.equal(await template.inputValue(), "article");
  await assert.doesNotReject(projectOutput.getByRole("link", { name: "Hypertext" }).waitFor());
  assert.equal(await templateNotice.isHidden(), true);
  await template.selectOption("ball");
  assert.ok(Number(await page.locator("[data-project-versions-proxy] .project-editor__version-count").textContent()) > 0, "edits are retained in session history");
  await page.waitForFunction(() => {
    const frame = document.querySelector("[data-project-output-mount] iframe:not([inert])");
    return frame && frame !== window.initialProjectFrame && frame.contentDocument?.querySelector("canvas");
  });
  const rotatedMachines = await page.evaluate(() => ({
    frontend: document.documentElement.dataset.resourcesFrontendMachineId,
    editor: document.querySelector("[data-project-editor]").dataset.editorMachineId,
  }));
  assert.equal(rotatedMachines.frontend, initialMachines.frontend);
  assert.equal(rotatedMachines.editor, initialMachines.editor);
  assert.equal(await page.evaluate(() => window.initialProjectFrame.isConnected), false);
  assert.equal(await page.locator(".project-editor").evaluate((element) => element.getBoundingClientRect().height >= 600), true);
  await selectProjectFile("script.js");
  await page.waitForFunction(() => !document.querySelector("[data-project-editor]")?.dataset.editorLoading);
  await assert.doesNotReject(codeSurface(page).locator(".cm-content").getByText("getContext", { exact: false }).waitFor());
  await page.waitForFunction(() => {
    const preview = document.querySelector("[data-project-preview]");
    const canvas = preview?.querySelector("iframe:not([inert])")?.contentDocument?.querySelector("canvas");
    if (!canvas) return false;
    return canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height)
      .data.some((value, index) => index % 4 === 3 && value > 0);
  });
  assert.equal(await codeSurface(page).locator(".cm-gutterElement").count() > 1, true);
  assert.equal(await codeSurface(page).locator(".cm-scroller").evaluate((element) => parseFloat(getComputedStyle(element).paddingLeft) <= 4), true);
  await codeSurface(page).locator(".cm-content").click();
  await page.keyboard.press("Control+f");
  await codeSurface(page).locator(".cm-search input[name='search']").fill("getContext");
  await page.keyboard.press("Escape");
  assert.equal(await codeSurface(page).locator(".cm-search").count(), 0);
  await page.keyboard.press("Control+End");
  await page.keyboard.type("\n{");
  assert.match(await codeSurface(page).locator(".cm-content").innerText(), /\{\}$/);
  assert.equal(await newEditor.getAttribute("data-draft-state"), "dirty");
  assert.notEqual(await newEditor.locator("[data-project-save]").textContent(), "Unsaved changes");
  await page.getByRole("button", { name: "Project menu" }).click();
  await page.getByRole("menuitem", { name: "Discard draft", exact: true }).click();
  await assert.doesNotReject(page.getByRole("alertdialog", { name: "Discard draft" }).waitFor());
  await page.getByRole("alertdialog", { name: "Discard draft" }).getByRole("button", { name: "Cancel" }).click();
  assert.equal(await page.getByRole("alertdialog", { name: "Discard draft" }).isHidden(), true);
  assert.equal(await templateNotice.isHidden(), true);
  await template.selectOption("article");
  assert.ok(Number(await page.locator("[data-project-versions-proxy] .project-editor__version-count").textContent()) > 0, "edits are retained in session history");
  await page.waitForFunction(() => !document.querySelector("[data-project-editor]")?.dataset.editorLoading);
  await assert.doesNotReject(projectOutput.getByRole("link", { name: "Hypertext" }).waitFor());
  await template.selectOption("mark");
  assert.ok(Number(await page.locator("[data-project-versions-proxy] .project-editor__version-count").textContent()) > 0, "edits are retained in session history");
  await page.waitForFunction(() => !document.querySelector("[data-project-editor]")?.dataset.editorLoading);
  await assert.doesNotReject(newEditor.locator('[data-open-tab="image.svg"][aria-selected="true"]').waitFor());
  await assert.doesNotReject(codeSurface(page).locator(".cm-content").getByText("circle", { exact: false }).waitFor());
  await assert.doesNotReject(projectOutput.locator("circle").waitFor());
  await template.selectOption("chart");
  await assert.doesNotReject(projectOutput.locator("rect").nth(2).waitFor());
  assert.doesNotMatch(await page.locator("[data-project-status]").textContent(), /Preview stopped/);
  await template.selectOption("stars");
  await page.waitForFunction(() => {
    const preview = document.querySelector("[data-project-preview]");
    const canvas = preview?.querySelector(".project-editor__output-frame")
      ?.contentDocument?.querySelector("canvas");
    return canvas?.getContext("2d").getImageData(0, 0, canvas.width, canvas.height)
      .data.some((value, index) => index % 4 === 3 && value > 0);
  });
  const starfieldBefore = await page.evaluate(() => document.querySelector("[data-project-preview]")
    .querySelector(".project-editor__output-frame").contentDocument.querySelector("canvas").toDataURL());
  await page.waitForTimeout(300);
  const starfieldAfter = await page.evaluate(() => document.querySelector("[data-project-preview]")
    .querySelector(".project-editor__output-frame").contentDocument.querySelector("canvas").toDataURL());
  assert.notEqual(starfieldAfter, starfieldBefore);
  await template.selectOption("clock");
  await page.waitForFunction(() => /^\d{2}:\d{2}:\d{2}$/.test(document.querySelector("[data-project-preview] .project-editor__output-frame")
    ?.contentDocument?.querySelector("#time")?.textContent || ""));
  await template.selectOption("hello");
  assert.ok(Number(await page.locator("[data-project-versions-proxy] .project-editor__version-count").textContent()) > 0, "edits are retained in session history");
  await page.waitForFunction(() => !document.querySelector("[data-project-editor]")?.dataset.editorLoading);
  await assert.doesNotReject(codeSurface(page).locator(".cm-content").getByText("This small page is made from familiar HTML elements", { exact: false }).waitFor());
  await codeSurface(page).locator(".cm-content").click();
  await assert.doesNotReject(codeSurface(page).locator(".cm-cursor").waitFor({ state: "visible" }));
  await newEditor.getByRole("button", { name: "Output View" }).click();
  assert.equal(await newEditor.locator(".project-editor__workspace").getAttribute("data-view"), "preview");
  await newEditor.getByRole("button", { name: "Editor" }).click();
  assert.equal(await newEditor.locator(".project-editor__workspace").getAttribute("data-view"), "editor");
  await newEditor.getByRole("button", { name: "Split view" }).click();
  const splitter = newEditor.getByRole("separator", { name: "Resize editor and preview" });
  await splitter.press("ArrowRight");
  assert.equal(await splitter.getAttribute("aria-valuenow"), "55");
  await codeSurface(page).locator(".cm-content").fill("<h1>Digital Clock</h1>\n");
  await selectProjectFile("Configuration");
  await page.waitForFunction(() => !document.querySelector("[data-project-editor]")?.dataset.editorLoading);
  assert.equal(await codeSurface(page).locator(".cm-content").getAttribute("aria-readonly"), "true");
  const visibleConfiguration = await codeSurface(page).locator(".cm-content").innerText();
  assert.doesNotMatch(visibleConfiguration, /allowedElements/);
  assert.match(visibleConfiguration, /"container": "page"/);
  assert.match(visibleConfiguration, /\n  "sandbox": \{\n    "network": false,/);
  await page.screenshot({ path: resolve(repoRoot, "../macchiato-work/project-configuration-formatted.png") });
  await codeSurface(page).locator(".cm-content").focus();
  await page.keyboard.type("not editable");
  assert.equal(await codeSurface(page).locator(".cm-content").innerText(), visibleConfiguration);
  await page.waitForFunction(() => document.querySelector("[data-project-save]")?.textContent === "Draft saved in this session");
  await page.reload({ waitUntil: "networkidle" });
  await page.locator("[data-project-editor][data-editor-machine-state='ready']").waitFor();
  assert.equal(await page.locator("[data-project-editor]").getAttribute("data-draft-state"), "saved");
  const restoredDraftVersionCount = await page.locator("[data-project-versions-proxy] .project-editor__version-count").textContent();
  await page.getByLabel("Title", { exact: true }).fill("Digital Clock");
  await page.getByLabel("Name", { exact: true }).fill("digital-clock");
  await page.getByLabel("Description (optional)").fill("A small HTML clock.");
  await page.getByLabel("Namespace").selectOption({ label: "Tiny Tools" });
  await page.locator("[data-project-versions-proxy]").click();
  assert.match(await page.locator("[data-project-version-list] [aria-current='true'] [data-version-time]").textContent(), /^\d+ seconds? ago$/);
  assert.equal(await page.locator("[data-project-history]").isVisible(), true);
  await page.locator("[data-project-versions-proxy]").click();
  assert.equal(await page.locator("[data-project-history]").isHidden(), true);
  await page.locator("[data-project-versions-proxy]").click();
  assert.equal(await page.locator("[data-project-history]").isVisible(), true);
  await page.getByLabel("Title", { exact: true }).click();
  assert.equal(await page.locator("[data-project-history]").isHidden(), true);
  await page.locator("[data-project-versions-proxy]").click();
  await page.locator("[data-project-version-list] [data-version-sequence='1']").click();
  assert.equal(await page.locator("[data-project-versions-proxy] .project-editor__version-count").textContent(), restoredDraftVersionCount);
  assert.match(await page.locator("[data-current-version]").textContent(), /ago$/);
  await page.locator("[data-project-versions-proxy]").click();
  await page.locator("[data-project-version-list] [aria-current='true']").click();
  assert.equal(await page.locator("[data-project-versions-proxy] .project-editor__version-count").textContent(), restoredDraftVersionCount);
  await selectProjectFile("index.html");
  await page.waitForFunction(() => !document.querySelector("[data-project-editor]")?.dataset.editorLoading);
  await codeSurface(page).locator(".cm-content").fill("<h1>Digital Clock</h1>\n");
  assert.match(await page.locator("[data-current-version]").textContent(), /^\d+ seconds? ago$/);
  await page.waitForFunction(() => document.querySelector("[data-project-snapshot]")?.value.includes("Digital Clock"));
  await page.getByRole("button", { name: "Create project" }).click();
  await assert.doesNotReject(page.getByRole("button", { name: "Save project" }).waitFor());
  assert.equal(await page.getByLabel("Title", { exact: true }).inputValue(), "Digital Clock");
  assert.equal(await page.getByLabel("Namespace").locator("option:checked").textContent(), "Tiny Tools");
  assert.equal(new URL(page.url()).pathname, "/tiny-tools/digital-clock");
  assert.equal(await page.locator("main.layout").getAttribute("data-view"), "focused");
  assert.equal(await page.locator(".layout.focused-view > .nav").isHidden(), true);
  assert.equal(await page.locator(".layout.focused-view > .footer").isHidden(), true);
  await page.waitForFunction(() => document.querySelector("[data-project-versions-proxy] .project-editor__version-count")?.textContent === "1");
  assert.equal(await page.locator("[data-project-versions-proxy] .project-editor__version-count").textContent(), "1");
  await assert.doesNotReject(codeSurface(page).locator(".cm-content").waitFor());
  const projectEditor = page.locator(".project-editor");
  await assert.doesNotReject(codeSurface(page).locator(".cm-content").getByText("Digital Clock", { exact: false }).first().waitFor());
  const outputFrame = projectEditor.locator("iframe.project-editor__output-frame:not([inert])");
  await projectOutput.getByText("Digital Clock", { exact: true }).waitFor();
  assert.equal(await outputFrame.getAttribute("allow"), "fullscreen");
  await outputFrame.evaluate((frame) => { frame.contentWindow.__projectOutputIdentity = "preserved"; });
  await codeSurface(page).locator(".cm-content").fill("<h1>Digital Clock</h1>\n<p>Updated.</p>\n");
  await page.waitForTimeout(250);
  assert.equal(
    await outputFrame.evaluate(frame => frame.contentWindow.__projectOutputIdentity),
    "preserved",
    "editing should leave the current output machine alive during the debounce window",
  );
  await page.waitForFunction(() => document.querySelector("[data-project-editor]")?.dataset.draftDirty === "true");
  assert.equal(await page.locator("[data-project-submit]").textContent(), "Save project");
  await page.waitForFunction(() => !document.querySelector("[data-project-editor]")?.dataset.draftDirty && document.querySelector("[data-project-save]")?.textContent === "Saved");
  await page.waitForTimeout(2_000);
  await projectEditor.frameLocator("iframe.project-editor__output-frame:not([inert])").getByText("Updated.", { exact: true }).waitFor();
  assert.equal(await outputFrame.evaluate((frame) => frame.contentWindow.__projectOutputIdentity), undefined);
  assert.equal(await projectEditor.locator("iframe.project-editor__output-frame").count(), 1);
  const versionsButton = page.locator("[data-project-versions-proxy]");
  assert.equal((await versionsButton.innerText()).trim(), "");
  await versionsButton.click();
  const pastVersions = page.locator("[data-project-version-list] [data-version-sequence]");
  const editedSequence = await page.locator("[data-project-version-list] [aria-current='true']").getAttribute("data-version-sequence");
  const editedVersionSelector = editedSequence
    ? `[data-project-version-list] [data-version-sequence="${editedSequence}"]`
    : "[data-project-version-list] .project-editor__version:not([data-version-sequence])";
  assert.match(await pastVersions.first().textContent(), /\d+ seconds? ago.*LATEST/);
  assert.notEqual(await pastVersions.first().getAttribute("title"), "");
  await page.locator("[data-project-version-list] [data-version-sequence='1']").click();
  assert.equal(await page.locator("[data-project-versions-proxy] .project-editor__version-count").textContent(), "1");
  await page.waitForFunction(() => document.querySelector("[data-current-version]")?.textContent.endsWith("ago"));
  await projectEditor.frameLocator("iframe.project-editor__output-frame:not([inert])").getByText("Updated.", { exact: true }).waitFor({ state: "detached" });
  assert.match(await page.locator("[data-current-version]").textContent(), /ago$/);
  await versionsButton.click();
  // Reopening keeps the historical selection; choose the edited checkpoint
  // explicitly rather than treating aria-current as an alias for newest.
  await page.locator(editedVersionSelector).click();
  await projectEditor.frameLocator("iframe.project-editor__output-frame:not([inert])").getByText("Updated.", { exact: true }).waitFor();
  assert.equal(await page.locator("[data-project-versions-proxy] .project-editor__version-count").textContent(), "1");
  await versionsButton.click();
  await page.locator("[data-project-version-list] [data-version-sequence='1']").click();
  await codeSurface(page).locator(".cm-content").fill("<h1>Forked from history</h1>");
  await page.waitForFunction(() => document.querySelector("[data-project-editor]")?.dataset.draftDirty === "true");
  await page.waitForFunction(() => !document.querySelector("[data-project-editor]")?.dataset.draftDirty && document.querySelector("[data-project-save]")?.textContent === "Saved");
  await page.goto(`http://resources-edge.localhost:${port}/projects`, { waitUntil: "networkidle" });
  const openProject = page.getByRole("link", { name: /Digital Clock/ }).click({ noWaitAfter: true });
  await page.waitForFunction(() => location.pathname === "/tiny-tools/digital-clock");
  await assert.doesNotReject(page.locator("[data-project-editor][data-editor-machine-state='starting']").waitFor());
  assert.equal(await page.locator(".project-route-loading").count(), 0);
  assert.equal(await page.locator("main.layout").getAttribute("data-view"), "focused");
  assert.equal(new URL(page.url()).pathname, "/tiny-tools/digital-clock");
  await openProject;
  await assert.doesNotReject(page.locator("[data-project-editor][data-editor-machine-state='ready']").waitFor());
  assert.equal(new URL(page.url()).pathname, "/tiny-tools/digital-clock");
  await page.getByLabel("Description (optional)").fill("Updated project details.");
  assert.equal(await page.locator("[data-project-submit]").textContent(), "Save project");
  const detailPublication = page.waitForResponse(response => response.request().method() === "POST" &&
    new URL(response.url()).pathname.startsWith("/projects/"));
  await page.locator("[data-project-submit]").click();
  assert.equal((await detailPublication).status(), 303);
  await page.waitForLoadState("networkidle");
  await page.locator("[data-project-editor][data-editor-machine-state='ready']").waitFor();
  await assert.doesNotReject(page.getByRole("button", { name: "Save project" }).waitFor());
  assert.equal(await page.getByLabel("Description (optional)").inputValue(), "Updated project details.");
  const storedTemplate = page.getByLabel("Template");
  const storedVersionCount = Number(await page.locator("[data-project-versions-proxy] .project-editor__version-count").textContent());
  const snapshotBeforeTemplate = await page.locator("[data-project-snapshot]").inputValue();
  const templateBeforeReplacement = await storedTemplate.inputValue();
  await storedTemplate.selectOption("mark");
  await assert.doesNotReject(newEditor.locator('[data-open-tab="image.svg"][aria-selected="true"]').waitFor());
  await assert.doesNotReject(page.locator("[data-project-notice]").getByRole("button", { name: "Undo" }).waitFor());
  await page.waitForFunction(() => !document.querySelector("[data-project-editor]")?.dataset.draftDirty && document.querySelector("[data-project-save]")?.textContent === "Saved");
  assert.ok(Number(await page.locator("[data-project-versions-proxy] .project-editor__version-count").textContent()) > storedVersionCount);
  await page.locator("[data-project-notice]").getByRole("button", { name: "Undo" }).click();
  assert.equal(await page.locator("[data-project-snapshot]").inputValue(), snapshotBeforeTemplate);
  assert.equal(await storedTemplate.inputValue(), templateBeforeReplacement);
  assert.equal(await page.locator("[data-project-notice]").isHidden(), true);
  await page.waitForFunction(() => document.querySelector("[data-project-editor]")?.dataset.draftDirty === "true");
  await page.waitForFunction(() => !document.querySelector("[data-project-editor]")?.dataset.draftDirty && document.querySelector("[data-project-save]")?.textContent === "Saved");
  await page.reload({ waitUntil: "networkidle" });
  await page.locator("[data-project-editor][data-editor-machine-state='ready']").waitFor();
  assert.equal(await page.getByLabel("Template").inputValue(), templateBeforeReplacement);
  assert.equal(await page.locator("[data-project-snapshot]").inputValue(), snapshotBeforeTemplate);
  await page.getByLabel("Template").selectOption("mark");
  await page.waitForFunction(() => document.querySelector("[data-project-editor]")?.dataset.draftDirty === "true");
  await page.waitForFunction(() => !document.querySelector("[data-project-editor]")?.dataset.draftDirty && document.querySelector("[data-project-save]")?.textContent === "Saved");
  await page.reload({ waitUntil: "networkidle" });
  await page.locator("[data-project-editor][data-editor-machine-state='ready']").waitFor();
  const draftFlash = page.locator("[data-draft-flash]");
  await assert.doesNotReject(draftFlash.getByRole("button", { name: "Revert to published version" }).waitFor());
  assert.match(await draftFlash.textContent(), /There are draft changes\./);
  assert.equal(await draftFlash.evaluate((element) => getComputedStyle(element).borderColor), "rgb(201, 155, 55)");
  await page.screenshot({ path: resolve(repoRoot, "../macchiato-work/resources-draft-flash.png") });
  await draftFlash.getByRole("button", { name: "Dismiss" }).click();
  assert.equal(await draftFlash.count(), 0);
  await page.reload({ waitUntil: "networkidle" });
  await page.locator("[data-project-editor][data-editor-machine-state='ready']").waitFor();
  const revertPublication = page.waitForResponse(response => response.request().method() === "POST" &&
    new URL(response.url()).pathname.startsWith("/projects/"));
  await page.locator("[data-draft-flash]").getByRole("button", { name: "Revert to published version" }).click();
  assert.equal((await revertPublication).status(), 303);
  await page.waitForLoadState("networkidle");
  await page.locator("[data-project-editor][data-editor-machine-state='ready']").waitFor();
  await assert.doesNotReject(page.getByRole("button", { name: "Save project" }).waitFor());
  assert.equal(await page.getByLabel("Template").inputValue(), templateBeforeReplacement);
  assert.equal(await page.locator("[data-project-snapshot]").inputValue(), snapshotBeforeTemplate);
  assert.equal(await page.locator("[data-draft-flash]").count(), 0);
  assert.equal(await page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link", { name: "tiny-tools" }).getAttribute("href"), "/tiny-tools");
  await page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link", { name: "tiny-tools" }).click();
  await assert.doesNotReject(page.getByRole("heading", { name: "Tiny Tools" }).waitFor());
  assert.equal(await page.title(), "Tiny Tools - Resources.co");
  assert.equal(await page.locator("#crumb .here").textContent(), "tiny-tools");
  assert.equal((await page.locator("#brand-path").innerText()).trim(), "Resources.co");
  await page.getByRole("link", { name: /Digital Clock/ }).click();
  const pageScripts = await page.locator("script[src]").evaluateAll(nodes => nodes.map(node => node.getAttribute("src")));
  assert.equal(pageScripts.length, 1, "the page loads only its frontend controller script");
  assert.match(pageScripts[0], /^\/-\/resources-site\/controller\.js(?:\?|$)/);
  const guest = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await guest.goto(`http://resources-edge.localhost:${port}/tiny-tools/digital-clock`, { waitUntil: "networkidle" });
  assert.equal(await guest.locator("main.layout").getAttribute("data-view"), "focused");
  assert.equal(await guest.locator(".layout.focused-view > .nav").isHidden(), true);
  assert.equal(await guest.locator(".layout.focused-view > .footer").isHidden(), true);
  assert.equal(await guest.evaluate(() => document.querySelector(".project-editor").getBoundingClientRect().top - document.querySelector(".focused-header").getBoundingClientRect().bottom), 0);
  assert.equal(await guest.getByLabel("Title", { exact: true }).inputValue(), "Digital Clock");
  assert.equal(await guest.getByLabel("Title", { exact: true }).isDisabled(), true);
  assert.equal(await guest.getByLabel("Namespace").count(), 0);
  assert.equal(await guest.getByText("Visibility", { exact: true }).count(), 0);
  assert.equal(await guest.getByRole("button", { name: "Save project" }).count(), 0);
  const guestEditor = codeSurface(guest).locator(".cm-content");
  await assert.doesNotReject(guestEditor.waitFor());
  await guestEditor.fill("<h1>Visitor experiment</h1>");
  await assert.doesNotReject(guest.frameLocator("[data-project-output-mount] iframe:not([inert])")
    .locator("h1", { hasText: "Visitor experiment" }).waitFor());
  await guest.waitForTimeout(1_700);
  assert.equal(await guest.locator("[data-project-save]").textContent(), "");
  assert.equal(await guest.locator("[data-project-status]").getAttribute("data-state"), "normal");
  await guest.close();
  await page.getByRole("button", { name: "Project menu" }).click();
  await page.getByRole("menuitem", { name: "Delete project", exact: true }).click();
  const deleteDialog = page.getByRole("alertdialog", { name: "Delete project" });
  await assert.doesNotReject(deleteDialog.waitFor());
  await deleteDialog.getByRole("button", { name: "Cancel" }).click();
  assert.equal(await deleteDialog.isHidden(), true);
  await page.getByRole("button", { name: "Project menu" }).click();
  await page.getByRole("menuitem", { name: "Delete project", exact: true }).click();
  await deleteDialog.getByRole("button", { name: "Delete project", exact: true }).click();
  await assert.doesNotReject(page.getByRole("heading", { name: "Projects", exact: true }).waitFor());
  assert.equal(new URL(page.url()).pathname, "/projects");
});

test("Public project cards and palette searches navigate from the outer guest", async (t) => {
  const port = await getPort(), dataDir = await tempDir();
  const app = startApp(port, dataDir);
  t.after(async () => { await stopChild(app.child); await rm(dataDir, { recursive: true, force: true }); });
  await app.waitForReady;
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage();
  const errors = [], requests = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => requests.push(request.url()));
  await page.route("**/api/public-projects", route => route.fulfill({ json: [
    { namespace: "catalog", slug: "example", name: "Example project", description: "A public project" },
  ] }));
  await page.route("**/catalog/example", route => route.fulfill({ contentType: "text/html", body: "Project reached" }));
  await page.route("**/browse?*", route => route.fulfill({ contentType: "text/html", body: "Search reached" }));
  const origin = `http://resources-edge.localhost:${port}`;
  await page.goto(origin);
  const card = page.locator("[data-public-projects] .account-card");
  await card.waitFor();
  assert.equal(await card.getAttribute("href"), "/catalog/example");
  await card.click();
  await page.waitForURL(`${origin}/catalog/example`);
  await page.goto(origin);
  await page.waitForFunction(() => document.documentElement.dataset.resourcesFrontendMachineState === "ready");
  await page.locator("[data-command-open]").click();
  await page.locator("[data-command-input]").fill("tiles & cats");
  await page.locator("[data-search-elsewhere]").click();
  await page.waitForURL(`${origin}/browse?q=tiles%20%26%20cats`);
  assert.deepEqual(errors, []);
  assert.equal(requests.some(url => /project-editor.*\.(?:wasm|bin)/.test(url)), false,
    "ordinary links do not require an editor guest");
});

test("Resources project save controls publish titled latest versions", async (t) => {
  const port = await getPort();
  const dataDir = await tempDir();
  const app = startApp(port, dataDir);
  t.after(async () => { await stopChild(app.child); await rm(dataDir, { recursive: true, force: true }); });
  await app.waitForReady;
  const db = new DatabaseSync(join(dataDir, "macchiato.sqlite3"));
  const account = await createAccountStore(createNodeSqliteClient(db)).authenticateIdentity({
    provider: "github", providerUserId: "save-controls", login: "save-dev", name: "Save Dev",
    email: "save@example.test", emailVerified: true,
  });
  db.close();
  const session = await seal({ v: 1, sub: account.id, login: account.login, name: account.name, iat: Date.now(), exp: Date.now() + 300_000 }, "local-preview-session-signing-key");
  const browser = await chromium.launch();
  t.after(async () => browser.close());
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.context().addCookies([{ name: "resources_session", value: session, domain: "resources-edge.localhost", path: "/", httpOnly: true, sameSite: "Lax" }]);
  await page.goto(`http://resources-edge.localhost:${port}/projects/new`, { waitUntil: "networkidle" });
  await codeSurface(page).locator(".cm-content").waitFor();
  await page.getByLabel("Title", { exact: true }).fill("Save controls");
  await page.getByRole("button", { name: "Create project" }).click();
  await page.locator("[data-project-submit]").waitFor();
  // The saved project's HTML arrives before its independently loaded editor
  // controls. Exercise those controls only after that new workspace is ready.
  await page.waitForFunction(() =>
    document.querySelector("[data-project-editor]")?.dataset.editorMachineStage === "ready");
  assert.equal(await page.locator(".project-close").getAttribute("href"), "/", "an exhausted project close stack should return home");
  const projectToolbar = await page.locator(".project-editor__toolbar").boundingBox();
  for (const label of ["Notifications", "Create", "Account menu"]) {
    const control = page.locator(`.userbar [aria-label="${label}"]`).first();
    const box = await control.boundingBox();
    await page.mouse.move(box.x + box.width / 2, projectToolbar.y + 8);
    await page.waitForTimeout(60);
    assert.equal(await page.locator(".userbar .ub-pop[data-open='true']").count(), 0, `${label} should not hover from the project bar`);
  }
  const detailsButton = page.getByRole("button", { name: "Details" });
  assert.equal(await detailsButton.getAttribute("aria-pressed"), "true");
  assert.equal(await page.locator(".project-create__fields").isVisible(), true);
  assert.equal(await page.getByText("Embed view", { exact: true }).count(), 0);
  const closeWithDetails = await page.locator(".project-close").evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const icon = element.querySelector("svg").getBoundingClientRect();
    return { width: rect.width, height: rect.height, center: rect.top + rect.height / 2, iconCenter: icon.top + icon.height / 2 };
  });
  await detailsButton.click();
  assert.equal(await detailsButton.getAttribute("aria-pressed"), "false");
  assert.equal(await page.locator(".project-create__fields").isHidden(), true);
  const closeWithoutDetails = await page.locator(".project-close").evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const icon = element.querySelector("svg").getBoundingClientRect();
    return { width: rect.width, height: rect.height, center: rect.top + rect.height / 2, iconCenter: icon.top + icon.height / 2 };
  });
  assert.deepEqual(closeWithoutDetails, closeWithDetails);
  await detailsButton.click();
  const projectActionCenters = await page.locator(".project-fields__toolbar-actions").evaluate((actions) => [...actions.children].map((element) => {
    const rect = element.getBoundingClientRect();
    return (rect.top + rect.bottom) / 2;
  }));
  assert.ok(Math.abs(projectActionCenters[0] - projectActionCenters[1]) < 1, "project menu and close control should share a centerline");
  const saveSplitGeometry = await page.locator("[data-save-split]").evaluate((split) => {
    const primary = split.querySelector(".save-split__primary");
    const arrow = split.querySelector(".save-split__arrow");
    const primaryRect = primary.getBoundingClientRect();
    const arrowRect = arrow.getBoundingClientRect();
    return {
      gap: arrowRect.left - primaryRect.right,
      primaryTopRight: getComputedStyle(primary).borderTopRightRadius,
      arrowTopLeft: getComputedStyle(arrow).borderTopLeftRadius,
    };
  });
  assert.equal(saveSplitGeometry.gap, 0);
  assert.equal(saveSplitGeometry.primaryTopRight, "0px");
  assert.equal(saveSplitGeometry.arrowTopLeft, "0px");
  assert.deepEqual(await page.locator("[data-project-tabs] [role='tab']").allTextContents(), ["index.html"]);
  await page.getByRole("button", { name: "Select a file or view" }).click();
  await page.getByRole("menuitemradio", { name: "style.css", exact: true }).click();
  await page.getByRole("tab", { name: "index.html", exact: true }).click();
  assert.deepEqual(await page.locator("[data-project-tabs] [role='tab']").allTextContents(), ["index.html", "style.css"]);
  const indexTab = page.getByRole("tab", { name: "index.html" });
  await page.mouse.move(0, 0);
  await indexTab.hover();
  await page.waitForTimeout(30);
  assert.equal(await page.locator(".instant-tooltip").count(), 0, "a fully visible root file should not have a tooltip");
  await page.mouse.move(0, 0);
  await indexTab.evaluate((element) => { element.style.width = "48px"; });
  // Stay on the label, not the independently clickable close control.
  await indexTab.hover({ position: { x: 8, y: 10 } });
  await page.waitForTimeout(100);
  assert.equal(await page.locator(".instant-tooltip").count(), 0, "pointer tooltips should respect the native-style delay");
  await page.waitForTimeout(550);
  assert.equal(await page.locator(".instant-tooltip").textContent(), "index.html");
  await page.mouse.move(0, 0);
  await indexTab.evaluate((element) => { element.style.removeProperty("width"); });
  const crowdedTabGeometry = await page.locator("[data-project-editor]").evaluate((root) => {
    const tabs = root.querySelector("[data-project-tabs]");
    const sample = tabs.querySelector(".project-editor__open-tab");
    const extras = Array.from({ length: 12 }, () => sample.cloneNode(true));
    tabs.append(...extras);
    const source = root.querySelector(".project-editor__source-toolbar").getBoundingClientRect();
    const split = root.querySelector(".project-editor__toolbar-split").getBoundingClientRect();
    const result = { overflowed: tabs.scrollWidth > tabs.clientWidth, sourceRight: source.right, splitLeft: split.left };
    extras.forEach((extra) => extra.remove());
    return result;
  });
  assert.equal(crowdedTabGeometry.overflowed, true);
  assert.ok(crowdedTabGeometry.sourceRight <= crowdedTabGeometry.splitLeft + 1, "crowded tabs should remain inside the editor toolbar cell");
  await page.locator("[data-tab-path='index.html']").dragTo(page.locator("[data-tab-path='style.css']"));
  assert.deepEqual(await page.locator("[data-project-tabs] [role='tab']").allTextContents(), ["style.css", "index.html"]);
  await page.locator("[data-tab-path='index.html']").dragTo(page.locator("[data-tab-path='style.css']"));
  assert.deepEqual(await page.locator("[data-project-tabs] [role='tab']").allTextContents(), ["index.html", "style.css"]);
  await page.getByRole("tab", { name: "style.css" }).click();
  await page.getByRole("tab", { name: "style.css" }).hover();
  assert.equal(await page.getByRole("button", { name: "Close style.css" }).evaluate((element) => getComputedStyle(element).opacity), "1");
  await page.getByRole("button", { name: "Close style.css" }).click();
  assert.equal(await page.getByRole("tab", { name: "style.css" }).count(), 0);
  await page.getByRole("button", { name: "Select a file or view" }).click();
  assert.equal(await page.locator("[data-project-file-menu] .project-editor__popover-head").textContent(), "Open File/View");
  assert.deepEqual(await page.locator("[data-project-file-available] [role='menuitemradio']").allTextContents(), ["style.css", "Configuration"]);
  assert.deepEqual(await page.locator("[data-project-open-files] [role='menuitemradio']").allTextContents(), ["index.html"]);
  assert.equal(await page.locator("[data-project-open-files] > p").textContent(), "Open files");
  assert.equal(await page.locator(".project-editor__file-choices").evaluate((element) => getComputedStyle(element).overflow), "auto");
  assert.equal(await page.locator(".project-editor__open-file-choices").evaluate((element) => getComputedStyle(element).overflow), "auto");
  await page.locator("[data-project-file-filter]").fill("index");
  assert.equal(await page.locator("[data-project-file-available]").isHidden(), true);
  assert.equal(await page.locator("[data-project-open-files]").isVisible(), true);
  await page.locator("[data-project-file-filter]").fill("");
  await page.getByRole("menuitemradio", { name: "Configuration" }).click();
  assert.equal(await page.getByRole("tab", { name: "Configuration" }).count(), 1);
  await page.getByRole("tab", { name: "index.html" }).click();
  await page.getByRole("button", { name: "Editor menu" }).click();
  await page.getByRole("menuitem", { name: "Save tab configuration" }).waitFor();
  await page.getByRole("menuitem", { name: "Import ZIP" }).waitFor();
  await page.getByRole("menuitem", { name: "Export ZIP" }).waitFor();
  await page.getByRole("button", { name: "Editor menu" }).click();
  await page.getByRole("button", { name: "Output View" }).click();
  const outputOnlyLayout = await page.locator("[data-project-editor]").evaluate((root) => {
    const toolbar = root.querySelector(".project-editor__toolbar").getBoundingClientRect();
    const output = root.querySelector(".project-editor__preview-toolbar").getBoundingClientRect();
    return { toolbar: [toolbar.left, toolbar.right], output: [output.left, output.right], divider: getComputedStyle(root.querySelector(".project-editor__toolbar-split")).display };
  });
  assert.deepEqual(outputOnlyLayout.output, outputOnlyLayout.toolbar);
  assert.equal(outputOnlyLayout.divider, "none");
  await page.getByRole("button", { name: "Editor" }).click();
  assert.equal(await page.locator(".project-editor__toolbar-split").evaluate((element) => getComputedStyle(element).display), "none");
  assert.equal(await page.getByRole("button", { name: "Expanded view", exact: true }).isHidden(), true);
  await page.getByRole("button", { name: "Split view" }).click();
  const editor = codeSurface(page).locator(".cm-content");
  await editor.click();
  await page.keyboard.press("Control+f");
  await codeSurface(page).locator(".cm-search input[name='search']").waitFor();
  const searchLayout = await codeSurface(page).locator(".cm-panel.cm-search").evaluate((panel) => {
    const panelRect = panel.getBoundingClientRect();
    const controls = [...panel.querySelectorAll("input, button")].map((element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
    });
    return { panel: { left: panelRect.left, right: panelRect.right, top: panelRect.top,
      bottom: panelRect.bottom, height: panelRect.height }, controls };
  });
  // CodeMirror's full search panel includes Find, Replace, options, and their
  // actions. It wraps instead of squeezing or clipping them into one row.
  assert.ok(searchLayout.panel.height < 150, `search panel should remain compact, got ${searchLayout.panel.height}px`);
  assert.ok(searchLayout.controls.every((control) => control.left >= searchLayout.panel.left && control.right <= searchLayout.panel.right));
  assert.ok(searchLayout.controls.every((control) => control.top >= searchLayout.panel.top && control.bottom <= searchLayout.panel.bottom));
  assert.ok(searchLayout.controls[0].right - searchLayout.controls[0].left >= 100, "Find input must remain usable");
  await page.screenshot({ path: join(dataDir, "resources-project-search.png") });
  const beforeReplace = JSON.parse(await page.locator("[data-project-snapshot]").inputValue())
    .files.find(file => file.path === "index.html").content;
  assert.ok(beforeReplace.includes("Hypertext"));
  await codeSurface(page).locator('.cm-search input[name="search"]').pressSequentially("Hypertext");
  await codeSurface(page).locator(".cm-searchMatch").first().waitFor();
  await codeSurface(page).locator('.cm-search input[name="replace"]').pressSequentially("Hyperlink");
  await codeSurface(page).locator('.cm-search button[name="replaceAll"]').click();
  await page.waitForFunction(expected => JSON.parse(document.querySelector("[data-project-snapshot]").value)
    .files.find(file => file.path === "index.html").content === expected,
    beforeReplace.replaceAll("Hypertext", "Hyperlink"));
  await page.keyboard.press("Escape");
  assert.equal(await codeSurface(page).locator(".cm-search").count(), 0);
  assert.equal(await codeSurface(page).locator(".cm-content").evaluate((element) => element.contains(document.activeElement) || element === document.activeElement), true);
  await editor.fill("<h1>First edit</h1>");
  await page.waitForFunction(() => document.querySelector("[data-project-submit]")?.disabled === false);
  assert.equal(await page.locator("[data-project-submit]").textContent(), "Save project");
  await editor.fill("<h1>Second edit</h1>");
  assert.equal(await page.locator("[data-project-submit]").textContent(), "Save project");
  assert.equal(await page.locator("[data-project-submit]").isEnabled(), true);
  await page.getByRole("button", { name: "More save options" }).click();
  await page.getByRole("menuitem", { name: "Save with title…" }).click();
  await page.getByLabel("Version title").fill("Ready for review");
  const publication = page.waitForResponse(response => response.request().method() === "POST" &&
    new URL(response.url()).pathname.startsWith("/projects/"));
  await page.getByRole("button", { name: "Save version" }).click();
  const published = await publication;
  assert.equal(new URLSearchParams(published.request().postData()).get("versionTitle"), "Ready for review",
    "the title reaches the native form before requestSubmit reads it");
  assert.equal(published.status(), 303);
  await page.waitForLoadState("networkidle");
  await page.locator("[data-project-versions-proxy]").waitFor();
  await page.waitForFunction(() => /^\d+ seconds? ago$/.test(document.querySelector("[data-current-version]")?.textContent || ""));
  assert.equal(await page.locator("[data-project-versions-proxy]").evaluate((button) => button.innerText.trim()), "");
  assert.equal(await page.locator("[data-project-versions-proxy] svg").count(), 2);
  assert.equal(await page.locator("[data-project-versions-proxy] .project-editor__history-arrow").count(), 1);
  assert.equal(await page.locator("[data-project-versions-proxy]").getAttribute("aria-label"), "Version history");
  const toolbarControls = await page.evaluate(() => {
    const measure = (selector) => {
      const element = document.querySelector(selector);
      const rect = element.getBoundingClientRect();
      return [rect.width, rect.height];
    };
    return {
      files: measure("[data-project-file-trigger]"),
      history: measure("[data-project-versions-proxy]"),
      overflow: measure("[data-editor-overflow-trigger]"),
      fullScreen: measure("[data-project-present]"),
      close: measure(".project-close"),
      modes: [...document.querySelectorAll(".project-view-segments button")].map((button) => button.getBoundingClientRect().height),
      arrows: [...document.querySelectorAll(".project-editor__file-arrow, .project-editor__history-arrow")].map((arrow) => arrow.getBoundingClientRect().height),
    };
  });
  assert.deepEqual(toolbarControls, {
    files: [45, 30], history: [38, 30], overflow: [30, 30], fullScreen: [30, 30], close: [30, 30], modes: [30, 30, 30], arrows: [11, 11],
  });
  assert.match(await page.locator("[data-current-version]").textContent(), /^\d+ seconds? ago$/);
  await page.locator("[data-project-versions-proxy]").click();
  assert.equal(await page.locator("[data-project-history] .project-editor__popover-head").textContent(), "Version history");
  assert.equal(await page.locator("[data-project-history-close]").count(), 0);
  assert.match(await page.locator("[data-project-version-list] [aria-current='true'] [data-version-time]").textContent(), /^\d+ seconds? ago$/);
  assert.equal(await page.locator("[data-project-version-list] .project-editor__latest").count(), 1);
  const latest = page.locator("[data-project-version-list] [data-version-sequence]", { hasText: "LATEST" }).first();
  await latest.waitFor();
  assert.match(await latest.textContent(), /Ready for review.*\d+ seconds? ago.*LATEST/);
  await page.screenshot({ path: join(dataDir, "resources-version-history.png") });
  await page.locator("[data-project-versions-proxy]").click();
  assert.equal(await page.locator("[data-project-history]").isHidden(), true);
  await codeSurface(page).locator(".cm-content").fill("<h1>Reload recovery marker</h1>");
  await page.waitForFunction(() => document.querySelector("[data-project-editor]")?.dataset.draftDirty === "true");
  assert.match(await page.locator("[data-project-snapshot]").inputValue(), /Reload recovery marker/);
  assert.match(await page.evaluate(() => sessionStorage.getItem(`resources_project_pending_v1:${document.querySelector("[data-project-editor]").dataset.projectId}`)), /Reload recovery marker/);
  let unloadDialogs = 0;
  page.on("dialog", async (dialog) => { unloadDialogs += 1; await dialog.dismiss(); });
  const outputStartupContents = [];
  await page.exposeFunction("recordOutputStartup", text => {
    if (!outputStartupContents.includes(text)) outputStartupContents.push(text);
  });
  await page.addInitScript(() => {
    window.editorStartupContents = [];
    const observer = new MutationObserver(() => {
      const text = document.querySelector(".cm-content")?.textContent;
      if (text && !window.editorStartupContents.includes(text)) window.editorStartupContents.push(text);
      if (document.querySelector("[data-project-editor]")?.dataset.editorMachineStage === "ready") observer.disconnect();
    });
    observer.observe(document, { subtree: true, childList: true, characterData: true });
    // Init scripts also run inside output frames. Keep the record outside the
    // frame so replacing a frame cannot erase evidence of stale first output.
    let previous = "";
    new MutationObserver(() => {
      if (window === window.top) return;
      const heading = document.querySelector("body h1");
      const text = heading?.textContent;
      if (text && text !== previous && heading.getClientRects().length) {
        previous = text;
        window.recordOutputStartup(text);
      }
    }).observe(document, { subtree: true, childList: true, characterData: true, attributes: true });
  });
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(unloadDialogs, 0, "recoverable project edits should not trigger a browser unload warning");
  await page.waitForFunction(() => document.querySelector("[data-project-editor]")?.dataset.editorMachineStage === "ready");
  assert.match(await page.locator("[data-project-snapshot]").inputValue(), /Reload recovery marker/);
  await codeSurface(page).locator(".cm-content").waitFor();
  assert.match(await codeSurface(page).locator(".cm-content").innerText(), /Reload recovery marker/);
  assert.deepEqual(await codeSurface(page).locator("html").evaluate(() => window.editorStartupContents), ["<h1>Reload recovery marker</h1>"],
    "reload must not first render the superseded server snapshot");
  await page.frameLocator("[data-project-output-mount] iframe:not([inert])").getByRole("heading", {
    name: "Reload recovery marker", exact: true,
  }).waitFor();
  assert.deepEqual(outputStartupContents, ["Reload recovery marker"],
    "output must not first show the superseded server snapshot either");
  await page.screenshot({ path: resolve(repoRoot, "../macchiato-work/project-recovered-output.png") });
  await page.waitForFunction(() => document.querySelector("[data-project-save]")?.textContent === "Saved");
  // A candidate is not necessarily a valid or different snapshot. Deferring
  // output must not strand these cases behind their loading indicator.
  for (const candidate of ["malformed", "unchanged"]) {
    await page.evaluate(candidate => {
      const root = document.querySelector("[data-project-editor]");
      sessionStorage.setItem(`resources_project_pending_v1:${root.dataset.projectId}`,
        candidate === "malformed" ? "{" : root.querySelector("[data-project-snapshot]").value);
    }, candidate);
    outputStartupContents.length = 0;
    await page.reload({ waitUntil: "networkidle" });
    await page.frameLocator("[data-project-output-mount] iframe:not([inert])").getByRole("heading", {
      name: "Reload recovery marker", exact: true,
    }).waitFor();
    assert.deepEqual(outputStartupContents, ["Reload recovery marker"], candidate);
    assert.equal(await page.evaluate(() => sessionStorage.getItem(
      `resources_project_pending_v1:${document.querySelector("[data-project-editor]").dataset.projectId}`)), null);
  }
  assert.equal(await page.locator("[data-project-submit]").textContent(), "Save project");
  await page.getByRole("button", { name: "Editor menu" }).click();
  await page.getByRole("menuitem", { name: "Save tab configuration" }).click();
  assert.equal(await page.locator("[data-project-submit]").textContent(), "Save project");
  assert.equal(await page.locator("[data-project-submit]").isEnabled(), true);
  await page.getByRole("button", { name: "Project menu" }).click();
  assert.equal(await page.getByRole("menuitem", { name: "Delete project" }).isVisible(), true);
  await page.screenshot({ path: join(dataDir, "resources-save-controls.png") });
  assert.deepEqual(errors, []);
});

test("large project files remain readable without exceeding the editor service boundary", { timeout: 90_000 }, async t => {
  const port = await getPort(), dataDir = await tempDir();
  const app = startApp(port, dataDir);
  t.after(async () => { await stopChild(app.child); await rm(dataDir, { recursive: true, force: true }); });
  await app.waitForReady;
  const db = new DatabaseSync(join(dataDir, "macchiato.sqlite3"));
  const account = await createAccountStore(createNodeSqliteClient(db)).authenticateIdentity({
    provider: "github", providerUserId: "large-file", login: "large-dev", name: "Large Dev",
    email: "large@example.test", emailVerified: true,
  });
  db.close();
  const session = await seal({ v: 1, sub: account.id, login: account.login, name: account.name,
    iat: Date.now(), exp: Date.now() + 300_000 }, "local-preview-session-signing-key");
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.context().addCookies([{ name: "resources_session", value: session,
    domain: "resources-edge.localhost", path: "/", httpOnly: true, sameSite: "Lax" }]);
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  const large = "First line\n" + "y".repeat(65535) + "😀\n" +
    '<img src="https://example.invalid/not-a-request">\n' +
    ("source " + "x".repeat(180) + "\n").repeat(12000) + "Last line\n";
  const snapshot = { files: [
    { path: "index.html", content: "<h1>Large file fixture</h1>" },
    { path: "large.txt", content: large },
    { path: "many-lines.txt", content: "line\n".repeat(6000) },
  ], config: { entry: "index.html", template: "html" } };
  await page.goto(`http://resources-edge.localhost:${port}/projects/new`, { waitUntil: "networkidle" });
  await codeSurface(page).locator(".cm-content").waitFor();
  const image = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024; canvas.height = 768;
    const context = canvas.getContext("2d"), pixels = context.createImageData(canvas.width, canvas.height);
    let random = 1;
    for (let at = 0; at < pixels.data.length; at += 4) {
      random ^= random << 13; random ^= random >>> 17; random ^= random << 5;
      pixels.data[at] = random & 255;
      pixels.data[at + 1] = random >>> 8 & 255;
      pixels.data[at + 2] = random >>> 16 & 255;
      pixels.data[at + 3] = 255;
    }
    context.putImageData(pixels, 0, 0);
    return canvas.toDataURL("image/png");
  });
  assert.ok(image.length > 2 * 1024 * 1024, "the image also crosses the service boundary");
  snapshot.files.push({ path: "large.png", content: image });
  await page.locator("[data-project-archive-file]").setInputFiles({ name: "large.zip",
    mimeType: "application/zip", buffer: Buffer.from(encodeProjectArchive(snapshot)) });
  await page.frameLocator("[data-project-output-mount] iframe:not([inert])").getByRole("heading", { name: "Large file fixture" }).waitFor();
  await page.locator("[data-project-file-trigger]").click();
  await page.locator('[data-project-file="large.txt"]').click();
  try {
    await page.locator(".project-editor__asset-view").getByText("First line", { exact: false }).waitFor({ timeout: 5000 });
  } catch (error) {
    t.diagnostic(JSON.stringify({ errors, status: await page.locator("[data-project-status]").textContent() }));
    throw error;
  }
  const panel = page.locator(".project-editor__asset-view");
  const source = panel.getByLabel("File source");
  const parts = [];
  for (;;) {
    const part = await source.textContent();
    assert.ok(part.length <= 64 * 1024);
    parts.push(part);
    if (await panel.getByRole("button", { name: "Next section" }).isDisabled()) break;
    await panel.getByRole("button", { name: "Next section" }).click();
  }
  assert.equal(parts.join(""), large, "paging presents every original character once");
  await panel.getByRole("button", { name: "Previous section" }).click();
  assert.equal(await source.textContent(), parts.at(-2));
  for (const colorScheme of ["light", "dark"]) for (const width of [1440, 390]) {
    await page.emulateMedia({ colorScheme });
    await page.waitForFunction(theme => document.documentElement.dataset.theme === theme, colorScheme);
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    if (width === 390) await page.getByRole("button", { name: "Editor", exact: true }).click();
    const bounds = await panel.evaluate(node => {
      const rect = node.getBoundingClientRect(), pre = node.querySelector("[role=document]");
      const next = node.querySelector("button:last-child").getBoundingClientRect();
      return { bottom: rect.bottom, right: rect.right, width: innerWidth, height: innerHeight,
        nextBottom: next.bottom, nextRight: next.right, background: getComputedStyle(node).backgroundColor,
        scrollable: pre.scrollHeight > pre.clientHeight, overflow: getComputedStyle(pre).overflowY,
        fontFamily: getComputedStyle(pre).fontFamily };
    });
    assert.ok(bounds.bottom <= bounds.height + 1 && bounds.right <= bounds.width + 1, JSON.stringify(bounds));
    assert.ok(bounds.nextBottom <= bounds.height + 1 && bounds.nextRight <= bounds.width + 1, JSON.stringify(bounds));
    assert.equal(bounds.overflow, "auto");
    assert.equal(bounds.fontFamily, "monospace");
    assert.equal(bounds.scrollable, true);
    assert.equal(bounds.background, colorScheme === "light" ? "rgb(250, 250, 248)" : "rgb(30, 29, 27)");
    assert.equal(await panel.locator("img").count(), 0, "source markup is text, never active DOM");
    await page.screenshot({ path: resolve(repoRoot, `../macchiato-work/large-source-${colorScheme}-${width}.png`) });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator("[data-project-file-trigger]").click();
  await page.locator('[data-project-file="many-lines.txt"]').click();
  assert.equal(await source.textContent(), snapshot.files[2].content);
  assert.equal(await panel.getByRole("button", { name: "Next section" }).isDisabled(), true);
  await page.locator("[data-project-file-trigger]").click();
  await page.locator('[data-project-file="large.png"]').click();
  try {
    await page.waitForFunction(() => document.querySelector(".project-editor__image-view")?.naturalWidth === 1024, null, { timeout: 5000 });
  } catch (error) {
    t.diagnostic(JSON.stringify({ errors, image: await page.locator(".project-editor__image-view").evaluateAll(nodes =>
      nodes.map(node => ({ complete: node.complete, length: node.getAttribute("src")?.length, width: node.naturalWidth }))) }));
    throw error;
  }
  assert.equal(await page.locator(".project-editor__image-view").getAttribute("src"), image);
  await page.getByRole("button", { name: "Editor menu" }).click();
  const downloading = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "Export ZIP" }).click();
  const exported = await decodeProjectArchive(await readFile(await (await downloading).path()));
  assert.deepEqual(exported.files.map(file => file.path).sort(), snapshot.files.map(file => file.path).sort());
  for (const file of snapshot.files) {
    assert.ok(exported.files.find(entry => entry.path === file.path)?.content === file.content,
      `reading never rewrites the exported bytes of ${file.path}`);
  }
  await page.locator('[data-tab-path="index.html"] [role="tab"]').click();
  await codeSurface(page).locator(".cm-content").click();
  await codeSurface(page).locator(".cm-content").press("Control+End");
  await page.keyboard.insertText("<p>Still editable</p>");
  await page.frameLocator("[data-project-output-mount] iframe:not([inert])").getByText("Still editable").waitFor();
  assert.deepEqual(errors, []);
});

test("project resources survive session recovery, API saves, native publication, and ZIP export", { timeout: 120_000 }, async t => {
  const started = performance.now();
  const checkpoint = name => t.diagnostic(`${name}: ${Math.round(performance.now() - started)} ms`);
  const port = await getPort(), dataDir = await tempDir();
  const app = startApp(port, dataDir);
  t.after(async () => { await stopChild(app.child); await rm(dataDir, { recursive: true, force: true }); });
  await app.waitForReady;
  const db = new DatabaseSync(join(dataDir, "macchiato.sqlite3"));
  const account = await createAccountStore(createNodeSqliteClient(db)).authenticateIdentity({
    provider: "github", providerUserId: "asset-recovery", login: "asset-dev", name: "Asset Dev",
    email: "asset@example.test", emailVerified: true,
  });
  db.close();
  const session = await seal({ v: 1, sub: account.id, login: account.login, name: account.name,
    iat: Date.now(), exp: Date.now() + 300_000 }, "local-preview-session-signing-key");
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  // Compare complete exported host/guest sets, never a mismatched single file.
  if (process.env.MACCHIATO_TEST_ASSETS_DIRECTORY) {
    const directory = resolve(process.env.MACCHIATO_TEST_ASSETS_DIRECTORY);
    await page.route("**/-/resources-site/**", async route => {
      const name = new URL(route.request().url()).pathname.split("/").pop();
      const contentType = name.endsWith(".js") ? "text/javascript" : name.endsWith(".wasm")
        ? "application/wasm" : name.endsWith(".html") ? "text/html" : name.endsWith(".css")
        ? "text/css" : "application/octet-stream";
      await route.fulfill({ body: await readFile(join(directory, name)), contentType });
    });
  }
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.context().addCookies([{ name: "resources_session", value: session,
    domain: "resources-edge.localhost", path: "/", httpOnly: true, sameSite: "Lax" }]);
  const source = name => ({ files: [
    { path: "index.html", content: '<h1 id="result">Loading resource</h1><script src="data.js"></script>' },
    { path: "data.js", content: `/*${"x".repeat(70 * 1024)}*/\ndocument.getElementById("result").textContent = "${name}";` },
    { path: "tile.svg", content: `<svg viewBox="0 0 24 24"><title>${name}</title><circle r="4"/></svg>` },
  ], config: { entry: "index.html", template: "html" } });
  const original = source("Original resource"), changed = source("Recovered resource");
  const output = page.frameLocator("[data-project-output-mount] iframe:not([inert])");
  const filesOf = snapshot => Object.fromEntries(snapshot.files.map(file => [file.path, file.content]));
  async function fillSessionStorage() {
    const quota = await page.evaluate(() => {
      let filler = "", errorName;
      for (let step = 128 * 1024; step >= 1; step /= 2) {
        for (;;) {
          const next = filler + "x".repeat(step);
          try { sessionStorage.setItem("quota-fixture", next); filler = next; }
          catch (error) { errorName = error.name; break; }
        }
      }
      return errorName;
    });
    assert.equal(quota, "QuotaExceededError", "exercise the browser's real storage quota");
  }
  async function importSnapshot(snapshot) {
    await page.locator("[data-project-archive-file]").setInputFiles({ name: "resource.zip",
      mimeType: "application/zip", buffer: Buffer.from(encodeProjectArchive(snapshot)) });
    try {
      // Import clears the input when it finishes. Autosave may replace the
      // transient status before Playwright samples it, so verify completion
      // and the actual exported bytes instead of racing a button label.
      await page.waitForFunction(() => document.querySelector("[data-project-archive-file]")?.files.length === 0);
      assert.deepEqual(await exportedFiles(), filesOf(snapshot), "the imported files remain complete and exportable");
    } catch (error) {
      t.diagnostic(JSON.stringify({ errors, importState: await page.evaluate(() => ({
        button: document.querySelector("[data-project-save]")?.textContent,
        status: document.querySelector("[data-project-status]")?.textContent,
        editor: { ...document.querySelector("[data-project-editor]")?.dataset },
        files: JSON.parse(document.querySelector("[data-project-snapshot]").value).files
          .map(file => ({ path: file.path, length: file.content.length })),
      })) }));
      await page.screenshot({ path: resolve(repoRoot, "../macchiato-work/project-resource-import-failed.png") });
      throw error;
    }
  }
  async function exportedFiles() {
    await page.getByRole("button", { name: "Editor menu" }).click();
    const downloading = page.waitForEvent("download");
    await page.getByRole("menuitem", { name: "Export ZIP" }).click();
    return filesOf(await decodeProjectArchive(await readFile(await (await downloading).path())));
  }
  await page.goto(`http://resources-edge.localhost:${port}/projects/new`, { waitUntil: "networkidle" });
  await codeSurface(page).locator(".cm-content").waitFor();
  await importSnapshot(original);
  await output.getByRole("heading", { name: "Original resource", exact: true }).waitFor();
  checkpoint("initial import and output");
  await page.getByLabel("Title", { exact: true }).fill("Resource recovery");
  const creating = page.waitForResponse(response => response.request().method() === "POST" &&
    new URL(response.url()).pathname === "/projects");
  await page.getByRole("button", { name: "Create project" }).click();
  const created = await creating;
  const submitted = JSON.parse(new URLSearchParams(created.request().postData()).get("snapshot"));
  assert.deepEqual(filesOf(submitted), filesOf(original), "native creation must not persist handles");
  assert.equal(created.status(), 303);
  await page.waitForLoadState("networkidle");
  await page.waitForFunction(() => document.querySelector("[data-project-editor]")?.dataset.editorMachineStage === "ready");
  await output.getByRole("heading", { name: "Original resource", exact: true }).waitFor();

  const key = await page.locator("[data-project-editor]").getAttribute("data-project-id")
    .then(id => `resources_project_pending_v1:${id}`);
  // A valid old JSON snapshot can fit native storage yet exceed the service
  // limit after being escaped again as its reply value. Keep it for recovery;
  // failing to read it must not prevent the saved project from opening.
  const oversizedLength = await page.evaluate(key => {
    const record = JSON.stringify({ files: [{ path: "index.html", content: "\\".repeat(550000) }], config: {} });
    sessionStorage.setItem(key, record);
    return record.length;
  }, key);
  await page.reload({ waitUntil: "domcontentloaded" });
  await codeSurface(page).locator(".cm-content").waitFor({ timeout: 10000 });
  await output.getByRole("heading", { name: "Original resource", exact: true }).waitFor();
  await page.locator("[data-project-status]").getByText(/Draft recovery failed.*Storage response exceeds its text limit/).waitFor();
  assert.equal(await page.evaluate(key => sessionStorage.getItem(key)?.length, key), oversizedLength);
  await page.evaluate(key => sessionStorage.removeItem(key), key);
  await page.reload({ waitUntil: "networkidle" });
  await codeSurface(page).locator(".cm-content").waitFor();
  await output.getByRole("heading", { name: "Original resource", exact: true }).waitFor();

  checkpoint("created project and oversized recovery rejection");
  // Keep the server checkpoint unchanged while staging a new asset-bearing
  // snapshot. This failure is confined to the disposable fixture's autosave.
  let rejectSave = true;
  await page.route("**/api/projects/*/snapshot", route => rejectSave
    ? route.fulfill({ status: 503, contentType: "application/json", body: '{"message":"Fixture autosave held"}' })
    : route.continue());
  await importSnapshot(changed);
  const pending = await page.evaluate(key => JSON.parse(sessionStorage.getItem(key)), key);
  assert.equal(pending.format, "resources-project-session-v1");
  assert.equal(pending.resources.length, 2);
  assert.ok(pending.value.length < 5000, "the guest snapshot stays compact");
  rejectSave = false;
  await page.reload({ waitUntil: "networkidle" });
  await output.getByRole("heading", { name: "Recovered resource", exact: true }).waitFor();
  await page.waitForFunction(() => document.querySelector("[data-project-save]")?.textContent === "Saved");
  assert.equal(await page.evaluate(key => sessionStorage.getItem(key), key), null);
  const workspaceUrl = await page.locator("[data-project-snapshot-url]").getAttribute("data-project-snapshot-url");
  const workspace = await (await page.request.get(new URL(workspaceUrl, page.url()).href)).json();
  assert.deepEqual(filesOf(workspace.snapshot), filesOf(changed), "autosave sends actual resource bytes");
  assert.deepEqual(await exportedFiles(), filesOf(changed));
  checkpoint("recovered snapshot autosave and export");

  await page.locator("[data-project-file-trigger]").click();
  await page.locator('[data-project-file="data.js"]').click();
  await codeSurface(page).locator(".cm-content").press("Control+End");
  await codeSurface(page).locator(".cm-content").getByText(/Recovered resource/).waitFor();
  assert.doesNotMatch(await codeSurface(page).locator(".cm-content").textContent(), /resources-project-resource:/);
  const publishing = page.waitForResponse(response => response.request().method() === "POST" &&
    new URL(response.url()).pathname.startsWith("/projects/"));
  await page.getByRole("button", { name: "Save project", exact: true }).click();
  const published = await publishing;
  assert.deepEqual(filesOf(JSON.parse(new URLSearchParams(published.request().postData()).get("snapshot"))),
    filesOf(changed), "native publication also sends bytes");
  assert.equal(published.status(), 303);
  await page.waitForLoadState("networkidle");

  await page.waitForFunction(() => document.querySelector("[data-project-editor]")?.dataset.editorMachineStage === "ready");
  await page.locator('[data-tab-path="index.html"] [role="tab"]').click();
  checkpoint("native publication");
  await fillSessionStorage();
  checkpoint("saved project storage filled");
  const savedUnderQuota = structuredClone(changed);
  savedUnderQuota.files.find(file => file.path === "index.html").content += '<!--' + "x".repeat(4096) + '-->';
  await codeSurface(page).locator(".cm-content").click();
  await codeSurface(page).locator(".cm-content").press("Control+a");
  await page.keyboard.insertText(savedUnderQuota.files.find(file => file.path === "index.html").content);
  await page.getByText(/Draft recovery could not be saved/).waitFor();
  await page.waitForFunction(() => document.querySelector("[data-project-editor]")?.dataset.draftState === "saved");
  await page.getByText(/Draft recovery could not be saved/).waitFor({ state: "hidden" });
  const autosavedUnderQuota = await (await page.request.get(new URL(workspaceUrl, page.url()).href)).json();
  assert.deepEqual(filesOf(autosavedUnderQuota.snapshot),
    filesOf(savedUnderQuota), "server autosave continues when the local recovery write fails");
  await page.evaluate(() => sessionStorage.removeItem("quota-fixture"));
  await codeSurface(page).locator(".cm-content").press("Control+a");
  await page.keyboard.insertText(changed.files.find(file => file.path === "index.html").content);
  await page.waitForFunction(() => document.querySelector("[data-project-editor]")?.dataset.draftState === "saved");

  const expired = JSON.stringify({ ...changed, files: changed.files.map(file =>
    file.path === "tile.svg" ? { ...file, content: "\0resources-project-resource:1" } : file) });
  await page.evaluate(({ key, expired }) => sessionStorage.setItem(key, expired), { key, expired });
  await page.reload({ waitUntil: "networkidle" });
  try {
    await page.getByText(/Draft recovery failed:.*Stored recovery data was kept/).waitFor({ timeout: 10_000 });
  } catch (error) {
    t.diagnostic(JSON.stringify({ errors, text: await page.locator("[data-project-editor]").innerText() }));
    await page.screenshot({ path: resolve(repoRoot, "../macchiato-work/resource-recovery-warning-failure.png") });
    throw error;
  }
  assert.equal(await page.evaluate(key => sessionStorage.getItem(key), key), expired);
  await output.getByRole("heading", { name: "Recovered resource", exact: true }).waitFor();
  await page.screenshot({ path: resolve(repoRoot, "../macchiato-work/resource-recovery-warning.png") });
  checkpoint("quota autosave and expired recovery rejection");
  await page.evaluate(key => sessionStorage.removeItem(key), key);

  // Unsaved-project history uses the same transport without flattening its
  // patches or copying all resource bytes into the MicroQuickJS application.
  await page.goto(`http://resources-edge.localhost:${port}/projects/new`, { waitUntil: "networkidle" });
  await codeSurface(page).locator(".cm-content").waitFor();
  for (const snapshot of [original, changed]) {
    await importSnapshot(snapshot);
    await page.waitForFunction(() => document.querySelector("[data-project-editor]")?.dataset.draftState === "saved");
  }
  await page.reload({ waitUntil: "networkidle" });
  await output.getByRole("heading", { name: "Recovered resource", exact: true }).waitFor();
  assert.deepEqual(await exportedFiles(), filesOf(changed));
  await page.screenshot({ path: resolve(repoRoot, "../macchiato-work/resource-recovery-draft.png") });
  checkpoint("unsaved project history recovery");

  const retained = await page.evaluate(() => sessionStorage.getItem("resources_project_draft_v5"));
  await fillSessionStorage();
  checkpoint("unsaved project storage filled");
  const unsaved = '<h1>After quota</h1><!--' + "x".repeat(4096) + '-->';
  const content = codeSurface(page).locator(".cm-content");
  await content.click();
  await content.press("Control+a");
  await page.keyboard.insertText(unsaved);
  try { await page.getByText(/Draft recovery could not be saved/).waitFor({ timeout: 10_000 }); }
  catch (error) {
    t.diagnostic(JSON.stringify({ errors, status: await page.locator("[data-project-status]").textContent() }));
    throw error;
  }
  await output.getByRole("heading", { name: "After quota", exact: true }).waitFor();
  assert.equal(await page.evaluate(() => sessionStorage.getItem("resources_project_draft_v5")), retained);
  assert.equal((await exportedFiles())["index.html"], unsaved, "latest edits remain exportable despite quota failure");
  assert.notEqual(await page.locator("[data-project-editor]").getAttribute("data-draft-state"), "saved");
  async function checkWarningLayout() {
    await page.getByRole("button", { name: "Retry", exact: true }).waitFor({ state: "visible" });
    const warningLayout = await page.locator("[data-project-status]").evaluate(node => {
      const box = node.getBoundingClientRect(), retry = node.querySelector("button").getBoundingClientRect();
      return { overflow: node.scrollWidth > node.clientWidth, retryFits: retry.left >= box.left &&
        retry.right <= box.right && retry.top >= box.top && retry.bottom <= box.bottom,
        onscreen: box.top >= 0 && box.bottom <= innerHeight && box.right <= innerWidth };
    });
    assert.deepEqual(warningLayout, { overflow: false, retryFits: true, onscreen: true });
  }
  await checkWarningLayout();
  await page.screenshot({ path: resolve(repoRoot, "../macchiato-work/resource-recovery-quota.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => document.querySelector(".project-editor__workspace").dataset.view === "preview");
  await checkWarningLayout();
  await page.screenshot({ path: resolve(repoRoot, "../macchiato-work/resource-recovery-quota-phone-output.png") });
  await page.getByRole("button", { name: "Editor", exact: true }).click();
  await checkWarningLayout();
  await page.screenshot({ path: resolve(repoRoot, "../macchiato-work/resource-recovery-quota-phone-editor.png") });
  checkpoint("quota warning desktop and phone layouts");
  await page.locator("[data-project-versions-proxy]").click();
  await page.locator("[data-project-history] [data-version-sequence]").last().click();
  const historical = await page.locator("[data-project-snapshot]").inputValue();
  await page.evaluate(() => sessionStorage.removeItem("quota-fixture"));
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await page.waitForFunction(() => document.querySelector("[data-project-editor]")?.dataset.draftState === "saved");
  await page.getByText(/Draft recovery could not be saved/).waitFor({ state: "hidden" });
  assert.equal(await page.locator("[data-project-snapshot]").inputValue(), historical, "retry does not change the selected history view");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.reload({ waitUntil: "networkidle" });
  await output.getByRole("heading", { name: "After quota", exact: true }).waitFor();
  await content.click();
  await content.press("Control+a");
  await page.keyboard.insertText("<h1>Storage recovered</h1>");
  await page.waitForFunction(() => document.querySelector("[data-project-editor]")?.dataset.draftState === "saved");
  await page.getByText(/Draft recovery could not be saved/).waitFor({ state: "hidden" });
  await page.reload({ waitUntil: "networkidle" });
  await output.getByRole("heading", { name: "Storage recovered", exact: true }).waitFor();
  checkpoint("retry and reload complete");
  assert.deepEqual(errors, []);
});

test("CodeMirror Find/Replace remains usable in both themes and narrow workspaces", async (t) => {
  const port = await getPort(), dataDir = await tempDir();
  const app = startApp(port, dataDir);
  t.after(async () => { await stopChild(app.child); await rm(dataDir, { recursive: true, force: true }); });
  await app.waitForReady;
  const browser = await chromium.launch();
  t.after(async () => browser.close());
  for (const colorScheme of ["light", "dark"]) for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 844 }, colorScheme });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`http://resources-edge.localhost:${port}/try`);
    await page.waitForFunction(() => document.querySelector("[data-project-editor]")?.dataset.editorMachineStage === "ready");
    if (width < 760) await page.getByRole("button", { name: "Editor", exact: true }).click();
    await codeSurface(page).locator(".cm-content").click();
    await page.keyboard.press("Control+f");
    const search = codeSurface(page).locator(".cm-panel.cm-search");
    await search.waitFor();
    const layout = await search.evaluate(panel => {
      const rect = panel.getBoundingClientRect();
      const controls = [...panel.querySelectorAll("input,button")];
      const close = panel.querySelector('[name="close"]').getBoundingClientRect();
      return { clipped: controls.some(control => {
        const box = control.getBoundingClientRect();
        return box.left < rect.left || box.right > rect.right || box.top < rect.top || box.bottom > rect.bottom;
      }), obscured: controls.some(control => {
        const box = control.getBoundingClientRect();
        return control.name !== "close" && box.left < close.right && box.right > close.left &&
          box.top < close.bottom && box.bottom > close.top;
      }), inputWidth: panel.querySelector('[name="search"]').getBoundingClientRect().width };
    });
    assert.equal(layout.clipped, false, `${colorScheme}, ${width}px: controls remain inside the panel`);
    assert.equal(layout.obscured, false, `${colorScheme}, ${width}px: close does not cover another control`);
    assert.ok(layout.inputWidth >= 100, `${colorScheme}, ${width}px: usable Find field`);
    const before = JSON.parse(await page.locator("[data-project-snapshot]").inputValue())
      .files.find(file => file.path === "index.html").content;
    await search.locator('[name="search"]').pressSequentially("Hypertext");
    await codeSurface(page).locator(".cm-searchMatch").first().waitFor();
    await search.locator('input[name="replace"]').pressSequentially("Hyperlink");
    await search.locator('[name="replaceAll"]').click();
    await page.waitForFunction(expected => JSON.parse(document.querySelector("[data-project-snapshot]").value)
      .files.find(file => file.path === "index.html").content === expected, before.replaceAll("Hypertext", "Hyperlink"));
    await page.screenshot({ path: join(process.env.MACCHIATO_TEST_ARTIFACTS || dataDir, `search-${colorScheme}-${width}.png`) });
    await page.keyboard.press("Escape");
    assert.equal(await search.count(), 0);
    const mount = page.locator(".project-editor__source > .project-editor__mount");
    assert.equal(await mount.evaluate(node => getComputedStyle(node).position), "absolute");
    const beforeWarning = await mount.boundingBox();
    // Exercise a wrapped status row without crashing a machine just to expose
    // the layout. It must reserve space, not overlay the editor's last line.
    await page.locator(".project-editor__source").evaluate(source => {
      const warning = document.createElement("div");
      warning.className = "project-editor__status";
      warning.dataset.state = "error";
      warning.dataset.layoutFixture = "true";
      warning.textContent = "A recoverable editor error with enough detail to wrap on a narrow screen. Your draft is still available.";
      source.append(warning);
    });
    const bounds = await mount.evaluate(node => {
      const editor = node.getBoundingClientRect(), source = node.parentElement.getBoundingClientRect();
      const status = node.parentElement.querySelector("[data-layout-fixture]").getBoundingClientRect();
      return { editorBottom: editor.bottom, editorHeight: editor.height, statusTop: status.top,
        statusBottom: status.bottom, sourceBottom: source.bottom };
    });
    assert.ok(bounds.editorHeight > 200 && bounds.editorHeight < beforeWarning.height, JSON.stringify({ bounds, beforeWarning }));
    assert.ok(bounds.editorBottom <= bounds.statusTop && bounds.statusBottom <= bounds.sourceBottom);
    await page.screenshot({ path: join(process.env.MACCHIATO_TEST_ARTIFACTS || dataDir, `editor-status-${colorScheme}-${width}.png`) });
    await page.locator("[data-layout-fixture]").evaluate(node => node.remove());
    assert.ok(Math.abs((await mount.boundingBox()).height - beforeWarning.height) < 1);
    assert.deepEqual(errors, []);
    await page.close();
  }
});

test("Resources Edge manages usernames, invitations, notifications, and roles in Chromium", async (t) => {
  const port = await getPort();
  const dataDir = await tempDir();
  const app = startApp(port, dataDir);
  t.after(async () => { await stopChild(app.child); await rm(dataDir, { recursive: true, force: true }); });
  await app.waitForReady;

  const db = new DatabaseSync(join(dataDir, "macchiato.sqlite3"));
  const accounts = createAccountStore(createNodeSqliteClient(db));
  const owner = await accounts.authenticateIdentity({ provider: "github", providerUserId: "org-owner", login: "owner-user", name: "Owner User", email: "owner@example.test", emailVerified: true });
  const invited = await accounts.authenticateIdentity({ provider: "github", providerUserId: "org-invited", login: "invited-user", name: "Invited User", email: "invited@example.test", emailVerified: true });
  db.close();
  async function sessionFor(account) {
    return seal({ v: 1, sub: account.id, provider: "github", login: account.login, name: account.name, iat: Date.now(), exp: Date.now() + 300_000 }, "local-preview-session-signing-key");
  }

  const browser = await chromium.launch();
  t.after(async () => browser.close());
  const ownerPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [], editorRequests = [];
  ownerPage.on("pageerror", error => errors.push(error.message));
  ownerPage.on("request", request => {
    if (/project-editor.*\.(?:wasm|bin)(?:\?|$)/.test(request.url())) editorRequests.push(request.url());
  });
  await ownerPage.context().addCookies([{ name: "resources_session", value: await sessionFor(owner), domain: "resources-edge.localhost", path: "/", httpOnly: true, sameSite: "Lax" }]);
  await ownerPage.goto(`http://resources-edge.localhost:${port}/organizations/new`);
  await ownerPage.waitForFunction(() => document.documentElement.dataset.resourcesFrontendMachineState === "ready");
  const organizationName = ownerPage.getByLabel("Name", { exact: true });
  await organizationName.fill("chosen-name");
  await ownerPage.getByLabel("Title", { exact: true }).fill("First title");
  assert.equal(await organizationName.inputValue(), "chosen-name", "a manual name survives the first title edit");
  await organizationName.fill("");
  await ownerPage.getByLabel("Title", { exact: true }).fill("Browser Team");
  assert.equal(await organizationName.inputValue(), "browser-team",
    "the outer guest must initialize organization name generation without an editor machine");
  await organizationName.fill("bad_name");
  assert.equal(await organizationName.evaluate(input => input.checkValidity()), false);
  await organizationName.fill("browser-team");
  assert.equal(await organizationName.evaluate(input => input.checkValidity()), true);
  await ownerPage.getByLabel("Description (optional)").fill("A browser-tested café organization.");
  await ownerPage.getByRole("button", { name: "Create organization" }).click();
  await ownerPage.getByRole("link", { name: /Browser Team/ }).click();
  await ownerPage.getByRole("heading", { name: "Invite an existing user" }).waitFor();
  await ownerPage.getByLabel("Username").fill("invited-user");
  await ownerPage.getByLabel("Role").selectOption("admin");
  const inviteResponsePromise = ownerPage.waitForResponse((response) =>
    response.request().method() === "POST" && response.url().includes("/invitations"));
  await ownerPage.getByRole("button", { name: "Send invitation" }).click();
  const inviteResponse = await inviteResponsePromise;
  assert.equal(inviteResponse.status(), 303,
    inviteResponse.status() === 303 ? undefined : await inviteResponse.text());
  await ownerPage.waitForTimeout(300);
  await ownerPage.screenshot({ path: join(dataDir, "resources-organization-admin.png"), fullPage: true });

  const invitedPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  invitedPage.on("pageerror", error => errors.push(error.message));
  await invitedPage.context().addCookies([{ name: "resources_session", value: await sessionFor(invited), domain: "resources-edge.localhost", path: "/", httpOnly: true, sameSite: "Lax" }]);
  await invitedPage.goto(`http://resources-edge.localhost:${port}/`);
  await invitedPage.getByLabel("Notifications").click();
  await invitedPage.getByText(/invited you to join Browser Team as admin/).waitFor();
  const markResponsePromise = invitedPage.waitForResponse((response) =>
    response.request().method() === "POST" && response.url().includes("/notifications/"));
  await invitedPage.getByRole("button", { name: "Mark read" }).click();
  const markResponse = await markResponsePromise;
  assert.equal(markResponse.status(), 303,
    markResponse.status() === 303 ? undefined : await markResponse.text());
  await invitedPage.waitForLoadState("domcontentloaded");
  await invitedPage.getByLabel("Notifications").click();
  await invitedPage.getByRole("button", { name: "Accept" }).click();
  await invitedPage.getByRole("heading", { name: "Browser Team" }).waitFor();
  await invitedPage.waitForTimeout(300);
  await invitedPage.screenshot({ path: join(dataDir, "resources-organization-mobile.png"), fullPage: true });

  await ownerPage.reload();
  await ownerPage.getByLabel("Role for invited-user").selectOption("member");
  await ownerPage.getByRole("button", { name: "Change role" }).click();
  assert.equal(await ownerPage.getByLabel("Role for invited-user").inputValue(), "member");

  await invitedPage.goto(`http://resources-edge.localhost:${port}/profile`);
  await invitedPage.getByLabel("Username").fill("renamed-user");
  await invitedPage.getByRole("button", { name: "Save username" }).click();
  assert.equal(await invitedPage.getByLabel("Username").inputValue(), "renamed-user");
  assert.deepEqual(errors, []);
  assert.deepEqual(editorRequests, [], "ordinary account forms do not start a project editor");
});

test("resources design raw file site renders through the server in a real browser", async (t) => {
  const port = await getPort();
  const dataDir = await tempDir();
  const app = startApp(port, dataDir);
  t.after(async () => {
    await stopChild(app.child);
    await rm(dataDir, { recursive: true, force: true });
  });

  await app.waitForReady;
  const browser = await chromium.launch();
  t.after(async () => browser.close());
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  const consoleErrors = [];
  const badResponses = [];

  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("response", (response) => {
    if (response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`);
  });

  const response = await page.goto(`http://resources-design.localhost:${port}/`, { waitUntil: "networkidle" });
  await assert.doesNotReject(page.locator(".layout").waitFor());
  await assert.doesNotReject(page.getByText("Resources.co", { exact: true }).first().waitFor());
  assert.equal(response.status(), 200);
  assert.equal(await page.locator("#__bundler_thumbnail").count(), 0);
  assert.deepEqual(errors, []);
  assert.deepEqual(consoleErrors, []);
  assert.deepEqual(badResponses, []);
});

test("resources website no longer exposes Claude export bundle routes", async () => {
  const exportIndex = await resourcesWebsiteHandler(new Request("http://resources-website.localhost/export/index.html"));
  const loader = await resourcesWebsiteHandler(new Request("http://resources-website.localhost/export/loader.js"));

  assert.equal(exportIndex.status, 404);
  assert.equal(loader.status, 404);
});

test("resources sqlite site is mounted on a subdomain with friendly paths", async (t) => {
  const port = await getPort();
  const dataDir = await tempDir();
  const app = startApp(port, dataDir);
  t.after(async () => {
    await stopChild(app.child);
    await rm(dataDir, { recursive: true, force: true });
  });

  await app.waitForReady;
  const home = await fetch(`http://resources-co.localhost:${port}/`);
  const homeHtml = await home.text();
  const project = await fetch(`http://resources-co.localhost:${port}/macchiato/app`);
  const projectHtml = await project.text();
  const docs = await fetch(`http://resources-co.localhost:${port}/docs`);
  const docsHtml = await docs.text();
  const missing = await fetch(`http://resources-co.localhost:${port}/export/index.html`);
  const missingHtml = await missing.text();

  assert.equal(home.status, 200);
  assert.match(homeHtml, /<title>Resources\.co<\/title>/);
  assert.match(homeHtml, /href="\/macchiato\/app"/);
  assert.doesNotMatch(homeHtml, /href="#macchiato\/app"/);
  assert.equal(project.status, 200);
  assert.match(projectHtml, /<title>App - Resources\.co<\/title>/);
  assert.match(projectHtml, /<header class="box focused-header" data-screen-label="brand">/);
  assert.match(projectHtml, /class="home-ic" href="\/" aria-label="Home"/);
  assert.match(projectHtml, /aria-label="Breadcrumb"/);
  assert.match(projectHtml, /href="\/macchiato"/);
  assert.match(projectHtml, /<h1>App<\/h1>/);
  assert.equal(docs.status, 200);
  assert.match(docsHtml, /href="\/docs\/dom-use" target="_blank" rel="noopener noreferrer"/);
  assert.match(docsHtml, /Structured, schema-controlled DOM access/);
  assert.equal(missing.status, 404);
  assert.match(missingHtml, /This block has not been composed yet\./);
  assert.match(missingHtml, /href="\/browse"/);
});

test("resources sqlite site CSS is constrained by its site schema", () => {
  const css = buildResourcesSiteRoutes()[0].css;

  assert.equal(validateResourcesStylesheet(css), true);
  assert.equal(validateResourcesStylesheet(`${css}\n:root { --accent: #31d6c9; --gap: 24px; }`), true);
  assert.equal(validateResourcesStylesheet(`${css}\n.block { margin-top: 18px; }`), true);
  assert.equal(validateResourcesStylesheet(`${css}\n.project-editor__mount { contain: size; }`), true);
  assert.throws(() => validateResourcesStylesheet(`${css}\n.project-editor__mount { contain: paint; }`),
    /CSS value not allowed for contain/);
  assert.throws(
    () => validateResourcesStylesheet(`${css}\n.evil { filter: blur(4px); }`),
    /CSS property not allowed: filter/,
  );
  assert.throws(
    () => validateResourcesStylesheet(`${css}\n.block { color: rebeccapurple; }`),
    /CSS value not allowed for color/,
  );
  assert.throws(
    () => validateResourcesStylesheet(`${css}\n.box { background: conic-gradient(red, blue); }`),
    /CSS value not allowed for background/,
  );
  assert.throws(
    () => validateResourcesStylesheet(`${css}\n.evil { src: url("/-/fonts/other/font.woff2"); }`),
    /CSS URL not allowed/,
  );
});

test("resources sqlite site DOM schema composes layout block definitions", async () => {
  const schema = JSON.parse(await readFile(join(resourcesSiteDir, "dom.schema.json"), "utf8"));
  const domUse = new DomUse(schema);
  const doc = domUse.createDocument();
  const layout = doc.createElement("main");
  const brand = doc.createElement("header");
  const toggle = doc.createElement("section");
  const mainColumn = doc.createElement("div");
  const contentRoot = doc.createElement("div");
  const projectSummary = doc.createElement("section");
  const packageDetails = doc.createElement("section");
  const nav = doc.createElement("nav");
  const footer = doc.createElement("footer");
  const button = doc.createElement("button");

  layout.setAttribute("class", "layout");
  brand.setAttribute("class", "box brand");
  toggle.setAttribute("class", "box toggle");
  mainColumn.setAttribute("class", "main");
  mainColumn.setAttribute("id", "main");
  contentRoot.setAttribute("class", "content-root");
  contentRoot.setAttribute("id", "content");
  projectSummary.setAttribute("class", "box block project-summary");
  packageDetails.setAttribute("class", "box block package-details");
  nav.setAttribute("class", "box nav");
  footer.setAttribute("class", "box footer");

  assert.equal(layout.appendChild(brand), brand);
  assert.equal(layout.appendChild(toggle), toggle);
  assert.equal(layout.appendChild(mainColumn), mainColumn);
  assert.equal(mainColumn.appendChild(contentRoot), contentRoot);
  assert.equal(contentRoot.appendChild(projectSummary), projectSummary);
  assert.equal(contentRoot.appendChild(packageDetails), packageDetails);
  assert.equal(layout.appendChild(nav), nav);
  assert.equal(layout.appendChild(footer), footer);
  assert.throws(() => layout.appendChild(button), /Child button not allowed in main/);
});

test("resources user menu module composes its own dom-use capability", async () => {
  const base = JSON.parse(await readFile(join(resourcesSiteDir, "dom.schema.json"), "utf8"));
  const schema = resourcesDomSchema();
  assert.equal(base.definitions.userbar, undefined);
  assert.equal(schema.definitions.userbar.element, "section.box.userbar");
  assert.equal(schema.definitions["edge-status"].element, "aside.box.userbar.edge-status");
  assert.equal(schema.definitions["userbar-pop"].children[1], "$popover-menu");
  assert.equal(schema.definitions.layout.children[0].oneOf.includes("$userbar"), true);
  assert.equal(schema.nodes.main.children[0].oneOf.includes("$edge-status"), true);
});

test("resources website renders its index in a real browser", async (t) => {
  const port = await getPort();
  const dataDir = await tempDir();
  const app = startApp(port, dataDir);
  t.after(async () => {
    await stopChild(app.child);
    await rm(dataDir, { recursive: true, force: true });
  });

  await app.waitForReady;
  const browser = await chromium.launch();
  t.after(async () => browser.close());
  const page = await browser.newPage();
  const errors = [];
  const consoleErrors = [];
  const failedRequests = [];
  const badResponses = [];

  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("requestfailed", (request) => {
    failedRequests.push(`${request.url()} ${request.failure()?.errorText || ""}`.trim());
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      badResponses.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.goto(`http://resources-website.localhost:${port}/`, { waitUntil: "networkidle" });
  const loadedFonts = await page.evaluate(async () => {
    const weights = ["400", "500", "600", "700"];
    await Promise.all(weights.map((weight) => document.fonts.load(`${weight} 16px "Space Grotesk"`, "Resources.co")));
    await document.fonts.ready;
    return weights.map((weight) => ({
      weight,
      loaded: document.fonts.check(`${weight} 16px "Space Grotesk"`, "Resources.co"),
    }));
  });

  await assert.doesNotReject(page.locator("h1", { hasText: "Infrastructure you own, composed from parts." }).waitFor());
  await assert.doesNotReject(page.locator("text=resources/containers").waitFor());
  assert.deepEqual(errors, []);
  assert.deepEqual(consoleErrors, []);
  assert.deepEqual(failedRequests, []);
  assert.deepEqual(badResponses, []);
  assert.deepEqual(loadedFonts, [
    { weight: "400", loaded: true },
    { weight: "500", loaded: true },
    { weight: "600", loaded: true },
    { weight: "700", loaded: true },
  ]);
  assert.equal(await page.locator("#__bundler_err").count(), 0);
  assert.equal(await page.locator(".crumb").count(), 0);
  assert.equal(await page.locator("script").count(), 0);
});

test("resources sqlite site transitions between friendly paths in a real browser", async (t) => {
  const port = await getPort();
  const dataDir = await tempDir();
  const app = startApp(port, dataDir);
  t.after(async () => {
    await stopChild(app.child);
    await rm(dataDir, { recursive: true, force: true });
  });

  await app.waitForReady;
  const browser = await chromium.launch();
  t.after(async () => browser.close());
  const page = await browser.newPage();
  const errors = [];
  const consoleErrors = [];
  const badResponses = [];

  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("response", (response) => {
    if (response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`);
  });

  await page.goto(`http://resources-co.localhost:${port}/`, { waitUntil: "networkidle" });
  await assert.doesNotReject(page.locator("h1", { hasText: "Infrastructure you own, composed from parts." }).waitFor());

  await page.locator(".items a[href='/macchiato/app']").first().click();
  await assert.doesNotReject(page.locator("h1", { hasText: "App" }).waitFor());
  assert.equal(new URL(page.url()).pathname, "/macchiato/app");
  assert.equal((await page.locator("#brand-path").textContent()).replace(/\s+/g, ""), "/macchiato/app");
  assert.equal(await page.locator(".focused-header").count(), 1);
  assert.equal(await page.locator(".focused-header .home-ic[aria-label='Home'] svg").count(), 1);
  assert.equal(await page.locator(".focused-header a", { hasText: "macchiato" }).count(), 1);
  assert.equal(await page.locator(".focused-header .here", { hasText: "app" }).count(), 1);
  assert.equal(await page.locator("main.layout").getAttribute("data-view"), "focused");
  assert.equal(await page.locator(".nav").isHidden(), true);
  assert.equal(await page.locator(".brand__home").count(), 0);
  await assert.doesNotReject(page.locator(".focused-header .crumb", { hasText: "macchiato" }).waitFor());

  await page.locator("#brand-path a[href='/macchiato']").click();
  await assert.doesNotReject(page.locator("h1", { hasText: "macchiato" }).waitFor());
  assert.equal(new URL(page.url()).pathname, "/macchiato");
  assert.equal((await page.locator("#brand-path").textContent()).trim(), "macchiato");
  assert.equal(await page.locator("main.layout").getAttribute("data-view"), "standard");
  assert.equal(await page.locator(".nav").isVisible(), true);

  await page.locator(".nav a[data-section='home']").click();
  await assert.doesNotReject(page.locator("h1", { hasText: "Infrastructure you own, composed from parts." }).waitFor());
  assert.equal(new URL(page.url()).pathname, "/");
  assert.equal(await page.locator(".crumb").count(), 0);
  assert.equal(await page.locator(".brand__home", { hasText: "Resources.co" }).count(), 1);

  await page.goto(`http://resources-co.localhost:${port}/about`, { waitUntil: "networkidle" });
  await page.locator(".brand__home").click();
  await assert.doesNotReject(page.locator("h1", { hasText: "Infrastructure you own, composed from parts." }).waitFor());
  assert.equal(new URL(page.url()).pathname, "/");

  await page.locator(".nav a[data-section='browse']").click();
  await assert.doesNotReject(page.locator("h1", { hasText: "Browse the catalogue" }).waitFor());
  await page.locator(".brand__home").click();
  await assert.doesNotReject(page.locator("h1", { hasText: "Infrastructure you own, composed from parts." }).waitFor());
  assert.equal(new URL(page.url()).pathname, "/");

  assert.deepEqual(errors, []);
  assert.deepEqual(consoleErrors, []);
  assert.deepEqual(badResponses, []);
});

test("resources sqlite site uses a moderate consistent box shadow", async (t) => {
  const port = await getPort();
  const dataDir = await tempDir();
  const app = startApp(port, dataDir);
  t.after(async () => {
    await stopChild(app.child);
    await rm(dataDir, { recursive: true, force: true });
  });

  await app.waitForReady;
  const browser = await chromium.launch();
  t.after(async () => browser.close());
  const page = await browser.newPage();

  await page.goto(`http://resources-co.localhost:${port}/`, { waitUntil: "networkidle" });
  const shadows = await page.locator(".box").evaluateAll((nodes) => [
    ...new Set(nodes.map((node) => getComputedStyle(node).boxShadow)),
  ]);

  assert.deepEqual(shadows, ["rgba(2, 6, 28, 0.24) 0px 12px 28px 0px"]);
});

test("resources sqlite site prefetches internal routes and skips skeleton for cached navigation", async (t) => {
  const port = await getPort();
  const dataDir = await tempDir();
  const app = startApp(port, dataDir);
  t.after(async () => {
    await stopChild(app.child);
    await rm(dataDir, { recursive: true, force: true });
  });

  await app.waitForReady;
  const browser = await chromium.launch();
  t.after(async () => browser.close());
  const page = await browser.newPage();

  await page.goto(`http://resources-co.localhost:${port}/`, { waitUntil: "networkidle" });
  const link = page.locator(".items a[href='/macchiato/app']").first();
  await link.hover();
  await assert.doesNotReject(link.evaluate((node) => new Promise((resolve, reject) => {
    if (node.dataset.prefetch === "ready") {
      resolve();
      return;
    }
    const timer = setTimeout(() => reject(new Error("prefetch did not finish")), 3000);
    const observer = new MutationObserver(() => {
      if (node.dataset.prefetch === "ready") {
        clearTimeout(timer);
        observer.disconnect();
        resolve();
      }
    });
    observer.observe(node, { attributes: true, attributeFilter: ["data-prefetch"] });
  })));

  await link.click();
  await assert.doesNotReject(page.locator("h1", { hasText: "App" }).waitFor());
  assert.equal(await page.locator("#content[data-loading='true']").count(), 0);
  assert.equal(await page.locator(".skeleton-block").count(), 0);
});

test("resources sqlite site shows skeletons for uncached internal navigation", async (t) => {
  const port = await getPort();
  const dataDir = await tempDir();
  const app = startApp(port, dataDir);
  t.after(async () => {
    await stopChild(app.child);
    await rm(dataDir, { recursive: true, force: true });
  });

  await app.waitForReady;
  const browser = await chromium.launch();
  t.after(async () => browser.close());
  const page = await browser.newPage();
  await page.addInitScript(() => {
    window.IntersectionObserver = undefined;
    window.__resourcesDisablePrefetch = true;
  });
  await page.route(`http://resources-co.localhost:${port}/collections`, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 150));
    await route.continue();
  });

  await page.goto(`http://resources-co.localhost:${port}/`, { waitUntil: "networkidle" });
  await page.locator(".nav a[href='/collections']").click();
  await assert.doesNotReject(page.locator("#content[data-loading='true']").waitFor());
  await assert.doesNotReject(page.locator(".skeleton-block").first().waitFor());
  await assert.doesNotReject(page.locator("h1", { hasText: "Projects" }).waitFor());
  assert.equal(await page.locator("#content[data-loading='true']").count(), 0);
});

test("resources sqlite site has a responsive hamburger menu", async (t) => {
  const port = await getPort();
  const dataDir = await tempDir();
  const app = startApp(port, dataDir);
  t.after(async () => {
    await stopChild(app.child);
    await rm(dataDir, { recursive: true, force: true });
  });

  await app.waitForReady;
  const browser = await chromium.launch();
  t.after(async () => browser.close());
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  const consoleErrors = [];
  const badResponses = [];

  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("response", (response) => {
    if (response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`);
  });

  await page.goto(`http://resources-co.localhost:${port}/`, { waitUntil: "networkidle" });
  await assert.doesNotReject(page.locator("h1", { hasText: "Infrastructure you own, composed from parts." }).waitFor());

  assert.equal(await page.locator(".nav").isVisible(), false);
  assert.equal(await page.locator(".toggle").isVisible(), false);
  assert.equal(await page.locator(".menu").isVisible(), true);
  assert.equal(await page.locator(".menu-panel").isVisible(), false);

  await page.locator(".menu-button").click();
  await assert.doesNotReject(page.locator(".menu[data-open='true']").waitFor());
  assert.equal(await page.locator(".menu-button").getAttribute("aria-expanded"), "true");
  assert.equal(await page.locator(".menu-panel").isVisible(), true);

  await page.waitForFunction(() => getComputedStyle(document.querySelector(".menu-button span:nth-child(2)")).opacity === "0");
  const middleLine = await page.locator(".menu-button span").nth(1).evaluate((node) => getComputedStyle(node).opacity);
  assert.equal(middleLine, "0");

  await page.locator(".menu-panel .theme-toggle").click();
  assert.equal(await page.evaluate(() => document.documentElement.getAttribute("data-theme")), "light");

  await page.locator(".menu-nav a[data-section='collections']").click();
  await assert.doesNotReject(page.locator("h1", { hasText: "Projects" }).waitFor());
  assert.equal(new URL(page.url()).pathname, "/collections");
  assert.equal(await page.locator(".menu").getAttribute("data-open"), "false");
  assert.equal(await page.locator(".menu-nav a[data-section='collections']").getAttribute("aria-current"), "page");

  const firstCollection = page.locator(".items a").first();
  const itemLayout = await firstCollection.evaluate((node) => ({
    direction: getComputedStyle(node).flexDirection,
    titleTop: node.querySelector(".it-name").getBoundingClientRect().top,
    descTop: node.querySelector(".it-desc").getBoundingClientRect().top,
  }));
  assert.equal(itemLayout.direction, "column");
  assert.equal(itemLayout.descTop > itemLayout.titleTop, true);

  assert.deepEqual(errors, []);
  assert.deepEqual(consoleErrors, []);
  assert.deepEqual(badResponses, []);
});

test("resources sqlite user menu preserves exclusive sandboxed popover behavior", async (t) => {
  const port = await getPort();
  const dataDir = await tempDir();
  const app = startApp(port, dataDir);
  t.after(async () => {
    await stopChild(app.child);
    await rm(dataDir, { recursive: true, force: true });
  });

  await app.waitForReady;
  const browser = await chromium.launch();
  t.after(async () => browser.close());
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto(`http://resources-co.localhost:${port}/`, { waitUntil: "networkidle" });
  const userbar = page.locator(".userbar");
  const popovers = userbar.locator(".ub-pop");
  const notifications = page.getByRole("button", { name: "Notifications" });
  const create = page.getByRole("button", { name: "Create new" });
  const account = page.getByRole("button", { name: "Account menu" });

  await notifications.click();
  await assert.doesNotReject(popovers.nth(0).locator(".popover").waitFor());
  assert.equal(await notifications.getAttribute("aria-expanded"), "true");
  assert.equal(await popovers.nth(0).getAttribute("data-open"), "true");

  await create.click();
  await page.waitForFunction(() => document.querySelectorAll(".userbar .ub-pop[data-open='true']").length === 1);
  assert.equal(await notifications.getAttribute("aria-expanded"), "false");
  assert.equal(await create.getAttribute("aria-expanded"), "true");
  await assert.doesNotReject(page.getByRole("menu").filter({ hasText: "New project" }).waitFor());

  await create.click();
  await page.waitForFunction(() => document.querySelectorAll(".userbar .ub-pop[data-open='true']").length === 0);
  assert.equal(await userbar.getAttribute("data-userbar-hover-paused"), "true");
  assert.equal(await create.getAttribute("aria-expanded"), "false");

  await account.click();
  await assert.doesNotReject(page.getByRole("menu").filter({ hasText: "Signed in" }).waitFor());
  assert.equal(await account.getAttribute("aria-expanded"), "true");
  assert.equal(await page.locator(".userbar .ub-pop[data-open='true']").count(), 1);

  await page.getByRole("heading", { name: /Infrastructure you own/ }).click();
  await page.waitForFunction(() => document.querySelectorAll(".userbar .ub-pop[data-open='true']").length === 0);
  assert.equal(await account.getAttribute("aria-expanded"), "false");
  assert.deepEqual(errors, []);
});

test("resources user menu safe polygon protects diagonal travel but permits horizontal switching", async (t) => {
  const port = await getPort();
  const dataDir = await tempDir();
  const app = startApp(port, dataDir);
  t.after(async () => {
    await stopChild(app.child);
    await rm(dataDir, { recursive: true, force: true });
  });

  await app.waitForReady;
  const browser = await chromium.launch();
  t.after(async () => browser.close());
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  await page.goto(`http://resources-co.localhost:${port}/`, { waitUntil: "networkidle" });

  const account = page.getByRole("button", { name: "Account menu" });
  const create = page.getByRole("button", { name: "Create new" });
  const accountPop = account.locator("xpath=..");
  const createPop = create.locator("xpath=..");

  await account.hover();
  await page.waitForFunction(() => document.querySelectorAll(".userbar .ub-pop")[2]?.dataset.open === "true");
  const accountBox = await account.boundingBox();
  const panelBox = await accountPop.locator(".popover").boundingBox();
  assert.ok(accountBox && panelBox);
  await page.mouse.move(accountBox.x + accountBox.width / 2, accountBox.y + accountBox.height / 2);
  await page.mouse.move(panelBox.x + 12, panelBox.y + 24, { steps: 16 });
  assert.equal(await accountPop.getAttribute("data-open"), "true");
  assert.notEqual(await createPop.getAttribute("data-open"), "true");

  await account.hover();
  const createBox = await create.boundingBox();
  assert.ok(createBox);
  await page.mouse.move(createBox.x + createBox.width / 2, accountBox.y + accountBox.height / 2, { steps: 8 });
  await page.waitForFunction(() => document.querySelectorAll(".userbar .ub-pop")[1]?.dataset.open === "true");
  assert.equal(await createPop.getAttribute("data-open"), "true");
  assert.notEqual(await accountPop.getAttribute("data-open"), "true");
});

test("resources app supports logged-in, logged-out, login, signup, and signout states", async (t) => {
  const port = await getPort();
  const dataDir = await tempDir();
  const app = startApp(port, dataDir);
  t.after(async () => {
    await stopChild(app.child);
    await rm(dataDir, { recursive: true, force: true });
  });

  await app.waitForReady;
  const browser = await chromium.launch();
  t.after(async () => browser.close());
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  await page.goto(`http://resources-co.localhost:${port}/`, { waitUntil: "networkidle" });

  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForFunction(() => document.body.dataset.auth === "out");
  await assert.doesNotReject(page.getByRole("button", { name: "Notifications" }).waitFor());
  await assert.doesNotReject(page.getByRole("button", { name: "Create new" }).waitFor());
  assert.equal(await page.locator(".ub-btn").count(), 0);
  const guestAccount = page.locator('[aria-label="Account menu"]:visible');
  assert.equal(await guestAccount.locator(".ub-avatar--blank").count(), 1);
  await guestAccount.click();
  await assert.doesNotReject(page.getByRole("link", { name: "Log in" }).waitFor());
  await assert.doesNotReject(page.getByRole("link", { name: "Sign up" }).waitFor());

  await page.getByRole("link", { name: "Log in" }).click();
  await assert.doesNotReject(page.getByRole("heading", { name: "Log in to Resources.co" }).waitFor());
  assert.equal(new URL(page.url()).pathname, "/login");
  await page.getByRole("button", { name: "Continue with GitHub" }).click();
  await page.waitForFunction(() => document.body.dataset.auth !== "out");
  await assert.doesNotReject(page.getByRole("heading", { name: /Infrastructure you own/ }).waitFor());
  assert.equal(new URL(page.url()).pathname, "/");
  assert.equal(await page.getByRole("button", { name: "Account menu" }).isVisible(), true);

  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.locator('[aria-label="Account menu"]:visible').click();
  await page.getByRole("link", { name: "Sign up" }).click();
  await assert.doesNotReject(page.getByRole("heading", { name: "Create your account" }).waitFor());
  assert.equal(new URL(page.url()).pathname, "/signup");
  await page.getByRole("button", { name: "Continue with Apple" }).click();
  await page.waitForFunction(() => document.body.dataset.auth !== "out");
  assert.equal(new URL(page.url()).pathname, "/");
  assert.equal(await page.evaluate(() => localStorage.getItem("resources-auth-state-v1")), "in");
});

test("resources sqlite site keeps footer near the viewport bottom on sparse pages", async (t) => {
  const port = await getPort();
  const dataDir = await tempDir();
  const app = startApp(port, dataDir);
  t.after(async () => {
    await stopChild(app.child);
    await rm(dataDir, { recursive: true, force: true });
  });

  await app.waitForReady;
  const browser = await chromium.launch();
  t.after(async () => browser.close());
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  const response = await page.goto(`http://resources-co.localhost:${port}/not-real`, { waitUntil: "networkidle" });
  assert.equal(response.status(), 404);
  await assert.doesNotReject(page.locator("h1", { hasText: "This block has not been composed yet." }).waitFor());
  const footerBottomGap = await page.locator(".footer").evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return window.innerHeight - rect.bottom;
  });

  assert.ok(footerBottomGap >= 20);
  assert.ok(footerBottomGap < 90);
});
