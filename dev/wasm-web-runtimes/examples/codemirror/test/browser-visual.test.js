import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { chromium } from "@playwright/test";
import test from "node:test";

const root = resolve(new URL("..", import.meta.url).pathname);
const machineModule = resolve(root,
  "../../../wasm-web-machine/dist/module/wasm-web-machine.js");
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript",
  ".wasm": "application/wasm" };
const runtime = process.env.CODEMIRROR_RUNTIME || "";
const demoPath = name => `${runtime ? `/${runtime}` : ""}/${name}/`;
const screenshotTag = runtime || "quickjs";

test("the demo index and each bridged QuickJS editor work", async (context) => {
  const server = createServer(async (request, response) => {
    const pathname = new URL(request.url, "http://example.test").pathname;
    if (pathname === "/wasm-web-machine.js") {
      response.writeHead(200, { "content-type": "text/javascript" });
      response.end(await readFile(machineModule));
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
    ["MicroQuickJS", "Canonical host workbench", "Simple editor", "Full UI", "Large document"]);
  await index.screenshot({ path: "/tmp/quickjs-codemirror-index.png" });
  await index.close();

  const demoNames = runtime === "microquickjs" ? ["full"] : ["simple", "full", "large"];
  for (const name of demoNames) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const started = performance.now();
    await page.goto(`${base}${demoPath(name)}`);
    await page.waitForSelector("body[data-ready]");
    context.diagnostic(`${name}: browser-ready=${(performance.now() - started).toFixed(1)}ms`);
    assert.equal(await page.locator(".cm-editor").count(), 1);
    assert.equal(Math.round((await page.locator(".cm-editor").boundingBox()).height), 900);
    assert.ok(await page.locator(".cm-lineNumbers .cm-gutterElement").count() > 1);
    assert.deepEqual(errors, []);
    await page.screenshot({ path: `/tmp/${screenshotTag}-codemirror-${name}.png` });
    await page.close();
  }

  const full = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await full.goto(`${base}${demoPath("full")}`);
  await full.waitForSelector("body[data-ready]");
  assert.ok(await full.locator(".cm-foldGutter .cm-gutterElement").count() > 1);
  await full.screenshot({ path: "/tmp/quickjs-codemirror-full-mobile.png" });
  await full.close();

  const completionContext = await browser.newContext({
    viewport: { width: 1200, height: 800 },
    recordVideo: { dir: "/tmp/quickjs-codemirror-video", size: { width: 1200, height: 800 } },
  });
  const completion = await completionContext.newPage();
  const completionErrors = [];
  completion.on("pageerror", error => completionErrors.push(error.message));
  await completion.goto(`${base}${demoPath("full")}`);
  await completion.waitForSelector("body[data-ready]");
  await completion.locator(".cm-content").click();
  await completion.keyboard.press("ControlOrMeta+End");
  await completion.keyboard.press("Enter");
  await completion.keyboard.type("f");
  const completionList = completion.locator("[role=listbox]");
  await completionList.waitFor();
  assert.match(await completionList.locator("xpath=..").getAttribute("class"),
    /(?:^|\s)cm-tooltip-autocomplete(?:\s|$)/);
  assert.deepEqual(await completionList.evaluate(element => {
    const style = getComputedStyle(element);
    return {
      fontFamily: style.fontFamily,
      listStyleType: style.listStyleType,
      margin: style.margin,
      padding: style.padding,
    };
  }), { fontFamily: "monospace", listStyleType: "none", margin: "0px", padding: "0px" });
  assert.equal(await completionList.locator("[role=option]").first()
    .getAttribute("aria-selected"), "true");
  await completion.screenshot({ path: "/tmp/quickjs-codemirror-autocomplete.png" });
  await completion.keyboard.press("ArrowDown");
  assert.equal(await completionList.locator("[role=option]").nth(1)
    .getAttribute("aria-selected"), "true");
  await completion.keyboard.press("Enter");
  assert.match((await completion.locator(".cm-line").allTextContents()).join("\n"),
    /(?:^|\n)finally$/);
  await completion.keyboard.press("ControlOrMeta+z");
  await completion.keyboard.press("Backspace");
  await completion.keyboard.type("i");
  await completionList.waitFor();
  assert.ok(await completionList.locator("[role=option]").count() > 1);
  await completion.keyboard.press("Escape");
  await completionList.waitFor({ state: "hidden" });
  assert.deepEqual(completionErrors, []);
  await completion.close();
  await completionContext.close();

  const folding = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  const foldingErrors = [];
  folding.on("pageerror", error => foldingErrors.push(error.message));
  folding.on("console", message => {
    if (message.type() === "error" && !message.text().includes("CodeMirror:typescript=")) {
      foldingErrors.push(message.text());
    }
  });
  await folding.goto(`${base}${demoPath("full")}`);
  await folding.waitForSelector("body[data-ready]");
  const foldLines = [0, 6, 11, 16];
  const foldMarkers = folding.locator('.cm-foldGutter span[title="Fold line"]');
  const lineNumbers = folding.locator(
    ".cm-lineNumbers .cm-gutterElement:not([style*='visibility: hidden'])");
  assert.equal(await foldMarkers.count(), foldLines.length);
  for (let index = 0; index < foldLines.length; index++) {
    const lineBox = await lineNumbers.nth(foldLines[index]).boundingBox();
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
  await input.goto(`${base}${demoPath("full")}`);
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
  await input.keyboard.press("ArrowDown");
  await input.waitForFunction(() => {
    const lines = Array.from(document.querySelectorAll(".cm-line"));
    return lines.length === 4 && lines.at(-1)?.textContent === "}";
  });
  await input.waitForTimeout(100);
  assert.equal((await input.locator(".cm-line").allTextContents()).join("\n"),
    "function greet(name) {\n  const message = `Hello, ${name}!`;\n  return message;\n}");
  const inputText = async () => (await input.locator(".cm-line").allTextContents()).join("\n");
  const completedFunction = await inputText();
  await input.waitForTimeout(1000);
  await input.keyboard.press("ArrowLeft");
  await input.keyboard.press("ArrowRight");
  await input.keyboard.type("!");
  await input.keyboard.press("ControlOrMeta+z");
  await input.waitForFunction(() => document.querySelectorAll(".cm-line")[3]?.textContent === "}");
  await input.keyboard.press("ControlOrMeta+End");
  assert.equal(await inputText(), completedFunction);
  await input.keyboard.press("ControlOrMeta+Shift+z");
  await input.waitForFunction(() => document.querySelectorAll(".cm-line")[3]?.textContent === "}!");
  assert.equal(await inputText(), `${completedFunction}!`);
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
  await input.keyboard.press("ControlOrMeta+f");
  await input.keyboard.type("message", { delay: 20 });
  await input.keyboard.press("Enter");
  await input.keyboard.press("Escape");
  await input.waitForTimeout(50);
  assert.equal(await input.locator(".cm-search").count(), 0);
  await input.keyboard.type("Z");
  assert.match(await content.innerText(), /Z/);
  await input.keyboard.press("ControlOrMeta+z");
  assert.match(await input.evaluate(() => document.activeElement.className), /cm-content/);
  await input.keyboard.press("ArrowRight");
  const lineBoxes = await input.locator(".cm-line").evaluateAll(elements =>
    elements.map(element => element.getBoundingClientRect()));
  const numberBoxes = await input.locator(".cm-lineNumbers .cm-gutterElement")
    .evaluateAll(elements => elements.filter(element => element.style.visibility !== "hidden")
      .map(element => element.getBoundingClientRect()));
  assert.equal(numberBoxes.length, lineBoxes.length);
  assert.deepEqual(await input.locator(".cm-lineNumbers .cm-gutterElement")
    .evaluateAll(elements => elements.filter(element => element.style.visibility !== "hidden")
      .map(element => element.textContent)), ["1", "2", "3", "4"]);
  const gutterOffset = numberBoxes[0].top - lineBoxes[0].top;
  assert.ok(gutterOffset >= 0 && gutterOffset <= 4);
  for (let index = 0; index < lineBoxes.length; index++) {
    assert.ok(Math.abs(numberBoxes[index].top - lineBoxes[index].top - gutterOffset) <= 1);
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
  await pointer.goto(`${base}${demoPath("full")}`);
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

  const human = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const humanErrors = [];
  human.on("pageerror", error => humanErrors.push(error.message));
  human.on("console", message => {
    if (message.type() === "error" && !message.text().includes("CodeMirror:typescript=")) {
      humanErrors.push(message.text());
    }
  });
  await human.goto(`${base}${demoPath("full")}`);
  await human.waitForSelector("body[data-ready]");
  const humanSource = (await readFile(resolve(root, "fixtures/human-edit.js"), "utf8")).trimEnd();
  const humanLines = humanSource.split("\n");
  const humanContent = human.locator(".cm-content");
  await humanContent.click();
  await human.keyboard.press("ControlOrMeta+A");
  for (let index = 0; index < humanLines.length; index++) {
    const trimmed = humanLines[index].trimStart();
    if (index) {
      if (trimmed.startsWith("}")) {
        await human.keyboard.press("ArrowDown");
        if (trimmed.length > 1) await human.keyboard.type(trimmed.slice(1), { delay: 3 });
        await human.waitForTimeout(10);
        continue;
      }
      await human.keyboard.press("Enter");
      // Replace inferred indentation when the developer deliberately chooses
      // different formatting. Existing closing brackets are traversed above.
      await human.keyboard.press("Home");
      await human.keyboard.press("Shift+End");
    }
    const lineText = humanLines[index];
    if (index === 17) {
      await human.keyboard.type(`${lineText}x`, { delay: 3 });
      await human.keyboard.press("Backspace");
    } else {
      await human.keyboard.type(lineText, { delay: 3 });
    }
    await human.waitForTimeout(10);
  }
  const editorText = async () => (await human.locator(".cm-line").allTextContents()).join("\n");
  assert.equal(await human.locator(".cm-line").count(), 67);
  assert.equal(await editorText(), humanSource);

  await human.waitForTimeout(600);
  await human.keyboard.press("ControlOrMeta+End");
  await human.keyboard.type(" // temporary direction", { delay: 4 });
  assert.match(await editorText(), /temporary direction$/);
  await human.keyboard.press("ControlOrMeta+z");
  assert.equal(await editorText(), humanSource);
  await human.keyboard.press("ControlOrMeta+Shift+z");
  assert.match(await editorText(), /temporary direction$/);
  await human.keyboard.press("ControlOrMeta+z");
  assert.equal(await editorText(), humanSource);

  const humanFirstLine = human.locator(".cm-line").first();
  await humanFirstLine.scrollIntoViewIfNeeded();
  const firstLineBox = await humanFirstLine.boundingBox();
  const dragX = firstLineBox.x + 110;
  const dragY = firstLineBox.y + firstLineBox.height / 2;
  await human.mouse.dblclick(dragX, dragY);
  assert.equal(await human.evaluate(() => getSelection().toString()), "ProjectRegistry");
  await human.evaluate(() => {
    globalThis.__nativeDragEvents = [];
    for (const type of ["dragstart", "dragover", "drop", "dragend"]) {
      document.addEventListener(type, () => __nativeDragEvents.push(type));
    }
  });
  const selectedBox = await human.evaluate(() => {
    const rect = getSelection().getRangeAt(0).getBoundingClientRect();
    return { x: rect.x, y: rect.y, height: rect.height };
  });
  const dragTarget = await human.locator(".cm-line").nth(9).boundingBox();
  await human.mouse.move(selectedBox.x + 5, selectedBox.y + selectedBox.height / 2);
  await human.mouse.down();
  await human.waitForTimeout(100);
  await human.mouse.move(dragTarget.x + 150, dragTarget.y + dragTarget.height / 2,
    { steps: 18 });
  await human.mouse.up();
  await human.waitForTimeout(50);
  assert.ok((await human.evaluate(() => __nativeDragEvents)).includes("dragstart"));
  const dragged = await editorText();
  assert.notEqual(dragged, humanSource);
  assert.equal((dragged.match(/ProjectRegistry/g) || []).length, 1);
  assert.ok(await humanContent.locator("span[class^=wwc-c]").count() > 50);
  await human.keyboard.press("ControlOrMeta+z");
  assert.equal(await editorText(), humanSource);
  await human.keyboard.press("ControlOrMeta+Shift+z");
  assert.equal(await editorText(), dragged);
  await human.keyboard.press("ControlOrMeta+z");
  assert.equal(await editorText(), humanSource);
  assert.deepEqual(humanErrors, []);
  await human.screenshot({ path: "/tmp/quickjs-codemirror-human-edit.png" });
  await human.close();
});
