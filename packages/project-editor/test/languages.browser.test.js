import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { chromium } from "playwright";
import { editorLanguages } from "../src/languages.js";

test("the MicroQuickJS editor loads language bytecode on demand, including Markdown fences", { timeout: 60_000 }, async (t) => {
  const root = new URL("../../../", import.meta.url).pathname;
  const working = resolve(root, "../macchiato-work");
  await mkdir(working, { recursive: true });
  const directory = await mkdtemp(resolve(working, "editor-languages-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const examples = resolve(root, "dev/wasm-web-runtimes/examples");
  const runtime = resolve(examples, "microquickjs-suite/microquickjs-guest-runtime");
  const generated = resolve(root, "packages/website/generated");
  const application = resolve(directory, "application.bin");
  execFileSync(resolve(runtime, "microquickjs/mqjs"), ["-m32", "-o", application,
    new URL("fixtures/language-editor.js", import.meta.url).pathname]);
  const output = resolve(directory, "editor.wasm");
  execFileSync(process.execPath, [resolve(examples, "microquickjs-suite/scripts/stamp-wasm.js"),
    resolve(runtime, "target/wasm32-unknown-unknown/release/wasm_web_container_example_runtime.wasm"), output,
    `runtime.bin=${resolve(examples, "codemirror/generated/microquickjs-runtime.bin")}`,
    `application.bin=${application}`, `editor.bin=${resolve(generated, "project-editor-core.bin")}`,
    ...[...new Set(editorLanguages.map((entry) => entry.package))].map((name) =>
      `language-${name}.bin=${resolve(generated, `project-editor-language-${name}.bin`)}`),
  ]);
  const wasm = await readFile(output);
  const machine = await readFile(resolve(root, "dev/wasm-web-machine/dist/module/machine.js"));
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.stack || error.message));
  await page.route("http://languages.test/**", (route) => {
    const path = new URL(route.request().url()).pathname;
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
    let response;
    const machine = new WasmWebMachine(module, document.querySelector("#guest"), {
      stamp, onMessage(message) {
        if (message.startsWith("__wwcResponse:")) response = JSON.parse(message.slice(14));
        else if (message.startsWith("__wwcError:")) throw new Error(message);
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
  async function select(path, content, language) {
    const info = await page.evaluate((request) => window.callGuest("selectFile", request), { path, content });
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
  ]) await select(path, content, language);
  await page.evaluate(() => window.stopGuest());
  assert.deepEqual(errors, []);
});
