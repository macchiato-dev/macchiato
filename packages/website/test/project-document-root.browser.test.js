import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "esbuild";
import { chromium } from "playwright";
import { compileProjectFiles } from "../../project-editor/src/single-file-compiler.js";

test("a granted HTML document subtree has distinct head, body, and root semantics", async t => {
  const root = resolve(new URL("../../..", import.meta.url).pathname);
  const machineSource = process.env.MACCHIATO_TEST_MACHINE_SOURCE || resolve(root, "dev/wasm-web-machine/src/wasm-web-machine.ts");
  const host = (await build({ stdin: { contents: `
    export { default as Machine } from ${JSON.stringify(machineSource)};
    export { QuickJSRuntime } from './dev/wasm-web-runtimes/quickjs/context-runtime.js';
  `, resolveDir: root },
    bundle: true, write: false, format: "esm", platform: "browser" })).outputFiles[0].text;
  const wasm = await readFile(process.env.MACCHIATO_TEST_OUTPUT_RUNTIME ||
    resolve(root, "packages/website/generated/project-quickjs-runtime.wasm"));
  const css = `
    html.page { color: purple; font-size: 18px; }
    body.app { color: green; font-size: 20px; margin: 12px; }
    html.page > body.app > p { color: #123456; font-size: 1.25em; }
    :root > body > p { opacity: .75; }
    html:has(+ #outside) p, body + #outside { color: red; }
  `;
  const program = compileProjectFiles([{ path: "index.html", content: `<style>${css}</style><p>Sample</p>` }]);
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage(), errors = [], unexpected = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", route => {
    const url = new URL(route.request().url());
    if (url.origin !== "http://document-root.test") {
      unexpected.push(url.href); return route.abort();
    }
    if (url.pathname === "/machine.js") return route.fulfill({ body: host, contentType: "text/javascript" });
    if (url.pathname === "/runtime.wasm") return route.fulfill({ body: wasm, contentType: "application/wasm" });
    if (url.pathname === "/") return route.fulfill({
      body: '<!doctype html><title>Host</title><main id="mount"></main><div id="outside">Private</div>', contentType: "text/html" });
    unexpected.push(url.href); return route.abort();
  });
  await page.goto("http://document-root.test/");
  const result = await page.evaluate(async ({ program, css }) => {
    const { Machine, QuickJSRuntime } = await import("/machine.js");
    const module = await WebAssembly.compileStreaming(fetch("/runtime.wasm"));
    const own = document.createElement("html"), head = document.createElement("head"), body = document.createElement("body");
    own.append(head, body);
    document.querySelector("#mount").append(own);
    const reports = [];
    const runtime = new QuickJSRuntime(module);
    const machine = new Machine(runtime.createSession(), own, { onMessage: value => reports.push(value) });
    function run(source) { machine.onmsg(new TextEncoder().encode("\x01" + source)); }
    try {
      await machine.onmsg(0);
      run(`document.documentElement.className = "page";
        document.body.className = "app";
        __resourcesOutputLoad(${JSON.stringify(JSON.stringify(program))});
        __wwcPostMessage(JSON.stringify({
          distinct: document.documentElement !== document.body && document.head !== document.body,
          rootTag: document.documentElement.localName, bodyTag: document.body.localName,
          headTag: document.head.localName,
          bodyQuery: document.querySelector("html > body") === document.body,
          rootQuery: document.querySelector(":root") === document.documentElement,
          scopeQuery: document.body.querySelector(":scope > p") === document.querySelector("p"),
          parent: document.body.parentElement === document.documentElement,
          outside: document.querySelector("#outside") === null,
          rootParent: document.documentElement.parentElement === null
        }));`);
      const frame = document.createElement("iframe");
      const loaded = new Promise(resolve => frame.onload = resolve);
      frame.srcdoc = `<!doctype html><html class="page"><head><style>${css}</style></head><body class="app"><p>Sample</p></body></html>`;
      document.body.append(frame);
      await loaded;
      function appearance(element) {
        if (!element) return null;
        const style = element.ownerDocument.defaultView.getComputedStyle(element);
        return { color: style.color, font: style.fontSize, margin: style.margin, opacity: style.opacity };
      }
      const actual = [own, body, body.querySelector("p")].map(appearance);
      const mutations = [];
      const observer = new MutationObserver(() => {}), records = [];
      observer.observe(own, { attributes: true, attributeFilter: ["class"] });
      for (const change of [
        'document.documentElement.removeAttribute("class")',
        'document.documentElement.setAttribute("class", "page")',
        'immediate([2, document.documentElement.reference, stringIndex("className"), encode("page")])',
      ]) {
        run(change + '; __wwcPostMessage("scope:" + (document.querySelector(":root") === document.documentElement));');
        mutations.push(reports.pop());
        records.push(observer.takeRecords().length);
      }
      observer.disconnect();
      return { reports: reports.filter(value => value.startsWith("{")).map(JSON.parse),
        actual, mutations, records,
        expected: [frame.contentDocument.documentElement, frame.contentDocument.body,
          frame.contentDocument.querySelector("p")].map(appearance),
        stylesInHead: head.querySelectorAll("style").length,
        stylesInBody: body.querySelectorAll("style").length,
        host: appearance(document.querySelector("#outside")), hostTitle: document.title };
    } finally { machine.destroy(); runtime.destroy(); }
  }, { program, css });
  assert.deepEqual(result.reports, [{ distinct: true, rootTag: "html", bodyTag: "body", headTag: "head",
    bodyQuery: true, rootQuery: true, scopeQuery: true, parent: true, outside: true, rootParent: true }]);
  assert.deepEqual(result.actual, result.expected);
  assert.deepEqual(result.mutations, ["scope:true", "scope:true", "scope:true"]);
  assert.deepEqual(result.records, [1, 1, 1]);
  assert.equal(result.stylesInHead, 1);
  assert.equal(result.stylesInBody, 0);
  assert.equal(result.host.color, "rgb(0, 0, 0)");
  assert.equal(result.hostTitle, "Host");
  assert.deepEqual(errors, []);
  assert.deepEqual(unexpected, []);
});
