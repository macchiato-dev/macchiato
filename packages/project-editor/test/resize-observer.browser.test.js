import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { build } from "esbuild";
import { chromium } from "playwright";

for (const engine of ["microquickjs", "quickjs"]) {
  for (const framed of [false, true]) test(`${engine} observes native element resizing (${framed ? "iframe" : "direct"})`, {
    timeout: 30_000,
  }, async t => {
    const root = new URL("../../../", import.meta.url).pathname;
    const working = resolve(root, "../macchiato-work");
    await mkdir(working, { recursive: true });
    const directory = await mkdtemp(resolve(working, "resize-observer-"));
    t.after(() => rm(directory, { recursive: true, force: true }));
    const generated = resolve(root, "packages/project-editor/generated");
    const fixture = new URL("fixtures/resize-observer.js", import.meta.url);
    const source = await readFile(fixture, "utf8");
    let wasm;
    if (engine === "microquickjs") {
      const suite = resolve(root, "dev/wasm-web-runtimes/examples/microquickjs-suite");
      const application = resolve(directory, "application.bin");
      execFileSync(resolve(suite, "microquickjs-guest-runtime/microquickjs/mqjs"),
        ["-m32", "-o", application, fixture.pathname]);
      execFileSync(process.execPath, [resolve(suite, "scripts/stamp-wasm.js"),
        resolve(generated, "project-editor-quickjs-runtime.wasm"), resolve(directory, "guest.wasm"),
        `runtime.bin=${resolve(generated, "project-editor-runtime.bin")}`, `application.bin=${application}`]);
      wasm = await readFile(resolve(directory, "guest.wasm"));
    } else wasm = await readFile(resolve(root, "packages/website/generated/project-quickjs-runtime.wasm"));
    const code = (await build({ stdin: { contents: `
      export { default as Machine } from './dev/wasm-web-machine/src/wasm-web-machine.ts';
      export { QuickJSRuntime } from './dev/wasm-web-runtimes/quickjs/context-runtime.js';
    `, resolveDir: root }, bundle: true, write: false, format: "esm", platform: "browser" })).outputFiles[0].text;
    const browser = await chromium.launch();
    t.after(() => browser.close());
    const page = await browser.newPage(), errors = [], unexpected = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/*", route => {
      const url = new URL(route.request().url());
      if (url.origin !== "http://resize.test") { unexpected.push(url.href); return route.abort(); }
      return route.fulfill(url.pathname === "/module.js" ? { body: code, contentType: "text/javascript" }
        : url.pathname === "/guest.wasm" ? { body: wasm, contentType: "application/wasm" }
        : { body: `<!doctype html><title>Resize observations</title><style>
          .box { width:100.25px; height:40.5px; padding:3px; border:2px solid; }
        </style><main id="mount"><div id="a" class="box"></div><div id="b" class="box"></div></main>
        <aside id="outside" class="box"></aside>`, contentType: "text/html" });
    });
    await page.goto("http://resize.test/");
    if (framed) await page.evaluate(async () => {
      const frame = document.createElement("iframe"); frame.src = "/frame";
      const ready = new Promise(resolve => frame.onload = resolve);
      document.body.append(frame); await ready;
    });
    const target = framed ? page.frames().find(frame => new URL(frame.url()).pathname === "/frame") : page;
    await target.evaluate(async ({ engine, source }) => {
      const { Machine, QuickJSRuntime } = await import("/module.js");
      const module = await WebAssembly.compileStreaming(fetch("/guest.wasm"));
      const runtime = engine === "quickjs" ? new QuickJSRuntime(module) : null;
      window.notices = []; window.nativeNotices = [];
      const machine = new Machine(runtime ? runtime.createSession() : module, document.getElementById("mount"), {
        stamp: runtime ? undefined : new Uint8Array(WebAssembly.Module.customSections(module, "wasm-web-machine")[0]),
        onMessage(message) {
          if (!message.startsWith("__wwcResponse:")) notices.push(JSON.parse(message));
        },
      });
      await machine.onmsg(0);
      if (runtime) machine.onmsg(new TextEncoder().encode("\u0001" + source));
      const describe = entry => ({ target: entry.target.id,
        rect: [entry.contentRect.x, entry.contentRect.y, entry.contentRect.width, entry.contentRect.height],
        content: entry.contentBoxSize.map(value => [value.inlineSize, value.blockSize]),
        border: entry.borderBoxSize.map(value => [value.inlineSize, value.blockSize]),
        device: entry.devicePixelContentBoxSize.map(value => [value.inlineSize, value.blockSize]),
      });
      const native = new ResizeObserver(function (entries, observer) {
        nativeNotices.push({ entries: entries.map(describe), identity: observer === native, receiver: this === native });
      });
      window.command = value => {
        const element = document.getElementById(value.target);
        if (value.action === "observe") native.observe(element, { box: value.box || "content-box" });
        else if (value.action === "unobserve") native.unobserve(element);
        else if (value.action === "disconnect") native.disconnect();
        machine.onmsg(new TextEncoder().encode("\u0002resizeCommand\0" + JSON.stringify(value)));
      };
      window.dispose = () => { native.disconnect(); machine.destroy(); runtime?.destroy(); };
      command({ action: "observe", target: "a" });
      command({ action: "observe", target: "b", box: "border-box" });
    }, { engine, source });
    async function compare(count) {
      await target.waitForFunction(count => notices.filter(value => value.entries).length >= count &&
        nativeNotices.length >= count, count, { timeout: 3000 });
      assert.deepEqual(await target.evaluate(() => notices.filter(value => value.entries)),
        await target.evaluate(() => nativeNotices));
    }
    await compare(1);
    const initial = await target.evaluate(() => notices[0].entries[0]);
    // Resize the element without dispatching window resize or synthetic input.
    await target.evaluate(() => {
      document.getElementById("a").style.width = "147.75px";
      document.getElementById("b").style.padding = "7px";
      document.getElementById("outside").style.width = "200px";
    });
    await compare(2);
    await target.evaluate(() => {
      command({ action: "unobserve", target: "a" });
      document.getElementById("a").style.width = "180px";
      document.getElementById("b").style.height = "61.25px";
    });
    await compare(3);
    const retained = await target.evaluate(() => notices.at(-1).entries[0]);
    assert.notDeepEqual(retained, initial);
    await target.evaluate(() => {
      command({ action: "disconnect" });
      document.getElementById("b").style.width = "170px";
      command({ action: "retained" });
    });
    assert.deepEqual(await target.evaluate(() => notices.at(-1)), { retained });
    await target.evaluate(() => command({ action: "observe", target: "a", box: "device-pixel-content-box" }));
    await compare(4);
    await target.evaluate(() => command({ action: "recycle" }));
    const recycled = await target.evaluate(() => notices.at(-1));
    assert.equal(recycled.recycled, 5000);
    assert.ok(recycled.growth <= 2, "removing the last target releases callback slots");
    await target.evaluate(() => command({ action: "reflect-id" }));
    assert.deepEqual(await target.evaluate(() => notices.at(-1)), { id: "renamed", attribute: "renamed", identity: true });
    assert.equal(await target.locator("#a").count(), 1);
    await target.evaluate(() => { dispose(); document.getElementById("a").style.width = "220px"; });
    await target.waitForTimeout(80);
    assert.equal(await target.evaluate(() => notices.filter(value => value.entries).length), 4);
    assert.equal(await target.evaluate(() => notices.some(value => value.unexpected)), false);
    assert.deepEqual(errors, []); assert.deepEqual(unexpected, []);
  });
}
