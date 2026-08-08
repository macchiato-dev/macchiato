import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { DomUse } from "@macchiato-dev/dom-use";
import { chromium } from "playwright";

import { resourcesWebsiteHandler } from "../../../examples/resources-website/handler.js";
import { buildResourcesSiteRoutes, resourcesDomSchema, validateResourcesStylesheet } from "../../../examples/resources-site/seed.js";
import { seal } from "../../../examples/resources-site/auth/session.js";
import { createAccountStore } from "../../../examples/resources-site/models/accounts.js";
import { createNodeSqliteClient } from "../../../examples/resources-site/adapters/node-sqlite-client.js";

const repoRoot = resolve(new URL("../../..", import.meta.url).pathname);
const appCli = resolve(repoRoot, "packages", "app", "src", "index.js");
const resourcesSiteDir = resolve(repoRoot, "examples", "resources-site");

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
  await page.screenshot({ path: "/tmp/resources-signups-disabled-home.png" });
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
  assert.match(text, /command-palette-use\/client\.js/);
  assert.equal(config.status, 200);
  assert.match(configText, /Resources\.co Edge Preview/);
  assert.match(configText, /in-memory export manifest/);
  assert.match(configText, /Bunny Storage/);
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
    await page.locator(".cm-editor").waitFor();
    const snapshot = JSON.parse(await page.locator("[data-project-snapshot]").inputValue());
    assert.equal(snapshot.config.container, container);
    assert.equal(await page.getByLabel("Template").inputValue(), template);
    assert.equal(await page.locator(".project-create__fields").isVisible(), true);
    assert.equal(await page.locator(".project-view__identity").count(), 0);
    assert.equal(await page.locator(`[data-project-preview] ${previewSelector}`).count(), 1);
    assert.equal(await page.locator("[data-project-status]").getAttribute("data-state"), "normal");
    assert.equal(await page.locator("[data-project-save]").textContent(), "");
    if (template === "clock") {
      await page.locator("[data-preview-runtime='quickjs']").waitFor();
      await page.locator("[data-project-file-trigger]").click();
      await page.locator('[data-project-file="script.js"]').click();
      const scriptEditor = page.locator(".cm-content");
      await scriptEditor.press("Control+A");
      await scriptEditor.fill(snapshot.files.find((file) => file.path === "script.js").content.replace("1000", "5000"));
      await page.waitForTimeout(500);
      await page.locator("[data-preview-runtime='quickjs']").waitFor();
      const initialTime = await page.locator("[data-project-preview] #time").textContent();
      await page.waitForTimeout(1_500);
      assert.equal(await page.locator("[data-project-preview] #time").textContent(), initialTime);
      await page.waitForFunction((previous) => document.querySelector("[data-project-preview] #time")?.textContent !== previous, initialTime, { timeout: 5_500 });
    }
    if (template === "article") {
      await page.getByLabel("Template").selectOption("mark");
      await page.locator("[data-project-file-trigger]").click();
      await assert.doesNotReject(page.locator('[data-project-file="image.svg"]').waitFor());
      assert.equal(JSON.parse(await page.locator("[data-project-snapshot]").inputValue()).config.template, "mark");
      await page.waitForTimeout(1_700);
      assert.equal(await page.locator("[data-project-save]").textContent(), "");
    }
    await page.close();
  }

  const blogPage = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await blogPage.goto(`http://resources-edge.localhost:${port}/blog/generating-slides-from-code`);
  const examplePanel = blogPage.locator(".blog-example-panel");
  assert.equal(await examplePanel.locator("a").first().textContent(), "benatkin / DOM use code tour");
  assert.equal(await examplePanel.locator("a").first().getAttribute("href"), "/benatkin/dom-use-tour");
  assert.match(await examplePanel.locator("a").last().getAttribute("href"), /^http:\/\/blog-examples\.localhost:/);
  await blogPage.close();

  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(`http://resources-edge.localhost:${port}/try?template=article`, { waitUntil: "domcontentloaded" });
  const editor = page.locator(".cm-content");
  await editor.waitFor();
  await editor.click();
  await page.keyboard.press("Control+A");
  await page.keyboard.type('<article><h1 id="allowed">Waiting</h1><iframe><p>Blocked subtree</p></iframe></article><script>document.getElementById("allowed").textContent = "Allowed guest code still runs";</script>');
  await page.locator("[data-project-status][data-state='error']").waitFor();
  await page.locator("[data-project-preview] h1").getByText("Allowed guest code still runs", { exact: true }).waitFor();
  await page.waitForTimeout(2_000);
  assert.equal(await page.locator("[data-project-preview]").getAttribute("data-preview-runtime"), "quickjs");
  assert.equal(await page.locator("[data-project-preview]").getAttribute("data-preview-violations"), "1");
  assert.equal(await page.locator("[data-project-preview] h1").textContent(), "Allowed guest code still runs");
  assert.equal(await page.locator("[data-project-preview] iframe").count(), 0);
  assert.equal(await page.locator("[data-project-preview]").getByText("Blocked subtree").count(), 0);
  assert.match(await editor.innerText(), /<iframe>.*Blocked subtree.*<\/iframe>/s);
  assert.equal(await page.locator("[data-project-status]").getAttribute("data-state"), "error");
  assert.equal(await page.locator("[data-project-tip-controls]").isVisible(), false);
  assert.match(await page.locator("[data-project-error]").textContent(), /^Blocked:.*iframe.*omitted/i);
  assert.equal(await page.locator("[data-project-save]").textContent(), "");
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

