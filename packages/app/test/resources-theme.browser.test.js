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
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());

  for (const [system, stored, expected] of [
    ["light", "system", "light"], ["dark", "system", "dark"],
    ["light", "dark", "dark"], ["dark", "light", "light"],
    ["light", null, "light"], ["light", "invalid", "light"],
    ["light", "unavailable", "light"],
  ]) {
    await t.test(`${system} system, preference ${stored}`, async () => {
      const context = await browser.newContext({ colorScheme: system });
      try {
        // Serve the real generated documents and CSP, but no frontend machine.
        // First paint must not depend on its download or startup completing.
        await context.route("http://theme.test/**", (route) => {
          const body = documents.get(new URL(route.request().url()).pathname);
          return route.fulfill({ status: body ? 200 : 404,
            headers: Object.fromEntries(publicResponseHeaders("index.html")), body: body || "" });
        });
        await context.addInitScript(({ stored }) => {
          if (stored === "unavailable") {
            Object.defineProperty(window, "localStorage", { get() { throw new Error("Storage blocked"); } });
          } else if (stored !== null) localStorage.setItem("macchiato-theme", stored);
          window.paints = [];
          function sample() {
            if (document.body) window.paints.push({
              theme: document.documentElement.dataset.theme,
              background: getComputedStyle(document.documentElement).getPropertyValue("--bg-color").trim(),
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
        }
        await page.goto("http://theme.test/");
        await checkPaint();
        await Promise.all([page.waitForURL("**/blog"), page.locator('a[href="/blog"]').first().click()]);
        await checkPaint();
        await page.reload();
        await checkPaint();
        await page.goBack();
        await checkPaint();
        await page.goto("http://theme.test/projects/new");
        await checkPaint();
        // The server-rendered workspace must already be correctly colored
        // while all guest downloads are still absent. Each spinner belongs
        // to its own pane, rather than obscuring the divider between them.
        const workspace = await page.evaluate(() => {
          const toolbar = document.querySelector(".project-editor__toolbar");
          const color = node => node && getComputedStyle(node).backgroundColor;
          return {
            toolbar: color(toolbar),
            details: color(document.querySelector(".project-create__fields")),
            panes: [...document.querySelectorAll(".project-editor__pane-loading")].map(node => {
              const box = node.getBoundingClientRect(), pane = node.parentElement.getBoundingClientRect();
              return { color: color(node), display: getComputedStyle(node).display,
                inset: Math.abs(box.x - pane.x) + Math.abs(box.width - pane.width),
                width: box.width, height: box.height };
            }),
          };
        });
        assert.equal(workspace.toolbar, expected === "light" ? "rgb(219, 228, 255)" : "rgb(23, 34, 110)");
        assert.equal(workspace.details, workspace.toolbar);
        assert.equal(workspace.panes.length, 2);
        for (const pane of workspace.panes) {
          assert.equal(pane.color, workspace.toolbar);
          assert.equal(pane.display, "grid");
          assert.ok(pane.width > 100 && pane.height > 100 && pane.inset <= 2, JSON.stringify(pane));
        }
        if (process.env.MACCHIATO_TEST_ARTIFACTS) {
          await mkdir(process.env.MACCHIATO_TEST_ARTIFACTS, { recursive: true });
          await page.screenshot({ path: join(process.env.MACCHIATO_TEST_ARTIFACTS,
            `project-first-paint-${system}-${stored}.png`) });
        }
        assert.deepEqual(errors, []);
      } finally {
        await context.close();
      }
    });
  }
});
