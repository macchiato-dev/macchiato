import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir, readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { after, before, test } from "node:test";
import { chromium, devices } from "playwright";

const root = new URL("../", import.meta.url).pathname;
const machineModule = join(root,
  "../../../wasm-web-machine/dist/module/wasm-web-machine.js");
const types = new Map([
  [".css", "text/css"], [".html", "text/html"], [".js", "text/javascript"],
  [".wasm", "application/wasm"],
]);
let server;
let origin;

before(async () => {
  server = createServer(async (request, response) => {
    try {
      let path = new URL(request.url, "http://localhost").pathname;
      if (path === "/wasm-web-machine.js") {
        response.writeHead(200, { "content-type": "text/javascript" });
        response.end(await readFile(machineModule));
        return;
      }
      if (path.endsWith("/")) path += "index.html";
      const file = normalize(join(root, path));
      if (!file.startsWith(root)) throw new Error("path outside test root");
      let body = await readFile(file);
      if (process.env.MOBILE_SYNTAX_SMALL &&
          file.endsWith("mobile-fixture-javascript.txt")) body = body.subarray(0, 1000);
      response.writeHead(200, { "content-type": types.get(extname(file)) || "application/octet-stream" });
      response.end(body);
    } catch {
      response.writeHead(404).end("not found");
    }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise(resolve => server.close(resolve)));

function statusMetrics(text) {
  const match = /^(.*): (\d+) lines · (\d+) retained tokens · (\d+) visible chars · (\d+) state chars · (\d+) skipped chars · ([\d.]+) ms$/.exec(text);
  assert.ok(match, `unexpected status: ${text}`);
  return {
    name: match[1], lines: Number(match[2]), retainedTokens: Number(match[3]),
    parsedChars: Number(match[4]), stateChars: Number(match[5]),
    skippedHighlightChars: Number(match[6]), milliseconds: Number(match[7]),
  };
}

async function visibleLineNumbers(editor) {
  return editor.locator(".cm-lineNumbers .cm-gutterElement").evaluateAll(nodes => {
    const scroller = nodes[0]?.closest(".cm-editor")?.querySelector(".cm-scroller");
    if (!scroller) return [];
    const viewport = scroller.getBoundingClientRect();
    return nodes.filter(node => {
      const rect = node.getBoundingClientRect();
      return rect.bottom > viewport.top && rect.top < viewport.bottom && rect.height > 0;
    }).map(node => Number(node.textContent)).filter(Number.isFinite);
  });
}

async function scrollToLastLines(editor, minimum) {
  await editor.locator(".cm-content").click({ position: { x: 20, y: 20 } });
  await editor.locator(".cm-content").press("Control+End");
  let lines = [];
  for (let attempt = 0; attempt < 40; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 50));
    lines = await visibleLineNumbers(editor);
    if (lines.length && Math.max(...lines) >= minimum) return lines;
    await editor.locator(".cm-scroller").evaluate(node => {
      node.scrollTop = node.scrollHeight;
    });
  }
  assert.fail(`last visible line ${Math.max(0, ...lines)} did not reach ${minimum}`);
}

const requiredMarks = {
  JavaScript: ["comment", "keyword", "number", "string"],
  CSS: ["comment", "number", "property"],
  Markdown: ["comment", "fence", "heading", "keyword", "string"],
  "HTML + CSS + JS": ["comment", "keyword", "property", "string", "tag"],
};
const offscreenOpeners = {
  JavaScript: "viewport template begins above",
  CSS: "viewport-state probe begins above",
  Markdown: "```javascript",
  "HTML + CSS + JS": "<style>",
};

test("viewport-local modes stay bounded on a mobile-sized browser", { timeout: 180_000 }, async () => {
  const browser = await chromium.launch({ args: process.env.MOBILE_SYNTAX_UNCAPPED ? [] :
    ["--js-flags=--max-old-space-size=64"] });
  const results = {};
  const screenshotDir = process.env.MOBILE_SYNTAX_SCREENSHOTS;
  if (screenshotDir) await mkdir(screenshotDir, { recursive: true });
  try {
    const runtimes = (process.env.MOBILE_SYNTAX_RUNTIMES ||
      "plain,quickjs,microquickjs").split(",");
    for (const runtime of runtimes) {
      console.log(`mobile syntax runtime: ${runtime}`);
      const context = await browser.newContext({ ...devices["iPhone 13"], isMobile: true });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      page.on("requestfailed", request => errors.push(
        `${request.url()} ${request.failure()?.errorText || "request failed"}`));
      await page.goto(`${origin}/mobile-syntax/${runtime}/`, {
        waitUntil: "load", timeout: 120_000,
      });
      try {
        await page.locator(".mobile-syntax-status").waitFor({
          timeout: Number(process.env.MOBILE_SYNTAX_START_TIMEOUT || 30_000),
        });
      } catch (error) {
        const body = await page.locator("body").innerText().catch(() => "<unavailable>");
        throw new Error(`${runtime} did not start: ${errors.join("; ") || error.message}; body=${body}`);
      }
      results[runtime] = {};

      const tabs = (process.env.MOBILE_SYNTAX_TABS ||
        "JavaScript,CSS,Markdown,HTML + CSS + JS").split(",");
      for (const name of tabs) {
        console.log(`mobile syntax tab: ${runtime} / ${name}`);
        await page.getByRole("tab", { name, exact: true }).click();
        const status = page.locator(".mobile-syntax-status");
        await assert.doesNotReject(() => status.waitFor());
        try {
          await page.waitForFunction(expected =>
            document.querySelector(".mobile-syntax-status")?.textContent.startsWith(expected),
          `${name}:`, { timeout: 5_000 });
        } catch (error) {
          throw new Error(`${runtime} did not activate ${name}: ` +
            `${errors.join(" | ") || error.message}`);
        }
        const initial = statusMetrics(await status.textContent());
        assert.equal(initial.name, name,
          `${runtime} activated ${name}; errors=${errors.join(" | ")}`);
        assert.ok(initial.lines >= 3000 && initial.lines <= 10000, `${runtime} ${name} lines`);
        assert.ok(initial.parsedChars < 20_000, `${runtime} ${name} visible parse is bounded`);
        assert.equal(initial.stateChars, 0, `${runtime} ${name} starts at the document top`);
        assert.ok(initial.retainedTokens < 2500, `${runtime} ${name} tokens are bounded`);

        const activeEditor = page.locator(".cm-editor").last();
        await activeEditor.locator(".cm-content").click({ position: { x: 12, y: 12 } });
        await page.keyboard.type("x");
        assert.equal(await activeEditor.locator("[class*='cm-mobile-']").count(), 0,
          `${runtime} ${name} drops stale highlighting on a keystroke`);
        await page.waitForTimeout(250);
        assert.ok(await activeEditor.locator("[class*='cm-mobile-']").count() > 0,
          `${runtime} ${name} rebuilds visible highlighting after the throttle`);
        const initialLines = await visibleLineNumbers(activeEditor);
        assert.ok(initialLines.length > 0, `${runtime} ${name} renders line numbers`);
        const scroller = activeEditor.locator(".cm-scroller");
        const scroll = await scroller.evaluate(async node => {
          node.scrollTop = node.scrollHeight;
          await new Promise(requestAnimationFrame);
          await new Promise(requestAnimationFrame);
          return { top: node.scrollTop, height: node.scrollHeight, client: node.clientHeight };
        });
        assert.ok(scroll.top > 0 && scroll.height > scroll.client,
          `${runtime} ${name} has a scrollable large document`);
        await scrollToLastLines(activeEditor, initial.lines - 30);
        await page.waitForTimeout(350);
        const final = statusMetrics(await status.textContent());
        const finalLines = await visibleLineNumbers(activeEditor);
        const gutterElements = await activeEditor.locator(
          ".cm-lineNumbers .cm-gutterElement").count();
        assert.ok(final.parsedChars < 20_000);
        assert.ok(final.stateChars > 0,
          `${runtime} ${name} scans state from the top: ${JSON.stringify(final)}; ` +
          `gutter elements=${gutterElements}; initial lines=${initialLines.join(",")}; ` +
          `final lines=${finalLines.join(",")}; errors=${errors.join(" | ")}`);
        assert.ok(final.retainedTokens < 2500);
        assert.ok(Math.max(...finalLines) > Math.max(...initialLines),
          `${runtime} ${name} moved the rendered viewport: ` +
          `${initialLines.join(",")} -> ${finalLines.join(",")}`);
        const renderedText = await activeEditor.locator(".cm-content").innerText();
        assert.ok(renderedText.includes("viewport state continuation"),
          `${runtime} ${name} shows the multiline-state continuation`);
        assert.ok(!renderedText.includes(offscreenOpeners[name]),
          `${runtime} ${name} recovers multiline state with its opener offscreen`);
        const markCounts = {};
        const renderedClasses = await activeEditor.locator(".cm-content span").evaluateAll(
          nodes => [...new Set(nodes.map(node => node.className).filter(Boolean))]);
        for (const kind of requiredMarks[name]) {
          markCounts[kind] = await activeEditor.locator(`.cm-mobile-${kind}`).count();
          assert.ok(markCounts[kind] > 0,
            `${runtime} ${name} highlights ${kind} in the final mixed-state probe; ` +
            `counts=${JSON.stringify(markCounts)} classes=${renderedClasses.join(",")} ` +
            `initial=${JSON.stringify(initial)} stats=${JSON.stringify(final)} ` +
            `lines=${finalLines.join(",")}`);
        }
        const retainedMarks = await activeEditor.locator("[class*='cm-mobile-']").count();
        const renderedLines = await activeEditor.locator(".cm-content .cm-line").count();
        // CodeMirror splits a multiline decoration at every rendered line
        // boundary. Since these lexical decorations never overlap, each
        // rendered boundary can add at most one span beyond the RangeSet's
        // logical token count. A small allowance covers selection boundaries.
        assert.ok(retainedMarks <= final.retainedTokens + renderedLines + 10,
          `${runtime} ${name} retains only reported viewport decorations: ` +
          `${retainedMarks} DOM marks / ${final.retainedTokens} tokens / ` +
          `${renderedLines} rendered lines`);
        results[runtime][name] = { initial, final };
        if (screenshotDir) await page.screenshot({
          path: join(screenshotDir,
            `${runtime}-${name.toLowerCase().replaceAll(/[^a-z]+/g, "-")}.png`),
        });
      }

      const client = await context.newCDPSession(page);
      await client.send("Performance.enable");
      const metrics = await client.send("Performance.getMetrics");
      const values = Object.fromEntries(metrics.metrics.map(item => [item.name, item.value]));
      const dom = await client.send("Memory.getDOMCounters");
      results[runtime].memory = {
        jsHeapUsedBytes: values.JSHeapUsedSize,
        jsHeapTotalBytes: values.JSHeapTotalSize,
        documents: dom.documents, nodes: dom.nodes, listeners: dom.jsEventListeners,
      };
      assert.ok(values.JSHeapUsedSize < 64 * 1024 * 1024, `${runtime} stays under JS heap cap`);
      assert.equal(errors.length, 0, `${runtime} errors: ${errors.join("; ")}`);
      await context.close();
    }
  } finally {
    await browser.close();
  }
  console.log(JSON.stringify(results, null, 2));
});
