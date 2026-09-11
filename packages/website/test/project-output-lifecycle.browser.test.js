import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { build } from "esbuild";
import { chromium } from "playwright";
import { compileProjectFiles } from "../../project-editor/src/single-file-compiler.js";

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
