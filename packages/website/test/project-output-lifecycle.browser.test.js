import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { build } from "esbuild";
import { chromium } from "playwright";
import { compileProjectFiles } from "../../project-editor/src/single-file-compiler.js";

test("output waits for approved fonts before replacing the visible session", { timeout: 30_000 }, async t => {
  const code = (await build({ stdin: { contents: `
    export { default as Machine } from './dev/wasm-web-machine/src/wasm-web-machine.ts';
    export { ProjectOutput } from './packages/website/project-output-session.js';
  `, resolveDir: new URL("../../..", import.meta.url).pathname },
    bundle: true, write: false, format: "esm", platform: "browser" })).outputFiles[0].text;
  const wasm = await readFile(new URL("../generated/project-quickjs-runtime.wasm", import.meta.url));
  const font = await readFile(new URL("../../../dev/wasm-web-runtimes/examples/microquickjs-suite/mahjong/assets/fonts/libre-baskerville-latin-wght-normal.woff2", import.meta.url));
  const initial = compileProjectFiles([{ path: "index.html", content: "<button>Original</button>" }]);
  const styled = compileProjectFiles([{ path: "index.html", content:
    '<style>button { font-family: ReadyFont; }</style><button>Replacement</button>' }]);
  // The builder supplies font bytes through the stylesheet ABI, not host CSS
  // parsing. Encode one version-5 font record independently for this fixture.
  const operations = [5, 1, 2];
  const uint = value => {
    do { const byte = value % 128; value = Math.floor(value / 128);
      operations.push(byte | (value ? 128 : 0)); } while (value);
  };
  for (const text of ["ReadyFont", "normal", "400", "swap"]) {
    const bytes = new TextEncoder().encode(text); uint(bytes.length); operations.push(...bytes);
  }
  uint(font.length);
  for (const byte of font) operations.push(byte);
  styled.stylesheets.push({ operations });
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage(), errors = [], unexpected = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", route => {
    const url = new URL(route.request().url());
    if (url.origin !== "http://fonts.test") { unexpected.push(url.href); return route.abort(); }
    return route.fulfill(url.pathname === "/module.js" ? { body: code, contentType: "text/javascript" }
      : url.pathname === "/runtime.wasm" ? { body: wasm, contentType: "application/wasm" }
      : { body: '<!doctype html><title>Output font readiness</title><main id="mount"></main>' });
  });
  await page.goto("http://fonts.test/");
  const result = await page.evaluate(async ({ initial, styled }) => {
    const { Machine, ProjectOutput } = await import("/module.js");
    const module = await WebAssembly.compileStreaming(fetch("/runtime.wasm"));
    const mount = document.getElementById("mount");
    let approve, requested;
    const reports = [], checks = [];
    const output = new ProjectOutput(Machine, module, mount, () => ({
      allowFont: () => new Promise(resolve => { approve = resolve; requested(); }),
    }), error => reports.push(error.message));
    const visibleText = () => mount.querySelector('.project-output-root:not([inert]) button')?.textContent;
    try {
      for (const via of ["stylesheet", "script"]) for (const allowed of [true, false, true]) {
        await output.load(initial);
        const ready = new Promise(resolve => { requested = resolve; });
        let settled = false;
        const program = via === "stylesheet" ? styled : { ...styled,
          stylesheets: styled.stylesheets.slice(0, -1),
          scripts: [{ source: "font.js", code: "document.installStylesheetOperations(new Uint8Array(" +
            JSON.stringify(styled.stylesheets.at(-1).operations) + "));" }],
        };
        const loading = output.load(program).then(() => { settled = true; return null; }, error => {
          settled = true; return error.message;
        });
        await ready;
        // Cross a task boundary while approval is held by the controller.
        await new Promise(resolve => setTimeout(resolve, 0));
        const before = { settled, visible: visibleText(), fonts: document.fonts.size };
        approve(allowed);
        const error = await loading;
        checks.push({ via, allowed, before, error, visible: visibleText(),
          faces: [...document.fonts].map(face => [face.family, face.status]) });
      }
      // Disposal must release the waiting load even if approval never answers.
      const ready = new Promise(resolve => { requested = resolve; });
      const loading = output.load(styled).then(() => "resolved", error => error.message);
      await ready;
      output.destroy();
      checks.push({ disposed: await loading });
      approve(true);
      await new Promise(resolve => setTimeout(resolve, 0));
    } finally { output.destroy(); }
    return { checks, reports, fontsAfterDestroy: document.fonts.size };
  }, { initial, styled });
  for (const check of result.checks) {
    if (check.disposed) { assert.match(check.disposed, /destroyed/); continue; }
    assert.deepEqual(check.before, { settled: false, visible: "Original", fonts: 0 });
    assert.equal(check.visible, check.allowed ? "Replacement" : "Original");
    assert.deepEqual(check.faces, check.allowed ? [["ReadyFont", "loaded"]] : []);
    if (check.allowed) assert.equal(check.error, null);
    else assert.match(check.error, /custom font was not allowed/);
  }
  assert.equal(result.fontsAfterDestroy, 0);
  assert.deepEqual(result.reports, [], "preparing failures belong to the load caller, not the active output");
  assert.deepEqual(errors, []);
  assert.deepEqual(unexpected, []);
});

