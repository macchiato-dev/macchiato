import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (name) => readFileSync(new URL(`../src/${name}`, import.meta.url), "utf8");

test("the page controller does not parse project HTML or CSS", () => {
  const controller = source("browser-controller.js");
  assert.doesNotMatch(controller, /single-file-compiler|parseConstrainedCss|parseProjectHtml/);
  assert.ok(controller.split("\n").length <= 500);
});

test("the supervised controller serves artifacts without legacy-subdomain authority", () => {
  const supervisor = source("supervisor.js");
  assert.doesNotMatch(supervisor, /MACCHIATO_UPSTREAM|codemirror-quickjs\.localhost|resources-edge\.localhost/);
  assert.match(supervisor, /--allow-net=127\.0\.0\.1:/);
  assert.ok(source("controller.ts").split("\n").length <= 500);
});

test("the canonical classic-script guest contains no module syntax", () => {
  const generated = readFileSync(new URL(
    "../../wasm-web-runtimes/examples/codemirror/generated/canonical-dom.js",
    import.meta.url), "utf8");
  assert.doesNotMatch(generated, /\nexport\s+\{/);
  assert.equal((generated.match(/function parseCss\(/g) || []).length, 1);
});

test("the build guest has a message capability and no DOM capability", () => {
  const environment = readFileSync(new URL(
    "../../wasm-web-runtimes/quickjs/src/message-guest.js", import.meta.url), "utf8");
  const machines = readFileSync(new URL(
    "../../../packages/website/project-machines.js", import.meta.url), "utf8");
  assert.doesNotMatch(environment, /\bdocument\b|createElement|installStylesheet/);
  assert.match(environment, /postMessage/);
  assert.match(machines, /new WasmWebMachine\(module, null,/);
});

test("the frontend coordinator receives a dedicated root rather than the editor root", () => {
  const runtime = readFileSync(new URL(
    "../../../packages/website/project-editor-runtime.js", import.meta.url), "utf8");
  const coordinator = /function resourcesFrontendMachine\(\)[\s\S]*?^}/m
    .exec(runtime)?.[0] || "";
  assert.match(coordinator, /document\.createElement\("div"\)/);
  assert.match(coordinator, /createProjectAppMachine\(root\)/);
  assert.doesNotMatch(coordinator, /createProjectAppMachine\(options\.root\)/);
});

test("machine.js is assembled by literal concatenation rather than bundling", () => {
  const build = readFileSync(new URL(
    "../../wasm-web-machine/build.js", import.meta.url), "utf8");
  assert.match(build, /const assembled = pieces\.join\("\\n"\)/);
  assert.match(build, /bundle: false/);
  assert.doesNotMatch(build, /bundle: true/);
});

test("authored example files stay within the 500-line teaching envelope", () => {
  const files = [
    "../../wasm-web-runtimes/examples/microquickjs-suite/cat-memory/index.html",
    "../../wasm-web-runtimes/examples/microquickjs-suite/cat-memory/style.css",
    "../../wasm-web-runtimes/examples/microquickjs-suite/cat-memory/application.js",
    "../../wasm-web-runtimes/examples/microquickjs-suite/mahjong/index.html",
    "../../wasm-web-runtimes/examples/microquickjs-suite/mahjong/style.css",
    "../../wasm-web-runtimes/examples/microquickjs-suite/mahjong/application.js",
    "../../wasm-web-runtimes/examples/microquickjs-suite/mahjong/game-model.js",
    "../../wasm-web-runtimes/examples/sqlite-book/index.html",
    "../../wasm-web-runtimes/examples/sqlite-book/style.css",
    "../../wasm-web-runtimes/examples/sqlite-book/application.js",
    "../../wasm-web-runtimes/examples/browser-editors/prosemirror/index.html",
    "../../wasm-web-runtimes/examples/browser-editors/wordgard/index.html",
    "../../wasm-web-runtimes/examples/browser-editors/xterm/pong/index.html",
    "../../wasm-web-runtimes/examples/browser-editors/xterm/terminal/index.html",
  ];
  for (const file of files) {
    const text = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.ok(text.split("\n").length <= 500, file);
  }
});
