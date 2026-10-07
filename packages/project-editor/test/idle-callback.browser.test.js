import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { build } from "esbuild";
import { chromium } from "playwright";

// Real browser idle deadlines, not a deterministic replacement scheduler.
// Build the website guests first so both runtimes use the current environment.
for (const engine of ["microquickjs", "quickjs"]) {
  for (const framed of [false, true]) test(`${engine} forwards native idle deadlines (${framed ? "iframe" : "document"})`, {
    timeout: 60_000,
  }, async t => {
    const root = new URL("../../../", import.meta.url).pathname;
    const working = resolve(root, "../macchiato-work");
    await mkdir(working, { recursive: true });
    const directory = await mkdtemp(resolve(working, "idle-callback-"));
    t.after(() => rm(directory, { recursive: true, force: true }));
    const generated = resolve(root, "packages/project-editor/generated");
    const fixture = new URL("fixtures/idle-callback.js", import.meta.url);
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
      if (url.origin !== "http://idle.test") { unexpected.push(url.href); return route.abort(); }
      return route.fulfill(url.pathname === "/module.js" ? { body: code, contentType: "text/javascript" }
        : url.pathname === "/guest.wasm" ? { body: wasm, contentType: "application/wasm" }
        : { body: '<!doctype html><title>Idle deadlines</title><main id="mount"></main>', contentType: "text/html" });
    });
    await page.goto("http://idle.test/");
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
      const nativeRequest = window.requestIdleCallback.bind(window);
      const nativeCancel = window.cancelIdleCallback.bind(window);
      window.pendingIdle = new Set(); window.nativeDeadlines = []; window.notices = [];
      window.requestIdleCallback = (callback, options) => {
        const id = nativeRequest(deadline => {
          pendingIdle.delete(id);
          nativeDeadlines.push({ timeout: deadline.didTimeout, remaining: deadline.timeRemaining() });
          callback(deadline);
        }, options);
        pendingIdle.add(id); return id;
      };
      window.cancelIdleCallback = id => { pendingIdle.delete(id); nativeCancel(id); };
      window.machines = [];
      window.mountGuest = async () => {
        const root = document.createElement("div"); document.getElementById("mount").append(root);
        const index = machines.length;
        const machine = new Machine(runtime ? runtime.createSession() : module, root, {
          stamp: runtime ? undefined : new Uint8Array(WebAssembly.Module.customSections(module, "wasm-web-machine")[0]),
          onMessage(message) {
            if (!message.startsWith("__wwcResponse:")) notices.push({ index, ...JSON.parse(message) });
          },
        });
        machines.push(machine); await machine.onmsg(0);
        if (runtime) machine.onmsg(new TextEncoder().encode("\u0001" + source));
        return index;
      };
      window.command = (value, index = 0) => machines[index].onmsg(
        new TextEncoder().encode("\u0002idleCommand\0" + JSON.stringify(value)));
      window.dispose = () => { machines.forEach(machine => machine.destroy()); };
      window.disposeRuntime = () => runtime?.destroy();
      await mountGuest();
    }, { engine, source });
    await target.evaluate(() => { command("supported"); command("invalid"); command("cancel"); command("request"); });
    await target.waitForFunction(() => notices.some(value => value.delivered));
    const normal = await target.evaluate(() => ({ notices, nativeDeadlines }));
    assert.deepEqual(normal.notices.slice(0, 3), [
      { index: 0, supported: true, cancel: true },
      { index: 0, invalid: true, invalidOptions: true, optionReads: 1 }, { index: 0, canceled: 5000 },
    ]);
    assert.equal(normal.notices[3].timeout, false);
    assert.ok(normal.notices[3].remaining >= 0 && normal.notices[3].remaining <= normal.nativeDeadlines[0].remaining);
    assert.equal(normal.nativeDeadlines.length, 1, "all canceled native tasks really were canceled");
    // Keep the actual deadline reference past dispatch and the dispatch-cache
    // cleanup. timeRemaining must be live, not a copied initial budget.
    await target.waitForTimeout(80);
    await target.evaluate(() => command("retained"));
    assert.deepEqual(await target.evaluate(() => notices.at(-1)), { index: 0, retained: 0, timeout: false });
    await target.evaluate(() => {
      command("timeout");
      const until = performance.now() + 30;
      while (performance.now() < until) {} // Exceed the requested native timeout in this task.
    });
    await target.waitForFunction(() => notices.filter(value => value.delivered).length === 2);
    assert.equal(await target.evaluate(() => notices.at(-1).timeout), true);
    await target.evaluate(async () => {
      await mountGuest(); command("request", 1); command("foreign-cancel", 0);
    });
    await target.waitForFunction(() => notices.some(value => value.index === 1 && value.delivered));
    assert.equal(await target.evaluate(() => {
      command("request"); command("request", 1); dispose(); return pendingIdle.size;
    }), 0, "disposal cancels every pending native callback");
    await target.waitForTimeout(80);
    assert.equal(await target.evaluate(() => notices.filter(value => value.delivered).length), 3);
    if (engine === "quickjs") {
      const bounds = await target.evaluate(async () => {
        const results = [];
        for (const args of [[-2, 0], [4294967296, 0], [0, -1], [0, 4096], [0.5, 0], [0, 0.5],
          [-1, 0], [4294967295, 4095]]) {
          const index = await mountGuest();
          let error = "";
          try { command(args, index); } catch (failure) { error = failure.message; }
          const scheduled = pendingIdle.size;
          machines[index].destroy();
          results.push({ blocked: error.includes("idle callback is not allowed"), scheduled, remaining: pendingIdle.size });
        }
        return results;
      });
      assert.deepEqual(bounds, Array.from({ length: 8 }, (_, index) => ({
        blocked: index < 6, scheduled: index < 6 ? 0 : 1, remaining: 0,
      })), "validate raw ABI arguments before scheduling; accepted boundary IDs are disposable");
    }
    // Without native support, expose no imitation API. CodeMirror owns its
    // timer fallback and can detect this using the ordinary typeof check.
    await target.evaluate(async () => {
      window.requestIdleCallback = undefined; window.cancelIdleCallback = undefined;
      const index = await mountGuest(); command("supported", index);
    });
    assert.deepEqual(await target.evaluate(() => notices.at(-1)), { index: engine === "quickjs" ? 10 : 2, supported: false, cancel: false });
    await target.evaluate(() => { machines.at(-1).destroy(); disposeRuntime(); });
    assert.deepEqual(errors, []); assert.deepEqual(unexpected, []);
  });
}
