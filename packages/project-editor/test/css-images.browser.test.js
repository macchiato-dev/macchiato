import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { chromium } from "playwright";
import { compileProjectFiles } from "../src/single-file-compiler.js";
import { encodeConstrainedCssRules } from "../src/constrained-css-wire.js";

test("the host renders embedded CSS SVG and rejects unsafe image data before applying it", async (t) => {
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.setContent('<div class="card"></div>');
  const network = [];
  page.on("request", (request) => network.push(request.url()));
  const source = `
    import { createCssRenderer } from './dev/wasm-web-machine/src/devices/css-renderer.ts';
    import { createSvgRenderer } from './dev/wasm-web-machine/src/devices/svg-renderer.ts';
    import { readSelector, renderSelector } from './dev/wasm-web-machine/src/devices/selector-renderer.ts';
    import { CONSTRAINED_CSS_VALUE_FUNCTIONS, isAllowedCssProperty } from './packages/project-editor/src/constrained-css-policy.js';
    class Reader {
      constructor(bytes) { this.bytes = bytes; this.at = 0; }
      byte() { if (this.at === this.bytes.length) throw Error('Truncated'); return this.bytes[this.at++]; }
      uint() { let n=0, scale=1, byte; do { byte=this.byte(); n+=(byte&127)*scale; scale*=128; } while(byte&128); return n; }
      text() { const n=this.uint(); if(n>this.bytes.length-this.at) throw Error('Truncated'); const s=new TextDecoder().decode(this.bytes.subarray(this.at,this.at+n)); this.at+=n; return s; }
    }
    const fail = (message) => { throw new Error(message); };
    window.install = createCssRenderer({ Reader, CSS_VALUE_FUNCTIONS: CONSTRAINED_CSS_VALUE_FUNCTIONS,
      hostDocument: document, logicalHead: document.head, installedStyles: new Set(),
      options: {}, trackCheck: () => {}, reject: fail, isAllowedProperty: isAllowedCssProperty,
      scopeId: null, readSelector, renderSelector,
      renderSvg: createSvgRenderer(Reader, new TextEncoder(), fail) }).installStylesheet;
  `;
  const code = await build({ stdin: { contents: source, resolveDir: new URL("../../../", import.meta.url).pathname },
    bundle: true, write: false, format: "iife", platform: "browser" });
  await page.addScriptTag({ content: code.outputFiles[0].text });
  function image(svg) {
    return compileProjectFiles([{ path: "index.html", content:
      `<style>.card{background-image:url("data:image/svg+xml,${encodeURIComponent(svg)}")}</style>` }], {},
    { limits: { maxCodePoints: 8192, maxLineCodePoints: 8192, maxLines: 10 } }).stylesheets[0].operations;
  }
  const safe = image('<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" fill="#abc"/></svg>');
  await page.evaluate((bytes) => window.install(new Uint8Array(bytes)), safe);
  assert.match(await page.locator(".card").evaluate((node) => getComputedStyle(node).backgroundImage), /^url\("data:image\/svg\+xml;base64,/);
  const styles = await page.locator("style").count();
  for (const svg of [
    '<svg onload="fetch(1)"></svg>',
    '<svg><path fill="url(https://example.test/leak)" d="M0 0"/></svg>',
  ]) {
    await assert.rejects(page.evaluate((bytes) => window.install(new Uint8Array(bytes)), image(svg)), /SVG image attribute/);
    assert.equal(await page.locator("style").count(), styles);
  }
  // Bypass the compiler deliberately: the host must independently reject
  // images in a border, arbitrary operator text, and a raw URL function.
  await page.locator(".card").evaluate(node => { node.style.border = "2px solid red"; });
  const original = await page.locator(".card").getAttribute("style");
  for (const [value, error] of [
    [[11, ["svg", [], []]], /only available as a background image/],
    [[12, "url(https://example.test/leak)"], /operator is not representable/],
    [[7, "url", [4, "https://example.test/leak"]], /function url is not allowed/],
  ]) {
    const bytes = [...encodeConstrainedCssRules([{ selector: ".card", declarations: [
      { property: "border", value, important: false },
    ] }])];
    await assert.rejects(page.evaluate(bytes => window.install(new Uint8Array(bytes),
      document.querySelector(".card").style, true), bytes), error);
    assert.equal(await page.locator(".card").getAttribute("style"), original);
    assert.equal(await page.locator("style").count(), styles);
  }
  assert.deepEqual(network, []);
});
