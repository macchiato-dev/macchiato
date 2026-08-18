import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { chromium } from "@playwright/test";

const root = new URL("../../../dist/pages/", import.meta.url);
const types = { ".css": "text/css", ".html": "text/html", ".js": "text/javascript",
  ".wasm": "application/wasm" };

test("the MicroQuickJS guest compiles Cat Memory CSS", async (context) => {
  const server = createServer(async (request, response) => {
    const url = new URL(request.url, "http://example.test");
    const path = url.pathname === "/cat-memory/" ?
      "cat-memory/index.html" : url.pathname.slice(1);
    response.setHeader("content-type", types[path.slice(path.lastIndexOf("."))] ||
      "application/octet-stream");
    response.end(await readFile(join(root.pathname, path)));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(() => new Promise((resolve) => server.close(resolve)));

  const browser = await chromium.launch({ headless: true });
  context.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
  const requests = [], errors = [];
  page.on("request", (request) => requests.push(new URL(request.url()).pathname));
  page.on("pageerror", (error) => errors.push(String(error)));
  await page.goto(`http://127.0.0.1:${server.address().port}/cat-memory/`);

  const cards = page.locator(".card");
  await cards.first().waitFor();
  assert.equal(await cards.count(), 16);
  assert.equal(await page.locator(".card-back-paw").count(), 16);
  assert.equal(await page.locator(".card-front-cat").count(), 16);
  assert.deepEqual(await page.locator(".card-back-paw").first().evaluate((image) => {
    const source = atob(image.src.slice(image.src.indexOf(",") + 1));
    return {
      prefix: image.src.slice(0, image.src.indexOf(",") + 1),
      svg: source.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'),
      networkSyntax: /(?:href|url\(|<script|<image)/i.test(source),
    };
  }), {
    prefix: "data:image/svg+xml;base64,",
    svg: true,
    networkSyntax: false,
  });
  assert.ok(await page.evaluate(() => [...document.styleSheets]
    .some((sheet) => sheet.cssRules.length > 20)));
  assert.equal(await page.evaluate(() => document.querySelector("main").firstChild.data.trim()),
    "The guest may retain meaningful source comments as DOM nodes.");
  assert.deepEqual(await page.locator("svg.mark").evaluate((mark) => ({
    namespace: mark.namespaceURI,
    children: [...mark.children].map((child) => child.localName),
  })), {
    namespace: "http://www.w3.org/2000/svg",
    children: ["path", "path", "ellipse", "circle", "circle", "path"],
  });
  assert.match(await page.locator("style").textContent(),
    /^\/\* The guest compiles this source; the host formats its typed records\. \*\/\n\n:root \{/);
  assert.equal(requests.some((path) => path.endsWith("/style.css")), false);

  const pair = await cards.evaluateAll((nodes) => {
    const seen = new Map();
    for (let index = 0; index < nodes.length; index++) {
      const source = nodes[index].querySelector(".card-front-cat").src;
      if (seen.has(source)) return [seen.get(source), index];
      seen.set(source, index);
    }
  });
  await cards.nth(pair[0]).click();
  await cards.nth(pair[1]).click();
  await page.waitForTimeout(550);
  assert.equal(await page.locator(".card.matched").count(), 2);
  assert.deepEqual(errors, []);
});
