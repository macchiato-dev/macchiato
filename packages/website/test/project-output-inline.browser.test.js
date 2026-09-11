import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { build } from "esbuild";
import { chromium } from "playwright";
import { compileProjectFiles } from "../../project-editor/src/single-file-compiler.js";

test("inline content updates retain matching nodes and the machine stylesheet", async t => {
  const root = resolve(new URL("../../..", import.meta.url).pathname);
  const code = (await build({ stdin: { contents: `
    export { default as Machine } from './dev/wasm-web-machine/src/wasm-web-machine.ts';
    export { ProjectOutput } from './packages/website/project-output-session.js';
  `, resolveDir: root }, bundle: true, write: false, format: "esm", platform: "browser" })).outputFiles[0].text;
  const wasm = await readFile(resolve(root, "packages/website/generated/project-quickjs-runtime.wasm"));
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage(), errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("http://inline.test/**", route => {
    const path = new URL(route.request().url()).pathname;
    return route.fulfill(path === "/module.js" ? { body: code, contentType: "text/javascript" }
      : path === "/runtime.wasm" ? { body: wasm, contentType: "application/wasm" }
      : { body: '<div id="mount"></div><p id="outside" class="sample">Outside</p>', contentType: "text/html" });
  });
  await page.goto("http://inline.test/");
  const compile = style => compileProjectFiles([{ path: "index.html", content:
    `<style>.sample { color: green; }</style><p class="sample" id="sample"${style === null ? "" : ` style="${style}"`}>Text</p>` }]);
  const result = await page.evaluate(async programs => {
    const { Machine, ProjectOutput } = await import("/module.js");
    const module = await WebAssembly.compileStreaming(fetch("/runtime.wasm"));
    const output = new ProjectOutput(Machine, module, document.querySelector("#mount"), () => ({}), error => { throw error; });
    try {
      await output.load(programs[0]);
      const original = document.querySelector("#sample");
      const stylesheet = document.querySelector("#mount style");
      const updated = output.setContent(programs[1].tree);
      const sameNode = original === document.querySelector("#sample");
      const blue = getComputedStyle(original).color;
      const cleared = output.setContent(programs[2].tree);
      const empty = document.querySelector("#sample");
      const greenAfterEmpty = getComputedStyle(empty).color;
      const removed = output.setContent(programs[3].tree);
      return { updated, sameNode, blue, cleared, greenAfterEmpty, removed,
        stylesheetRetained: stylesheet.isConnected && document.querySelector("#mount style") === stylesheet,
        inlineRemoved: document.querySelector("#sample").getAttribute("style") === null,
        green: getComputedStyle(document.querySelector("#sample")).color,
        outside: getComputedStyle(document.querySelector("#outside")).color };
    } finally { output.destroy(); }
  }, [compile("color:red"), compile("color:blue"), compile(""), compile(null)]);
  assert.equal(result.updated.hydrated, true);
  assert.equal(result.cleared.hydrated, true);
  assert.equal(result.sameNode, true);
  assert.equal(result.blue, "rgb(0, 0, 255)");
  assert.equal(result.greenAfterEmpty, "rgb(0, 128, 0)");
  assert.equal(result.stylesheetRetained, true);
  assert.equal(result.inlineRemoved, true);
  assert.equal(result.green, "rgb(0, 128, 0)");
  assert.equal(result.outside, "rgb(0, 0, 0)");
  assert.deepEqual(errors, []);
});
