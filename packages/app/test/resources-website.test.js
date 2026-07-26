import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { DomUse } from "@macchiato-dev/dom-use";
import { chromium } from "playwright";

import { resourcesWebsiteHandler } from "../../../examples/resources-website/handler.js";
import { buildResourcesSiteRoutes, resourcesDomSchema, validateResourcesStylesheet } from "../../../examples/resources-site/seed.js";
import { seal } from "../../../examples/resources-site/auth/session.js";

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

function startApp(port, dataDir) {
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
  assert.match(text, /Edge safe/);
  assert.match(response.headers.get("content-security-policy"), /script-src 'none'/);
  assert.doesNotMatch(text, /type="module"|type="importmap"/);
  assert.equal(config.status, 200);
  assert.match(configText, /Resources\.co Edge Preview/);
  assert.match(configText, /in-memory export manifest/);
  assert.match(configText, /Bunny Storage/);
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

test("Resources.co edge preview renders in a real browser without page scripts", async (t) => {
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
  await assert.doesNotReject(page.getByText("Edge safe", { exact: true }).waitFor());
  await assert.doesNotReject(page.getByRole("link", { name: "Log in" }).waitFor());
  const edgeTheme = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return [style.getPropertyValue("--accent").trim(), style.getPropertyValue("--active-bg").trim()];
  });
  assert.equal(response.status(), 200);
  assert.equal(await page.locator("script:not([type='application/json'])").count(), 0);
  assert.equal(await page.locator("script[type='application/json']").count(), 1);

  await page.getByRole("link", { name: "Log in" }).click();
  await assert.doesNotReject(page.getByRole("link", { name: "Continue with GitHub" }).waitFor());
  await assert.doesNotReject(page.getByRole("link", { name: "Continue with GitLab" }).waitFor());
  await assert.doesNotReject(page.getByRole("heading", { name: "Log in to Resources.co" }).waitFor());
  await assert.doesNotReject(page.locator(".nav").waitFor());
  await assert.doesNotReject(page.locator(".footer").waitFor());
  assert.equal(await page.locator("script:not([type='application/json'])").count(), 0);
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
  await assert.doesNotReject(page.getByText("latte-dev", { exact: true }).waitFor());
  await assert.doesNotReject(page.getByRole("button", { name: "Sign out" }).waitFor());
  assert.equal(await page.getByRole("link", { name: "Log in" }).count(), 0);

  await page.goto(`http://resources-co.localhost:${port}/`, { waitUntil: "networkidle" });
  const localTheme = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return [style.getPropertyValue("--accent").trim(), style.getPropertyValue("--active-bg").trim()];
  });
  assert.deepEqual(edgeTheme, localTheme);
  assert.deepEqual(errors, []);
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
  const missing = await fetch(`http://resources-co.localhost:${port}/export/index.html`);
  const missingHtml = await missing.text();

  assert.equal(home.status, 200);
  assert.match(homeHtml, /<title>Resources\.co<\/title>/);
  assert.match(homeHtml, /href="\/macchiato\/app"/);
  assert.doesNotMatch(homeHtml, /href="#macchiato\/app"/);
  assert.equal(project.status, 200);
  assert.match(projectHtml, /<title>App - Resources\.co<\/title>/);
  assert.match(projectHtml, /<header class="box project-identity" data-screen-label="brand">/);
  assert.match(projectHtml, /aria-label="Project path"/);
  assert.match(projectHtml, /class="project-identity__home" href="\/" aria-label="Resources\.co home"/);
  assert.match(projectHtml, /aria-label="Breadcrumb"/);
  assert.match(projectHtml, /href="\/macchiato"/);
  assert.match(projectHtml, /<h1>App<\/h1>/);
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
  assert.equal(await page.locator(".project-identity").count(), 1);
  assert.equal(await page.locator(".project-identity__home[aria-label='Resources.co home'] svg").count(), 1);
  assert.equal(await page.locator(".project-identity__owner", { hasText: "macchiato" }).count(), 1);
  assert.equal(await page.locator(".project-identity__name--current", { hasText: "app" }).count(), 1);
  assert.equal(await page.locator(".brand__home").count(), 0);
  await assert.doesNotReject(page.locator(".crumb", { hasText: "macchiato" }).waitFor());

  await page.locator("#brand-path a[href='/macchiato']").click();
  await assert.doesNotReject(page.locator("h1", { hasText: "macchiato" }).waitFor());
  assert.equal(new URL(page.url()).pathname, "/macchiato");
  assert.equal((await page.locator("#brand-path").textContent()).trim(), "macchiato");

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
  await page.waitForFunction(() => document.querySelector(".userbar .ub-pop:nth-child(3)")?.dataset.open === "true");
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
  await page.waitForFunction(() => document.querySelector(".userbar .ub-pop:nth-child(2)")?.dataset.open === "true");
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
  await assert.doesNotReject(page.getByRole("link", { name: "Log in" }).waitFor());
  await assert.doesNotReject(page.getByRole("link", { name: "Sign up" }).waitFor());
  assert.equal(await page.getByRole("button", { name: "Account menu" }).isVisible(), false);

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
