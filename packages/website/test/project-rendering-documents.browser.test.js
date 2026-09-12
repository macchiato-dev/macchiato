import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { build } from "esbuild";
import { chromium } from "playwright";
import { compileProjectFiles } from "../../project-editor/src/single-file-compiler.js";

// Feasibility experiment only: ProjectOutput still uses nested HTML in
// production. No guest source is placed in the rendering frames as script.
test("independent rendering documents share an engine without sharing page state", async t => {
  const root = new URL("../../..", import.meta.url).pathname;
  const code = (await build({ stdin: { resolveDir: root, contents: `
    export { default as Machine } from './dev/wasm-web-machine/src/wasm-web-machine.ts';
    export { QuickJSRuntime } from './dev/wasm-web-runtimes/quickjs/context-runtime.js';
  ` }, bundle: true, write: false, format: "esm", platform: "browser" })).outputFiles[0].text;
  const wasm = await readFile(new URL("../generated/project-quickjs-runtime.wasm", import.meta.url));
  const source = size => `<!doctype html><html><head><style>
    html { font-size:${size}px; }
    body { margin:2rem; background:#e8f2ff; color:#17243a; }
    #sample { width:10rem; height:2rem; background:#b8c8ef; }
    #space { height:1000px; }
  </style></head><body><div id="sample"></div><button id="counter">0</button>
  <div id="space"></div><script>
    globalThis.appOnly = true;
    var count = 0;
    document.getElementById('counter').addEventListener('click', function () {
      document.getElementById('counter').textContent = String(++count);
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowRight') document.getElementById('counter').textContent = String(++count);
    });
  </script></body></html>`;
  const programs = [20, 24].map(size => compileProjectFiles([{ path: "index.html", content: source(size) }]));
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1240, height: 600 } });
  const errors = [], unexpected = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", route => {
    const url = new URL(route.request().url());
    if (url.origin !== "http://rendering.test") { unexpected.push(url.href); return route.abort(); }
    if (url.pathname === "/module.js") return route.fulfill({ body: code, contentType: "text/javascript" });
    if (url.pathname === "/runtime.wasm") return route.fulfill({ body: wasm, contentType: "application/wasm" });
    if (url.pathname === "/native") return route.fulfill({ body: source(20), contentType: "text/html" });
    if (url.pathname === "/") return route.fulfill({ contentType: "text/html", body: `<!doctype html>
      <style>body{margin:0}#comparison{display:flex;gap:20px}
      #mount{position:relative;width:600px;height:400px}iframe{width:600px;height:400px;border:0;flex:none}
      #mount iframe{position:absolute;inset:0;width:100%;height:100%}</style>
      <div id="comparison"><iframe id="native" src="/native"></iframe><div id="mount"></div></div>
      <p id="controller-private">Controller only</p>` });
    unexpected.push(url.href); return route.abort();
  });
  await page.goto("http://rendering.test/");
  await page.evaluate(async () => {
    const { Machine, QuickJSRuntime } = await import("/module.js");
    const module = await WebAssembly.compileStreaming(fetch("/runtime.wasm"));
    const engine = new QuickJSRuntime(module), mount = document.getElementById("mount");
    const entries = new Map(), released = [];
    let next = 0, active = null;
    // Deliberately keep the interpreter and machine in this controller realm.
    // Each grant is a whole, independently laid-out, script-free Document.
    window.experiment = {
      async prepare(program) {
        const frame = document.createElement("iframe"), id = String(++next);
        frame.dataset.id = id;
        frame.style.visibility = "hidden";
        frame.style.pointerEvents = "none";
        frame.inert = true;
        frame.setAttribute("sandbox", "allow-same-origin");
        frame.srcdoc = '<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'none\'; style-src \'unsafe-inline\'; img-src data:; font-src data:; base-uri \'none\'; form-action \'none\'"><title></title></head><body></body></html>';
        await new Promise(resolve => { frame.onload = resolve; mount.append(frame); });
        const reports = [], doc = frame.contentDocument;
        const machine = new Machine(engine.createSession(), doc, { onMessage: value => reports.push(value) });
        const entry = { frame, machine, reports, doc };
        entries.set(id, entry);
        try {
          await machine.onmsg(0);
          this.run(id, '__resourcesOutputLoad(' + JSON.stringify(JSON.stringify({
            tree: program.tree, document: program.document, stylesheets: program.stylesheets,
          })) + ');');
          for (const script of program.scripts) this.run(id, script.code);
          await machine.onmsg(0);
          return id;
        } catch (error) { this.remove(id); throw error; }
      },
      run(id, source) {
        entries.get(id).machine.onmsg(new TextEncoder().encode('\x01' + source));
      },
      report(id, expression) {
        this.run(id, '__wwcPostMessage(JSON.stringify(' + expression + '));');
        return JSON.parse(entries.get(id).reports.pop());
      },
      reveal(id) {
        const { frame } = entries.get(id), previous = active;
        frame.style.visibility = '';
        frame.style.pointerEvents = '';
        frame.inert = false;
        active = id;
        if (previous) this.remove(previous);
      },
      remove(id) {
        const entry = entries.get(id);
        if (!entry) return;
        released.push({ frame: new WeakRef(entry.frame), document: new WeakRef(entry.doc) });
        try { entry.machine.destroy(); }
        finally { entry.frame.remove(); entries.delete(id); }
      },
      state() { return { active, frames: mount.children.length, sessions: entries.size }; },
      retained() { return released.map((item, index) => ({ index,
        frame: !!item.frame.deref(), document: !!item.document.deref() })); },
      destroy() { for (const id of entries.keys()) this.remove(id); engine.destroy(); },
    };
  });
  const prepare = program => page.evaluate(program => experiment.prepare(program), program);
  const reveal = id => page.evaluate(id => experiment.reveal(id), id);
  const report = (id, expression) => page.evaluate(({ id, expression }) => experiment.report(id, expression), { id, expression });
  const view = id => page.frameLocator(`#mount iframe[data-id="${id}"]`);
  const native = page.frameLocator("#native");
  const measure = locator => locator.locator("#sample").evaluate(sample => {
    const { defaultView: win, documentElement: root, body } = sample.ownerDocument;
    const rect = sample.getBoundingClientRect();
    return { root: win.getComputedStyle(root).fontSize, margin: win.getComputedStyle(body).margin,
      box: [rect.x, rect.y, rect.width, rect.height], viewport: [win.innerWidth, win.innerHeight] };
  });
  async function pixel(selector) {
    const box = await page.locator(selector).boundingBox();
    const png = await page.screenshot({ clip: { x: box.x + 8, y: box.y + 8, width: 1, height: 1 } });
    return page.evaluate(async bytes => {
      const bitmap = await createImageBitmap(new Blob([new Uint8Array(bytes)], { type: "image/png" }));
      const canvas = document.createElement("canvas"); canvas.width = canvas.height = 1;
      const context = canvas.getContext("2d"); context.drawImage(bitmap, 0, 0); bitmap.close();
      return [...context.getImageData(0, 0, 1, 1).data];
    }, [...png]);
  }
  try {
    const first = await prepare(programs[0]);
    await reveal(first);
    assert.deepEqual(await measure(view(first)), await measure(native));
    assert.deepEqual(await pixel("#mount"), [232, 242, 255, 255]);
    assert.deepEqual(await pixel("#mount"), await pixel("#native"));
    const second = await prepare(programs[1]);
    assert.equal((await measure(view(second))).box[2], 240, "hidden replacement has native rem layout");
    await view(first).locator("#counter").click();
    await page.keyboard.press("ArrowRight");
    assert.equal(await view(first).locator("#counter").textContent(), "2", "active app keeps handling input");
    assert.equal(await view(second).locator("#counter").textContent(), "0", "session globals and events are independent");
    for (const id of [first, second]) {
      assert.equal(await report(id, "document.querySelector('#controller-private') === null"), true);
      assert.equal(await view(id).locator("body").evaluate(body => body.ownerDocument.defaultView.appOnly), undefined,
        "application JS did not run in the browser realm");
    }
    await reveal(second);
    await native.locator("style").evaluate(style => style.textContent = style.textContent.replace("20px", "24px"));
    assert.deepEqual(await measure(view(second)), await measure(native));
    assert.deepEqual(await pixel("#mount"), await pixel("#native"));
    await view(second).locator("#counter").click();
    assert.equal(await view(second).locator("#counter").textContent(), "1");
    // A failed replacement must leave the existing app and its state intact.
    const broken = { ...programs[0], scripts: [{ code: "throw new Error('Replacement failed')" }] };
    await assert.rejects(prepare(broken), /Replacement failed/);
    assert.deepEqual(await page.evaluate(() => experiment.state()), { active: second, frames: 1, sessions: 1 });
    assert.equal(await view(second).locator("#counter").textContent(), "1");
    await page.locator("#mount").evaluate(node => { node.style.width = '420px'; node.style.height = '260px'; });
    assert.deepEqual((await measure(view(second))).viewport, [420, 260]);
    await view(second).locator("body").evaluate(body => body.ownerDocument.defaultView.scrollTo(0, 120));
    assert.equal(await report(second, "pageYOffset"), 120);
    assert.equal(await page.evaluate(() => scrollY), 0);
    for (let index = 0; index < 10; index++) await reveal(await prepare(programs[index % 2]));
    assert.equal(await page.locator("#mount iframe").count(), 1);
    if (process.env.MACCHIATO_TEST_ARTIFACTS) {
      await mkdir(process.env.MACCHIATO_TEST_ARTIFACTS, { recursive: true });
      await page.screenshot({ path: resolve(process.env.MACCHIATO_TEST_ARTIFACTS, "rendering-documents.png") });
    }
    await page.evaluate(() => experiment.destroy());
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const client = await page.context().newCDPSession(page);
    await client.send("Runtime.discardConsoleEntries");
    await client.send("HeapProfiler.collectGarbage");
    const retained = await page.evaluate(() => experiment.retained());
    t.diagnostic(JSON.stringify(retained));
    assert.equal(retained.some(item => item.frame || item.document), false, "removed frames and documents are collectible");
    await client.detach();
    assert.deepEqual(errors, []);
    assert.deepEqual(unexpected, []);
  } finally { await page.evaluate(() => experiment.destroy()); }
});
