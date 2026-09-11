import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { build } from "esbuild";
import { chromium } from "playwright";
import { compileProjectFiles } from "../../project-editor/src/single-file-compiler.js";

// These TODO comparisons intentionally execute and fail until output owns a
// real rendering document. Matching ordinary element styles is insufficient:
// rem and the painted canvas are properties of the browsing document itself.
test("project document viewport agrees with a standalone page", async t => {
  const root = new URL("../../..", import.meta.url).pathname;
  const code = (await build({ stdin: { contents: `
    export { default as Machine } from './dev/wasm-web-machine/src/wasm-web-machine.ts';
    export { ProjectOutput } from './packages/website/project-output-session.js';
  `, resolveDir: root }, bundle: true, write: false, format: "esm", platform: "browser" })).outputFiles[0].text;
  const wasm = await readFile(new URL("../generated/project-quickjs-runtime.wasm", import.meta.url));
  const shell = await readFile(new URL("../project-output-frame.html", import.meta.url), "utf8");
  const source = size => `<!doctype html><html><head><style>
    html { font-size:${size}px; }
    body { margin:2rem; background:#e8f2ff; color:#17243a; }
    #sample { width:10rem; height:2rem; background:#b8c8ef; }
  </style></head><body><div id="sample"></div></body></html>`;
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1240, height: 500 } });
  const errors = [], unexpected = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", route => {
    const url = new URL(route.request().url());
    if (url.origin !== "http://viewport.test") {
      unexpected.push(url.href); return route.abort();
    }
    if (url.pathname === "/module.js") return route.fulfill({ body: code, contentType: "text/javascript" });
    if (url.pathname === "/runtime.wasm") return route.fulfill({ body: wasm, contentType: "application/wasm" });
    if (url.pathname === "/actual") return route.fulfill({ body: shell, contentType: "text/html" });
    if (url.pathname === "/native") return route.fulfill({ body: source(20), contentType: "text/html" });
    if (url.pathname === "/") return route.fulfill({ contentType: "text/html", body: `<!doctype html>
      <style>body{margin:0;display:flex;gap:20px}iframe{width:600px;height:400px;border:0;flex:none}</style>
      <iframe id="native" src="/native"></iframe><iframe id="actual" src="/actual"></iframe>` });
    unexpected.push(url.href); return route.abort();
  });
  await page.goto("http://viewport.test/");
  const actual = page.frames().find(frame => frame.url().endsWith("/actual"));
  const native = page.frames().find(frame => frame.url().endsWith("/native"));
  const program = compileProjectFiles([{ path: "index.html", content: source(20) }]);
  await actual.evaluate(async program => {
    const { Machine, ProjectOutput } = await import("/module.js");
    const module = await WebAssembly.compileStreaming(fetch("/runtime.wasm"));
    window.output = new ProjectOutput(Machine, module, document.querySelector("#project-output-a"),
      () => ({}), error => { throw error; });
    await output.load(program);
  }, program);
  const measurements = [];
  async function measure(frame) {
    return frame.evaluate(() => {
      const sample = document.querySelector("#sample"), body = sample.parentElement;
      const rect = sample.getBoundingClientRect(), root = body.parentElement;
      return { fontSize: getComputedStyle(root).fontSize, margin: getComputedStyle(body).margin,
        box: [rect.x, rect.y, rect.width, rect.height] };
    });
  }
  async function pixel(id) {
    const box = await page.locator(id).boundingBox();
    const png = await page.screenshot({ clip: { x: box.x + 8, y: box.y + 8, width: 1, height: 1 } });
    return page.evaluate(async bytes => {
      const image = await createImageBitmap(new Blob([new Uint8Array(bytes)], { type: "image/png" }));
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0); image.close();
      return [...context.getImageData(0, 0, 1, 1).data];
    }, [...png]);
  }
  try {
    for (const size of [20, 24]) {
      if (size === 24) {
        // A real source edit updates CSS through the same load path as a game.
        await native.locator("style").evaluate(node => node.textContent = node.textContent.replace("20px", "24px"));
        await actual.evaluate(program => output.load(program),
          compileProjectFiles([{ path: "index.html", content: source(size) }]));
      }
      measurements.push({ size, native: await measure(native), actual: await measure(actual),
        nativePixel: await pixel("#native"), actualPixel: await pixel("#actual") });
    }
    if (process.env.MACCHIATO_TEST_ARTIFACTS) {
      await mkdir(process.env.MACCHIATO_TEST_ARTIFACTS, { recursive: true });
      await page.screenshot({ path: resolve(process.env.MACCHIATO_TEST_ARTIFACTS, "document-viewport.png") });
    }
    t.diagnostic(JSON.stringify(measurements));
    for (const result of measurements) {
      assert.equal(result.actual.fontSize, result.native.fontSize, "root font declaration is already preserved");
      await t.test(`rem lengths at ${result.size}px root size`, { todo: "nested HTML is not the rem root" }, () => {
        assert.deepEqual(result.actual, result.native);
      });
      await t.test(`body background at ${result.size}px root size`, { todo: "nested body does not paint the canvas" }, () => {
        assert.deepEqual(result.nativePixel, [232, 242, 255, 255]);
        assert.deepEqual(result.actualPixel, result.nativePixel);
      });
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(unexpected, []);
  } finally { await actual.evaluate(() => output.destroy()); }
});