test("output replacement and destruction release active and preparing sessions", { timeout: 30_000 }, async t => {
  const code = (await build({ stdin: { contents: `
    export { default as Machine } from './dev/wasm-web-machine/src/wasm-web-machine.ts';
    export { ProjectOutput } from './packages/website/project-output-session.js';
  `, resolveDir: new URL("../../..", import.meta.url).pathname },
    bundle: true, write: false, format: "esm", platform: "browser" })).outputFiles[0].text;
  const wasm = await readFile(new URL("../generated/project-quickjs-runtime.wasm", import.meta.url));
  const program = compileProjectFiles([{ path: "index.html", content: `
    <style>button { color: blue; }</style><button>Active</button><script>
      globalThis.retainedButton = document.querySelector('button');
      retainedButton.addEventListener('click', () => __wwcPostMessage('click'));
      new MutationObserver(() => __wwcPostMessage('mutation')).observe(retainedButton, { attributes: true });
      new ResizeObserver(() => __wwcPostMessage('resize')).observe(retainedButton);
      setInterval(() => __wwcPostMessage('tick'), 10);
    </script>` }]);
  const browser = await chromium.launch();
  t.after(() => browser.close());
  for (const failCleanup of [false, true]) await t.test(failCleanup ? "throwing cleanup hook" : "normal cleanup", async () => {
    const page = await browser.newPage(), errors = [], unexpected = [];
    try {
      page.on("pageerror", error => errors.push(error.message));
      await page.route("**/*", route => {
        const url = new URL(route.request().url());
        if (url.origin !== "http://lifecycle.test") { unexpected.push(url.href); return route.abort(); }
        return route.fulfill(url.pathname === "/module.js" ? { body: code, contentType: "text/javascript" }
          : url.pathname === "/runtime.wasm" ? { body: wasm, contentType: "application/wasm" }
          : { body: '<!doctype html><title>Output lifetimes</title><main id="mount"></main>' });
      });
      await page.goto("http://lifecycle.test/");
      const result = await page.evaluate(async ({ program, failCleanup }) => {
        const { Machine, ProjectOutput } = await import("/module.js");
        const module = await WebAssembly.compileStreaming(fetch("/runtime.wasm"));
        const mount = document.getElementById("mount"), notices = [], leases = [], oldButtons = [];
        let throwOnRelease = false, preparingReady;
        const prepared = new Promise(resolve => { preparingReady = resolve; });
        const output = new ProjectOutput(Machine, module, mount, () => {
          const index = leases.length, held = new Set(); leases.push(held);
          return {
            onMessage(text) {
              notices.push({ index, text });
              if (text === "preparing") preparingReady();
            },
            onReferenceLease(id, count) {
              if (count) held.add(id); else held.delete(id);
              if (!count && throwOnRelease && index === 12) throw new Error("Fixture release hook failed");
            },
          };
        }, error => { throw error; });
        let pending;
        try {
          const counts = [];
          for (let index = 0; index < 12; index++) {
            await output.load(program);
            oldButtons.push(mount.querySelector("button"));
            counts.push({ wrappers: mount.children.length, styles: mount.querySelectorAll("style").length,
              retiredLeases: leases.slice(0, -1).reduce((sum, held) => sum + held.size, 0) });
          }
          // A real module suspended on its own timer keeps the preparing context
          // alive. Its controller promise must reject when that session closes.
          pending = output.load({ ...program, scripts: [...program.scripts, {
            module: true, source: "pending.js", code: `
              __wwcPostMessage('preparing');
              await new Promise(resolve => setTimeout(resolve, 60000));
              __wwcPostMessage('resumed disposed module');`,
          }] }).then(() => "resolved", error => error.message);
          await prepared;
          const wrappersBefore = mount.children.length;
          oldButtons.at(-1).click();
          const activeWorksWhilePreparing = notices.at(-1)?.text === "click" && notices.at(-1)?.index === 11;
          throwOnRelease = failCleanup;
          let failure;
          try { output.destroy(); } catch (error) { failure = error.message; }
          const pendingResult = await pending;
          const count = notices.length;
          for (const button of oldButtons) {
            button.click(); button.setAttribute("data-retired", "true");
          }
          await new Promise(resolve => setTimeout(resolve, 50));
          let engineDisposed = false;
          try { output.runtime.createSession(); }
          catch (error) { engineDisposed = /disposed/.test(error.message); }
          output.destroy();
          return { counts, wrappersBefore, activeWorksWhilePreparing, failure: failure || null,
            pendingResult, wrappersAfter: mount.children.length, engineDisposed,
            retainedLeases: leases.reduce((sum, held) => sum + held.size, 0),
            lateCallbacks: notices.length - count };
        } finally {
          throwOnRelease = false;
          // Clean the failed baseline too, after capturing its observable state.
          output.runtime.destroy();
          output.destroy();
          if (pending) await pending;
        }
      }, { program, failCleanup });
      t.diagnostic(JSON.stringify({ failCleanup, ...result, counts: result.counts.length }));
      assert.ok(result.counts.every(count => count.wrappers === 1 && count.styles === 1 && !count.retiredLeases));
      assert.equal(result.wrappersBefore, 2);
      assert.equal(result.activeWorksWhilePreparing, true);
      assert.equal(result.failure, failCleanup ? "Fixture release hook failed" : null);
      assert.match(result.pendingResult, /replaced or destroyed/);
      assert.equal(result.wrappersAfter, 0);
      assert.equal(result.engineDisposed, true);
      assert.equal(result.retainedLeases, 0);
      assert.equal(result.lateCallbacks, 0);
      assert.deepEqual(errors, []);
      assert.deepEqual(unexpected, []);
    } finally { await page.close(); }
  });
});
