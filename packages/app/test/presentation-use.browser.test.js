import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import test from "node:test";
import { chromium } from "playwright";

const root = new URL("../../../", import.meta.url);
const assets = new Map([
  ["/-/project-editor-runtime.js", new URL("packages/website/generated/project-editor-runtime.js", root)],
  ["/-/resources-site/presentation-runner.js", new URL("packages/website/generated/presentation-runner.js", root)],
  ["/-/resources-site/presentation-runner.html", new URL("packages/presentation-use/runner.html", root)],
]);

test("presentation-use keeps guest code in QuickJS and blocks ungranted URL sinks", async (context) => {
  const server = createServer(async (request, response) => {
    if (request.url === "/") {
      response.setHeader("content-type", "text/html; charset=utf-8");
      response.end(`<!doctype html><html lang="es"><body><div id="preview"></div><output id="status"></output><script type="module">
        import { mountResourcesPresentation } from "/-/project-editor-runtime.js";
        const status = document.querySelector("#status");
        window.presentationController = mountResourcesPresentation({
          root: document.querySelector("#preview"),
          project: {
            title: "URL boundary probe",
            file: '<main id="app"><button id="image">Set image URL</button><button id="link">Set link URL</button><button id="count">Count</button><p id="state">ready</p><p id="ticks">0</p><p id="language"></p><img id="picture" alt=""><a id="target">target</a></main><script>let count = 0; let ticks = 0; document.getElementById("language").textContent = navigator.language; document.getElementById("image").addEventListener("click", () => { document.getElementById("picture").src = "https://tracker.example/private.png"; }); document.getElementById("link").addEventListener("click", () => { document.getElementById("target").setAttribute("href", "https://tracker.example/leak"); }); document.getElementById("count").addEventListener("click", () => { document.getElementById("count").textContent = "Count " + (++count); }); document.addEventListener("keydown", (event) => { document.getElementById("state").textContent = event.key; }); setInterval(() => { document.getElementById("ticks").textContent = String(++ticks); }, 100);<\\/script>',
            domSchema: {
              nodes: {
                body: { attrs: [], events: ["keydown"], children: ["main"] },
                main: { attrs: ["id"], children: ["button", "p", "img", "a"] },
                button: { attrs: ["id"], events: ["click"], children: ["#text"] },
                p: { attrs: ["id"], children: ["#text"] },
                img: { attrs: ["id", "alt", "src"], children: [] },
                a: { attrs: ["id", "href"], children: ["#text"] },
              },
              urls: { "img.src": "^data:image/png;base64,", "a.href": "^#[-a-z]+$" },
            },
            cssSchema: { properties: {} },
            capabilities: { events: ["click", "keydown"], timerResolution: 20 },
          },
          onStatus(event) { status.textContent = event.type + (event.message ? ": " + event.message : ""); },
        });
      </script>`);
      return;
    }
    const asset = assets.get(request.url.split("?")[0]);
    if (!asset) { response.statusCode = 404; response.end("Not found"); return; }
    response.setHeader("content-type", asset.pathname.endsWith(".html") ? "text/html; charset=utf-8" : "text/javascript; charset=utf-8");
    response.end(await readFile(asset));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(() => new Promise((resolve) => server.close(resolve)));
  const browser = await chromium.launch();
  context.after(() => browser.close());
  const page = await browser.newPage();
  const browserErrors = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") browserErrors.push(message.text()); });
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  const frameElement = page.locator(".project-editor__presentation-frame");
  await frameElement.waitFor({ timeout: 10_000 }).catch(() => assert.fail(`presentation frame did not mount: ${browserErrors.join(" | ")}`));
  assert.equal(await frameElement.getAttribute("sandbox"), null);
  const guest = page.frameLocator(".project-editor__presentation-frame");
  await guest.locator("[data-runtime='quickjs-dom-use']").waitFor({ timeout: 15_000 }).catch(async () => {
    assert.fail(`presentation runtime did not mount: ${await page.locator("#status").textContent()} | ${await guest.locator("body").innerText()} | ${browserErrors.join(" | ")}`);
  });
  assert.equal(await guest.locator("html").getAttribute("data-theme"), "dark");
  assert.equal(await guest.locator("html").evaluate((node) =>
    getComputedStyle(node).getPropertyValue("--macchiato-color-scheme").trim()), "dark");
  await page.evaluate(() => {
    document.documentElement.dataset.theme = "light";
    document.dispatchEvent(new CustomEvent("themechange", {
      detail: { choice: "light", theme: "light" },
    }));
  });
  await guest.locator('html[data-theme="light"]').waitFor();
  assert.equal(await guest.locator("html").evaluate((node) => node.style.colorScheme), "light");
  assert.equal(await guest.locator("#state").textContent(), "ready");
  assert.equal(await guest.locator("#language").textContent(), "es");
  await page.evaluate(() => window.presentationController.focus());
  await page.keyboard.press("ArrowRight");
  await guest.locator("#state").getByText("ArrowRight").waitFor();

  await guest.locator("#count").click({ delay: 250 });
  await guest.locator("#count").getByText("Count 1", { exact: true }).waitFor();
  for (let count = 2; count <= 5; count += 1) {
    await guest.locator("#count").click();
    await guest.locator("#count").getByText(`Count ${count}`, { exact: true }).waitFor();
  }

  await guest.locator("#image").click();
  await page.locator("#status").getByText(/blocked: URL not allowed on img\.src/).waitFor();
  assert.equal(await guest.locator("#picture").getAttribute("src"), null);
  assert.equal(await guest.locator("#state").textContent(), "ArrowRight");

  await guest.locator("#link").click();
  await page.locator("#status").getByText(/blocked: URL not allowed on a\.href/).waitFor();
  assert.equal(await guest.locator("#target").getAttribute("href"), null);
});