test("Resources.co edge preview limits browser code to host-owned UI modules", async (t) => {
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

  const response = await page.goto(`http://resources-edge.localhost:${port}/`, { waitUntil: "networkidle" });
  await assert.doesNotReject(page.getByRole("heading", { name: /Infrastructure you own/ }).waitFor());
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
  assert.equal(await page.locator("script:not([type='application/json'])").count(), 4);
  assert.equal(await page.locator("script[type='application/json']").count(), 1);
  assert.equal(await page.locator("html").getAttribute("lang"), "en");
  assert.deepEqual(edgeTheme, ["#30d5c8", "#2f5bff"]);
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
  await page.getByLabel("Account menu").click();
  await assert.doesNotReject(page.getByRole("link", { name: "Settings" }).waitFor());
  assert.equal(await page.getByRole("link", { name: "Log in" }).count(), 1);
  await page.getByRole("button", { name: "Light" }).click();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "light");
  await page.locator(".main").click();
  assert.equal(await page.locator("details.edge-user-menu[open]").count(), 0);
  await page.keyboard.press(process.platform === "darwin" ? "Meta+k" : "Control+k");
  await assert.doesNotReject(page.getByRole("dialog", { name: "Search or jump to…" }).waitFor());
  await page.getByRole("searchbox", { name: "Search or jump to…" }).fill("settings");
  await assert.doesNotReject(page.getByRole("link", { name: "Settings" }).last().waitFor());
  await page.keyboard.press("Escape");

  await page.getByLabel("Account menu").click();
  await page.getByLabel("Language").selectOption("es");
  await page.getByRole("button", { name: "Change" }).click();
  await assert.doesNotReject(page.getByRole("heading", { name: "Infraestructura tuya, compuesta por partes." }).waitFor());
  assert.equal(await page.locator("html").getAttribute("lang"), "es");
  await page.getByRole("link", { name: "Acerca de" }).click();
  await assert.doesNotReject(page.getByRole("heading", { name: "Acerca de Resources.co" }).waitFor());
  await page.getByLabel("Menú de cuenta").click();
  await page.getByLabel("Idioma").selectOption("en");
  await page.getByRole("button", { name: "Cambiar" }).click();
  await assert.doesNotReject(page.getByRole("heading", { name: "About Resources.co" }).waitFor());
  assert.equal(await page.locator("html").getAttribute("lang"), "en");

  await page.goto(`http://resources-edge.localhost:${port}/login`, { waitUntil: "networkidle" });
  await assert.doesNotReject(page.getByRole("link", { name: "Continue with GitHub" }).waitFor());
  await assert.doesNotReject(page.getByRole("link", { name: "Continue with GitLab" }).waitFor());
  await assert.doesNotReject(page.getByRole("heading", { name: "Log in to Resources.co" }).waitFor());
  await assert.doesNotReject(page.locator(".nav").waitFor());
  await assert.doesNotReject(page.locator(".footer").waitFor());
  assert.equal(await page.locator("script:not([type='application/json'])").count(), 4);
  assert.equal(await page.locator("script[type='application/json']").count(), 1);
  const authCardWidth = await page.locator(".auth-card").evaluate((node) => node.getBoundingClientRect().width);
  assert.ok(authCardWidth >= 400 && authCardWidth <= 440);

  const session = await seal({
    v: 1,
    sub: "gitlab:84",
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
  await page.locator(".project-editor .cm-content").waitFor({ state: "attached" });
  assert.equal(await page.locator(".project-editor__workspace").getAttribute("data-view"), "preview");
  assert.equal(await page.getByRole("button", { name: "Split" }).isVisible(), false);
  assert.equal(await page.locator(".project-editor__tabs").isVisible(), false);
  assert.equal(await page.locator("[data-project-file-picker]").isVisible(), true);
  assert.equal(await page.locator(".project-create__fields").isHidden(), true);
  assert.equal(await page.locator(".command-trigger [data-command-shortcut]").isHidden(), true);
  assert.equal(await page.locator(".command-trigger__icon").isVisible(), true);
  const mobileViewControls = page.locator(".project-editor__view-controls");
  const controlsBox = await mobileViewControls.boundingBox();
  const filesBox = await page.locator(".project-editor__source-toolbar").boundingBox();
  assert.ok(controlsBox && filesBox && controlsBox.y < filesBox.y);
  assert.ok(Number.parseFloat(await page.getByRole("button", { name: "Preview" }).evaluate((node) => getComputedStyle(node).fontSize)) >= 14);
  await page.getByRole("button", { name: "Details" }).click();
  await page.getByLabel("Template").selectOption("clock");
  await page.waitForFunction(() => !document.querySelector("[data-project-editor]")?.dataset.editorLoading);
  await page.getByRole("button", { name: "Preview" }).click();
  const fileTrigger = page.locator("[data-project-file-trigger]");
  await fileTrigger.click();
  await page.getByRole("menuitemradio", { name: "script.js" }).click();
  assert.equal(await page.locator("[data-project-file-current]").textContent(), "script.js");
  await fileTrigger.click();
  await page.mouse.click(380, 300);
  assert.equal(await page.locator("[data-project-file-menu]").isHidden(), true);
  await page.getByRole("button", { name: "Preview" }).click();
  assert.equal(await page.locator(".project-editor__workspace").getAttribute("data-view"), "preview");
  assert.equal(await page.locator(".project-editor__source").isHidden(), true);
  await page.waitForFunction(() => document.querySelector("[data-project-preview]")?.dataset.previewRuntime === "quickjs");
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
  assert.equal(await page.getByRole("button", { name: "Split" }).isVisible(), true);
  assert.equal(await page.locator(".project-editor__tabs").count(), 0);
  assert.equal(await page.locator("[data-project-file-picker]").isVisible(), true);
  assert.equal(await page.locator(".project-create__fields").isVisible(), true);
  assert.equal(await page.locator(".command-trigger [data-command-shortcut]").isVisible(), true);
  assert.equal(await page.locator(".command-trigger__icon").isHidden(), true);
  assert.deepEqual(errors, []);
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
    exp: Date.now() + 60_000,
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
  await page.locator("[data-project-file]").first().waitFor();
  const newEditor = page.locator(".project-editor");
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
  const container = page.getByLabel("Container");
  assert.deepEqual(await template.locator("option").allTextContents(), ["Article", "Hello, HTML", "Digital clock", "Logo mark", "Bar chart", "Bouncing ball", "Starfield", "Blank project"]);
  assert.equal(await template.inputValue(), "article");
  assert.equal(await container.inputValue(), "article");
  const elementTags = page.locator("[data-container-outline] [data-element-tag]");
  assert.deepEqual(await elementTags.allTextContents(), ["html", "head", "meta", "title", "link", "body", "article", "header", "h1", "p", "a", "strong", "em", "ul", "li", "code"]);
  assert.equal(await page.locator("[data-element-tag='html']").getAttribute("title"), "Parents: document. Attributes: lang.");
  assert.equal(await page.locator("[data-element-tag='title']").getAttribute("title"), "Parents: head. Attributes: none.");
  await page.locator("[data-element-tag='a']").hover();
  assert.equal(await page.locator("[data-element-tag='a']").getAttribute("title"), "Parents: p, li. Attributes: href, title, target.");
  await page.screenshot({ path: "/tmp/resources-element-tags.png" });
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
  assert.equal(await page.locator(".project-editor iframe").count(), 0);
  assert.equal(await page.locator("script[src^='/\-/resources-site/content-form.js?v=']").count(), 1);
  await assert.doesNotReject(newEditor.locator(".cm-content").waitFor());
  assert.ok(await newEditor.locator(".cm-content span").count() > 10, "HTML syntax should be tokenized");
  const selectionStart = await newEditor.locator(".cm-line").nth(1).boundingBox();
  const selectionEnd = await newEditor.locator(".cm-line").nth(4).boundingBox();
  await page.mouse.move(selectionStart.x + 25, selectionStart.y + selectionStart.height / 2);
  await page.mouse.down();
  await page.mouse.move(selectionEnd.x + 110, selectionEnd.y + selectionEnd.height / 2, { steps: 10 });
  await page.mouse.up();
  assert.ok(await newEditor.locator(".cm-selectionBackground").count() >= 2, "multiline selection should remain visible after mouseup");
  assert.notEqual(await newEditor.locator(".cm-line").nth(2).evaluate((element) => getComputedStyle(element.firstElementChild, "::selection").backgroundColor), "rgba(0, 0, 0, 0)");
  await assert.doesNotReject(newEditor.getByText("Split", { exact: true }).waitFor());
  await assert.doesNotReject(newEditor.getByRole("link", { name: "Hypertext" }).waitFor());
  await assert.doesNotReject(newEditor.getByRole("link", { name: "WebAssembly" }).waitFor());
  await assert.doesNotReject(newEditor.getByRole("link", { name: "Capability-based security" }).waitFor());
  assert.deepEqual(await newEditor.locator("[data-project-preview] a").evaluateAll((links) => links.map((link) => link.target)), ["_blank", "_blank", "_blank"]);
  assert.equal(await newEditor.locator("[data-preview-title]").textContent(), "A small article");
  assert.equal((await newEditor.locator("[data-project-snapshot]").inputValue()).includes("</html>\\n"), false);
  assert.equal(await page.getByRole("button", { name: "Add file" }).count(), 0);
  assert.equal(await page.getByRole("button", { name: "Remove selected file" }).count(), 0);
  const versionPlacement = await page.evaluate(() => {
    const editor = document.querySelector("[data-project-editor]").getBoundingClientRect();
    const versions = document.querySelector("[data-project-versions]").getBoundingClientRect();
    return { versionsRight: versions.right, sourceRight: editor.left + editor.width / 2 };
  });
  assert.ok(versionPlacement.versionsRight <= versionPlacement.sourceRight + 1);
  const editorScrollModel = await newEditor.evaluate(() => ({
    documentHeight: document.documentElement.scrollHeight,
    viewportHeight: document.documentElement.clientHeight,
    sourceOverflow: getComputedStyle(document.querySelector(".project-editor__source")).overflow,
    previewOverflow: getComputedStyle(document.querySelector(".project-editor__preview")).overflow,
    codeOverflow: getComputedStyle(document.querySelector(".cm-scroller")).overflow,
  }));
  assert.equal(editorScrollModel.documentHeight, editorScrollModel.viewportHeight);
  assert.equal(editorScrollModel.sourceOverflow, "hidden");
  assert.equal(editorScrollModel.previewOverflow, "auto");
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
  await page.locator("[data-project-versions]").click();
  assert.equal(await page.locator("[data-project-version-list] [aria-current='true']").textContent(), "Current Version");
  assert.equal(await page.locator("[data-project-history]").isVisible(), true);
  await page.locator("[data-project-versions]").click();
  assert.equal(await page.locator("[data-project-history]").isHidden(), true);
  await template.selectOption("ball");
  const templateNotice = page.locator("[data-project-notice]");
  await assert.doesNotReject(templateNotice.getByRole("button", { name: "Undo" }).waitFor());
  assert.match(await templateNotice.textContent(), /Template replaced the project/);
  assert.equal(await page.locator("[data-project-status]").getAttribute("data-state"), "warning");
  await templateNotice.getByRole("button", { name: "Undo" }).click();
  assert.equal(await template.inputValue(), "article");
  await assert.doesNotReject(newEditor.getByRole("link", { name: "Hypertext" }).waitFor());
  assert.equal(await templateNotice.isHidden(), true);
  await template.selectOption("ball");
  assert.equal(await page.locator("[data-project-versions] .project-editor__version-count").textContent(), "1");
  assert.equal(await container.inputValue(), "canvas");
  assert.deepEqual(await page.locator("[data-container-outline] [data-element-tag]").allTextContents(), ["html", "head", "meta", "title", "body", "canvas", "script"]);
  assert.equal(await page.locator(".project-editor").evaluate((element) => element.getBoundingClientRect().height >= 600), true);
  await page.getByRole("button", { name: "script.js", exact: true }).click();
  await page.waitForFunction(() => !document.querySelector("[data-project-editor]")?.dataset.editorLoading);
  await assert.doesNotReject(newEditor.locator(".cm-content").getByText("getContext", { exact: false }).waitFor());
  await page.waitForFunction(() => Number(document.querySelector("[data-project-preview]")?.dataset.canvasCommands) > 10);
  assert.equal(await newEditor.locator("[data-project-preview]").getAttribute("data-preview-runtime"), "quickjs");
  assert.equal(await newEditor.locator(".cm-gutterElement").count() > 1, true);
  assert.equal(await newEditor.locator(".cm-scroller").evaluate((element) => parseFloat(getComputedStyle(element).paddingLeft) <= 4), true);
  await newEditor.locator(".cm-content").click();
  await page.keyboard.press("Control+f");
  await newEditor.locator(".cm-search input[name='search']").fill("getContext");
  await page.keyboard.press("Escape");
  assert.equal(await newEditor.locator(".cm-search").count(), 0);
  await page.keyboard.press("Control+End");
  await page.keyboard.type("\n{");
  assert.match(await newEditor.locator(".cm-content").innerText(), /\{\}$/);
  assert.equal(await newEditor.getAttribute("data-draft-state"), "dirty");
  assert.notEqual(await newEditor.locator("[data-project-save]").textContent(), "Unsaved changes");
  assert.equal(await page.locator("[data-draft-actions]").isVisible(), true);
  await page.getByRole("button", { name: "Discard draft", exact: true }).click();
  await assert.doesNotReject(page.getByRole("alertdialog", { name: "Discard draft" }).waitFor());
  await page.getByRole("alertdialog", { name: "Discard draft" }).getByRole("button", { name: "Cancel" }).click();
  assert.equal(await page.getByRole("alertdialog", { name: "Discard draft" }).isHidden(), true);
  assert.equal(await templateNotice.isHidden(), true);
  await template.selectOption("article");
  assert.equal(await page.locator("[data-project-versions] .project-editor__version-count").textContent(), "2");
  await page.waitForFunction(() => !document.querySelector("[data-project-editor]")?.dataset.editorLoading);
  await assert.doesNotReject(newEditor.getByRole("link", { name: "Hypertext" }).waitFor());
  await template.selectOption("mark");
  assert.equal(await page.locator("[data-project-versions] .project-editor__version-count").textContent(), "3");
  await page.waitForFunction(() => !document.querySelector("[data-project-editor]")?.dataset.editorLoading);
  await assert.doesNotReject(page.getByRole("button", { name: "image.svg", exact: true }).waitFor());
  await assert.doesNotReject(newEditor.locator(".cm-content").getByText("circle", { exact: false }).waitFor());
  await assert.doesNotReject(newEditor.locator("[data-project-preview] circle").waitFor());
  await template.selectOption("chart");
  await assert.doesNotReject(newEditor.locator("[data-project-preview] rect").nth(2).waitFor());
  assert.doesNotMatch(await page.locator("[data-project-status]").textContent(), /Preview stopped/);
  await template.selectOption("stars");
  await page.waitForFunction(() => Number(document.querySelector("[data-project-preview]")?.dataset.canvasCommands) > 100);
  assert.equal(await newEditor.locator("[data-project-preview]").getAttribute("data-preview-runtime"), "quickjs");
  await template.selectOption("clock");
  await page.waitForFunction(() => /^\d{2}:\d{2}:\d{2}$/.test(document.querySelector("[data-project-preview] #time")?.textContent || ""));
  assert.equal(await newEditor.locator("[data-project-preview]").getAttribute("data-preview-runtime"), "quickjs");
  await template.selectOption("hello");
  assert.equal(await page.locator("[data-project-versions] .project-editor__version-count").textContent(), "7");
  await page.waitForFunction(() => !document.querySelector("[data-project-editor]")?.dataset.editorLoading);
  await assert.doesNotReject(newEditor.locator(".cm-content").getByText("This small page is made from familiar HTML elements", { exact: false }).waitFor());
  await newEditor.locator(".cm-content").click();
  await assert.doesNotReject(newEditor.locator(".cm-cursor").waitFor({ state: "visible" }));
  await newEditor.getByRole("button", { name: "Preview" }).click();
  assert.equal(await newEditor.locator(".project-editor__workspace").getAttribute("data-view"), "preview");
  await newEditor.getByRole("button", { name: "Editor" }).click();
  assert.equal(await newEditor.locator(".project-editor__workspace").getAttribute("data-view"), "editor");
  await newEditor.getByRole("button", { name: "Split" }).click();
  const splitter = newEditor.getByRole("separator", { name: "Resize editor and preview" });
  await splitter.press("ArrowRight");
  assert.equal(await splitter.getAttribute("aria-valuenow"), "55");
  await newEditor.locator(".cm-content").fill("<h1>Digital Clock</h1>\n");
  await page.getByRole("button", { name: "Configuration" }).click();
  await page.waitForFunction(() => !document.querySelector("[data-project-editor]")?.dataset.editorLoading);
  assert.equal(await newEditor.locator(".cm-content").getAttribute("aria-readonly"), "true");
  const visibleConfiguration = await newEditor.locator(".cm-content").innerText();
  assert.doesNotMatch(visibleConfiguration, /allowedElements/);
  assert.match(visibleConfiguration, /"container": "page"/);
  await newEditor.locator(".cm-content").focus();
  await page.keyboard.type("not editable");
  assert.equal(await newEditor.locator(".cm-content").innerText(), visibleConfiguration);
  await page.waitForFunction(() => document.querySelector("[data-project-save]")?.textContent === "Draft saved in this session");
  await page.reload({ waitUntil: "networkidle" });
  await assert.doesNotReject(page.locator("[data-new-draft-flash]").getByText(/session draft/i).waitFor());
  assert.equal(await page.locator("[data-project-editor]").getAttribute("data-draft-state"), "saved");
  const restoredDraftVersionCount = await page.locator("[data-project-versions] .project-editor__version-count").textContent();
  await page.locator("[data-new-draft-flash]").getByRole("button", { name: "Dismiss" }).click();
  await page.getByLabel("Title", { exact: true }).fill("Digital Clock");
  await page.getByLabel("Name", { exact: true }).fill("digital-clock");
  await page.getByLabel("Description (optional)").fill("A small HTML clock.");
  await page.getByLabel("Namespace").selectOption({ label: "Tiny Tools" });
  await page.locator("[data-project-versions]").click();
  assert.equal(await page.locator("[data-project-version-list] [aria-current='true']").textContent(), "Current Version");
  assert.equal(await page.locator("[data-project-history]").isVisible(), true);
  await page.locator("[data-project-versions]").click();
  assert.equal(await page.locator("[data-project-history]").isHidden(), true);
  await page.locator("[data-project-versions]").click();
  assert.equal(await page.locator("[data-project-history]").isVisible(), true);
  await page.getByLabel("Title", { exact: true }).click();
  assert.equal(await page.locator("[data-project-history]").isHidden(), true);
  await page.locator("[data-project-versions]").click();
  await page.locator("[data-project-version-list] [data-version-sequence='1']").click();
  assert.equal(await page.locator("[data-project-versions] .project-editor__version-count").textContent(), restoredDraftVersionCount);
  assert.match(await page.locator("[data-current-version]").textContent(), /ago$/);
  await page.locator("[data-project-versions]").click();
  await page.locator("[data-project-version-list]").getByRole("button", { name: "Current Version" }).click();
  assert.equal(await page.locator("[data-project-versions] .project-editor__version-count").textContent(), restoredDraftVersionCount);
  await page.getByRole("button", { name: "index.html", exact: true }).click();
  await page.waitForFunction(() => !document.querySelector("[data-project-editor]")?.dataset.editorLoading);
  await newEditor.locator(".cm-content").fill("<h1>Digital Clock</h1>\n");
  assert.equal(await page.locator("[data-current-version]").textContent(), "Current Version");
  await page.waitForFunction(() => document.querySelector("[data-project-snapshot]")?.value.includes("Digital Clock"));
  await page.getByRole("button", { name: "Create project" }).click();
  await assert.doesNotReject(page.getByRole("button", { name: "Save project" }).waitFor());
  assert.equal(await page.getByLabel("Title", { exact: true }).inputValue(), "Digital Clock");
  assert.equal(await page.getByLabel("Namespace").locator("option:checked").textContent(), "Tiny Tools");
  assert.equal(new URL(page.url()).pathname, "/tiny-tools/digital-clock");
  assert.equal(await page.locator("main.layout").getAttribute("data-view"), "focused");
  assert.equal(await page.locator(".layout.focused-view > .nav").isHidden(), true);
  assert.equal(await page.locator(".layout.focused-view > .footer").isHidden(), true);
  await assert.doesNotReject(page.locator("[data-project-versions] .project-editor__version-count", { hasText: "1" }).waitFor());
  await assert.doesNotReject(page.locator(".project-editor [data-project-editor-mount] .cm-content").waitFor());
  const projectEditor = page.locator(".project-editor");
  await assert.doesNotReject(projectEditor.locator(".cm-content").getByText("Digital Clock", { exact: false }).first().waitFor());
  await projectEditor.locator(".cm-content").fill("<h1>Digital Clock</h1>\n<p>Updated.</p>\n");
  await page.waitForFunction(() => document.querySelector("[data-project-editor]")?.dataset.draftDirty === "true");
  await page.waitForFunction(() => !document.querySelector("[data-project-editor]")?.dataset.draftDirty && document.querySelector("[data-project-save]")?.textContent === "Saved");
  const versionsButton = page.locator("[data-project-versions]");
  assert.match((await versionsButton.textContent()).replace(/\s+/g, " ").trim(), /^Current Version1/);
  await versionsButton.click();
  const pastVersions = page.locator("[data-project-version-list] [data-version-sequence]");
  assert.match(await pastVersions.first().textContent(), /ago$/);
  assert.notEqual(await pastVersions.first().getAttribute("title"), "");
  await page.locator("[data-project-version-list] [data-version-sequence='1']").click();
  await assert.doesNotReject(page.locator("[data-project-versions] .project-editor__version-count", { hasText: "1" }).waitFor());
  await page.waitForFunction(() => document.querySelector("[data-current-version]")?.textContent.endsWith("ago"));
  assert.match(await page.locator("[data-current-version]").textContent(), /ago$/);
  await versionsButton.click();
  await page.locator("[data-project-version-list]").getByRole("button", { name: "Current Version" }).click();
  assert.equal(await page.locator("[data-project-versions] .project-editor__version-count").textContent(), "1");
  await versionsButton.click();
  await page.locator("[data-project-version-list] [data-version-sequence='1']").click();
  await projectEditor.locator(".cm-content").fill("<h1>Forked from history</h1>");
  await page.waitForFunction(() => document.querySelector("[data-project-editor]")?.dataset.draftDirty === "true");
  await page.waitForFunction(() => !document.querySelector("[data-project-editor]")?.dataset.draftDirty && document.querySelector("[data-project-save]")?.textContent === "Saved");
  await page.goto(`http://resources-edge.localhost:${port}/projects`, { waitUntil: "networkidle" });
  await page.getByRole("link", { name: /Digital Clock/ }).click();
  assert.equal(new URL(page.url()).pathname, "/tiny-tools/digital-clock");
  await page.getByLabel("Description (optional)").fill("Updated project details.");
  await page.getByRole("button", { name: "Save project" }).click();
  await assert.doesNotReject(page.getByRole("button", { name: "Save project" }).waitFor());
  assert.equal(await page.getByLabel("Description (optional)").inputValue(), "Updated project details.");
  const storedTemplate = page.getByLabel("Template");
  const storedVersionCount = Number(await page.locator("[data-project-versions] .project-editor__version-count").textContent());
  const snapshotBeforeTemplate = await page.locator("[data-project-snapshot]").inputValue();
  const templateBeforeReplacement = await storedTemplate.inputValue();
  await storedTemplate.selectOption("mark");
  await assert.doesNotReject(page.getByRole("button", { name: "image.svg", exact: true }).waitFor());
  await assert.doesNotReject(page.locator("[data-project-notice]").getByRole("button", { name: "Undo" }).waitFor());
  await page.waitForFunction(() => document.querySelector("[data-project-editor]")?.dataset.draftDirty === "true");
  await page.waitForFunction(() => !document.querySelector("[data-project-editor]")?.dataset.draftDirty && document.querySelector("[data-project-save]")?.textContent === "Saved");
  assert.ok(Number(await page.locator("[data-project-versions] .project-editor__version-count").textContent()) > storedVersionCount);
  await page.locator("[data-project-notice]").getByRole("button", { name: "Undo" }).click();
  assert.equal(await page.locator("[data-project-snapshot]").inputValue(), snapshotBeforeTemplate);
  assert.equal(await storedTemplate.inputValue(), templateBeforeReplacement);
  assert.equal(await page.locator("[data-project-notice]").isHidden(), true);
  await page.waitForFunction(() => document.querySelector("[data-project-editor]")?.dataset.draftDirty === "true");
  await page.waitForFunction(() => !document.querySelector("[data-project-editor]")?.dataset.draftDirty && document.querySelector("[data-project-save]")?.textContent === "Saved");
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await page.getByLabel("Template").inputValue(), templateBeforeReplacement);
  assert.equal(await page.locator("[data-project-snapshot]").inputValue(), snapshotBeforeTemplate);
  await page.getByLabel("Template").selectOption("mark");
  await page.waitForFunction(() => document.querySelector("[data-project-editor]")?.dataset.draftDirty === "true");
  await page.waitForFunction(() => !document.querySelector("[data-project-editor]")?.dataset.draftDirty && document.querySelector("[data-project-save]")?.textContent === "Saved");
  await page.reload({ waitUntil: "networkidle" });
  const draftFlash = page.locator("[data-draft-flash]");
  await assert.doesNotReject(draftFlash.getByRole("button", { name: "Revert to published version" }).waitFor());
  assert.match(await draftFlash.textContent(), /unsaved changes/i);
  assert.equal(await draftFlash.evaluate((element) => getComputedStyle(element).borderColor), "rgb(201, 155, 55)");
  await page.screenshot({ path: "/tmp/resources-draft-flash.png" });
  await draftFlash.getByRole("button", { name: "Dismiss" }).click();
  assert.equal(await draftFlash.count(), 0);
  await page.reload({ waitUntil: "networkidle" });
  await page.locator("[data-draft-flash]").getByRole("button", { name: "Revert to published version" }).click();
  await assert.doesNotReject(page.getByRole("button", { name: "Save project" }).waitFor());
  assert.equal(await page.getByLabel("Template").inputValue(), templateBeforeReplacement);
  assert.equal(await page.locator("[data-project-snapshot]").inputValue(), snapshotBeforeTemplate);
  assert.equal(await page.locator("[data-draft-flash]").count(), 0);
  assert.equal(await page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link", { name: "projects" }).getAttribute("href"), "/projects");
  assert.equal(await page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link", { name: "tiny-tools" }).getAttribute("href"), "/tiny-tools");
  await page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link", { name: "tiny-tools" }).click();
  await assert.doesNotReject(page.getByRole("heading", { name: "Tiny Tools" }).waitFor());
  assert.equal(await page.title(), "Tiny Tools - Resources.co");
  assert.equal(await page.locator("#crumb .here").textContent(), "tiny-tools");
  assert.equal((await page.locator("#brand-path").innerText()).trim(), "Resources.co");
  await page.getByRole("link", { name: /Digital Clock/ }).click();
  assert.equal(await page.locator("script:not([type='application/json'])").count(), 4);
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
  const guestEditor = guest.locator(".project-editor .cm-content");
  await assert.doesNotReject(guestEditor.waitFor());
  await guestEditor.fill("<h1>Visitor experiment</h1>");
  await assert.doesNotReject(guest.locator("[data-project-preview] h1", { hasText: "Visitor experiment" }).waitFor());
  await guest.waitForTimeout(1_700);
  assert.equal(await guest.locator("[data-project-save]").textContent(), "");
  assert.equal(await guest.locator("[data-project-status]").getAttribute("data-state"), "normal");
  await guest.close();
  await page.getByRole("button", { name: "Delete project", exact: true }).click();
  const deleteDialog = page.getByRole("alertdialog", { name: "Delete project" });
  await assert.doesNotReject(deleteDialog.waitFor());
  await deleteDialog.getByRole("button", { name: "Cancel" }).click();
  assert.equal(await deleteDialog.isHidden(), true);
  await page.getByRole("button", { name: "Delete project", exact: true }).click();
  await deleteDialog.getByRole("button", { name: "Delete project", exact: true }).click();
  await assert.doesNotReject(page.getByRole("heading", { name: "Projects", exact: true }).waitFor());
  assert.equal(new URL(page.url()).pathname, "/projects");
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
