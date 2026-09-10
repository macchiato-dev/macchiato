import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { chromium } from "playwright";
import { editorLanguages } from "../src/languages.js";

for (const downloaded of [false, true]) test(`the MicroQuickJS editor loads ${downloaded ? "downloaded" : "stamped"} language bytecode and Markdown fences`, { timeout: process.env.MACCHIATO_EDITOR_ENCODER_COMPARE || process.env.MACCHIATO_EDITOR_NOTIFICATION_COMPARE || process.env.MACCHIATO_EDITOR_MOUNT_TIMINGS ? 120_000 : 60_000 }, async (t) => {
  const root = new URL("../../../", import.meta.url).pathname;
  const working = resolve(root, "../macchiato-work");
  await mkdir(working, { recursive: true });
  const directory = await mkdtemp(resolve(working, "editor-languages-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const examples = resolve(root, "dev/wasm-web-runtimes/examples");
  const runtime = resolve(examples, "microquickjs-suite/microquickjs-guest-runtime");
  const generated = resolve(root, "packages/website/generated");
  const application = resolve(directory, "application.bin");
  const applicationSource = resolve(directory, "application.js");
  const fixture = await readFile(new URL("fixtures/language-editor.js", import.meta.url), "utf8");
  await writeFile(applicationSource, fixture + (downloaded ? `
    var pendingDownloads = {};
    globalThis.__codeEditorLoadLanguage = globalThis.__codeEditorCreateLanguageLoader(function (name) {
      return new Promise(function (resolve, reject) {
        pendingDownloads[name] = resolve;
        __wwcPostMessage("download:" + name); flush();
      });
    });
    function bytecodeReceived(json) {
      var name = JSON.parse(json);
      load(name);
      pendingDownloads[name]();
      delete pendingDownloads[name];
      inspectEditor();
    }
  ` : ""));
  execFileSync(resolve(runtime, "microquickjs/mqjs"), ["-m32", "-o", application,
    applicationSource]);
  const output = resolve(directory, "editor.wasm");
  execFileSync(process.execPath, [resolve(examples, "microquickjs-suite/scripts/stamp-wasm.js"),
    // Re-stamp the shipped editor, not the last unrelated Cargo/demo build.
    resolve(generated, "project-editor-quickjs-runtime.wasm"), output,
    `runtime.bin=${resolve(generated, "project-editor-runtime.bin")}`,
    `application.bin=${application}`, `editor.bin=${resolve(generated, "project-editor-core.bin")}`,
    ...(downloaded ? [`language-atoms.bin=${resolve(generated, "project-editor-language-atoms.bin")}`]
      : [...new Set(editorLanguages.map((entry) => entry.package))].map((name) =>
        `language-${name}.bin=${resolve(generated, `project-editor-language-${name}.bin`)}`)),
  ]);
  const wasm = await readFile(output);
  const machine = await readFile(resolve(root, "dev/wasm-web-machine/dist/module/machine.js"));
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage();
  const errors = [];
  const downloads = [];
  let releaseHtml, htmlArrived;
  const htmlRequest = new Promise(resolve => { htmlArrived = resolve; });
  page.on("pageerror", (error) => errors.push(error.stack || error.message));
  await page.route("http://languages.test/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (/^\/language-[a-z]+\.bin$/.test(path)) {
      downloads.push(path.slice(1));
      if (path === "/language-html.bin") await new Promise(resolve => {
        releaseHtml = resolve; htmlArrived();
      });
      return route.fulfill({ body: await readFile(resolve(generated, `project-editor-${path.slice(1)}`)),
        contentType: "application/octet-stream" });
    }
    return route.fulfill(path === "/machine.js"
      ? { body: machine, contentType: "text/javascript" }
      : path === "/editor.wasm"
      ? { body: wasm, contentType: "application/wasm" }
      : { body: '<div id="guest"><div id="editor"></div></div>', contentType: "text/html" });
  });
  await page.goto("http://languages.test/");
  await page.evaluate(async () => {
    const { default: WasmWebMachine } = await import("/machine.js");
    const module = await WebAssembly.compileStreaming(fetch("/editor.wasm"));
    const stamp = new Uint8Array(WebAssembly.Module.customSections(module, "wasm-web-machine")[0]);
    window.guestNotices = [];
    let response;
    const machine = new WasmWebMachine(module, document.querySelector("#guest"), {
      stamp, onMessage(message) {
        if (!message.startsWith("__wwcResponse:")) window.guestNotices.push(message);
        if (message.startsWith("__wwcResponse:")) response = JSON.parse(message.slice(14));
        else if (message.startsWith("__wwcError:")) throw new Error(message);
        else if (message.startsWith("download:")) {
          const name = message.slice(9);
          Promise.resolve().then(async () => {
            const bytes = new Uint8Array(await (await fetch("/" + name)).arrayBuffer());
            const header = new TextEncoder().encode(name + "\0");
            const packet = new Uint8Array(1 + header.length + bytes.length);
            packet[0] = 3; packet.set(header, 1); packet.set(bytes, 1 + header.length);
            machine.onmsg(packet);
            window.callGuest("bytecodeReceived", name);
          });
        }
      },
    });
    await machine.onmsg(0);
    window.callGuest = (name, argument) => {
      const text = new TextEncoder().encode(name + "\0" + JSON.stringify(argument));
      const bytes = new Uint8Array(text.length + 1);
      bytes[0] = 2; bytes.set(text, 1); response = undefined;
      machine.onmsg(bytes);
      if (response === undefined) throw new Error("Guest did not respond");
      return response;
    };
    window.stopGuest = () => machine.destroy();
  });
  if (downloaded) {
    const original = '<h1 class="title">Hello</h1>';
    await page.evaluate(content => window.callGuest("selectFile", { path: "index.html", content }), original);
    await htmlRequest;
    const content = page.locator(".cm-content");
    await content.click();
    await page.keyboard.press("Control+End");
    await page.keyboard.type(" extra");
    const before = await page.evaluate(() => window.callGuest("inspectEditor", {}));
    assert.equal(before.document, original + " extra");
    assert.equal(before.languageLoaded, false);
    releaseHtml();
    await page.waitForFunction(() => window.callGuest("inspectEditor", {}).syntaxTree !== "");
    const after = await page.evaluate(() => window.callGuest("inspectEditor", {}));
    assert.equal(after.document, before.document);
    assert.deepEqual(after.selection, before.selection);
    await page.keyboard.press("Control+z");
    assert.equal((await page.evaluate(() => window.callGuest("inspectEditor", {}))).document, original);
  }
  async function select(path, content, language) {
    let info = await page.evaluate((request) => window.callGuest("selectFile", request), { path, content });
    if (downloaded) {
      await page.waitForFunction(() => {
        const state = window.callGuest("inspectEditor", {});
        return state.languageLoaded && state.syntaxTree !== "";
      }, null, { timeout: 10_000 }).catch(async error => {
        t.diagnostic(JSON.stringify({ errors, downloads,
          notices: await page.evaluate(() => window.guestNotices),
          state: await page.evaluate(() => window.callGuest("inspectEditor", {})) }));
        throw error;
      });
      info = await page.evaluate(() => window.callGuest("inspectEditor", {}));
    }
    assert.equal(info.language, language, path);
    assert.equal(info.languageLoaded, true, JSON.stringify({ path, info }));
    assert.equal(info.usage.codePoints, [...content].length, path + " code-point count");
    assert.notEqual(info.syntaxTree, "", path);
    await page.waitForFunction(() => document.querySelectorAll(".cm-line span[class]").length > 0);
    const collected = await page.evaluate(() => window.callGuest("collectEditor", {}));
    assert.equal(collected.languageLoaded, true, path + " after GC");
    assert.equal(collected.document, content, path + " after GC");
    return info;
  }
  const first = await select("index.html", '<h1 class="title">Hello</h1>', "html");
  assert.deepEqual(first.registeredLanguages, ["html"]);
  await select("README.md", '# Example\n\n```python\ndef greet(name):\n    return "Hi " + name\n```\n', "markdown");
  await page.waitForFunction(() => window.callGuest("inspectEditor", {}).registeredLanguages.includes("python"));
  const nested = await page.evaluate(() => window.callGuest("inspectEditor", {}));
  assert.deepEqual(nested.registeredLanguages.sort(), ["html", "markdown", "python"]);
  for (const [path, content, language] of [
    ["main.py", 'def greet(name):\n    return "Hi 😀 café 中文 " + name\n', "python"],
    ["main.rs", 'fn main() {\n    let value = 42;\n    println!("{}", value);\n}\n', "rust"],
    ["query.sql", "SELECT name FROM projects WHERE visible = 1;\n", "sql"],
    ["config.yaml", "project:\n  name: demo\n  enabled: true\n", "yaml"],
    ["main.cpp", "int main() {\n  return 42;\n}\n", "cpp"],
    ["view.tsx", 'const view = (name: string) => <h1>{name}</h1>;\n', "tsx"],
    ["view.jsx", 'const view = <h1>Hello</h1>;\n', "jsx"],
    ["types.ts", "interface Project { name: string; }\n", "typescript"],
    ["data.json", '{"enabled": true}\n', "json"],
    ["style.css", "body { color: rebeccapurple; }\n", "css"],
    ["view.vue", '<template><h1>{{ title }}</h1></template>\n', "vue"],
    ["view.svelte", '<script>let title = "Hello";</script>\n<h1>{title}</h1>\n', "svelte"],
  ]) await select(path, content, language);
  if (downloaded) assert.deepEqual(downloads, ["html", "markdown", "python", "rust", "sql", "yaml", "cpp", "javascript", "json", "css", "vue", "svelte"]
    .map(name => `language-${name}.bin`));
  await select("local.js", "const local = 1;\n", "javascript");
  const remoteChanges = await page.evaluate(() => guestNotices.filter(text => text.startsWith('{"type":"change"')).length);
  await page.evaluate(() => window.callGuest("localNotifications", { enabled: true }));
  await page.evaluate(() => window.callGuest("selectPosition", { head: 0 }));
  await page.keyboard.type("// local\n");
  const localNotices = await page.evaluate(() => window.callGuest("localNotifications", { enabled: false }));
  assert.equal(localNotices.filter(message => message.type === "change").at(-1)?.content,
    "// local\nconst local = 1;\n", "same-guest notifications deliver the actual edit as an object");
  assert.equal(await page.evaluate(() => guestNotices.filter(text => text.startsWith('{"type":"change"')).length),
    remoteChanges, "local edits should not also send a serialized host notification");
  if (process.env.MACCHIATO_EDITOR_TIMINGS && !downloaded) {
    // Measure real keyboard input in the shipped runtime, outside any builds.
    // Optional CDP profiles are diagnostic runs, not comparable timing runs.
    // Round trips include Playwright overhead; full-document inspection stays
    // outside each measured key pair.
    const source = await readFile(new URL("../../website/content-form-client.js", import.meta.url), "utf8");
    const lines = source.split("\n");
    const profileDirectory = process.env.MACCHIATO_EDITOR_PROFILE;
    const profiler = profileDirectory ? await page.context().newCDPSession(page) : null;
    if (profiler) {
      await mkdir(profileDirectory, { recursive: true });
      await profiler.send("Profiler.enable");
    }
    const compare = !!process.env.MACCHIATO_EDITOR_ENCODER_COMPARE;
    const compareNotifications = !!process.env.MACCHIATO_EDITOR_NOTIFICATION_COMPARE;
    assert.ok(Number(compare) + Number(compareNotifications) + Number(!!profiler) <= 1,
      "Run encoder, notification, and profiler diagnostics separately");
    if (compare) {
      const encoding = await page.evaluate(text => window.callGuest("measureTextEncoding", { text }), source);
      assert.ok(encoding.every(result => result.end === encoding[0].end));
      t.diagnostic(JSON.stringify({ benchmark: "wire-text-only", characters: source.length, writes: 20, encoding }));
    }
    for (const localNotifications of compareNotifications ? [false, true, true, false] : [false])
    for (const nativeText of compare ? [false, true, true, false] : [true])
    for (const line of compare || compareNotifications ? [0] : [0, Math.floor(lines.length / 2), lines.length - 1]) {
      await page.evaluate(enabled => window.callGuest("localNotifications", { enabled, latestOnly: true }), localNotifications);
      await page.evaluate(native => window.callGuest("selectTextWriter", { native }), nativeText);
      const position = lines.slice(0, line).reduce((sum, text) => sum + text.length + 1, 0);
      const content = source.slice(0, position) + "// sample: \n" + source.slice(position);
      const started = performance.now();
      await select("large.js", content, "javascript");
      const selectedMs = performance.now() - started;
      await page.evaluate(head => window.callGuest("selectPosition", { head }), position + 11);
      await page.waitForTimeout(150);
      const samples = [];
      if (profiler) await profiler.send("Profiler.start");
      for (let key = 0; key < (compare || compareNotifications ? 12 : 22); key++) {
        const start = performance.now();
        await page.keyboard.type("x");
        await page.keyboard.press("Backspace");
        if (key >= 2) samples.push(performance.now() - start);
      }
      if (profiler) {
        const { profile } = await profiler.send("Profiler.stop");
        await writeFile(resolve(profileDirectory, `line-${line}.cpuprofile`), JSON.stringify(profile));
      }
      const state = await page.evaluate(() => window.callGuest("inspectEditor", {}));
      assert.equal(state.document, content, "repeated edits must preserve the rest of the large file");
      assert.equal(state.selection.head, position + 11);
      const notices = await page.evaluate(() => window.callGuest("localNotifications", { enabled: false }));
      if (localNotifications) assert.equal(notices.at(-1)?.content, content,
        "local notification carries the complete final document");
      const sorted = [...samples].sort((a, b) => a - b);
      t.diagnostic(JSON.stringify({ benchmark: "large-project-javascript", profiled: !!profiler, nativeText, localNotifications, lines: lines.length,
        characters: content.length, line, selectedMs, keyPairMs: samples,
        median: sorted[Math.floor(sorted.length / 2)], p95: sorted[Math.ceil(sorted.length * 0.95) - 1], maximum: sorted.at(-1) }));
    }
    await page.evaluate(() => window.callGuest("selectTextWriter", { native: true }));
    if (profiler) await profiler.detach();
  }
  if (!downloaded) {
    // Real source, a bounded viewport, and no profiler. The guest times editor
    // construction plus its DOM flush, excluding transport of the source and
    // the later full-document correctness check. Run before/after separately.
    await page.addStyleTag({ content: '#editor { height: 500px; } .cm-editor { height: 100%; }' });
    for (const [path, file, language] of [
      ['large.js', '../../website/content-form-client.js', 'javascript'],
      ['large.rs', '../../../dev/microesnext/src/ponyfill.rs', 'rust'],
    ]) {
      const source = await readFile(new URL(file, import.meta.url), 'utf8');
      await select(path, source, language);
      const samples = [];
      for (let iteration = 0; iteration < (process.env.MACCHIATO_EDITOR_MOUNT_TIMINGS ? 4 : 1); iteration++) {
        samples.push(await page.evaluate(request => window.callGuest('measureMount', request), { path, content: source }));
        await page.waitForFunction(() => document.querySelectorAll('.cm-line span[class]').length > 0);
        await page.waitForFunction(() => window.callGuest('inspectParsing', {}).available);
        assert.equal((await page.evaluate(() => window.callGuest('inspectEditor', {}))).document, source);
        await page.waitForTimeout(100);
      }
      if (process.env.MACCHIATO_EDITOR_MOUNT_TIMINGS) t.diagnostic(JSON.stringify({ benchmark: 'initial-parse', path, characters: source.length, samples }));
      // Parsing beyond the first viewport is deferred, not disabled. Typing
      // and scrolling must still work without another click or remount.
      await page.evaluate(() => window.callGuest('selectPosition', { head: 0 }));
      await page.keyboard.type(' ');
      await page.keyboard.press('Backspace');
      assert.equal((await page.evaluate(() => window.callGuest('inspectEditor', {}))).document, source);
      await page.evaluate(head => window.callGuest('selectPosition', { head }), source.length);
      await page.waitForFunction(() => {
        const state = window.callGuest('inspectParsing', {});
        return state.viewportTo === state.length && state.available;
      }, null, { timeout: 30000 });
      assert.ok(await page.locator('.cm-line span[class]').count() > 0);
    }
  }
  // The editor runs in MicroQuickJS, but project JavaScript runs in QuickJS.
  // Typing a comment must not reject valid modern syntax using the editor's
  // more limited Function constructor as the project's syntax validator.
  const modern = 'const greeting = (name = "World") => `Hello ${name}`;\n';
  await select("modern.js", modern, "javascript");
  await page.locator(".cm-content").click();
  await page.keyboard.press("Control+Home");
  await page.keyboard.type("// comment\n");
  const change = await page.evaluate(() => guestNotices.map(text => {
    try { return JSON.parse(text); } catch { return null; }
  }).filter(message => message?.type === "change").at(-1));
  assert.equal(change.content, "// comment\n" + modern);
  assert.equal(change.syntaxErrors, false, "valid project JavaScript must not be classified as invalid ES5");
  for (const theme of ["dark", "light", "dark"]) {
    const expected = theme === "dark" ? "rgb(62, 82, 111)" : "rgb(185, 180, 220)";
    await page.evaluate(({ theme, color }) => {
      document.querySelector("#guest").style.setProperty("--resources-editor-selection", color);
      window.callGuest("selectTheme", { theme });
    }, { theme, color: expected });
    for (const [path, source] of [["selection.html", "<h1>First</h1>\n<p>Second</p>\n<p>Third</p>"],
      ["selection.css", "h1 { color: red; }\np { color: blue; }\n"]]) {
      await select(path, source, path.endsWith("html") ? "html" : "css");
      const first = await page.locator(".cm-line").nth(0).boundingBox();
      const second = await page.locator(".cm-line").nth(1).boundingBox();
      await page.mouse.move(first.x + 12, first.y + first.height / 2);
      await page.mouse.down();
      await page.mouse.move(second.x + 40, second.y + second.height / 2, { steps: 6 });
      await page.mouse.up();
      await page.locator(".cm-selectionBackground").first().waitFor({ state: "attached" });
      assert.equal(await page.locator(".cm-selectionBackground").first().evaluate(node =>
        getComputedStyle(node).backgroundColor), expected, `${theme}: first selection after opening ${path}`);
      assert.equal(await page.locator(".cm-line").first().evaluate(node =>
        getComputedStyle(node, "::selection").backgroundColor), expected, `${theme}: native selection agrees`);
    }
  }
  const beforeListeners = await page.evaluate(() => window.callGuest("inspectListeners", {}));
  const recycled = await page.evaluate(() => window.callGuest("recycleListeners", {}));
  assert.ok(recycled.slots <= beforeListeners.slots + 4,
    "5,000 temporary listeners reuse slots instead of consuming the 4,096 callback IDs");
  const target = await page.locator(".cm-content").boundingBox();
  await page.mouse.move(target.x + 5, target.y + 5);
  const received = await page.evaluate(() => window.callGuest("inspectListeners", {}));
  assert.equal(received.hits, beforeListeners.hits + 1, "only the current listener receives the event");
  await page.evaluate(() => window.callGuest("removeProbeListener", {}));
  await page.mouse.move(target.x + 15, target.y + 5);
  assert.equal((await page.evaluate(() => window.callGuest("inspectListeners", {}))).hits, received.hits,
    "the removed host listener cannot dispatch into a reused slot");
  const beforeBurst = await page.evaluate(() => window.callGuest("startEventBurst", {}));
  await page.getByRole("button", { name: "Event test", exact: true }).evaluate(node => {
    for (let index = 0; index < 5000; index++) node.dispatchEvent(new Event("change", { bubbles: true }));
  });
  // Wait for the guest's cache-retirement task, then read the retained event
  // through its normal getters. Retiring a cache is not invalidating a lease.
  await page.waitForTimeout(50);
  const burst = await page.evaluate(() => window.callGuest("inspectEventBurst", {}));
  assert.equal(burst.count, 5000);
  assert.ok(burst.slots <= beforeBurst.slots + 16, "a burst needs one cleanup callback, not one per event");
  assert.equal(burst.retainedType, "change");
  assert.equal(burst.retainedTarget, "event-burst");
  assert.equal(burst.retainedProbe, 1);
  await page.evaluate(() => window.stopGuest());
  assert.deepEqual(errors, []);
});
