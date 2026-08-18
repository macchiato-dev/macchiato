import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { chromium } from "@playwright/test";

const root = new URL("../../../dist/pages/", import.meta.url);
const types = { ".css": "text/css", ".html": "text/html", ".js": "text/javascript",
  ".wasm": "application/wasm" };

test("the index and portable examples work", async (context) => {
  const mahjongSource = await readFile(new URL("../mahjong/application.js", import.meta.url), "utf8");
  const solution = JSON.parse(/var solution = (\[[\s\S]*?\]);/.exec(mahjongSource)[1]);
  const server = createServer(async (request, response) => {
    const url = new URL(request.url, "http://example.test");
    const sitePath = url.pathname.replace(/^\/wasm-web-container(?=\/|$)/, "") || "/";
    const pathname = sitePath === "/" ? "index.html" :
      sitePath.endsWith("/") ? sitePath.slice(1) + "index.html" : sitePath.slice(1);
    const extension = pathname.slice(pathname.lastIndexOf("."));
    response.setHeader("content-type", types[extension] || "application/octet-stream");
    response.end(await readFile(join(root.pathname, pathname)));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(() => new Promise((resolve) => server.close(resolve)));

  const browser = await chromium.launch({ headless: true });
  context.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const site = origin + "/wasm-web-container";
  await page.goto(site + "/");
  assert.deepEqual(await page.locator("nav a").evaluateAll((links) =>
    links.map((link) => new URL(link.href).pathname)), [
    "/wasm-web-container/cat-memory/", "/wasm-web-container/plain-web/cat-memory/",
    "/wasm-web-container/mahjong/", "/wasm-web-container/plain-web/mahjong/",
  ]);
  await page.goto(site + "/mahjong/");

  const tiles = page.locator(".tile");
  await tiles.first().waitFor();
  assert.equal(await tiles.count(), 144);
  assert.deepEqual(await page.evaluate(() => [...document.fonts]
    .filter((font) => font.status === "loaded")
    .map((font) => font.family.replaceAll('"', "")).sort()),
  ["Cormorant Garamond", "Libre Baskerville", "Space Grotesk"]);
  assert.equal(await page.locator(".settings-menu").isHidden(), true);
  assert.equal(await page.getByRole("button", { name: "Undo last match" }).isHidden(), true);
  assert.equal(await page.locator(".stats").isHidden(), true);
  const firstRow = await tiles.nth(0).boundingBox();
  const secondRow = await tiles.nth(12).boundingBox();
  assert.ok(Math.abs(secondRow.y - firstRow.y - 68) < 0.1,
    "tile rows retain the source artwork's 68px board step");
  await tiles.nth(131).click();
  await tiles.nth(57).click();
  await page.waitForTimeout(350);
  assert.equal(await tiles.evaluateAll((nodes) => nodes.filter((node) => node.hidden).length), 2);

  await page.getByRole("button", { name: "Game options" }).click();
  assert.match(await page.locator(".setting").first().evaluate((element) =>
    getComputedStyle(element, "::after").backgroundImage), /^radial-gradient/);
  assert.match(await page.locator("style").evaluateAll((styles) =>
    styles.map((style) => style.textContent).join("\n")),
  /\.setting::after \{[\s\S]*?background: radial-gradient/);
  await page.getByRole("button", { name: "Enable undo" }).click();
  assert.equal(await page.locator(".settings-menu").isHidden(), true);
  await page.getByRole("button", { name: "Game options" }).click();
  await page.getByRole("button", { name: "Show time / moves" }).click();
  assert.equal(await page.getByRole("button", { name: "Undo last match" }).isVisible(), true);
  assert.match(await page.locator(".stats").textContent(), /^0:0\d · 1 move · 0 undos$/);
  await page.getByRole("button", { name: "Undo last match" }).click();
  assert.equal(await tiles.evaluateAll((nodes) => nodes.filter((node) => node.hidden).length), 0);
  assert.match(await page.locator(".stats").textContent(), / · 1 undos$/);

  await page.getByRole("button", { name: "Game options" }).click();
  await page.getByRole("button", { name: "Show tile names" }).click();
  await tiles.first().hover();
  assert.notEqual(await page.locator(".tile-name-display").textContent(), "");

  await page.getByRole("button", { name: "Game options" }).click();
  await page.getByRole("button", { name: "Show hint button" }).click();
  assert.equal(await page.getByRole("button", { name: "Hint" }).isVisible(), true);
  await page.getByRole("button", { name: "Game options" }).click();
  await page.getByRole("button", { name: "Inform when no move exists" }).click();
  await page.getByRole("button", { name: "Game options" }).click();
  await page.locator(".settings-dismiss").click({ position: { x: 2, y: 300 } });
  assert.equal(await page.locator(".settings-menu").isHidden(), true);
  assert.equal(await page.evaluate(() => sessionStorage.getItem(
    "-wwc--wasm-web-container-mahjong--configuration") !== null), true);
  await page.reload();
  await tiles.first().waitFor();
  assert.equal(await page.getByRole("button", { name: "Hint" }).isVisible(), true);
  assert.equal(await page.getByRole("button", { name: "Undo last match" }).isVisible(), true);
  assert.equal(await page.locator(".stats").isVisible(), true);
  assert.equal(await page.evaluate(() => localStorage.getItem(
    "-wwc--wasm-web-container-mahjong--hintEnabled")), "1");

  await page.getByRole("button", { name: /Tile art:/ }).click();
  assert.equal(await page.getByRole("button", { name: /Tile art:/ }).getAttribute("data-href"),
    "https://github.com/xhokir/riichi-mahjong-tiles");
  const creditUrl = page.locator(".modal input");
  assert.equal(await creditUrl.getAttribute("readonly"), "");
  assert.equal(await creditUrl.inputValue(),
    "https://github.com/xhokir/riichi-mahjong-tiles");
  await page.getByRole("button", { name: "Close" }).click();
  assert.equal(await page.locator(".modal").isHidden(), true);

  await page.getByRole("button", { name: "New game" }).click();
  assert.equal(await tiles.evaluateAll((nodes) => nodes.filter((node) => node.hidden).length), 0);
  for (const pair of solution) {
    await tiles.nth(pair[0]).evaluate((tile) => tile.click());
    await tiles.nth(pair[1]).evaluate((tile) => tile.click());
  }
  assert.equal(await tiles.evaluateAll((nodes) => nodes.filter((node) => node.hidden).length), 144);
  assert.equal(await page.locator(".game-status").textContent(), "");
  await page.waitForTimeout(1600);
  assert.match(await page.locator(".win-message").getAttribute("class"), /\bvisible\b/);
  assert.equal(await page.locator(".win-message").textContent(), "You Win!");
  assert.deepEqual(errors, []);


  const rawPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const rawErrors = [];
  rawPage.on("pageerror", (error) => rawErrors.push(String(error)));
  await rawPage.goto(site + "/plain-web/mahjong/");
  const rawTiles = rawPage.locator(".tile");
  await rawTiles.first().waitFor();
  assert.equal(await rawTiles.count(), 144);
  await rawPage.getByRole("button", { name: "Game options" }).click();
  assert.equal(await rawPage.locator(".settings-menu").isVisible(), true);
  assert.deepEqual(rawErrors, []);
  for (const mode of ["wasm", "plain"]) {
    const catPage = await browser.newPage({ viewport: { width: 900, height: 900 } });
    const catErrors = [];
    const catRequests = [];
    catPage.on("pageerror", (error) => catErrors.push(String(error)));
    catPage.on("request", (request) => catRequests.push(new URL(request.url()).pathname));
    await catPage.goto(site + (mode === "wasm" ?
      "/cat-memory/" : "/plain-web/cat-memory/"));
    const cards = catPage.locator(".card");
    await cards.first().waitFor();
    assert.equal(await cards.count(), 16);
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
    await catPage.waitForTimeout(550);
    assert.equal(await catPage.locator(".card.matched").count(), 2);
    assert.ok(await catPage.evaluate(() => [...document.styleSheets]
      .some((sheet) => sheet.cssRules.length > 20)), "the stylesheet is installed");
    if (mode === "wasm") {
      assert.equal(catRequests.some((path) => path.endsWith("/style.css")), false,
        "the Wasm guest compiles embedded CSS instead of asking the host to fetch it");
    }
    assert.deepEqual(catErrors, []);
    await catPage.close();
  }

  const memoryPage = await browser.newPage();
  await memoryPage.goto(site + "/");
  assert.equal(await memoryPage.evaluate(async (url) => {
    const result = await WebAssembly.instantiateStreaming(fetch(url), {
      host: { msg() { return 0; }, now() { return 0; } },
    });
    const memory = result.instance.exports.memory;
    const maximumPages = 4096;
    memory.grow(maximumPages - memory.buffer.byteLength / 65536);
    try { memory.grow(1); return false; }
    catch (error) { return error instanceof RangeError; }
  }, site + "/cat-memory/main.wasm"), true);
  await memoryPage.close();
});
