import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { chromium } from "playwright";
import { editorLanguages } from "../src/languages.js";

// Use identical compiled editor and language sources, source text, viewport,
// and browser input paths. Only the DOM/runtime boundary differs. This is a
// diagnostic comparison, not a fixed millisecond gate for shared CI machines.
test("bulk input preserves native behavior across the MicroQuickJS boundary", {
  timeout: 240_000,
}, async t => {
  const root = new URL("../../../", import.meta.url).pathname;
  const work = join(root, "../macchiato-work");
  await mkdir(work, { recursive: true });
  const directory = await mkdtemp(join(work, "bulk-input-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const generated = join(root, "packages/website/generated");
  // Compare a previous DOM environment without changing the editor, language,
  // document, or input sequence. Production artifacts always use the default.
  const environment = process.env.MACCHIATO_TEST_ENVIRONMENT_FILE || join(generated, "project-editor-runtime.bin");
  const runtime = join(root, "dev/wasm-web-runtimes/examples/microquickjs-suite/microquickjs-guest-runtime");
  const application = join(directory, "application.js");
  const selectedLanguage = process.env.MACCHIATO_TEST_EDITOR_LANGUAGE || "html";
  const parser = editorLanguages.find(entry => entry.name === selectedLanguage)?.package;
  assert.ok(parser || selectedLanguage === "plain", "known editor language required");
  const parserName = parser || "html";
  const setup = `__codeEditorSetContent(JSON.stringify({language:${JSON.stringify(selectedLanguage)},content:"Initial"}));`;
  const parseBudget = Number(process.env.MACCHIATO_TEST_PARSE_BUDGET || 0);
  assert.ok(Number.isInteger(parseBudget) && parseBudget >= 0 && parseBudget <= 20);
  assert.ok(!parseBudget || process.env.MACCHIATO_TYPING_CHECKPOINTS, "budget experiment requires checkpoints");
  const checkpoints = process.env.MACCHIATO_TYPING_CHECKPOINTS
    ? `globalThis.__bulkParseBudget = ${parseBudget};\n` + await readFile(
      new URL("fixtures/typing-checkpoints.js", import.meta.url), "utf8") : "";
  await writeFile(application, 'globalThis.__CODE_EDITOR_DEFER_START__=true;\n' +
    'load("editor.bin");load("language.bin");\n' + setup + "\n" + checkpoints);
  execFileSync(join(runtime, "microquickjs/mqjs"), ["-m32", "-o", join(directory, "application.bin"), application]);
  execFileSync(process.execPath, [join(root, "dev/wasm-web-runtimes/examples/microquickjs-suite/scripts/stamp-wasm.js"),
    join(runtime, "target/wasm32-unknown-unknown/release/wasm_web_container_example_runtime.wasm"),
    join(directory, "editor.wasm"), `runtime.bin=${environment}`,
    `application.bin=${join(directory, "application.bin")}`, `editor.bin=${join(generated, "project-editor-core.bin")}`,
    `language.bin=${join(generated, `project-editor-language-${parserName}.bin`)}`]);
  const wasm = await readFile(join(directory, "editor.wasm"));
  const machine = await readFile(join(root, "dev/wasm-web-machine/dist/module/machine.js"));
  const core = await readFile(join(generated, "project-editor-microquickjs.js"));
  const language = await readFile(join(generated, `project-editor-language-${parserName}.js`));
  const moduleSource = await readFile(process.env.MACCHIATO_TEST_SOURCE_FILE ||
    join(root, "packages/website/content-form-client.js"), "utf8");
  // The default matches the workspace stress test's inert output. Raw source
  // distinguishes ordinary editing from repeatedly parsing one huge comment.
  const rawSource = process.env.MACCHIATO_TEST_RAW_SOURCE === "1";
  const text = rawSource ? moduleSource : `<!--\n${moduleSource.replaceAll("-->", "-- >")}\n-->\n<h1>Large input</h1>`;
  const editorWidth = Number(process.env.MACCHIATO_TEST_EDITOR_WIDTH || 720);
  assert.ok(Number.isFinite(editorWidth) && editorWidth > 0 && editorWidth <= 1440);
  const methods = (process.env.MACCHIATO_TEST_INPUT_METHODS || "paste,insertText,replaceText").split(",");
  assert.ok(methods.length && methods.every(method => ["paste", "insertText", "replaceText"].includes(method)));
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const results = [];
  for (const [run, mode] of ["native", "microquickjs", "microquickjs", "native"].entries()) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const assets = { "/machine.js": machine, "/core.js": core, "/language.js": language, "/editor.wasm": wasm };
    await page.route("http://bulk-input.test/**", route => {
      const path = new URL(route.request().url()).pathname;
      return route.fulfill(assets[path]
        ? { body: assets[path], contentType: path.endsWith("wasm") ? "application/wasm" : "text/javascript" }
        : { contentType: "text/html", body: `<style>
          body { margin: 0; --resources-editor-caret: #111; --resources-editor-fg: #111;
            --resources-editor-bg: #eff5ff; }
          #guest { position: absolute; top: 56px; left: 0; bottom: 0; width: ${editorWidth}px; contain: size; }
          #editor, .cm-editor { height: 100%; }
          .cm-scroller { overflow: auto; }
        </style><div id="guest"><div id="editor"></div></div>` });
    });
    await page.goto("http://bulk-input.test/");
    await page.evaluate(async ({ mode, setup, checkpoints }) => {
      window.messages = [];
      window.events = { beforeinput: 0, input: 0 };
      for (const type of Object.keys(events)) document.addEventListener(type, () => events[type]++);
      if (mode === "native") {
        globalThis.__CODE_EDITOR_DEFER_START__ = true;
        globalThis.__browserUseNotify = message => messages.push(JSON.parse(message));
        await import("/core.js"); await import("/language.js");
        (0, eval)(setup + "\n" + checkpoints);
      } else {
        const { default: Machine } = await import("/machine.js");
        const module = await WebAssembly.compileStreaming(fetch("/editor.wasm"));
        const stamp = new Uint8Array(WebAssembly.Module.customSections(module, "wasm-web-machine")[0]);
        window.machine = new Machine(module, document.getElementById("guest"), {
          stamp, onMessage: message => messages.push(JSON.parse(message)),
        });
        await machine.onmsg(0);
      }
      window.typingCheckpoint = name => mode === "native" ? window[name]()
        : machine.onmsg(new TextEncoder().encode("\u0002" + name + "\0{}"));
    }, { mode, setup, checkpoints });
    const content = page.locator(".cm-content");
    const geometry = await page.locator(".cm-scroller").evaluate(node => {
      const style = getComputedStyle(node), box = node.getBoundingClientRect();
      const content = node.querySelector(".cm-content");
      return { width: box.width, height: box.height, font: style.font, lineHeight: style.lineHeight,
        contentEditable: content.contentEditable,
        userModify: getComputedStyle(content).getPropertyValue("-webkit-user-modify") };
    });
    results.push({ run, mode, method: "geometry", language: selectedLanguage, rawSource, ...geometry });
    t.diagnostic(JSON.stringify(results.at(-1)));
    // Warm both the browser input path and editor before measuring bulk work.
    await content.fill("warmup");
    await page.keyboard.press("End"); await page.keyboard.type(" edit");
    async function paste(value) {
      await content.evaluate((node, value) => {
        const clipboardData = new DataTransfer(); clipboardData.setData("text/plain", value);
        const event = new ClipboardEvent("paste", { clipboardData, bubbles: true, cancelable: true });
        node.dispatchEvent(event);
        if (!event.defaultPrevented) throw new Error("Paste was not handled");
      }, value);
    }
    for (const method of methods) {
      // The workspace replaces an already large document, not just "before".
      // Keep both cases so deletion/layout cost cannot masquerade as a
      // difference between its runtime and this isolated-editor fixture.
      const before = method === "replaceText" ? text + "\n<!-- previous document -->" : "before";
      await content.click();
      await page.keyboard.press("Control+A");
      await paste(before);
      await page.keyboard.press("Control+End");
      await page.keyboard.press("Control+A");
      await page.evaluate(() => { messages.length = 0; events.beforeinput = events.input = 0; });
      const profileDirectory = process.env.MACCHIATO_CPU_PROFILE_DIR;
      const profiler = profileDirectory ? await context.newCDPSession(page) : null;
      if (profiler) {
        await profiler.send("Profiler.enable");
        await profiler.send("Profiler.start");
      }
      const started = performance.now();
      if (method === "paste") await paste(text);
      else await page.keyboard.insertText(text);
      const elapsed = performance.now() - started;
      if (profiler) {
        const { profile } = await profiler.send("Profiler.stop");
        await mkdir(profileDirectory, { recursive: true });
        await writeFile(join(profileDirectory, `${run}-${mode}-${method}.cpuprofile`), JSON.stringify(profile));
        await profiler.detach();
      }
      const state = await page.evaluate(() => ({
        events, changes: messages.filter(message => message.type === "change").length,
        text: messages.filter(message => message.type === "change").at(-1)?.content,
      }));
      assert.equal(state.text, text);
      results.push({ run, mode, method, characters: text.length, milliseconds: Math.round(elapsed),
        events: state.events, changes: state.changes });
      t.diagnostic(JSON.stringify(results.at(-1)));
      await page.keyboard.press("Control+z");
      assert.equal(await page.evaluate(() => messages.filter(message => message.type === "change").at(-1)?.content), before);
      await page.keyboard.press("Control+y");
      assert.equal(await page.evaluate(() => messages.filter(message => message.type === "change").at(-1)?.content), text);
    }
    // A large document must also remain useful for ordinary first-page edits.
    // Type a short phrase, make a typo, and correct it using real key events.
    await page.keyboard.press("Control+Home");
    for (let index = 0; index < 4; index++) await page.keyboard.press("ArrowRight");
    let inserted = "";
    const keyMilliseconds = [];
    if (checkpoints) await page.evaluate(() => typingCheckpoint("resetTypingCheckpoints"));
    const typingDirectory = process.env.MACCHIATO_TYPING_CPU_PROFILE_DIR;
    const typingProfiler = typingDirectory ? await context.newCDPSession(page) : null;
    if (typingProfiler) {
      await typingProfiler.send("Profiler.enable");
      await typingProfiler.send("Profiler.start");
    }
    for (const key of [..." hellp", "Backspace", "o"]) {
      const started = performance.now();
      await page.keyboard.press(key === " " ? "Space" : key);
      keyMilliseconds.push(Math.round(performance.now() - started));
      inserted = key === "Backspace" ? inserted.slice(0, -1) : inserted + key;
      assert.equal(await page.evaluate(() => messages.filter(message => message.type === "change").at(-1)?.content),
        text.slice(0, 4) + inserted + text.slice(4));
    }
    if (typingProfiler) {
      const { profile } = await typingProfiler.send("Profiler.stop");
      await mkdir(typingDirectory, { recursive: true });
      await writeFile(join(typingDirectory, `${run}-${mode}-typing.cpuprofile`), JSON.stringify(profile));
      await typingProfiler.detach();
    }
    if (checkpoints) {
      const timings = await page.evaluate(() => {
        typingCheckpoint("reportTypingCheckpoints");
        return messages.filter(message => message.type === "typing-checkpoints").at(-1).timings;
      });
      results.push({ run, mode, method: "typing-checkpoints", timings });
      t.diagnostic(JSON.stringify(results.at(-1)));
      await page.waitForFunction(() => {
        typingCheckpoint("reportTypingCheckpoints");
        return messages.filter(message => message.type === "typing-checkpoints").at(-1).viewportParsed;
      }, null, { timeout: 10000 });
    }
    results.push({ run, mode, method: "first-page-typing", characters: text.length, keyMilliseconds });
    t.diagnostic(JSON.stringify(results.at(-1)));
    assert.deepEqual(errors, []);
    await page.evaluate(() => window.machine?.destroy());
    await context.close();
  }
  if (process.env.MACCHIATO_TEST_ARTIFACTS) {
    await mkdir(process.env.MACCHIATO_TEST_ARTIFACTS, { recursive: true });
    await writeFile(join(process.env.MACCHIATO_TEST_ARTIFACTS, "bulk-input.json"), JSON.stringify(results, null, 2));
  }
});
