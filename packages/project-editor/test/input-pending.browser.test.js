import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { build } from "esbuild";
import { chromium } from "playwright";

test("native input-pending detection survives the guest boundary", { timeout: 90_000 }, async t => {
  const root = new URL("../../../", import.meta.url).pathname;
  const work = resolve(root, "../macchiato-work");
  await mkdir(work, { recursive: true });
  const directory = await mkdtemp(resolve(work, "input-pending-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const generated = resolve(root, "packages/website/generated");
  const suite = resolve(root, "dev/wasm-web-runtimes/examples/microquickjs-suite");
  const fixture = new URL("fixtures/input-pending.js", import.meta.url);
  const source = await readFile(fixture, "utf8");
  execFileSync(resolve(suite, "microquickjs-guest-runtime/microquickjs/mqjs"),
    ["-m32", "-o", resolve(directory, "application.bin"), fixture.pathname]);
  execFileSync(process.execPath, [resolve(suite, "scripts/stamp-wasm.js"),
    resolve(generated, "project-editor-quickjs-runtime.wasm"), resolve(directory, "guest.wasm"),
    `runtime.bin=${resolve(generated, "project-editor-runtime.bin")}`,
    `application.bin=${resolve(directory, "application.bin")}`]);
  const micro = await readFile(resolve(directory, "guest.wasm"));
  const quick = await readFile(resolve(generated, "project-quickjs-runtime.wasm"));
  const code = (await build({ stdin: { contents: `
    export { default as Machine } from './dev/wasm-web-machine/src/wasm-web-machine.ts';
    export { QuickJSRuntime } from './dev/wasm-web-runtimes/quickjs/context-runtime.js';
  `, resolveDir: root }, bundle: true, write: false, format: "esm", platform: "browser" })).outputFiles[0].text;
  const browser = await chromium.launch();
  t.after(() => browser.close());
  for (const engine of ["native", "microquickjs", "quickjs"]) {
    for (const framed of [false, true]) for (const available of [true, false]) {
      await t.test(`${engine} ${framed ? "iframe" : "page"}, ${available ? "available" : "unavailable"}`, async () => {
        const page = await browser.newPage(), errors = [], unexpected = [];
        try {
          page.on("pageerror", error => errors.push(error.message));
          await page.route("**/*", route => {
            const url = new URL(route.request().url());
            if (url.origin !== "http://pending.test") { unexpected.push(url.href); return route.abort(); }
            return route.fulfill(url.pathname === "/module.js" ? { body: code, contentType: "text/javascript" }
              : url.pathname === "/guest.wasm" ? { body: engine === "quickjs" ? quick : micro, contentType: "application/wasm" }
              : { body: '<!doctype html><title>Input pending</title><main id="mount" tabindex="0">Focus target</main>' });
          });
          await page.goto("http://pending.test/");
          if (framed) await page.evaluate(async () => {
            const frame = document.createElement("iframe"); frame.src = "/frame";
            const ready = new Promise(resolve => frame.onload = resolve);
            document.body.append(frame); await ready;
          });
          const target = framed ? page.frames().find(frame => new URL(frame.url()).pathname === "/frame") : page;
          await target.evaluate(async ({ engine, source, available }) => {
            if (!available) Object.defineProperty(navigator, "scheduling", { value: undefined });
            window.notices = [];
            window.__wwcPostMessage = message => {
              if (message.startsWith("__wwcResponse:")) return;
              const value = JSON.parse(message); notices.push(value);
              if (value.waiting) console.log("input-waiting");
            };
            if (engine === "native") {
              (0, eval)(source);
              window.command = value => inputCommand(value);
              window.dispose = () => {};
            } else {
              const { Machine, QuickJSRuntime } = await import("/module.js");
              const module = await WebAssembly.compileStreaming(fetch("/guest.wasm"));
              const runtime = engine === "quickjs" ? new QuickJSRuntime(module) : null;
              const machine = new Machine(runtime ? runtime.createSession() : module, document.getElementById("mount"), {
                stamp: runtime ? undefined : new Uint8Array(WebAssembly.Module.customSections(module, "wasm-web-machine")[0]),
                onMessage: __wwcPostMessage,
              });
              await machine.onmsg(0);
              if (runtime) machine.onmsg(new TextEncoder().encode("\u0001" + source));
              window.command = value => machine.onmsg(new TextEncoder().encode("\u0002inputCommand\0" + value));
              window.dispose = () => { machine.destroy(); runtime?.destroy(); };
            }
            command("supported");
          }, { engine, source, available });
          assert.deepEqual(await target.evaluate(() => notices), [{ supported: available }]);
          if (available) {
            await target.evaluate(() => command("options"));
            assert.deepEqual(await target.evaluate(() => notices.at(-1)), { reads: 1, coerced: 0, invalid: 3 });
            await target.locator("#mount").click();
            const waiting = page.waitForEvent("console", message => message.text() === "input-waiting");
            const busy = target.evaluate(() => command("wait"));
            await waiting;
            // This queues real input while the main thread is still in Wasm.
            await page.keyboard.press("a");
            await busy;
            await target.waitForFunction(() => notices.some(value => value.key === "a"));
            assert.deepEqual(await target.evaluate(() => notices.slice(-3)),
              [{ waiting: true }, { pending: true }, { key: "a" }]);
          }
          await target.evaluate(() => dispose());
          assert.deepEqual(errors, []);
          assert.deepEqual(unexpected, []);
        } finally { await page.close(); }
      });
    }
  }
});
