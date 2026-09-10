import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";
import { renderSiteRoute } from "@macchiato-dev/site";
import { buildResourcesSiteRoutesForRuntime } from "../../website/seed.js";
import { publicResponseHeaders } from "../../website/edge/models.js";
import { ServerMachineController } from "../../server-use/src/machine-controller.js";

test("appearance is correct before the frontend loads, including document navigation", async (t) => {
  const routes = buildResourcesSiteRoutesForRuntime({ runtime: "edge" });
  const documents = new Map(routes.map((route) => [route.path, renderSiteRoute(route)]));
  // Account workspaces are populated by the server's document machine, not
  // present in the immutable public shell alone. Use that actual renderer.
  const generated = new URL("../../website/generated/", import.meta.url);
  const bytecodeDirectory = new URL("resources-document-bytecode/", generated);
  const renderer = new ServerMachineController(await WebAssembly.compile(
    await readFile(new URL("microquickjs-server.wasm", generated))), {
    bytecodes: await Promise.all((await readdir(bytecodeDirectory)).filter(name => name.endsWith(".bin"))
      .sort().map(name => readFile(new URL(name, bytecodeDirectory)))),
  });
  documents.set("/projects/new", await renderer.request(["page", JSON.stringify([
    documents.get("/projects/new"),
    { kind: "project-form", focused: true, notifications: [], accountContent: { projects: [], organizations: [] } },
    { sub: "theme-test", login: "theme-test", name: "Theme Test" }, {}, {},
    { locale: "en", pathname: "/projects/new", formErrorCode: "", signupsEnabled: true, controllerVersion: "test" },
  ])]));
  const accountHome = await renderer.request(["page", JSON.stringify([
    documents.get("/dashboard"),
    { kind: "dashboard", focused: false, notifications: [], publicProjects: null,
      accountContent: { organizations: [], projects: [{ name: "Theme fixture project",
        namespace: "theme-test", slug: "theme-fixture", description: "",
        template: "article", visibility: "public" }] } },
    { sub: "theme-test", login: "theme-test", name: "Theme Test" }, {}, {},
    { locale: "en", pathname: "/", formErrorCode: "", signupsEnabled: true, controllerVersion: "test" },
  ])]);
  assert.match(accountHome, /Theme fixture project/);
  const articles = [...documents.keys()].filter(path => path.startsWith("/blog/"));
  assert.ok(articles.length > 0, "exercise article documents, not only the blog index");
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());

  for (const mobile of [false, true]) for (const [system, stored, expected] of [
    ["light", "system", "light"], ["dark", "system", "dark"],
    ["light", "dark", "dark"], ["dark", "light", "light"],
    ["light", null, "light"], ["light", "invalid", "light"],
    ["light", "unavailable", "light"],
  ]) {
    await t.test(`${mobile ? "phone" : "desktop"}, ${system} system, preference ${stored}`, async () => {
      const context = await browser.newContext({ colorScheme: system,
        viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 } });
      try {
        // Serve the real generated documents and CSP, but no frontend machine.
        // First paint must not depend on its download or startup completing.
        await context.route("**/*", (route) => {
          // Embedded examples are not part of this static first-paint check.
          // Never fetch their external assets or run an unrelated application.
          if (new URL(route.request().url()).origin !== "http://theme.test") {
            return route.fulfill({ contentType: "text/html", body: "" });
          }
          if (new URL(route.request().url()).pathname === "/output-probe.html") {
            return route.fulfill({ contentType: "text/html", body: `<!doctype html>
              <style>body { background: #112233; }
                @media (prefers-color-scheme: light) { body { background: #ddeeff; } }
              </style><body>Output theme probe</body>` });
          }
          const url = new URL(route.request().url());
          // This query selects a fixture response only; the real server uses
          // its authenticated page plan to render this document at the root.
          const body = url.pathname === "/" && url.searchParams.has("account")
            ? accountHome : documents.get(url.pathname);
          return route.fulfill({ status: body ? 200 : 404,
            headers: Object.fromEntries(publicResponseHeaders("index.html")), body: body || "" });
        });
        await context.addInitScript(({ stored }) => {
          // The preference belongs to the site, not sandboxed article frames.
          if (window !== window.top) return;
          if (stored === "unavailable") {
            Object.defineProperty(window, "localStorage", { get() { throw new Error("Storage blocked"); } });
          } else if (stored !== null) localStorage.setItem("macchiato-theme", stored);
          window.paints = [];
          function sample() {
            if (document.body) window.paints.push({
              theme: document.documentElement.dataset.theme,
              background: getComputedStyle(document.documentElement).getPropertyValue("--bg-color").trim(),
              content: [...document.querySelectorAll('#content > *')].map(node => ({
                opacity: getComputedStyle(node).opacity,
                transform: getComputedStyle(node).transform,
              })),
            });
            if (window.paints.length < 6) requestAnimationFrame(sample);
          }
          requestAnimationFrame(sample);
        }, { stored });
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        async function checkPaint() {
          await page.waitForFunction(() => window.paints.length === 6);
          const paints = await page.evaluate(() => window.paints);
          assert.ok(paints.every((paint) => paint.theme === expected
            && paint.background === (expected === "light" ? "#e7ecff" : "#1a1aa2")), JSON.stringify(paints));
          assert.ok(paints.every(paint => paint.content.every(block =>
            block.opacity === '1' && block.transform === 'none')),
          'server-rendered content must be fully readable at first paint: ' + JSON.stringify(paints));
        }
        await page.goto("http://theme.test/");
        await checkPaint();
        await Promise.all([page.waitForURL("**/blog"), page.locator('a[href="/blog"]').first().click()]);
        await checkPaint();
        await page.reload();
        await checkPaint();
        await page.goBack();
        await checkPaint();
        for (const article of articles) {
          await page.goto("http://theme.test" + article);
          await checkPaint();
        }
        await page.goto("http://theme.test/?account");
        await checkPaint();
        assert.equal(await page.locator('a[href="/theme-test/theme-fixture"]').count(), 1,
          "the signed-in home renders the fixture project, not the public shell");
        await page.goto("http://theme.test/projects/new");
        await checkPaint();
        // The server-rendered workspace must already be correctly colored
        // while all guest downloads are still absent. Each spinner belongs
        // to its own pane, rather than obscuring the divider between them.
        const workspace = await page.evaluate(() => {
          const toolbar = document.querySelector(".project-editor__toolbar");
          const color = node => node && getComputedStyle(node).backgroundColor;
          return {
            overflow: document.documentElement.scrollWidth > innerWidth,
            splitVisible: document.querySelector('[data-project-view="split"]').checkVisibility(),
            sourceVisible: document.querySelector('.project-editor__source').checkVisibility(),
            outputVisible: document.querySelector('.project-editor__preview').checkVisibility(),
            toolbar: color(toolbar),
            details: color(document.querySelector(".project-create__fields")),
            panes: [...document.querySelectorAll(".project-editor__pane-loading")].map(node => {
              const box = node.getBoundingClientRect(), pane = node.parentElement.getBoundingClientRect();
              return { color: color(node), display: getComputedStyle(node).display, visible: node.checkVisibility(),
                inset: Math.abs(box.x - pane.x) + Math.abs(box.width - pane.width),
                width: box.width, height: box.height };
            }),
          };
        });
        assert.equal(workspace.toolbar, expected === "light" ? "rgb(219, 228, 255)" : "rgb(23, 34, 110)");
        assert.equal(workspace.details, workspace.toolbar);
        assert.equal(workspace.overflow, false);
        assert.equal(workspace.splitVisible, !mobile);
        assert.equal(workspace.sourceVisible, !mobile);
        assert.equal(workspace.outputVisible, true);
        assert.equal(workspace.panes.length, 2);
        assert.equal(workspace.panes.filter(pane => pane.visible).length, mobile ? 1 : 2);
        for (const pane of workspace.panes) {
          assert.equal(pane.color, workspace.toolbar);
          assert.equal(pane.display, "grid");
          if (pane.visible) assert.ok(pane.width > 100 && pane.height > 100 && pane.inset <= 2, JSON.stringify(pane));
        }
        // Playwright's explicit media override also overrides the embedded
        // document's inherited scheme. Main-document first paint was checked
        // above; clear that override to test real iframe scheme propagation.
        // No frontend is running here, so the resolved root theme stays put.
        await page.emulateMedia({ colorScheme: null });
        await page.evaluate(() => new Promise(resolve => {
          const frame = document.createElement("iframe");
          frame.className = "project-editor__output-frame";
          frame.onload = resolve;
          frame.src = "/output-probe.html";
          document.querySelector("[data-project-preview]").append(frame);
        }));
        const output = page.frames().find(frame => frame.url().endsWith("/output-probe.html"));
        const outputTheme = await output.evaluate(() => ({
          light: matchMedia("(prefers-color-scheme: light)").matches,
          background: getComputedStyle(document.body).backgroundColor,
        }));
        assert.deepEqual(outputTheme, { light: expected === "light",
          background: expected === "light" ? "rgb(221, 238, 255)" : "rgb(17, 34, 51)" },
          "iframe media follows the selected page theme even when it differs from the OS");
        if (process.env.MACCHIATO_TEST_ARTIFACTS) {
          await mkdir(process.env.MACCHIATO_TEST_ARTIFACTS, { recursive: true });
          await page.screenshot({ path: join(process.env.MACCHIATO_TEST_ARTIFACTS,
            `project-first-paint-${mobile ? "phone" : "desktop"}-${system}-${stored}.png`) });
        }
        assert.deepEqual(errors, []);
      } finally {
        await context.close();
      }
    });
  }
});
