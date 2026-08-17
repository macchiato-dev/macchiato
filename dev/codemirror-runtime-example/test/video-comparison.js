import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";

const root = resolve(new URL("..", import.meta.url).pathname);
const canonicalHost = resolve(root, "../wasm-web-container/examples/web/wasm-web-container.js");
const output = resolve(process.env.VIDEO_OUTPUT || `/tmp/codemirror-comparison-${Date.now()}`);
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript",
  ".wasm": "application/wasm" };
const withoutTrailingSpace = text => text.replace(/[\t ]+$/gm, "");

async function serve() {
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
      response.writeHead(200, { "content-type": types[extname(relative)] ||
        "application/octet-stream" });
      response.end(body);
    } catch {
      response.writeHead(404).end();
    }
  }).listen(0, "127.0.0.1");
  await new Promise(resolveReady => server.once("listening", resolveReady));
  return server;
}

function completionAppearance() {
  const element = document.querySelector(".cm-tooltip-autocomplete");
  if (!element || element.getClientRects().length === 0) return null;
  const listElement = element.querySelector("[role=listbox]");
  if (!listElement) return null;
  const list = getComputedStyle(listElement);
  const tooltip = getComputedStyle(element);
  const selected = listElement.querySelector("[role=option][aria-selected=true]");
  return {
    fontFamily: list.fontFamily,
    listStyleType: list.listStyleType,
    margin: list.margin,
    padding: list.padding,
    maxHeight: list.maxHeight,
    tooltipBackground: tooltip.backgroundColor,
    selectedBackground: selected ? getComputedStyle(selected).backgroundColor : null,
  };
}

async function typeSource(page, source) {
  const lines = source.split("\n");
  const mistakeLine = lines.findIndex(line => line.includes("this.value +="));
  const completionAppearances = [];
  const lineStates = [];
  const content = page.locator(".cm-content");
  await content.click();
  await page.keyboard.type("f");
  await page.locator(".cm-tooltip-autocomplete").waitFor({ state: "visible" });
  const completion = await page.evaluate(completionAppearance);
  assert.ok(completion, "autocomplete should have a measurable appearance");
  completionAppearances.push(completion);
  await page.waitForTimeout(500);
  await page.keyboard.press("Escape");
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.press("Backspace");
  await page.waitForFunction(() =>
    Array.from(document.querySelectorAll(".cm-line"), line => line.textContent).join("\n") === "");
  for (let line = 0; line < lines.length; line++) {
    const sourceLine = lines[line].trimStart();
    if (line && sourceLine.startsWith("}")) {
      await page.keyboard.press("ArrowDown");
      await page.waitForTimeout(90);
      lineStates.push((await page.locator(".cm-line").allTextContents()).join("\n"));
      continue;
    }
    if (line) await page.keyboard.press("Enter");
    const text = line === mistakeLine
      ? `${sourceLine}x` : sourceLine;
    for (const character of text) {
      await page.keyboard.type(character);
      await page.waitForTimeout(55);
    }
    if (line === mistakeLine) await page.keyboard.press("Backspace");
    await page.waitForTimeout(90);
    lineStates.push((await page.locator(".cm-line").allTextContents()).join("\n"));
  }
  await page.waitForTimeout(1200);
  const text = async () => (await page.locator(".cm-line").allTextContents()).join("\n");
  await content.focus();
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.type(" // changed direction", { delay: 30 });
  const changed = await text();
  assert.match(changed, / \/\/ changed direction$/);
  await page.keyboard.press("ControlOrMeta+z");
  assert.equal(withoutTrailingSpace(await text()), withoutTrailingSpace(source));
  await page.keyboard.press("Control+y");
  assert.equal(await text(), changed);
  await page.keyboard.press("ControlOrMeta+z");
  assert.equal(withoutTrailingSpace(await text()), withoutTrailingSpace(source));
  return {
    completionAppearances,
    lineStates,
    text: await text(),
  };
}

async function record(browser, base, name, pathname, source) {
  const directory = resolve(output, name);
  await mkdir(directory, { recursive: true });
  const context = await browser.newContext({
    viewport: { width: 1200, height: 800 },
    recordVideo: { dir: directory, size: { width: 1200, height: 800 } },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`${base}/${pathname}/`);
  await page.waitForSelector(".cm-editor");
  if (pathname === "test/pages/wasm") await page.waitForSelector("body[data-ready]");
  const video = page.video();
  const result = await typeSource(page, source);
  await page.screenshot({ path: resolve(directory, "final.png") });
  await page.close();
  await context.close();
  result.video = await video.path();
  result.errors = errors;
  return result;
}

function run(command, args) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", code => code === 0 ? resolveRun() :
      reject(new Error(`${command} exited with ${code}`)));
  });
}

async function findFfmpeg() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  const cache = resolve(process.env.HOME, ".cache/ms-playwright");
  for (const entry of await readdir(cache)) {
    if (entry.startsWith("ffmpeg-")) return resolve(cache, entry, "ffmpeg-linux");
  }
  throw new Error("Set FFMPEG to the Playwright-compatible ffmpeg executable");
}

async function deduplicate(video, directory) {
  const frames = resolve(directory, "frames");
  const unique = resolve(directory, "unique-frames");
  await mkdir(frames, { recursive: true });
  await mkdir(unique, { recursive: true });
  await run(await findFfmpeg(), ["-hide_banner", "-loglevel", "error", "-i", video,
    "-vsync", "0", resolve(frames, "%06d.png")]);
  const files = (await readdir(frames)).sort();
  const retained = [];
  let previous = null;
  for (const file of files) {
    const bytes = await readFile(resolve(frames, file));
    const hash = createHash("sha256").update(bytes).digest("hex");
    if (hash === previous) continue;
    const target = `${String(retained.length + 1).padStart(6, "0")}.png`;
    await copyFile(resolve(frames, file), resolve(unique, target));
    retained.push({ source: file, file: target, hash });
    previous = hash;
  }
  await writeFile(resolve(directory, "unique-frames.json"),
    `${JSON.stringify({ decoded: files.length, retained }, null, 2)}\n`);
  return { decoded: files.length, retained: retained.length, directory: unique };
}

await mkdir(output, { recursive: true });
const server = await serve();
const browser = await chromium.launch();
try {
  const source = (await readFile(resolve(root, "fixtures/video-class.js"), "utf8")).trimEnd();
  const base = `http://127.0.0.1:${server.address().port}`;
  const direct = await record(browser, base, "direct", "test/pages/direct", source);
  const wasm = await record(browser, base, "wasm", "test/pages/wasm", source);
  assert.deepEqual(wasm.lineStates, direct.lineStates);
  assert.equal(withoutTrailingSpace(direct.text), source);
  assert.equal(withoutTrailingSpace(wasm.text), source);
  assert.equal(wasm.text, direct.text);
  assert.deepEqual(wasm.completionAppearances, direct.completionAppearances);
  assert.deepEqual(direct.errors, []);
  assert.deepEqual(wasm.errors, []);
  const directFrames = await deduplicate(direct.video, resolve(output, "direct"));
  const wasmFrames = await deduplicate(wasm.video, resolve(output, "wasm"));
  const report = { output, direct: { video: direct.video, frames: directFrames },
    wasm: { video: wasm.video, frames: wasmFrames },
    completionAppearances: direct.completionAppearances };
  await writeFile(resolve(output, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
  await new Promise(resolveClosed => server.close(resolveClosed));
}
