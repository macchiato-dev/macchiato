import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { after, before, test } from "node:test";
import { chromium, devices } from "playwright";

const root = new URL("../", import.meta.url).pathname;
const machineModule = join(root,
  "../../../wasm-web-machine/dist/module/wasm-web-machine.js");
const types = new Map([
  [".css", "text/css"], [".html", "text/html"], [".js", "text/javascript"],
  [".txt", "text/plain"], [".wasm", "application/wasm"],
]);
const paths = {
  plain: "/mobile-syntax/benchmark/",
  quickjs: "/mobile-syntax/benchmark/quickjs/",
  microquickjs: "/mobile-syntax/benchmark/microquickjs/",
};
const runtimes = (process.env.MOBILE_SYNTAX_RUNTIMES ||
  "plain,quickjs,microquickjs").split(",");
const modes = (process.env.MOBILE_SYNTAX_MODES ||
  "javascript,css,markdown,html").split(",");
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
      if (!file.startsWith(root)) throw new Error("path outside root");
      response.writeHead(200, { "content-type": types.get(extname(file)) ||
        "application/octet-stream" });
      response.end(await readFile(file));
    } catch {
      response.writeHead(404).end("not found");
    }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise(resolve => server.close(resolve)));

async function record(page) {
  return JSON.parse(await page.locator("#benchmark-status").textContent());
}

async function configure(page, strategy, mode, source) {
  await page.evaluate(async ({ strategy, mode, source }) => {
    await globalThis.benchmarkGuestCall("setupMobileSyntaxBenchmark",
      `${strategy}|${mode}|${source}`);
  }, { strategy, mode, source });
  await page.locator("#benchmark-status[data-ready=true]").waitFor({
    timeout: 30_000, state: "attached",
  });
}

async function keyTrace(page) {
  const latencies = [];
  let seed = 0x6d2b79f5;
  for (let index = 0; index < 24; index++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const line = 1 + seed % 30;
    const column = 1 + (seed >>> 8) % 24;
    await page.evaluate(async value => {
      await globalThis.benchmarkGuestCall("selectMobileSyntaxBenchmark", value);
    }, `${line}|${column}`);
    const revision = Number(await page.locator("#benchmark-status")
      .getAttribute("data-revision"));
    const started = performance.now();
    await page.keyboard.type(index % 7 ? "x" : "_");
    await page.locator(`#benchmark-status:not([data-revision="${revision}"])`)
      .waitFor({ timeout: 5_000, state: "attached" });
    latencies.push(performance.now() - started);
  }
  latencies.sort((left, right) => left - right);
  return { median: latencies[12], p95: latencies[22], maximum: latencies[23] };
}

test("normal parsing and viewport parsing receive the same first-page edit workload",
  { timeout: 240_000 }, async () => {
    const browser = await chromium.launch({ headless: true,
      args: ["--js-flags=--max-old-space-size=64"] });
    const context = await browser.newContext({ ...devices["iPhone 13"] });
    const results = [];
    try {
      for (const runtime of runtimes) {
        const page = await context.newPage();
        const session = await context.newCDPSession(page);
        await session.send("Emulation.setCPUThrottlingRate", { rate: 4 });
        await page.goto(origin + paths[runtime]);
        await page.waitForFunction(() => typeof globalThis.benchmarkGuestCall === "function",
          null, { timeout: 30_000 });
        for (const mode of modes) {
          // The normal Markdown parser emits EmphasisMark, which the current
          // MicroQuickJS DOM device deliberately does not implement. The
          // viewport Markdown mode remains covered by the correctness matrix.
          if (runtime === "microquickjs" && mode === "markdown") continue;
          const source = await readFile(join(root,
            `generated/mobile-benchmark-fixture-${mode}.txt`), "utf8");
          // The established parser is deliberately measured first.
          for (const strategy of ["normal", "viewport"]) {
            await configure(page, strategy, mode, source);
            await page.evaluate(async () => {
              await globalThis.benchmarkGuestCall("runMobileSyntaxDispatchTrace", "120");
            });
            const keys = await keyTrace(page);
            await page.waitForTimeout(300);
            const current = await record(page);
            results.push({ runtime, mode, strategy, keys,
              creationMs: current.creationMs, readyMs: current.readyMs,
              dispatch: current.trace, syntax: current.syntaxStats });
            if (strategy === "viewport") {
              assert.ok(current.syntaxStats.parsedChars < 20_000);
              assert.ok(keys.median < 150,
                `${runtime} ${mode} median first-page key latency: ${keys.median} ms`);
              assert.ok(keys.p95 < 300,
                `${runtime} ${mode} p95 first-page key latency: ${keys.p95} ms`);
              assert.ok(current.syntaxStats.updateMilliseconds < 100,
                `${runtime} ${mode} syntax refresh: ` +
                `${current.syntaxStats.updateMilliseconds} ms`);
              if (mode === "css") {
                const longLineNumber = source.split("\n")
                  .findIndex(line => line.length > 7_000) + 1;
                assert.ok(longLineNumber > 0, "CSS benchmark contains a capped line");
                await page.evaluate(async line => {
                  await globalThis.benchmarkGuestCall("showMobileSyntaxBenchmark",
                    String(line));
                }, longLineNumber);
                await page.waitForFunction(() => {
                  const text = document.getElementById("benchmark-status").textContent;
                  return text && JSON.parse(text).syntaxStats?.skippedHighlightChars > 7000;
                }, null, { timeout: 10_000 });
                const longLine = await record(page);
                assert.ok(longLine.syntaxStats.stateChars > 0);
                assert.ok(longLine.syntaxStats.skippedHighlightChars > 7000,
                  `long CSS line was capped: ${JSON.stringify(longLine.syntaxStats)}`);
              }
            }
          }
        }
        await page.close();
      }
    } finally {
      await context.close();
      await browser.close();
    }
    console.log(`MOBILE_SYNTAX_COMPARISON=${JSON.stringify(results)}`);
  });
