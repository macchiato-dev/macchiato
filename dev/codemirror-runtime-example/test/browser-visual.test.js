import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { chromium } from "@playwright/test";
import test from "node:test";

const root = resolve(new URL("..", import.meta.url).pathname);
const canonicalHost = resolve(root,
  "../wasm-web-container/examples/web/wasm-web-container.js");
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript",
  ".wasm": "application/wasm" };

test("the demo index and each projected QuickJS editor work", async (context) => {
  const server = createServer(async (request, response) => {
    const pathname = new URL(request.url, "http://example.test").pathname;
    if (pathname === "/wasm-web-container.js") {
      response.writeHead(200, { "content-type": "text/javascript" });
      response.end(await readFile(canonicalHost));
      return;
    }
    const relative = pathname === "/" ? "index.html"
      : pathname.endsWith("/") ? `${pathname.slice(1)}index.html` : pathname.slice(1);
    try {
      const body = await readFile(resolve(root, relative));
      response.writeHead(200, { "content-type": types[extname(relative)] || "application/octet-stream" });
      response.end(body);
    } catch {
      response.writeHead(404).end();
    }
  }).listen(0, "127.0.0.1");
  await new Promise(resolveReady => server.once("listening", resolveReady));

  const browser = await chromium.launch();
  context.after(async () => {
    await browser.close();
    await new Promise(resolveClosed => server.close(resolveClosed));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const index = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  await index.goto(base);
  assert.deepEqual(await index.locator("nav strong").allTextContents(),
    ["Canonical host workbench", "Simple editor", "Full UI", "Large document"]);
  await index.screenshot({ path: "/tmp/quickjs-codemirror-index.png" });
  await index.close();

  for (const name of ["simple", "full", "large"]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const started = performance.now();
    await page.goto(`${base}/${name}/`);
    await page.waitForSelector("body[data-ready]");
    context.diagnostic(`${name}: browser-ready=${(performance.now() - started).toFixed(1)}ms`);
    assert.equal(await page.locator(".cm-editor").count(), 1);
    assert.equal(Math.round((await page.locator(".cm-editor").boundingBox()).height), 900);
    assert.ok(await page.locator(".cm-lineNumbers .cm-gutterElement").count() > 1);
    assert.deepEqual(errors, []);
    await page.screenshot({ path: `/tmp/quickjs-codemirror-${name}.png` });
    await page.close();
  }

  const full = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await full.goto(`${base}/full/`);
  await full.waitForSelector("body[data-ready]");
  assert.ok(await full.locator(".cm-foldGutter .cm-gutterElement").count() > 1);
  await full.screenshot({ path: "/tmp/quickjs-codemirror-full-mobile.png" });
  await full.close();

  const folding = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  const foldingErrors = [];
  folding.on("pageerror", error => foldingErrors.push(error.message));
  folding.on("console", message => {
    if (message.type() === "error" && !message.text().includes("CodeMirror:typescript=")) {
      foldingErrors.push(message.text());
    }
  });
  await folding.goto(`${base}/full/`);
  await folding.waitForSelector("body[data-ready]");
  const foldLines = [0, 6, 11, 16];
  const foldMarkers = folding.locator('.cm-foldGutter span[title="Fold line"]');
  assert.equal(await foldMarkers.count(), foldLines.length);
  for (let index = 0; index < foldLines.length; index++) {
    const lineBox = await folding.locator(".cm-line").nth(foldLines[index]).boundingBox();
    const markerBox = await foldMarkers.nth(index).boundingBox();
    assert.ok(Math.abs(markerBox.y - lineBox.y) <= 1);
  }
  await foldMarkers.first().click();
  assert.equal(await folding.locator(".cm-line").count(), 16);
  assert.match(await folding.locator(".cm-line").first().innerText(), /…/);
  await folding.locator('.cm-foldGutter span[title="Unfold line"]:visible').click();
  assert.equal(await folding.locator(".cm-line").count(), 20);
  assert.deepEqual(foldingErrors, []);
  await folding.screenshot({ path: "/tmp/quickjs-codemirror-folding.png" });
  await folding.close();

  const input = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  const inputErrors = [];
  input.on("pageerror", error => inputErrors.push(error.message));
  input.on("console", message => {
    if (message.type() === "error" && !message.text().includes("CodeMirror:typescript=")) {
      inputErrors.push(message.text());
    }
  });
  await input.goto(`${base}/full/`);
  await input.waitForSelector("body[data-ready]");
  const content = input.locator(".cm-content");
  await content.click();
  await input.keyboard.press("ControlOrMeta+A");
  await input.keyboard.type("function greetx", { delay: 24 });
  await input.keyboard.press("Backspace");
  await input.keyboard.type("(name) {");
  await input.keyboard.press("Enter");
  await input.keyboard.type("const messagex", { delay: 18 });
  await input.keyboard.press("Backspace");
  await input.keyboard.type(" = `Hello, ${name}!`;");
  await input.keyboard.press("Enter");
  await input.keyboard.type("return messagx", { delay: 16 });
  await input.keyboard.press("Backspace");
  await input.keyboard.type("e;");
  await input.keyboard.press("Enter");
  await input.keyboard.type("}");
  await input.waitForTimeout(100);
  assert.equal(await content.innerText(),
    "function greet(name) {\n  const message = `Hello, ${name}!`;\n  return message;\n}");
  const completedFunction = await content.innerText();
  await input.keyboard.type("!");
  await input.keyboard.press("ControlOrMeta+z");
  await input.keyboard.press("ControlOrMeta+End");
  assert.equal(await content.innerText(), completedFunction);
  await input.keyboard.press("ControlOrMeta+Shift+z");
  assert.equal(await content.innerText(), `${completedFunction}!`);
  await input.keyboard.press("ControlOrMeta+z");
  const line = input.locator(".cm-line").nth(2);
  const lineBox = await line.boundingBox();
  await input.mouse.click(lineBox.x + 35, lineBox.y + lineBox.height / 2);
  await input.keyboard.press("ArrowUp");
  await input.keyboard.type("X");
  assert.match(await input.locator(".cm-line").nth(1).innerText(), /X/);
  await input.keyboard.press("Backspace");
  await input.keyboard.press("ArrowDown");
  await input.keyboard.type("Y");
  assert.match(await input.locator(".cm-line").nth(2).innerText(), /Y/);
  await input.keyboard.press("Backspace");
  const lineBoxes = await input.locator(".cm-line").evaluateAll(elements =>
    elements.map(element => element.getBoundingClientRect()));
  const numberBoxes = await input.locator(".cm-lineNumbers .cm-gutterElement")
    .evaluateAll(elements => elements.filter(element => element.style.visibility !== "hidden")
      .map(element => element.getBoundingClientRect()));
  assert.equal(numberBoxes.length, lineBoxes.length);
  assert.deepEqual(await input.locator(".cm-lineNumbers .cm-gutterElement")
    .evaluateAll(elements => elements.filter(element => element.style.visibility !== "hidden")
      .map(element => element.textContent)), ["1", "2", "3", "4"]);
  for (let index = 0; index < lineBoxes.length; index++) {
    assert.ok(Math.abs(numberBoxes[index].top - lineBoxes[index].top) <= 1);
    assert.ok(Math.abs(numberBoxes[index].height - lineBoxes[index].height) <= 1);
  }
  assert.equal(await input.evaluate(() => getSelection().isCollapsed), true);
  assert.deepEqual(inputErrors, []);
  await input.screenshot({ path: "/tmp/quickjs-codemirror-input.png" });
  await input.close();

  const pointerContext = await browser.newContext({
    viewport: { width: 1200, height: 800 },
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const pointer = await pointerContext.newPage();
  const pointerErrors = [];
  pointer.on("pageerror", error => pointerErrors.push(error.message));
  pointer.on("console", message => {
    if (message.type() === "error" && !message.text().includes("CodeMirror:typescript=")) {
      pointerErrors.push(message.text());
    }
  });
  await pointer.goto(`${base}/full/`);
  await pointer.waitForSelector("body[data-ready]");
  const pointerContent = pointer.locator(".cm-content");
  const pointerLines = pointer.locator(".cm-line");
  const original = await pointerContent.innerText();
  const selectionStart = await pointerLines.nth(1).boundingBox();
  const selectionEnd = await pointerLines.nth(4).boundingBox();
  await pointer.mouse.move(selectionStart.x + 20, selectionStart.y + selectionStart.height / 2);
  await pointer.mouse.down();
  await pointer.mouse.move(selectionEnd.x + 30, selectionEnd.y + selectionEnd.height / 2,
    { steps: 15 });
  await pointer.mouse.up();
  assert.ok((await pointer.evaluate(() => getSelection().toString())).length > 20);
  await pointer.evaluate(() => {
    globalThis.__copyMutations = [];
    new MutationObserver(records => __copyMutations.push(...records.map(record => record.type)))
      .observe(document.querySelector(".cm-content"),
        { subtree: true, childList: true, characterData: true, attributes: true });
  });
  await pointer.keyboard.press("ControlOrMeta+c");
  await pointer.waitForTimeout(50);
  assert.equal(await pointerContent.innerText(), original);
  assert.deepEqual(await pointer.evaluate(() => __copyMutations), []);
  const clickTarget = await pointerLines.nth(10).boundingBox();
  await pointer.mouse.click(clickTarget.x + 40, clickTarget.y + clickTarget.height / 2);
  assert.equal(await pointerContent.innerText(), original);

  const firstLine = await pointerLines.first().boundingBox();
  await pointer.mouse.dblclick(firstLine.x + 72, firstLine.y + firstLine.height / 2);
  assert.equal(await pointer.evaluate(() => getSelection().toString()), "Project");
  const dropLine = await pointerLines.nth(3).boundingBox();
  await pointer.mouse.move(firstLine.x + 72, firstLine.y + firstLine.height / 2);
  await pointer.mouse.down();
  await pointer.mouse.move(dropLine.x + 150, dropLine.y + dropLine.height / 2,
    { steps: 16 });
  await pointer.mouse.up();
  await pointer.waitForTimeout(50);
  assert.equal(await pointerLines.first().innerText(), "type  = {");
  assert.notEqual(await pointerContent.innerText(), original);
  assert.equal((await pointerContent.innerText()).match(/Project/g)?.length,
    original.match(/Project/g)?.length);
  assert.equal(await pointer.evaluate(() => getSelection().toString()), "Project");
  await pointer.keyboard.press("ControlOrMeta+c");
  assert.equal(await pointer.evaluate(() => navigator.clipboard.readText()), "Project");
  assert.ok(await pointerContent.locator("span[class^=wwc-c]").count() > 20);
  assert.deepEqual(pointerErrors, []);
  await pointer.screenshot({ path: "/tmp/quickjs-codemirror-pointer.png" });
  await pointerContext.close();
});
