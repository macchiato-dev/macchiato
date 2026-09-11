import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { build } from "esbuild";
import { chromium } from "playwright";
import { compileProjectFiles } from "../../project-editor/src/single-file-compiler.js";

test("compiled document attributes reach distinct roots before scripts and survive content updates", async t => {
  const code = (await build({ stdin: { contents: `
    export { default as Machine } from './dev/wasm-web-machine/src/wasm-web-machine.ts';
    export { ProjectOutput } from './packages/website/project-output-session.js';
  `, resolveDir: new URL("../../..", import.meta.url).pathname },
    bundle: true, write: false, format: "esm", platform: "browser" })).outputFiles[0].text;
  const wasm = await readFile(new URL("../generated/project-quickjs-runtime.wasm", import.meta.url));
  const css = `body { color: green; margin: 12px; }
    html.page > body.app > p { opacity: .75; font-size: 1.25em; }
    html[lang="es"] > body[dir="rtl"] { font-size: 20px; }
    html:not(.page) > body > p { opacity: .5; }`;
  const source = (changed = false) => `<html ${changed ? 'lang="en"' :
    'class="page" lang="es" style="font-size:18px;color:purple"'}>
    <head data-note="A &amp; B"><style>${css}</style></head>
    <body ${changed ? '' : 'class="app" dir="rtl" style="color:blue"'}><p id="sample">Sample</p></body></html>`;
  const programs = [false, true].map(changed => compileProjectFiles([
    { path: "index.html", content: source(changed) },
  ]));
  programs[0].scripts.push({ source: "observe.js", code: `
    document.querySelector("p").setAttribute("data-root-language", document.documentElement.getAttribute("lang"));
    document.querySelector("p").setAttribute("data-distinct", String(document.body !== document.documentElement));
    document.querySelector("p").setAttribute("data-outside", String(document.querySelector("#outside") === null));
  ` });
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage(), errors = [], unexpected = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", route => {
    const url = new URL(route.request().url());
    if (url.origin !== "http://document-output.test") {
      unexpected.push(url.href); return route.abort();
    }
    if (url.pathname === "/module.js") return route.fulfill({ body: code, contentType: "text/javascript" });
    if (url.pathname === "/runtime.wasm") return route.fulfill({ body: wasm, contentType: "application/wasm" });
    if (url.pathname === "/") return route.fulfill({ contentType: "text/html",
      body: '<!doctype html><title>Host</title><main id="mount"></main><p id="outside">Private</p>' });
    unexpected.push(url.href); return route.abort();
  });
  await page.goto("http://document-output.test/");
  const result = await page.evaluate(async ({ programs, sources }) => {
    const { Machine, ProjectOutput } = await import("/module.js");
    const module = await WebAssembly.compileStreaming(fetch("/runtime.wasm"));
    const mount = document.querySelector("#mount");
    const output = new ProjectOutput(Machine, module, mount, () => ({}), error => { throw error; });
    const appearances = [];
    function appearance(root) {
      return [root, root.querySelector("body"), root.querySelector("p")].map(node => {
        const css = node.ownerDocument.defaultView.getComputedStyle(node);
        return [css.color, css.fontSize, css.direction, css.margin, css.opacity];
      });
    }
    async function compare(source) {
      const frame = document.createElement("iframe");
      const loaded = new Promise(resolve => frame.onload = resolve);
      frame.srcdoc = source;
      document.body.append(frame);
      await loaded;
      appearances.push({ actual: appearance(mount.querySelector("html")),
        expected: appearance(frame.contentDocument.documentElement) });
      frame.remove();
    }
    try {
      await output.load(programs[0]);
      const root = mount.querySelector("html"), body = root.querySelector("body"), head = root.querySelector("head");
      const paragraph = root.querySelector("p");
      const script = { language: paragraph.dataset.rootLanguage, distinct: paragraph.dataset.distinct,
        outside: paragraph.dataset.outside };
      await compare(sources[0]);
      const stylesheet = head.querySelector("style");
      // Remove only the test script's attributes before checking hydration.
      for (const name of ["data-root-language", "data-distinct", "data-outside"]) paragraph.removeAttribute(name);
      const updated = output.setContent(programs[1].tree, programs[1].document);
      await compare(sources[1]);
      return { script, appearances, hydrated: updated.hydrated,
        same: mount.querySelector("html") === root && root.querySelector("body") === body &&
          root.querySelector("p") === paragraph && head.querySelector("style") === stylesheet,
        language: root.getAttribute("lang"), bodyClass: body.getAttribute("class"),
        rootStyle: root.getAttribute("style"), bodyStyle: body.getAttribute("style"),
        headNote: head.getAttribute("data-note"), hostTitle: document.title };
    } finally { output.destroy(); }
  }, { programs, sources: [source(), source(true)] });
  assert.deepEqual(result.script, { language: "es", distinct: "true", outside: "true" });
  for (const comparison of result.appearances) assert.deepEqual(comparison.actual, comparison.expected);
  assert.equal(result.hydrated, true);
  assert.equal(result.same, true);
  assert.equal(result.language, "en");
  assert.equal(result.bodyClass, null);
  assert.equal(result.rootStyle, null);
  assert.equal(result.bodyStyle, null);
  assert.equal(result.headNote, "A & B");
  assert.equal(result.hostTitle, "Host");
  assert.deepEqual(errors, []);
  assert.deepEqual(unexpected, []);
});
