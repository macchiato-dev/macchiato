import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { chromium } from "playwright";

test("CodeMirror follows native pane resizing and visibility without input", { timeout: 60_000 }, async t => {
  const root = new URL("../../../", import.meta.url).pathname;
  const work = resolve(root, "../macchiato-work");
  await mkdir(work, { recursive: true });
  const directory = await mkdtemp(resolve(work, "pane-resize-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const generated = resolve(root, "packages/project-editor/generated");
  const suite = resolve(root, "dev/wasm-web-runtimes/examples/microquickjs-suite");
  const fixture = await readFile(new URL("fixtures/pane-resize.js", import.meta.url), "utf8");
  const application = resolve(directory, "application.js"), bytecode = resolve(directory, "application.bin");
  await writeFile(application, 'globalThis.__CODE_EDITOR_DEFER_START__=true;load("editor.bin");\n' + fixture);
  execFileSync(resolve(suite, "microquickjs-guest-runtime/microquickjs/mqjs"), ["-m32", "-o", bytecode, application]);
  execFileSync(process.execPath, [resolve(suite, "scripts/stamp-wasm.js"),
    resolve(generated, "project-editor-quickjs-runtime.wasm"), resolve(directory, "editor.wasm"),
    `runtime.bin=${process.env.MACCHIATO_TEST_ENVIRONMENT_FILE || resolve(generated, "project-editor-runtime.bin")}`,
    `application.bin=${bytecode}`, `editor.bin=${resolve(generated, "project-editor-core.bin")}`]);
  const assets = {
    "/editor.wasm": await readFile(resolve(directory, "editor.wasm")),
    "/machine.js": await readFile(resolve(root, "dev/wasm-web-machine/dist/module/machine.js")),
    "/editor.js": await readFile(resolve(generated, "project-editor-microquickjs.js")),
  };
  const browser = await chromium.launch();
  t.after(() => browser.close());
  for (const mode of ["native", "microquickjs"]) await t.test(mode, async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    try {
      await page.route("http://pane.test/**", route => {
        const path = new URL(route.request().url()).pathname;
        return route.fulfill(assets[path] ? { body: assets[path], contentType:
          path.endsWith(".wasm") ? "application/wasm" : "text/javascript" } : { contentType: "text/html", body: `
          <style>body { margin:0; --resources-editor-bg:#e7ecff; --resources-editor-fg:#17243a; }
          #pane { width:700px; height:500px; } #editor,.cm-editor { height:100%; }
          .cm-scroller { overflow:auto; }</style><main id="pane"><div id="editor"></div></main>` });
      });
      await page.goto("http://pane.test/");
      await page.evaluate(async ({ mode, fixture }) => {
        window.notices = []; window.windowResizes = 0;
        addEventListener("resize", () => windowResizes++);
        if (mode === "native") {
          const NativeResizeObserver = globalThis.ResizeObserver;
          window.resizeDeliveries = [];
          globalThis.ResizeObserver = class extends NativeResizeObserver {
            constructor(callback) {
              super((entries, observer) => {
                resizeDeliveries.push({ now: Date.now(), lastUpdate: globalThis.__codeEditorView?.docView.lastUpdate,
                  widths: entries.map(entry => entry.contentRect.width) });
                callback.call(observer, entries, observer);
              });
            }
          };
          globalThis.__CODE_EDITOR_DEFER_START__ = true;
          globalThis.__browserUseNotify = message => notices.push(JSON.parse(message));
          await import("/editor.js"); (0, eval)(fixture);
        } else {
          const { default: Machine } = await import("/machine.js");
          const module = await WebAssembly.compileStreaming(fetch("/editor.wasm"));
          window.machine = new Machine(module, document.getElementById("pane"), {
            stamp: new Uint8Array(WebAssembly.Module.customSections(module, "wasm-web-machine")[0]),
            onMessage: message => notices.push(JSON.parse(message)),
          });
          await machine.onmsg(0);
        }
        window.inspectPane = () => {
          if (mode === "native") readPaneState();
          else machine.onmsg(new TextEncoder().encode("\u0002readPaneState\0{}"));
          const rect = document.querySelector(".cm-content").getBoundingClientRect();
          return { ...notices.filter(value => value.type === "pane-state").at(-1),
            actualWidth: rect.width, actualHeight: rect.height, windowResizes };
        };
      }, { mode, fixture });
      // Let initial drawing settle, so a pending initial measure cannot hide
      // a missing notification. Plain text also rules out parser-driven draws.
      await page.waitForTimeout(250);
      const original = await page.evaluate(() => inspectPane().document);
      for (const width of [260, 900, 350, 700]) {
        // CodeMirror ignores resize notifications within 75 ms of its last
        // document update. Isolate pane resizing from that upstream guard;
        // waiting reads state only, without requesting a redraw in either VM.
        await page.waitForFunction(() => {
          const state = inspectPane();
          return state.now - state.lastUpdate > 100;
        });
        await page.locator("#pane").evaluate((node, width) => node.style.width = width + "px", width);
        await page.waitForFunction(() => {
          const state = inspectPane();
          return Math.abs(state.width - state.actualWidth) < 1 && Math.abs(state.height - state.actualHeight) < 2;
        }, null, { timeout: 3000 }).catch(async error => {
          t.diagnostic(JSON.stringify({ mode, width, state: await page.evaluate(() => inspectPane()),
            deliveries: await page.evaluate(() => window.resizeDeliveries) }));
          throw error;
        });
        const state = await page.evaluate(() => inspectPane());
        assert.equal(state.windowResizes, 0); assert.equal(state.document, original);
        const alignment = await page.evaluate(() => {
          const numbers = [...document.querySelectorAll(".cm-lineNumbers .cm-gutterElement")];
          return [...document.querySelectorAll(".cm-line")].filter(line => line.getBoundingClientRect().top < 500)
            .map(line => {
              const number = /^row (\d+):/.exec(line.textContent)?.[1];
              const gutter = numbers.find(node => node.textContent === number);
              return { number, difference: gutter ? Math.abs(gutter.getBoundingClientRect().top - line.getBoundingClientRect().top) : null };
            });
        });
        assert.ok(alignment.length > 0 && alignment.every(row => row.difference !== null && row.difference < 2), JSON.stringify(alignment));
        if (process.env.MACCHIATO_TEST_ARTIFACTS) {
          await mkdir(process.env.MACCHIATO_TEST_ARTIFACTS, { recursive: true });
          await page.screenshot({ path: resolve(process.env.MACCHIATO_TEST_ARTIFACTS, `${mode}-${width}.png`) });
        }
      }
      // Moving the pane changes intersection without resizing it or sending
      // scroll/input events. The observer must wake CodeMirror when it returns.
      for (const visible of [false, true, false, true]) {
        await page.locator("#pane").evaluate((node, visible) => {
          node.style.transform = visible ? "none" : "translateY(1200px)";
        }, visible);
        await page.waitForFunction(visible => {
          const state = inspectPane();
          // Native CodeMirror can leave its last measured inView value cached
          // while offscreen; its observer flag changes immediately instead.
          return state.intersecting === visible && (!visible || state.inView);
        }, visible, { timeout: 3000 });
        assert.equal(await page.evaluate(() => inspectPane().document), original);
      }
      await page.locator(".cm-content").click();
      await page.keyboard.press("Control+Home");
      await page.keyboard.type("edit ");
      assert.equal(await page.evaluate(() => inspectPane().document), "edit " + original);
      await page.keyboard.press("Control+z");
      assert.equal(await page.evaluate(() => inspectPane().document), original);
      assert.deepEqual(errors, []);
      await page.evaluate(() => window.machine?.destroy());
    } finally { await page.close(); }
  });
});
