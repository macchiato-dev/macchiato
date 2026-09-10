import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { chromium } from "playwright";
import { editorLanguages } from "../src/languages.js";

for (const downloaded of [false, true]) test(`the MicroQuickJS editor loads ${downloaded ? "downloaded" : "stamped"} language bytecode and Markdown fences`, { timeout: 60_000 }, async (t) => {
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
  await page.evaluate(() => window.stopGuest());
  assert.deepEqual(errors, []);
});
