import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

import { domUseTodosHandler } from "../../../examples/dom-use-todos/handler.js";

const repoRoot = resolve(new URL("../../..", import.meta.url).pathname);

async function request(pathname) {
  const response = await domUseTodosHandler(new Request(`http://dom-use-todos.localhost${pathname}`));
  return { response, text: await response.text() };
}

test("dom-use-todos serves a client-side QuickJS shell", async () => {
  const { response, text } = await request("/");

  assert.equal(response.status, 200);
  assert.match(text, /<script type="importmap">/);
  assert.match(text, /"@macchiato-dev\/quickjs-emscripten-sandbox": "\/-\/quickjs-emscripten-sandbox\/index\.js"/);
  assert.match(text, /"quickjs-emscripten-core": "\/-\/quickjs-emscripten-sandbox\/quickjs-core\.js"/);
  assert.match(text, /"@macchiato-dev\/dom-use": "\/-\/@macchiato-dev\/dom-use\/index\.js"/);
  assert.match(text, /"@macchiato-dev\/dom-use\/bridge": "\/-\/@macchiato-dev\/dom-use\/bridge\.js"/);
  assert.doesNotMatch(text, /node_modules/);
  assert.doesNotMatch(text, /index\.mjs/);
  assert.match(text, /<script type="module" src="\/client\.js"><\/script>/);
  assert.doesNotMatch(text, /\/event/);
});

test("dom-use-todos serves the original todo source unchanged", async () => {
  const expected = await readFile(resolve(repoRoot, "examples", "todo", "index.html"), "utf8");
  const { response, text } = await request("/source.html");

  assert.equal(response.status, 200);
  assert.equal(text, expected);
});

test("dom-use-todos serves client runtime and schemas", async () => {
  const client = await request("/client.js");
  const guest = await request("/guest.js");
  const domSchema = await request("/dom.schema.json");
  const cssSchema = await request("/css.schema.json");

  assert.equal(client.response.status, 200);
  assert.match(client.text, /createSandbox/);
  assert.match(client.text, /DomUseHostCapability/);
  assert.equal(guest.response.status, 200);
  assert.match(guest.text, /__macchiatoBoot/);
  assert.deepEqual(JSON.parse(domSchema.text).urls, false);
  assert.deepEqual(JSON.parse(cssSchema.text).urls, false);
});

test("dom-use-todos serves provider assets through module namespaces", async () => {
  const quickjs = await request("/-/quickjs-emscripten-sandbox/quickjs-core.js");
  const sandbox = await request("/-/quickjs-emscripten-sandbox/index.js");
  const quickjsMap = await request("/-/quickjs-emscripten-sandbox/quickjs-core.js.map");
  const ffiTypes = await request("/-/quickjs-emscripten-sandbox/ffi-types.js");
  const domUse = await request("/-/@macchiato-dev/dom-use/index.js");
  const domUseBridge = await request("/-/@macchiato-dev/dom-use/bridge.js");
  const oldNodeModulesPath = await request("/node_modules/quickjs-emscripten-core/dist/index.mjs");

  assert.equal(quickjs.response.status, 200);
  assert.equal(sandbox.response.status, 200);
  assert.match(sandbox.text, /export class Sandbox/);
  assert.match(quickjs.text, /from"\.\/quickjs-async-runtime\.js"/);
  assert.match(quickjs.text, /sourceMappingURL=quickjs-core\.js\.map/);
  assert.doesNotMatch(quickjs.text, /chunk-[A-Z0-9]+\.mjs/);
  assert.equal(quickjsMap.response.status, 200);
  assert.equal(JSON.parse(quickjsMap.text).version, 3);
  assert.equal(ffiTypes.response.status, 200);
  assert.match(ffiTypes.text, /sourceMappingURL=ffi-types\.js\.map/);
  assert.equal(domUse.response.status, 200);
  assert.match(domUse.text, /export class DomUse/);
  assert.equal(domUseBridge.response.status, 200);
  assert.match(domUseBridge.text, /export class DomUseHostCapability/);
  assert.equal(oldNodeModulesPath.response.status, 404);
});

test("dom-use-todos does not expose backend event dispatch", async () => {
  const response = await domUseTodosHandler(new Request("http://dom-use-todos.localhost/event", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  }));

  assert.equal(response.status, 404);
});
