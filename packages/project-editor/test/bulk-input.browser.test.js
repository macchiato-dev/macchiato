import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
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
  const generated = join(root, "packages/project-editor/generated");
  // Compare a previous DOM environment without changing the editor, language,
  // document, or input sequence. Production artifacts always use the default.
  const environment = process.env.MACCHIATO_TEST_ENVIRONMENT_FILE || join(generated, "project-editor-runtime.bin");
  const coreSource = process.env.MACCHIATO_TEST_EDITOR_SOURCE_FILE || join(generated, "project-editor-microquickjs.js");
  const runtime = join(root, "dev/wasm-web-runtimes/examples/microquickjs-suite/microquickjs-guest-runtime");
  const application = join(directory, "application.js");
  const selectedLanguage = process.env.MACCHIATO_TEST_EDITOR_LANGUAGE || "html";
  const parser = editorLanguages.find(entry => entry.name === selectedLanguage)?.package;
  assert.ok(parser || selectedLanguage === "plain", "known editor language required");
  const parserName = parser || "html";
  const languageSource = process.env.MACCHIATO_TEST_LANGUAGE_SOURCE_FILE ||
    join(generated, `project-editor-language-${parserName}.js`);
  const setup = `__codeEditorSetTheme('{"theme":"light"}');\n` +
    `__codeEditorSetContent(JSON.stringify({language:${JSON.stringify(selectedLanguage)},content:"Initial"}));`;
  const parseBudget = Number(process.env.MACCHIATO_TEST_PARSE_BUDGET || 0);
  assert.ok(Number.isInteger(parseBudget) && parseBudget >= 0 && parseBudget <= 20);
  assert.ok(!parseBudget || process.env.MACCHIATO_TYPING_CHECKPOINTS, "budget experiment requires checkpoints");
  const parseBeforeTyping = process.env.MACCHIATO_TEST_PARSE_BEFORE_TYPING === "1";
  assert.ok(!parseBeforeTyping || process.env.MACCHIATO_TYPING_CHECKPOINTS,
    "parse readiness experiment requires checkpoints");
  const profileCatchUp = process.env.MACCHIATO_TYPING_PROFILE_CATCH_UP === "1";
  assert.ok(!profileCatchUp || (process.env.MACCHIATO_TYPING_CPU_PROFILE_DIR &&
    process.env.MACCHIATO_TYPING_CHECKPOINTS), "catch-up profiling requires a profile directory and checkpoints");
  const checkpoints = process.env.MACCHIATO_TYPING_CHECKPOINTS
    ? `globalThis.__bulkParseBudget = ${parseBudget};
globalThis.__bulkWireCheckpoints = ${process.env.MACCHIATO_WIRE_CHECKPOINTS === "1"};
globalThis.__bulkCollectionCheckpoints = ${process.env.MACCHIATO_COLLECTION_CHECKPOINTS === "1"};
globalThis.__bulkHighlightCheckpoints = ${process.env.MACCHIATO_HIGHLIGHT_CHECKPOINTS === "1"};
globalThis.__bulkParseProgress = ${process.env.MACCHIATO_PARSE_PROGRESS === "1"};
` + await readFile(
      new URL("fixtures/typing-checkpoints.js", import.meta.url), "utf8") : "";
  const disableInputPending = process.env.MACCHIATO_TEST_DISABLE_INPUT_PENDING === "1";
  await writeFile(application, 'globalThis.__CODE_EDITOR_DEFER_START__=true;\n' +
    (disableInputPending ? 'Object.defineProperty(navigator,"scheduling",{value:undefined});\n' : '') +
    'load("editor.bin");load("language.bin");\n' + setup + "\n" + checkpoints);
  execFileSync(join(runtime, "microquickjs/mqjs"), ["-m32", "-o", join(directory, "application.bin"), application]);
  const coreBytecode = join(directory, "editor.bin");
  execFileSync(join(runtime, "microquickjs/mqjs"), ["-m32", "-o", coreBytecode, coreSource]);
  const languageBytecode = join(directory, "language.bin");
  execFileSync(join(runtime, "microquickjs/mqjs"), ["-m32", "-o", languageBytecode, languageSource]);
  execFileSync(process.execPath, [join(root, "dev/wasm-web-runtimes/examples/microquickjs-suite/scripts/stamp-wasm.js"),
    // A later demo/Cargo build may replace target/. Re-stamp the actual shipped
    // editor unless the caller explicitly selects an experimental runtime.
    process.env.MACCHIATO_TEST_RUNTIME_FILE || join(generated, "project-editor-quickjs-runtime.wasm"),
    join(directory, "editor.wasm"), `runtime.bin=${environment}`,
    `application.bin=${join(directory, "application.bin")}`, `editor.bin=${coreBytecode}`,
    `language.bin=${languageBytecode}`]);
  const wasm = await readFile(join(directory, "editor.wasm"));
  const machine = await readFile(join(root, "dev/wasm-web-machine/dist/module/machine.js"));
  const core = await readFile(coreSource);
  const language = await readFile(languageSource);
  const moduleSource = await readFile(process.env.MACCHIATO_TEST_SOURCE_FILE ||
    join(root, "packages/website/content-form-client.js"), "utf8");
  // The default matches the workspace stress test's inert output. Raw source
  // distinguishes ordinary editing from repeatedly parsing one huge comment.
  const rawSource = process.env.MACCHIATO_TEST_RAW_SOURCE === "1";
  const text = rawSource ? moduleSource : `<!--\n${moduleSource.replaceAll("-->", "-- >")}\n-->\n<h1>Large input</h1>`;
  const typingPosition = process.env.MACCHIATO_TEST_TYPING_POSITION || "first";
  assert.ok(["first", "last"].includes(typingPosition));
  const typingOffset = typingPosition === "last" ? text.length : Math.min(4, text.length);
  const editorWidth = Number(process.env.MACCHIATO_TEST_EDITOR_WIDTH || 720);
  assert.ok(Number.isFinite(editorWidth) && editorWidth > 0 && editorWidth <= 1440);
  const visualInput = process.env.MACCHIATO_TEST_VISUAL_INPUT === "1";
  const renderFrame = process.env.MACCHIATO_TEST_RENDER_FRAME === "1";
  // Use a saved, anonymous Resources response to retain the real workspace's
  // CSS/layout dependencies without running its application or output guests.
  // Only this test's trusted setup runs; the inserted file remains editor text.
  const workspacePage = process.env.MACCHIATO_TEST_WORKSPACE_PAGE
    ? (await readFile(process.env.MACCHIATO_TEST_WORKSPACE_PAGE, "utf8"))
      .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "")
    : null;
  if (workspacePage !== null) assert.match(workspacePage, /data-project-editor-mount/);
  const workspaceSha256 = workspacePage === null ? null
    : createHash("sha256").update(workspacePage).digest("hex");
  const narrowWorkspaceSelectors = process.env.MACCHIATO_DIRECT_LAYOUT_SELECTORS === "1";
  assert.ok(!narrowWorkspaceSelectors || workspacePage, "selector experiment requires the real workspace");
  assert.ok(!visualInput || process.env.MACCHIATO_TEST_ARTIFACTS, "visual input requires an artifacts directory");
  const keyInterval = Number(process.env.MACCHIATO_TEST_KEY_INTERVAL ?? (visualInput ? 100 : 0));
  assert.ok(Number.isFinite(keyInterval) && keyInterval >= 0 && keyInterval <= 1000);
  // This isolated editor has no site shell to supply its theme variables.
  // Read the actual light palette, failing if it moves rather than silently
  // recording uncolored text as evidence of correct syntax highlighting.
  const siteSource = await readFile(join(root, "packages/website/site.css"), "utf8");
  const palette = siteSource.match(/html\[data-theme="light"\] \.project-editor__mount \{ (--resources-editor-[^}]+) \}/)?.[1];
  assert.ok(palette, "the Resources editor light palette must be available");
  const methods = (process.env.MACCHIATO_TEST_INPUT_METHODS || "paste,insertText,replaceText").split(",");
  assert.ok(methods.length && methods.every(method => ["paste", "insertText", "replaceText"].includes(method)));
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const results = [];
  for (const [run, mode] of ["native", "microquickjs", "microquickjs", "native"].entries()) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 },
      ...(visualInput ? { recordVideo: { dir: join(directory, "videos"), size: { width: 1440, height: 900 } } } : {}) });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const assets = { "/machine.js": machine, "/core.js": core, "/language.js": language, "/editor.wasm": wasm };
    await page.route("http://bulk-input.test/**", route => {
      const path = new URL(route.request().url()).pathname;
      if (workspacePage && path === "/") return route.fulfill({ contentType: "text/html", body: workspacePage });
      if (renderFrame && path === "/") return route.fulfill({ contentType: "text/html", body: `<!doctype html>
        <style>body { margin:0; } iframe { position:absolute; left:0; top:56px;
          width:${editorWidth}px; height:calc(100% - 56px); border:0; }</style>
        <iframe src="/editor.html" title="Code editor" sandbox="allow-scripts allow-same-origin"></iframe>` });
      return route.fulfill(assets[path]
        ? { body: assets[path], contentType: path.endsWith("wasm") ? "application/wasm" : "text/javascript" }
        : { contentType: "text/html", body: `<style>
          body { margin: 0; ${palette} }
          #guest { position: absolute; top: ${renderFrame ? 0 : 56}px; left: 0; bottom: 0; width: ${editorWidth}px; contain: size; }
          #editor, .cm-editor { height: 100%; }
          .cm-scroller { overflow: auto; }
        </style><div id="guest"><div id="editor"></div></div>` });
    });
    await page.goto("http://bulk-input.test/");
    let changedSelectors = 0;
    if (narrowWorkspaceSelectors) changedSelectors = await page.evaluate(() => {
      let count = 0;
      function narrow(rules) {
        for (const rule of rules) {
          if (rule.selectorText) {
            const before = rule.selectorText;
            const after = before
              .replaceAll("html:has(.focused-view)", "html:has(> body > .focused-view)")
              .replaceAll("body:has(.focused-view)", "body:has(> .focused-view)")
              .replaceAll(".project-editor:has(.project-editor__workspace", ".project-editor:has(> .project-editor__workspace");
            if (after !== before) { rule.selectorText = after; count++; }
          }
          if (rule.cssRules) narrow(rule.cssRules);
        }
      }
      for (const sheet of document.styleSheets) narrow(sheet.cssRules);
      return count;
    });
    if (narrowWorkspaceSelectors) assert.ok(changedSelectors > 0, "layout selector experiment must change rules");
    if (workspacePage) {
      await page.evaluate(renderFrame => {
        document.documentElement.dataset.theme = "light";
        document.documentElement.dataset.themeChoice = "light";
        const editor = document.querySelector("[data-project-editor]");
        editor.dataset.editorMachineState = "ready";
        editor.dataset.outputMachineState = "ready";
        const mount = document.querySelector("[data-project-editor-mount]");
        mount.id = "guest";
        mount.replaceChildren();
        const child = document.createElement(renderFrame ? "iframe" : "div");
        if (renderFrame) {
          child.src = "/editor.html";
          child.title = "Code editor";
          child.setAttribute("sandbox", "allow-scripts allow-same-origin");
          child.style.cssText = "width:100%;height:100%;border:0;display:block";
        } else {
          child.id = "editor";
          child.style.height = "100%";
        }
        mount.append(child);
      }, renderFrame);
      if (renderFrame) await page.frameLocator("[data-project-editor-mount] iframe").locator("#editor").waitFor();
    }
    // The same trusted setup runs in each editor's realm. Inserted source is
    // only text, never executed; no user code is added to this rendering frame.
    const view = renderFrame ? page.frames().find(frame => frame.url().endsWith("/editor.html")) : page;
    assert.ok(view, "the editor rendering document is available");
    await view.evaluate(async ({ mode, setup, checkpoints }) => {
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
    const content = view.locator(".cm-content");
    const geometry = await view.locator(".cm-scroller").evaluate(node => {
      const style = getComputedStyle(node), box = node.getBoundingClientRect();
      const content = node.querySelector(".cm-content");
      const metrics = document.createElement("canvas").getContext("2d");
      metrics.font = style.font;
      return { width: box.width, height: box.height, font: style.font, lineHeight: style.lineHeight,
        keywordColor: style.getPropertyValue("--resources-editor-keyword").trim(),
        narrowGlyphWidth: metrics.measureText("iiii").width, wideGlyphWidth: metrics.measureText("WWWW").width,
        contentEditable: content.contentEditable,
        userModify: getComputedStyle(content).getPropertyValue("-webkit-user-modify") };
    });
    results.push({ run, mode, method: "geometry", language: selectedLanguage, rawSource, renderFrame,
      workspace: !!workspacePage, workspaceSha256, changedSelectors, ...geometry });
    t.diagnostic(JSON.stringify(results.at(-1)));
    if (visualInput) assert.equal(geometry.narrowGlyphWidth, geometry.wideGlyphWidth,
      "visual comparisons need an installed monospace font, not a proportional fallback");
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
      await view.evaluate(() => { messages.length = 0; events.beforeinput = events.input = 0; });
      const profileDirectory = process.env.MACCHIATO_CPU_PROFILE_DIR;
      const traceDirectory = process.env.MACCHIATO_BROWSER_TRACE_DIR;
      // Browser layout/editing is invisible in guest-only phase timers. Keep
      // this opt-in and separate from uninstrumented latency comparisons.
      const trace = traceDirectory ? await context.newCDPSession(page) : null;
      if (trace) await trace.send("Tracing.start", {
        categories: "devtools.timeline,disabled-by-default-devtools.timeline",
        transferMode: "ReturnAsStream",
      });
      const profiler = profileDirectory ? await context.newCDPSession(page) : null;
      if (profiler) {
        await profiler.send("Profiler.enable");
        await profiler.send("Profiler.start");
      }
      if (checkpoints) await view.evaluate(() => typingCheckpoint("resetTypingCheckpoints"));
      const started = performance.now();
      if (method === "paste") await paste(text);
      else await page.keyboard.insertText(text);
      const elapsed = performance.now() - started;
      if (trace) {
        const completed = new Promise(resolve => trace.once("Tracing.tracingComplete", resolve));
        await trace.send("Tracing.end");
        const { stream } = await completed;
        const chunks = [];
        try {
          for (;;) {
            const chunk = await trace.send("IO.read", { handle: stream });
            chunks.push(chunk.base64Encoded ? Buffer.from(chunk.data, "base64") : Buffer.from(chunk.data));
            if (chunk.eof) break;
          }
        } finally { await trace.send("IO.close", { handle: stream }); }
        await mkdir(traceDirectory, { recursive: true });
        await writeFile(join(traceDirectory, `${run}-${mode}-${method}.trace.json`), Buffer.concat(chunks));
        await trace.detach();
      }
      if (profiler) {
        const { profile } = await profiler.send("Profiler.stop");
        await mkdir(profileDirectory, { recursive: true });
        await writeFile(join(profileDirectory, `${run}-${mode}-${method}.cpuprofile`), JSON.stringify(profile));
        await profiler.detach();
      }
      const state = await view.evaluate(() => ({
        events, changes: messages.filter(message => message.type === "change").length,
        text: messages.filter(message => message.type === "change").at(-1)?.content,
      }));
      assert.equal(state.text, text);
      results.push({ run, mode, method, characters: text.length, milliseconds: Math.round(elapsed),
        events: state.events, changes: state.changes });
      t.diagnostic(JSON.stringify(results.at(-1)));
      if (checkpoints) {
        const measured = await view.evaluate(() => {
          typingCheckpoint("reportTypingCheckpoints");
          return messages.filter(message => message.type === "typing-checkpoints").at(-1);
        });
        results.push({ run, mode, method: method + "-checkpoints", ...measured });
        t.diagnostic(JSON.stringify(results.at(-1)));
      }
      await page.keyboard.press("Control+z");
      assert.equal(await view.evaluate(() => messages.filter(message => message.type === "change").at(-1)?.content), before);
      await page.keyboard.press("Control+y");
      assert.equal(await view.evaluate(() => messages.filter(message => message.type === "change").at(-1)?.content), text);
    }
    // A large document must also remain useful for ordinary first-page edits.
    // Type a short phrase, make a typo, and correct it using real key events.
    if (parseBeforeTyping) {
      // Diagnostic control: separate catching up after bulk replacement from
      // incremental edits to an already parsed document. Never used by the app.
      const parsing = await view.evaluate(() => {
        typingCheckpoint("finishBulkParsing");
        return messages.filter(message => message.type === "parse-before-typing").at(-1);
      });
      assert.equal(parsing.parsed, true, "the control requires the complete syntax tree");
      results.push({ run, mode, method: "parse-before-typing", ...parsing });
      t.diagnostic(JSON.stringify(results.at(-1)));
    }
    const navigationStarted = performance.now();
    await page.keyboard.press(typingPosition === "last" ? "Control+End" : "Control+Home");
    if (typingPosition === "first") {
      for (let index = 0; index < typingOffset; index++) await page.keyboard.press("ArrowRight");
    }
    results.push({ run, mode, method: "navigate-before-typing", position: typingPosition,
      offset: typingOffset, milliseconds: Math.round(performance.now() - navigationStarted) });
    t.diagnostic(JSON.stringify(results.at(-1)));
    let inserted = "";
    const keyMilliseconds = [];
    if (visualInput) await view.evaluate(() => {
      window.visualFrames = [];
      const started = performance.now();
      window.recordVisualFrame = () => {
        // Diagnostic-only DOM sampling. Do not mix these timings with the
        // ordinary benchmark: reading every frame adds work to the host.
        const lines = [...document.querySelectorAll(".cm-content .cm-line")];
        visualFrames.push({ milliseconds: performance.now() - started,
          lines: lines.map(line => ({ text: line.textContent,
            spans: [...line.querySelectorAll("span")].map(span => [span.textContent, span.className]) })) });
        window.visualFrameHandle = requestAnimationFrame(recordVisualFrame);
      };
      recordVisualFrame();
    });
    if (checkpoints) await view.evaluate(() => typingCheckpoint("resetTypingCheckpoints"));
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
      assert.equal(await view.evaluate(() => messages.filter(message => message.type === "change").at(-1)?.content),
        text.slice(0, typingOffset) + inserted + text.slice(typingOffset));
      if (keyInterval) await page.waitForTimeout(keyInterval);
    }
    async function stopTypingProfiler() {
      const { profile } = await typingProfiler.send("Profiler.stop");
      await mkdir(typingDirectory, { recursive: true });
      const phase = profileCatchUp ? "typing-and-catch-up" : "typing";
      await writeFile(join(typingDirectory, `${run}-${mode}-${phase}.cpuprofile`), JSON.stringify(profile));
      await typingProfiler.detach();
    }
    if (typingProfiler && !profileCatchUp) await stopTypingProfiler();
    // Exercise queued input before waiting for parser catch-up. Waiting first
    // would hide contention between background work and newly arriving keys.
    if (process.env.MACCHIATO_TEST_INPUT_BURST === "1") await typeQueuedBurst();
    if (checkpoints) {
      const timings = await view.evaluate(() => {
        typingCheckpoint("reportTypingCheckpoints");
        return messages.filter(message => message.type === "typing-checkpoints").at(-1);
      });
      results.push({ run, mode, method: "typing-checkpoints", collections: timings.collections, timings: timings.timings, wireReads: timings.wireReads,
        wireOperations: timings.wireOperations,
        viewportParsed: timings.viewportParsed, documentParsed: timings.documentParsed });
      t.diagnostic(JSON.stringify(results.at(-1)));
      const parseWaitStarted = performance.now();
      await view.waitForFunction(() => {
        typingCheckpoint("reportTypingCheckpoints");
        return messages.filter(message => message.type === "typing-checkpoints").at(-1).viewportParsed;
      }, null, { timeout: 10000 });
      const completed = await view.evaluate(() =>
        messages.filter(message => message.type === "typing-checkpoints").at(-1));
      results.push({ run, mode, method: "viewport-parse-wait", position: typingPosition,
        milliseconds: Math.round(performance.now() - parseWaitStarted), timings: completed.timings,
        parseProgress: completed.parseProgress });
      t.diagnostic(JSON.stringify(results.at(-1)));
    }
    // Idle parser slices can run after the final key. Keep this optional capture
    // open through readiness so profiling does not omit the delay under study.
    if (typingProfiler && profileCatchUp) await stopTypingProfiler();
    results.push({ run, mode, method: typingPosition + "-page-typing", offset: typingOffset,
      characters: text.length, keyInterval, keyMilliseconds });
    t.diagnostic(JSON.stringify(results.at(-1)));
    if (visualInput) {
      await page.waitForTimeout(300);
      const frames = await view.evaluate(() => {
        cancelAnimationFrame(visualFrameHandle);
        return visualFrames;
      });
      await mkdir(process.env.MACCHIATO_TEST_ARTIFACTS, { recursive: true });
      await writeFile(join(process.env.MACCHIATO_TEST_ARTIFACTS, `${run}-${mode}-frames.json`), JSON.stringify(frames));
      await page.screenshot({ path: join(process.env.MACCHIATO_TEST_ARTIFACTS, `${run}-${mode}-after.png`) });
      // A rendering-frame experiment must retain the editor's ordinary UI,
      // not just its text updates. Keep these checks outside timed input.
      await page.keyboard.press("Escape");
      await page.keyboard.press("Control+f");
      const search = view.locator('.cm-search input[name="search"]');
      await search.waitFor();
      await search.fill("function");
      await page.keyboard.press("Enter");
      assert.equal(await search.evaluate(node => node === document.activeElement), true);
      await page.screenshot({ path: join(process.env.MACCHIATO_TEST_ARTIFACTS, `${run}-${mode}-search.png`) });
      await page.keyboard.press("Escape");
      await content.focus();
      await page.keyboard.press("Control+End");
      await view.waitForFunction(() => {
        const scroll = document.querySelector(".cm-scroller");
        return scroll.scrollTop > 0;
      });
      await page.screenshot({ path: join(process.env.MACCHIATO_TEST_ARTIFACTS, `${run}-${mode}-bottom.png`) });
      await page.keyboard.press("Control+Home");
      await view.waitForFunction(() => document.querySelector(".cm-scroller").scrollTop === 0);
      assert.equal(await content.locator(".cm-line").first().textContent(),
        (text.slice(0, typingOffset) + inserted + text.slice(typingOffset)).split("\n")[0]);
    }
    // Keep rendered text and class spans as evidence for styling experiments,
    // outside the timed input sequence. A parsed tree alone does not prove
    // that its visible highlights have the same styles or boundaries.
    results.push({ run, mode, method: "first-page-highlighting", lines: await content.evaluate(node =>
      Array.from(node.querySelectorAll(".cm-line"), line => ({ text: line.textContent,
        spans: Array.from(line.querySelectorAll("span"), span => ({ text: span.textContent, class: span.className })) }))) });
    async function typeQueuedBurst() {
      // Queue keys at a fixed cadence without waiting for each acknowledgement.
      // Serial Playwright key presses cannot expose yielding to already queued
      // input while a background parser is busy on the main thread.
      const session = await context.newCDPSession(page);
      const viewportParsedBefore = checkpoints ? await view.evaluate(() => {
        typingCheckpoint("reportTypingCheckpoints");
        return messages.filter(message => message.type === "typing-checkpoints").at(-1).viewportParsed;
      }) : null;
      const letters = "abcdefghij", started = performance.now();
      const acknowledgements = [];
      await Promise.all([...letters].map((key, index) => new Promise((resolve, reject) => {
        setTimeout(() => {
          const code = "Key" + key.toUpperCase();
          const down = session.send("Input.dispatchKeyEvent", { type: "keyDown", key, code, text: key });
          const up = session.send("Input.dispatchKeyEvent", { type: "keyUp", key, code });
          Promise.all([down, up]).then(() => {
            acknowledgements[index] = Math.round(performance.now() - started - index * 30);
            resolve();
          }, reject);
        }, index * 30);
      })));
      await session.detach();
      assert.equal(await view.evaluate(() => messages.filter(message => message.type === "change").at(-1)?.content),
        text.slice(0, typingOffset) + inserted + letters + text.slice(typingOffset));
      results.push({ run, mode, method: "queued-typing", disableInputPending, viewportParsedBefore,
        interval: 30, acknowledgements });
      t.diagnostic(JSON.stringify(results.at(-1)));
    }
    assert.deepEqual(errors, []);
    await view.evaluate(() => window.machine?.destroy());
    await context.close();
    if (visualInput) await page.video().saveAs(join(process.env.MACCHIATO_TEST_ARTIFACTS, `${run}-${mode}.webm`));
  }
  if (process.env.MACCHIATO_TEST_ARTIFACTS) {
    await mkdir(process.env.MACCHIATO_TEST_ARTIFACTS, { recursive: true });
    await writeFile(join(process.env.MACCHIATO_TEST_ARTIFACTS, "bulk-input.json"), JSON.stringify(results, null, 2));
  }
});
