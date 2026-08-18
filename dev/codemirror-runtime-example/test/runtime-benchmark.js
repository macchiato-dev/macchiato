import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { chromium } from "@playwright/test";

const root = resolve(new URL("..", import.meta.url).pathname);
const hostPath = resolve(root,
  "../wasm-web-container/examples/web/wasm-web-container.js");
const iterations = Number(process.env.BENCHMARK_ITERATIONS || 6);
const warmups = Number(process.env.BENCHMARK_WARMUPS || 2);
const output = resolve(root, "benchmark-results.json");
const source = [
  "function benchmark(items) {",
  "  const visible = items.filter(item => item.enabled);",
  "  return visible.map(item => item.label).join(\", \");",
  "}",
].join("\n");
const paths = {
  quickjs: "/full/",
  microquickjs: "/microquickjs/full/",
};
const types = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".wasm", "application/wasm"],
]);

function percentile(values, fraction) {
  const sorted = values.toSorted((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))];
}

function summarize(values) {
  return {
    minimum: Math.min(...values),
    median: percentile(values, 0.5),
    p90: percentile(values, 0.9),
    maximum: Math.max(...values),
    mean: values.reduce((sum, value) => sum + value, 0) / values.length,
  };
}

async function serve() {
  const server = createServer(async (request, response) => {
    const pathname = new URL(request.url, "http://benchmark.test").pathname;
    if (pathname === "/wasm-web-container.js") {
      response.writeHead(200, { "content-type": "text/javascript; charset=utf-8" });
      response.end(await readFile(hostPath));
      return;
    }
    const relative = pathname === "/" ? "index.html"
      : pathname.endsWith("/") ? `${pathname.slice(1)}index.html` : pathname.slice(1);
    try {
      response.writeHead(200, {
        "content-type": types.get(extname(relative)) || "application/octet-stream",
      });
      response.end(await readFile(resolve(root, relative)));
    } catch {
      response.writeHead(404).end();
    }
  }).listen(0, "127.0.0.1");
  await new Promise(resolveReady => server.once("listening", resolveReady));
  return server;
}

async function runTrace(context, base, runtime) {
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  const navigationStarted = performance.now();
  await page.goto(`${base}${paths[runtime]}`, { waitUntil: "domcontentloaded" });
  const domContentLoadedMs = performance.now() - navigationStarted;
  await page.waitForSelector("body[data-ready]");
  const readyMs = performance.now() - navigationStarted;
  const content = page.locator(".cm-content");
  await content.click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.press("Backspace");
  const keyMs = [];
  const interactionStarted = performance.now();
  const lines = source.split("\n");
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    if (lineIndex === lines.length - 1) {
      const started = performance.now();
      await page.keyboard.press("ArrowDown");
      keyMs.push(performance.now() - started);
      continue;
    }
    if (lineIndex) {
      const started = performance.now();
      await page.keyboard.press("Enter");
      keyMs.push(performance.now() - started);
    }
    for (const character of lines[lineIndex].trimStart()) {
      const started = performance.now();
      await page.keyboard.type(character);
      keyMs.push(performance.now() - started);
    }
  }
  const typingMs = performance.now() - interactionStarted;
  const text = () => page.locator(".cm-line").allTextContents()
    .then(lines => lines.join("\n"));
  assert.equal(await text(), source);
  const historyStarted = performance.now();
  await page.keyboard.press("ControlOrMeta+z");
  await page.keyboard.press("ControlOrMeta+Shift+z");
  const historyMs = performance.now() - historyStarted;
  assert.equal(await text(), source);
  assert.deepEqual(errors, []);
  await page.close();
  return { domContentLoadedMs, readyMs, typingMs, historyMs, keyMs };
}

const server = await serve();
const browser = await chromium.launch();
try {
  const base = `http://127.0.0.1:${server.address().port}`;
  const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  for (let index = 0; index < warmups; index++) {
    await runTrace(context, base, "quickjs");
    await runTrace(context, base, "microquickjs");
  }
  const runs = [];
  for (let index = 0; index < iterations; index++) {
    const order = index % 2 === 0
      ? ["quickjs", "microquickjs"] : ["microquickjs", "quickjs"];
    for (const runtime of order) {
      runs.push({
        runtime,
        iteration: index + 1,
        order: order.join("-then-"),
        ...await runTrace(context, base, runtime),
      });
    }
  }
  await context.close();
  const report = Object.fromEntries(Object.keys(paths).map(runtime => {
    const selected = runs.filter(run => run.runtime === runtime);
    return [runtime, {
      startupReadyMs: summarize(selected.map(run => run.readyMs)),
      typingTraceMs: summarize(selected.map(run => run.typingMs)),
      keyLatencyMs: summarize(selected.flatMap(run => run.keyMs)),
      undoRedoMs: summarize(selected.map(run => run.historyMs)),
    }];
  }));
  const result = { generatedAt: new Date().toISOString(), warmups, iterations,
    sourceCharacters: source.length, report, runs };
  await writeFile(output, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify({ generatedAt: result.generatedAt, warmups, iterations,
    sourceCharacters: source.length, report }, null, 2));
} finally {
  await browser.close();
  await new Promise(resolveClosed => server.close(resolveClosed));
}
