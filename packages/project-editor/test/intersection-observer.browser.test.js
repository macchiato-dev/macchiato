import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { build } from "esbuild";
import { chromium } from "playwright";

test("native disconnect clears queued intersection records in Chromium", async t => {
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.setContent('<!doctype html><div id="target" style="height:40px">Observed</div>');
  const notices = await page.evaluate(() => new Promise((resolve, reject) => {
    const notices = [], target = document.getElementById("target");
    const timeout = setTimeout(() => { first.disconnect(); second.disconnect(); reject(Error("Missing queued notification")); }, 2000);
    function received(name, other, entries) {
      notices.push({ targets: entries.map(entry => entry.target.id) });
      // Do not assume an ordering between observers. Whichever is notified
      // first disconnects the other before its pending callback is delivered.
      other.disconnect();
      notices.push({ pending: other.takeRecords().map(entry => entry.target.id) });
      clearTimeout(timeout); first.disconnect(); second.disconnect(); resolve(notices);
    }
    const first = new IntersectionObserver(entries => received("first", second, entries));
    const second = new IntersectionObserver(entries => received("second", first, entries));
    first.observe(target); second.observe(target);
  }));
  assert.deepEqual(notices, [{ targets: ["target"] }, { pending: [] }]);
});

for (const engine of ["native", "microquickjs", "quickjs"]) {
  for (const framed of [false, true]) test(`${engine}: intersections follow scrolling, unobserve, and reconnect (${framed ? "iframe" : "direct"})`, {
    timeout: 30_000,
  }, async t => {
    const root = new URL("../../../", import.meta.url).pathname;
    const work = resolve(root, "../macchiato-work");
    await mkdir(work, { recursive: true });
    const directory = await mkdtemp(resolve(work, "intersection-observer-"));
    t.after(() => rm(directory, { recursive: true, force: true }));
    const generated = resolve(root, "packages/website/generated");
    const fixture = new URL("fixtures/intersection-observer.js", import.meta.url);
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
    } else if (engine === "quickjs") {
      wasm = await readFile(resolve(generated, "project-quickjs-runtime.wasm"));
    }
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
      if (url.origin !== "http://intersections.test") { unexpected.push(url.href); return route.abort(); }
      return route.fulfill(url.pathname === "/module.js" ? { body: code, contentType: "text/javascript" }
        : url.pathname === "/guest.wasm" ? { body: wasm, contentType: "application/wasm" }
        : { body: `<!doctype html><title>Intersections</title><style>
          #scroller { width:200px; height:100px; overflow:auto; }
          #spacer { height:200px; } #observed { width:100px; height:40px; }
          #tail { height:300px; }
        </style><main id="mount"><div id="scroller"><div id="spacer"></div>
        <div id="observed"></div><div id="tail"></div></div></main>`, contentType: "text/html" });
    });
    await page.goto("http://intersections.test/");
    if (framed) await page.evaluate(async () => {
      const frame = document.createElement("iframe"); frame.src = "/frame";
      const ready = new Promise(resolve => frame.onload = resolve);
      document.body.append(frame); await ready;
    });
    const target = framed ? page.frames().find(frame => new URL(frame.url()).pathname === "/frame") : page;
    await target.evaluate(async ({ engine, source }) => {
      window.notices = [];
      if (engine === "native") {
        window.__wwcPostMessage = message => notices.push(JSON.parse(message));
        (0, eval)(source);
        window.command = value => intersectionCommand(JSON.stringify(value));
        window.dispose = () => intersectionObserver.disconnect();
        return;
      }
      const { Machine, QuickJSRuntime } = await import("/module.js");
      const module = await WebAssembly.compileStreaming(fetch("/guest.wasm"));
      const runtime = engine === "quickjs" ? new QuickJSRuntime(module) : null;
      const machine = new Machine(runtime ? runtime.createSession() : module, document.getElementById("mount"), {
        stamp: runtime ? undefined : new Uint8Array(WebAssembly.Module.customSections(module, "wasm-web-machine")[0]),
        onMessage: message => { if (!message.startsWith("__wwcResponse:")) notices.push(JSON.parse(message)); },
      });
      await machine.onmsg(0);
      if (runtime) machine.onmsg(new TextEncoder().encode("\u0001" + source));
      window.command = value => machine.onmsg(new TextEncoder().encode("\u0002intersectionCommand\0" + JSON.stringify(value)));
      window.dispose = () => { machine.destroy(); runtime?.destroy(); };
    }, { engine, source });
    async function expect(count, visible, ratio) {
      await target.waitForFunction(count => notices.length >= count, count, { timeout: 2000 });
      assert.deepEqual(await target.evaluate(() => notices.at(-1)), {
        entries: [{ target: "observed", visible, ratio, size: [100, 40] }],
        observerIdentity: true, receiver: true,
      });
    }
    try {
      await expect(1, false, 0);
      await target.locator("#scroller").evaluate(node => { node.scrollTop = 120; });
      await expect(2, true, 0.5);
      await target.locator("#scroller").evaluate(node => { node.scrollTop = 200; });
      await expect(3, true, 1);
      for (const operation of ["unobserve", "disconnect"]) {
        await target.evaluate(operation => { command(operation); notices.length = 0; }, operation);
        await target.locator("#scroller").evaluate(node => { node.scrollTop = 0; });
        await target.waitForTimeout(100);
        assert.deepEqual(await target.evaluate(() => notices), []);
        await target.evaluate(() => command("observe"));
        await expect(1, false, 0);
        await target.locator("#scroller").evaluate(node => { node.scrollTop = 200; });
        await expect(2, true, 1);
      }
      assert.deepEqual(errors, []);
      assert.deepEqual(unexpected, []);
    } finally { await target.evaluate(() => dispose()); }
  });
}
