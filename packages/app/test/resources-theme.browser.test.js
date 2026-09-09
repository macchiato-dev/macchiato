import assert from "node:assert/strict";
import test from "node:test";
import { chromium } from "playwright";
import { renderSiteRoute } from "@macchiato-dev/site";
import { buildResourcesSiteRoutesForRuntime } from "../../website/seed.js";
import { publicResponseHeaders } from "../../website/edge/models.js";

test("appearance is correct before the frontend loads, including document navigation", async (t) => {
  const routes = buildResourcesSiteRoutesForRuntime({ runtime: "edge" });
  const documents = new Map(routes.map((route) => [route.path, renderSiteRoute(route)]));
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
        assert.deepEqual(errors, []);
      } finally {
        await context.close();
      }
    });
  }
});
