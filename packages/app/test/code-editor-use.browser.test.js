import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { chromium } from "playwright";

const repoRoot = resolve(new URL("../../..", import.meta.url).pathname);
const appCli = join(repoRoot, "packages/app/src/index.js");

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

function startApp(port, dataDir) {
  const child = spawn(process.execPath, [
    appCli, "--data-dir", dataDir, "--host", "127.0.0.1", "--port", String(port),
    "--app-plugin", "code-editor-use",
  ], { cwd: repoRoot, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  const ready = new Promise((resolveReady, reject) => {
    const timer = setTimeout(() => reject(new Error(output)), 30_000);
    const onData = (data) => {
      output += data;
      if (output.includes("Server running")) {
        clearTimeout(timer);
        resolveReady();
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("error", reject);
  });
  return { child, ready };
}

async function stop(child) {
  if (child.exitCode !== null) return;
  await new Promise((resolveStop) => {
    child.once("exit", resolveStop);
    child.kill("SIGTERM");
  });
}

test("code-editor-use runs CodeMirror inside QuickJS through a constrained DOM bridge", async (t) => {
  const port = await getPort();
  const dataDir = await mkdtemp(join(tmpdir(), "macchiato-code-editor-"));
  const app = startApp(port, dataDir);
  t.after(async () => {
    await stop(app.child);
    await rm(dataDir, { recursive: true, force: true });
  });
  await app.ready;

  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "platform", { configurable: true, value: "MacIntel" });
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  const response = await page.goto(`http://code-editor-use.localhost:${port}/`, { waitUntil: "networkidle" });
  await page.locator("body[data-ready='true']").waitFor();
  assert.equal(response.status(), 200);
  assert.match(response.headers()["content-security-policy"], /wasm-unsafe-eval/);
  assert.equal(await page.locator(".cm-editor").count(), 1);
  assert.deepEqual(await page.evaluate(() => ({
    editorViewGlobal: typeof globalThis.EditorView,
    createCodeEditorGlobal: typeof globalThis.createCodeEditor,
    bridge: typeof globalThis.__codeEditorBridge,
  })), {
    editorViewGlobal: "undefined",
    createCodeEditorGlobal: "undefined",
    bridge: "object",
  });

  const editableDocument = await page.evaluate(() => globalThis.__codeEditorBridge.inspect().document);
  await page.evaluate((document) => globalThis.__codeEditorBridge.setContent(document, "javascript", { readOnly: true }), editableDocument);
  assert.equal(await page.locator(".cm-content").getAttribute("aria-readonly"), "true");
  await page.locator(".cm-content").focus();
  await page.keyboard.type("SHOULD_NOT_APPEAR");
  assert.equal((await page.evaluate(() => globalThis.__codeEditorBridge.inspect())).document, editableDocument);
  await page.evaluate((document) => globalThis.__codeEditorBridge.setContent(document, "javascript"), editableDocument);
  assert.equal(await page.locator(".cm-content").getAttribute("aria-readonly"), "false");

  const longLogicalLine = Array.from({ length: 80 }, (_, index) => `segment${index}`).join(" ");
  await page.evaluate((document) => globalThis.__codeEditorBridge.setContent(document, "plain"), longLogicalLine);
  await page.locator(".cm-content.cm-lineWrapping").waitFor();
  const wideWrap = await page.locator("#editor").evaluate((editor) => {
    const line = editor.querySelector(".cm-line").getBoundingClientRect();
    const scroller = editor.querySelector(".cm-scroller");
    return { lineHeight: line.height, clientWidth: scroller.clientWidth, scrollWidth: scroller.scrollWidth };
  });
  assert.ok(wideWrap.scrollWidth <= wideWrap.clientWidth + 1, "wrapped content should not create horizontal editor overflow");
  await page.setViewportSize({ width: 520, height: 720 });
  await page.waitForTimeout(50);
  const narrowWrap = await page.locator("#editor").evaluate((editor) => {
    const line = editor.querySelector(".cm-line").getBoundingClientRect();
    const scroller = editor.querySelector(".cm-scroller");
    return { lineHeight: line.height, clientWidth: scroller.clientWidth, scrollWidth: scroller.scrollWidth };
  });
  assert.ok(narrowWrap.lineHeight > wideWrap.lineHeight, "narrowing the editor should add visual rows to the same logical line");
  assert.ok(narrowWrap.scrollWidth <= narrowWrap.clientWidth + 1, "narrow wrapped content should remain horizontally contained");
  assert.equal((await page.evaluate(() => globalThis.__codeEditorBridge.inspect())).usage.lines, 1);
  await page.locator(".cm-content").click({ position: { x: 12, y: 10 } });
  await page.keyboard.press("Home");
  const wrapStart = (await page.evaluate(() => globalThis.__codeEditorBridge.inspect())).selection.head;
  await page.keyboard.press("ArrowDown");
  const nextVisualRow = (await page.evaluate(() => globalThis.__codeEditorBridge.inspect())).selection.head;
  assert.ok(nextVisualRow > wrapStart && nextVisualRow < longLogicalLine.length, `ArrowDown should move within a wrapped logical line (${wrapStart} -> ${nextVisualRow} of ${longLogicalLine.length})`);
  await page.keyboard.down("Shift");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.up("Shift");
  const wrappedSelection = (await page.evaluate(() => globalThis.__codeEditorBridge.inspect())).selection;
  assert.ok(wrappedSelection.to > wrappedSelection.from, "Shift+ArrowDown should select across wrapped visual rows");
  assert.ok(await page.locator(".cm-selectionBackground").count() >= 1, "wrapped selection should remain visibly painted");
  await page.keyboard.type("WRAPPED");
  assert.match((await page.evaluate(() => globalThis.__codeEditorBridge.inspect())).document, /WRAPPED/);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.reload();
  await page.locator("body[data-ready='true']").waitFor();

  await page.locator(".cm-content").click();
  await page.keyboard.press("Meta+a");
  const selectAllOnFirstPress = await page.evaluate(() => globalThis.__codeEditorBridge.inspect());
  assert.deepEqual(selectAllOnFirstPress.selection, {
    anchor: 0,
    head: selectAllOnFirstPress.document.length,
    from: 0,
    to: selectAllOnFirstPress.document.length,
  });
  assert.equal(await page.locator("#editor.cm-native-selection").count(), 1);
  await page.keyboard.press("Meta+ArrowDown");
  assert.equal((await page.evaluate(() => globalThis.__codeEditorBridge.inspect())).selection.head, selectAllOnFirstPress.document.length);
  await page.keyboard.press("Meta+ArrowUp");
  assert.equal((await page.evaluate(() => globalThis.__codeEditorBridge.inspect())).selection.head, 0);
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowLeft");
  const beforeEmacsForward = await page.evaluate(() => globalThis.__codeEditorBridge.inspect().selection.head);
  await page.keyboard.press("Control+f");
  const afterEmacsForward = await page.evaluate(() => globalThis.__codeEditorBridge.inspect().selection.head);
  assert.equal(afterEmacsForward, beforeEmacsForward + 1);
  assert.equal(await page.locator(".cm-search").count(), 0);
  assert.equal(await page.locator(".editor-shell").evaluate((node) => getComputedStyle(node).borderRadius), "2px");
  assert.match(await page.locator("#status").textContent(), /QuickJS owns \d+ characters across 2 of 5000 lines/);

  await page.locator(".cm-content").click();
  const contentBox = await page.locator(".cm-content").boundingBox();
  await page.keyboard.down("Alt");
  await page.mouse.move(contentBox.x + 20, contentBox.y + 10);
  await page.mouse.down();
  await page.mouse.move(contentBox.x + 120, contentBox.y + 35);
  await page.mouse.up();
  await page.keyboard.up("Alt");
  assert.doesNotMatch(await page.locator("#status").textContent(), /Editor stopped/);
  const cursorStyle = await page.locator(".cm-cursor-primary").evaluate((node) => {
    const style = getComputedStyle(node);
    const editorStyle = getComputedStyle(node.closest(".cm-editor"));
    return {
      color: style.borderLeftColor,
      editorBackground: editorStyle.backgroundColor,
      display: style.display,
      height: Number.parseFloat(style.height),
    };
  });
  assert.notEqual(cursorStyle.color, cursorStyle.editorBackground);
  assert.notEqual(cursorStyle.color, "rgba(0, 0, 0, 0)");
  assert.equal(cursorStyle.display, "block");
  assert.ok(cursorStyle.height > 10);

  const constrainedPoint = await page.locator(".cm-line").first().evaluate((line) => {
    const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const index = walker.currentNode.textContent.indexOf("constrained");
      if (index < 0) continue;
      const range = document.createRange();
      range.setStart(walker.currentNode, index + 3);
      range.collapse(true);
      const rect = range.getBoundingClientRect();
      return { x: rect.left, y: rect.top + rect.height / 2 };
    }
    throw new Error("constrained text was not rendered");
  });
  await page.mouse.click(constrainedPoint.x, constrainedPoint.y);
  await page.keyboard.type("X");
  assert.match(await page.evaluate(() => globalThis.__codeEditorBridge.inspect().document), /conXstrained/);
  await page.keyboard.press("Control+z");

  await page.mouse.dblclick(constrainedPoint.x, constrainedPoint.y);
  await page.keyboard.type("WORD");
  assert.match(await page.locator(".cm-line").first().textContent(), /Hello, WORD editor!/);
  await page.keyboard.press("Control+z");

  await page.mouse.click(constrainedPoint.x, constrainedPoint.y, { clickCount: 3 });
  const tripleClick = await page.evaluate(() => globalThis.__codeEditorBridge.inspect());
  assert.match(tripleClick.document.slice(tripleClick.selection.from, tripleClick.selection.to), /^const greeting.*\n$/);
  await page.mouse.click(constrainedPoint.x, constrainedPoint.y);

  const firstLineBox = await page.locator(".cm-line").first().boundingBox();
  const secondLineBox = await page.locator(".cm-line").nth(1).boundingBox();
  await page.mouse.move(firstLineBox.x + 35, firstLineBox.y + firstLineBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(secondLineBox.x + secondLineBox.width + 60, secondLineBox.y + secondLineBox.height / 2, { steps: 12 });
  assert.match(await page.evaluate(() => document.getSelection().toString()), /\n/);
  assert.equal(await page.locator("#editor.cm-drag-preview").count(), 1);
  await page.mouse.up();
  await page.waitForTimeout(30);
  assert.equal(await page.locator("#editor.cm-drag-preview").count(), 0);
  assert.equal(await page.locator("#editor.cm-native-selection").count(), 1);
  assert.ok(await page.locator(".cm-selectionBackground").count() >= 2);
  const settledDragSelection = await page.evaluate(() => globalThis.__codeEditorBridge.inspect().selection);
  assert.ok(settledDragSelection.to > settledDragSelection.from);
  await page.keyboard.type("R");
  assert.equal(await page.locator(".cm-line").count(), 1);
  assert.doesNotMatch(await page.locator(".cm-line").first().textContent(), /console/);
  await page.keyboard.press("Control+z");

  const lastLineBox = await page.locator(".cm-line").last().boundingBox();
  await page.mouse.click(lastLineBox.x + 50, lastLineBox.y + lastLineBox.height / 2);
  await page.keyboard.press("ArrowDown");
  await page.keyboard.type("Z");
  assert.match(await page.locator(".cm-line").last().textContent(), /;Z$/);
  await page.keyboard.press("Control+z");

  await page.mouse.click(constrainedPoint.x, constrainedPoint.y);
  const secondLinePoint = await page.locator(".cm-line").nth(1).boundingBox();
  await page.keyboard.down("Shift");
  await page.mouse.click(secondLinePoint.x + 70, secondLinePoint.y + secondLinePoint.height / 2);
  await page.keyboard.up("Shift");
  await page.keyboard.type("SHIFTCLICK");
  assert.equal(await page.locator(".cm-line").count(), 1);
  assert.match(await page.locator(".cm-line").first().textContent(), /SHIFTCLICK/);
  await page.keyboard.press("Control+z");

  await page.mouse.click(constrainedPoint.x, constrainedPoint.y);
  await page.keyboard.down("Shift");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.up("Shift");
  await page.keyboard.type("SHIFTDOWN");
  assert.equal(await page.locator(".cm-line").count(), 1);
  assert.match(await page.locator(".cm-line").first().textContent(), /SHIFTDOWN/);
  await page.keyboard.press("Control+z");

  await page.reload();
  await page.locator("body[data-ready='true']").waitFor();
  await page.locator(".cm-content").click();

  await page.keyboard.press("Control+End");
  await page.keyboard.type("A");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.type("B");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.type("C");
  assert.match(await page.locator(".cm-line").last().textContent(), /;BAC$/);
  await page.keyboard.press("Control+z");
  await page.keyboard.press("Control+z");
  await page.keyboard.press("Control+z");

  await page.keyboard.press("Control+End");
  for (let index = 0; index < 12; index += 1) {
    await page.keyboard.type(`\nconst item${index} = ${index};`);
  }
  await assert.doesNotReject(page.getByText(/across 14 of 5000 lines/).waitFor());
  assert.equal((await page.locator(".cm-line").allTextContents()).at(-1), "const item11 = 11;");

  const finalLine = page.locator(".cm-line").last();
  await finalLine.scrollIntoViewIfNeeded();
  const renderedLines = page.locator(".cm-content > .cm-line");
  const penultimateBox = await renderedLines.nth((await renderedLines.count()) - 2).boundingBox();
  const finalBox = await renderedLines.last().boundingBox();
  await page.mouse.move(penultimateBox.x + 35, penultimateBox.y + penultimateBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(finalBox.x + finalBox.width + 40, finalBox.y + finalBox.height / 2, { steps: 10 });
  await page.mouse.up();
  await page.keyboard.type("VIRTUAL");
  const virtualizedDocument = await page.evaluate(() => globalThis.__codeEditorBridge.inspect().document);
  assert.match(virtualizedDocument, /^const greeting = "Hello, constrained editor!";/);
  assert.match(virtualizedDocument, /VIRTUAL$/);
  await page.keyboard.press("Control+z");

  await page.keyboard.press("Meta+f");
  const search = page.locator(".cm-search input[name='search']");
  const documentBeforeSearch = await page.evaluate(() => globalThis.__codeEditorBridge.inspect().document);
  const searchLayout = await page.locator("#editor").evaluate((editor) => {
    const editorBox = editor.querySelector(".cm-editor").getBoundingClientRect();
    const scrollerBox = editor.querySelector(".cm-scroller").getBoundingClientRect();
    const panelsBox = editor.querySelector(".cm-panels").getBoundingClientRect();
    return {
      editorBottom: editorBox.bottom,
      scrollerHeight: scrollerBox.height,
      panelsBottom: panelsBox.bottom,
    };
  });
  assert.ok(searchLayout.scrollerHeight > 200);
  assert.ok(Math.abs(searchLayout.editorBottom - searchLayout.panelsBottom) < 1);
  await search.fill("item8");
  assert.equal(await page.getByRole("button", { name: "Previous match" }).count(), 1);
  assert.equal(await page.getByRole("button", { name: "Next match" }).count(), 1);
  assert.equal(await page.getByRole("button", { name: "Close search" }).count(), 1);
  assert.equal(await page.evaluate(() => globalThis.__codeEditorBridge.inspect().document), documentBeforeSearch);
  assert.match(await page.evaluate(() => {
    const state = globalThis.__codeEditorBridge.inspect();
    return state.document.slice(state.selection.from, state.selection.to);
  }), /item8/);
  await page.keyboard.press("Enter");
  await page.keyboard.press("Escape");
  assert.equal(await page.locator(".cm-search").count(), 0);
  assert.equal(await page.evaluate(() => document.activeElement.classList.contains("cm-content")), true);
  assert.equal(await page.locator(".cm-focused").count(), 1);

  const linuxPage = await browser.newPage();
  await linuxPage.goto(`http://code-editor-use.localhost:${port}/`, { waitUntil: "networkidle" });
  await linuxPage.locator("body[data-ready='true']").waitFor();
  await linuxPage.locator(".cm-content").click();
  await linuxPage.keyboard.press("Control+f");
  await linuxPage.locator(".cm-search input[name='search']").fill("greeting");
  assert.equal(await linuxPage.evaluate(() => {
    const state = globalThis.__codeEditorBridge.inspect();
    return state.document.slice(state.selection.from, state.selection.to);
  }), "greeting");
  await linuxPage.keyboard.press("Escape");
  assert.equal(await linuxPage.evaluate(() => document.activeElement.classList.contains("cm-content")), true);
  await linuxPage.close();

  await page.locator(".cm-content").click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type("\n{");
  assert.match((await page.evaluate(() => globalThis.__codeEditorBridge.inspect().document)), /\{\}$/);
  await page.keyboard.press("Control+z");
  assert.equal(await page.locator(".cm-gutters .cm-gutterElement").count() > 1, true);
  await page.locator(".cm-content").click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type("\ncon");
  await page.keyboard.press("Control+Space");
  await page.locator(".cm-tooltip-autocomplete").waitFor();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Control+z");
  await page.keyboard.press("Control+Shift+z");
  await page.locator("h1").click();
  await page.locator(".cm-content").click();
  assert.equal(await page.locator(".cm-focused").count(), 1);
  assert.deepEqual(errors, []);

  const defaultLimit = await page.evaluate(() => {
    const document = Array.from({ length: 5_000 }, (_, index) => `line ${index + 1}`).join("\n");
    globalThis.__codeEditorBridge.setContent(document, "plain");
    return globalThis.__codeEditorBridge.inspect();
  });
  assert.equal(defaultLimit.usage.lines, 5_000);
  assert.equal(defaultLimit.usage.remainingLines, 0);
  assert.equal(defaultLimit.limits.maxLines, 5_000);
  assert.ok(defaultLimit.surface.operations.window > 0);
  assert.ok(defaultLimit.surface.operations.window <= defaultLimit.surface.limits.operations);
  assert.ok(defaultLimit.surface.elements < defaultLimit.surface.limits.elements);
  assert.ok(defaultLimit.surface.elements < 5_500, "the 5,000-line surface should remain close to one element per line");
  assert.ok(await page.locator(".cm-gutterElement").count() <= 100, "the guest-assisted gutter should remain viewport-sized");
  await assert.rejects(
    page.evaluate(() => globalThis.__codeEditorBridge.setContent("x\n".repeat(5_000), "plain")),
    /exceeds its document budget \(5001\/5000 lines/,
  );

  for (const maxLines of [100, 1_000]) {
    const limitedPage = await browser.newPage();
    await limitedPage.goto(`http://code-editor-use.localhost:${port}/?maxLines=${maxLines}`, { waitUntil: "networkidle" });
    await limitedPage.locator("body[data-ready='true']").waitFor();
    const report = await limitedPage.evaluate((limit) => {
      globalThis.__codeEditorBridge.setContent(Array.from({ length: limit }, () => "x").join("\n"), "plain");
      return globalThis.__codeEditorBridge.inspect();
    }, maxLines);
    assert.equal(report.usage.lines, maxLines);
    assert.equal(report.limits.maxLines, maxLines);
    await assert.rejects(
      limitedPage.evaluate((limit) => globalThis.__codeEditorBridge.setContent("x\n".repeat(limit), "plain"), maxLines),
      new RegExp(`exceeds its document budget \\(${maxLines + 1}/${maxLines} lines`),
    );
    await limitedPage.close();
  }

  const churnPage = await browser.newPage();
  await churnPage.goto(`http://code-editor-use.localhost:${port}/?maxLines=1000`, { waitUntil: "networkidle" });
  await churnPage.locator("body[data-ready='true']").waitFor();
  await churnPage.locator(".cm-content").fill(
    Array.from({ length: 250 }, (_, index) => `const value${index} = ${index};`).join("\n"),
  );
  await churnPage.waitForTimeout(200);
  const churnReport = await churnPage.evaluate(() => globalThis.__codeEditorBridge.inspect());
  assert.ok(churnReport.usage.lines >= 250);
  assert.ok(churnReport.surface.elements < churnReport.surface.limits.elements);
  assert.ok(churnReport.surface.tags.span > 100, "syntax highlighting should exercise the span budget");
  assert.ok(churnReport.surface.operations.peakWindow < churnReport.surface.limits.operations);
  assert.equal(await churnPage.locator(".cm-content").count(), 1);
  await churnPage.close();

  await page.evaluate(() => globalThis.__codeEditorBridge.setContent("main line", "plain"));
  await page.locator(".cm-content").click();
  await page.keyboard.press("Meta+ArrowDown");
  await page.keyboard.type(" edit");
  await page.evaluate(() => globalThis.__codeEditorBridge.setContent("selected version", "plain", { resetHistoryOnEdit: true }));
  await page.locator(".cm-content").fill("selected version branch");
  await page.keyboard.press("Meta+z");
  assert.equal((await page.evaluate(() => globalThis.__codeEditorBridge.inspect())).document, "selected version");
  await page.keyboard.press("Meta+z");
  assert.equal((await page.evaluate(() => globalThis.__codeEditorBridge.inspect())).document, "selected version", "undo must not cross the version branch point");

  await page.locator(".cm-line").first().evaluate((node) => node.setAttribute("onclick", "alert(1)"));
  await assert.doesNotReject(page.getByText(/Editor stopped: DOM shape rejected attribute: onclick/).waitFor());
  assert.equal(await page.locator("#editor").getByRole("textbox").count(), 0);
});
