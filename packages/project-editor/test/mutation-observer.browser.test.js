import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { build } from "esbuild";
import { chromium } from "playwright";

test("mutation observations preserve native registrations, queues, and options", { timeout: 60_000 }, async t => {
  const root = new URL("../../../", import.meta.url).pathname;
  const work = resolve(root, "../macchiato-work");
  await mkdir(work, { recursive: true });
  const directory = await mkdtemp(resolve(work, "mutation-observer-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const generated = resolve(root, "packages/website/generated");
  const suite = resolve(root, "dev/wasm-web-runtimes/examples/microquickjs-suite");
  const fixture = new URL("fixtures/mutation-observer.js", import.meta.url);
  const source = await readFile(fixture, "utf8");
  const application = resolve(directory, "application.bin");
  execFileSync(resolve(suite, "microquickjs-guest-runtime/microquickjs/mqjs"), ["-m32", "-o", application, fixture.pathname]);
  execFileSync(process.execPath, [resolve(suite, "scripts/stamp-wasm.js"),
    resolve(generated, "project-editor-quickjs-runtime.wasm"), resolve(directory, "microquickjs.wasm"),
    `runtime.bin=${resolve(generated, "project-editor-runtime.bin")}`, `application.bin=${application}`]);
  const assets = {
    "/microquickjs.wasm": await readFile(resolve(directory, "microquickjs.wasm")),
    "/quickjs.wasm": await readFile(resolve(generated, "project-quickjs-runtime.wasm")),
    "/module.js": (await build({ stdin: { contents: `
      export { default as Machine } from './dev/wasm-web-machine/src/wasm-web-machine.ts';
      export { QuickJSRuntime } from './dev/wasm-web-runtimes/quickjs/context-runtime.js';
    `, resolveDir: root }, bundle: true, write: false, format: "esm", platform: "browser" })).outputFiles[0].text,
  };
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const expected = {};
  for (const mode of ["native", "microquickjs", "quickjs"]) {
    for (const framed of mode === "native" ? [false] : [false, true]) await t.test(`${mode} ${framed ? "iframe" : "direct"}`, async () => {
      const page = await browser.newPage(), errors = [], unexpected = [];
      page.on("pageerror", error => errors.push(error.message));
      try {
        await page.route("**/*", route => {
          const url = new URL(route.request().url());
          if (url.origin !== "http://mutation.test") { unexpected.push(url.href); return route.abort(); }
          return route.fulfill(assets[url.pathname] ? { body: assets[url.pathname], contentType:
            url.pathname.endsWith(".wasm") ? "application/wasm" : "text/javascript" } : {
            contentType: "text/html", body: '<main id="mount"><div id="a" data-keep="old a">text</div><div id="b" data-keep="old b"></div></main><p id="outside">Private</p>',
          });
        });
        await page.goto("http://mutation.test/");
        if (framed) await page.evaluate(async () => {
          const frame = document.createElement("iframe"), loaded = new Promise(resolve => frame.onload = resolve);
          frame.src = "/frame"; document.body.append(frame); await loaded;
        });
        const target = framed ? page.frames().find(frame => frame.url().endsWith("/frame")) : page;
        await target.evaluate(async ({ mode, source }) => {
          window.notices = [];
          if (mode === "native") {
            window.__wwcPostMessage = message => notices.push(JSON.parse(message));
            (0, eval)(source);
            window.command = value => mutationCommand(JSON.stringify(value));
            window.dispose = () => mutationObserver.disconnect();
          } else {
            const { Machine, QuickJSRuntime } = await import("/module.js");
            const module = await WebAssembly.compileStreaming(fetch("/" + mode + ".wasm"));
            const runtime = mode === "quickjs" ? new QuickJSRuntime(module) : null;
            const machine = new Machine(runtime ? runtime.createSession() : module, document.querySelector("#mount"), {
              stamp: runtime ? undefined : new Uint8Array(WebAssembly.Module.customSections(module, "wasm-web-machine")[0]),
              onMessage: message => { if (!message.startsWith("__wwcResponse:")) notices.push(JSON.parse(message)); },
            });
            await machine.onmsg(0);
            if (runtime) machine.onmsg(new TextEncoder().encode("\u0001" + source));
            window.command = value => machine.onmsg(new TextEncoder().encode("\u0002mutationCommand\0" + JSON.stringify(value)));
            window.dispose = () => { machine.destroy(); runtime?.destroy(); };
          }
        }, { mode, source });
        for (const action of ["multiple", "replace-options", "defaults-filter", "character-default", "character-coercion",
          "false-default", "set-filter", "option-getters", "empty-filter", "drain", "invalid", "recycle", "named-write"]) {
          const result = await target.evaluate(async action => {
            notices.length = 0;
            command({ action });
            // Let the real mutation-observer checkpoint run, not a synthetic
            // guest notification. takeRecords cases must not get a callback.
            await new Promise(resolve => setTimeout(resolve, 0));
            return notices;
          }, action);
          if (action === "recycle") {
            assert.ok(result[0].growth <= 2, JSON.stringify(result));
            result[0].growth = 0;
          }
          if (mode === "native") expected[action] = result;
          else assert.deepEqual(result, expected[action], action);
          if (action === "named-write") assert.equal(await target.locator("#a").textContent(),
            "visible when the named call returns");
        }
        assert.deepEqual(await target.evaluate(async () => {
          notices.length = 0;
          command({ action: "multiple" });
          dispose();
          document.getElementById("a").setAttribute("data-keep", "after disposal");
          await new Promise(resolve => setTimeout(resolve, 0));
          return notices;
        }), [], "disposal cancels pending and future deliveries");
        assert.deepEqual(errors, []);
        assert.deepEqual(unexpected, []);
      } finally { await page.close(); }
    });
  }
});
