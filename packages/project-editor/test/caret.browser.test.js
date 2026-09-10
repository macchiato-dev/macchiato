import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { build } from "esbuild";
import { chromium } from "playwright";

test("native and MicroQuickJS editors preserve caret blink and text dragging", {
  timeout: 60_000,
}, async t => {
  const root = new URL("../../../", import.meta.url).pathname;
  const working = join(root, "../macchiato-work");
  await mkdir(working, { recursive: true });
  const directory = await mkdtemp(join(working, "caret-repeat-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const examples = join(root, "dev/wasm-web-runtimes/examples");
  const runtime = join(examples, "microquickjs-suite/microquickjs-guest-runtime");
  const compiler = join(runtime, "microquickjs/mqjs");
  const generated = join(root, "packages/website/generated");
  const setup = '__codeEditorSetContent(JSON.stringify({language:"text",content:' +
    JSON.stringify("A long line for repeated keyboard movement. ".repeat(4)) + '}));';
  const application = join(directory, "application.js");
  await writeFile(application, 'globalThis.__CODE_EDITOR_DEFER_START__ = true;\n' +
    'load("editor.bin");\n' + setup);
  execFileSync(compiler, ["-m32", "-o", join(directory, "application.bin"), application]);
  execFileSync(compiler, ["-m32", "-o", join(directory, "runtime.bin"),
    join(examples, "codemirror/generated/microquickjs-runtime.js")]);
  execFileSync(process.execPath, [join(examples, "microquickjs-suite/scripts/stamp-wasm.js"),
    join(runtime, "target/wasm32-unknown-unknown/release/wasm_web_container_example_runtime.wasm"),
    join(directory, "editor.wasm"), `runtime.bin=${join(directory, "runtime.bin")}`,
    `application.bin=${join(directory, "application.bin")}`,
    `editor.bin=${join(generated, "project-editor-core.bin")}`]);
  const wasm = await readFile(join(directory, "editor.wasm"));
  const machine = (await build({
    entryPoints: [join(root, "dev/wasm-web-machine/src/wasm-web-machine.ts")],
    bundle: true, write: false, format: "esm", platform: "browser",
  })).outputFiles[0].text;
  const native = (await build({
    entryPoints: [join(root, "packages/project-editor/src/guest.js")],
    banner: { js: "globalThis.__CODE_EDITOR_DEFER_START__=true;globalThis.__browserUseNotify=()=>{};" },
    footer: { js: setup },
    bundle: true, write: false, format: "esm", platform: "browser",
  })).outputFiles[0].text;
  const browser = await chromium.launch();
  t.after(() => browser.close());
  for (const mode of ["native", "microquickjs"]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 },
      ...(process.env.MACCHIATO_TEST_ARTIFACTS ? { recordVideo: { dir: process.env.MACCHIATO_TEST_ARTIFACTS } } : {}) });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("http://caret.test/**", route => {
      const path = new URL(route.request().url()).pathname;
      return route.fulfill(path === "/machine.js" || path === "/native.js"
        ? { contentType: "text/javascript", body: path === "/machine.js" ? machine : native }
        : path === "/editor.wasm" ? { contentType: "application/wasm", body: wasm }
        : { contentType: "text/html", body: '<style>body{--resources-editor-caret:#111;--resources-editor-fg:#111;--resources-editor-bg:#eff5ff}</style><div id="guest"><div id="editor"></div></div>' });
    });
    await page.goto("http://caret.test/");
    await page.evaluate(async mode => {
      if (mode === "native") { await import("/native.js"); return; }
      const { default: Machine } = await import("/machine.js");
      const module = await WebAssembly.compileStreaming(fetch("/editor.wasm"));
      const stamp = new Uint8Array(WebAssembly.Module.customSections(module, "wasm-web-machine")[0]);
      window.machine = new Machine(module, document.querySelector("#guest"), { stamp });
      await window.machine.onmsg(0);
    }, mode);
    await page.locator(".cm-content").click();
    await page.keyboard.press("Control+End");
    const samples = [];
    async function sample() {
      return page.evaluate(() => {
        const layer = document.querySelector(".cm-cursorLayer");
        const cursor = layer.querySelector(".cm-cursor");
        const style = getComputedStyle(layer);
        const rect = cursor.getBoundingClientRect();
        return { opacity: Number(style.opacity), animation: style.animationName,
          inline: layer.style.animationName, duration: style.animationDuration,
          x: rect.left, y: rect.top, height: rect.height };
      });
    }
    for (let index = 0; index < 50; index++) {
      // Repeated down calls without keyup produce real repeat=true key events.
      await page.keyboard.down("ArrowLeft");
      await page.waitForTimeout(40);
      samples.push(await sample());
    }
    await page.keyboard.up("ArrowLeft");
    if (process.env.MACCHIATO_TEST_ARTIFACTS) {
      await page.screenshot({ path: join(process.env.MACCHIATO_TEST_ARTIFACTS, `${mode}-caret.png`) });
      await writeFile(join(process.env.MACCHIATO_TEST_ARTIFACTS, `${mode}-caret.json`), JSON.stringify(samples, null, 2));
    }
    assert.ok(samples.every(sample => sample.opacity === 1 && sample.height > 0),
      `${mode}: moving caret became invisible: ${JSON.stringify(samples.filter(sample => sample.opacity !== 1))}`);
    assert.ok(new Set(samples.map(sample => `${sample.x},${sample.y}`)).size > 20, mode + ": caret moved");
    assert.equal(new Set(samples.map(sample => sample.animation)).size, 2, mode + ": blink restarts");
    assert.ok(samples.every(sample => sample.inline && sample.duration === "1.2s"));
    // Do not "fix" movement by disabling the blink animation altogether.
    const idleOpacity = new Set();
    for (let index = 0; index < 16; index++) {
      await page.waitForTimeout(100);
      idleOpacity.add((await sample()).opacity);
    }
    assert.deepEqual([...idleOpacity].sort(), [0, 1], mode + ": idle caret still blinks");
    await t.test(mode + " text drag, undo, and redo", async () => {
      const original = "alpha beta gamma\nsecond line";
      const moved = " beta gamma\nsecond linealpha";
      const content = page.locator(".cm-content");
      await content.fill(original);
      await page.keyboard.press("Control+Home");
      for (let index = 0; index < 5; index++) await page.keyboard.press("Shift+ArrowRight");
      const points = await page.evaluate(() => {
        const selection = document.getSelection();
        const from = selection.getRangeAt(0).getBoundingClientRect();
        const last = document.querySelector(".cm-line:last-child");
        const range = document.createRange();
        range.selectNodeContents(last);
        const to = range.getBoundingClientRect();
        window.dragEvents = [];
        for (const type of ["dragstart", "drop"])
          document.addEventListener(type, event => window.dragEvents.push({ type, trusted: event.isTrusted }));
        return { selected: selection.toString(), x: from.left + from.width / 2,
          y: from.top + from.height / 2, toX: to.right + 5, toY: to.top + to.height / 2 };
      });
      assert.equal(points.selected, "alpha");
      await page.mouse.move(points.x, points.y);
      await page.mouse.down();
      await page.waitForTimeout(150);
      await page.mouse.move(points.toX, points.toY, { steps: 15 });
      await page.mouse.up();
      await page.waitForFunction(moved => document.querySelector(".cm-content").innerText === moved, moved,
        { timeout: 2000 }).catch(async error => {
          t.diagnostic(JSON.stringify({ mode, points, state: await page.evaluate(() => ({
            text: document.querySelector(".cm-content").innerText, events: window.dragEvents,
            selected: document.getSelection().toString(),
          })) }));
          throw error;
        });
      assert.deepEqual(await page.evaluate(() => window.dragEvents), [
        { type: "dragstart", trusted: true }, { type: "drop", trusted: true },
      ], "exercise browser drag events, not a synthetic transfer shortcut");
      assert.equal(await page.evaluate(() => document.getSelection().toString()), "alpha");
      await page.keyboard.press("Control+z");
      await page.waitForFunction(original => document.querySelector(".cm-content").innerText === original, original);
      await page.keyboard.press("Control+y");
      await page.waitForFunction(moved => document.querySelector(".cm-content").innerText === moved, moved);
      if (process.env.MACCHIATO_TEST_ARTIFACTS)
        await page.screenshot({ path: join(process.env.MACCHIATO_TEST_ARTIFACTS, `${mode}-drag.png`) });
    });
    assert.deepEqual(errors, []);
    await page.evaluate(() => window.machine?.destroy());
    await context.close();
  }
});
