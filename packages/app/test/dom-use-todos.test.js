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
  assert.match(text, /quickjs-emscripten-core/);
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
  assert.match(client.text, /newQuickJSWASMModuleFromVariant/);
  assert.match(client.text, /class DomUseCapability/);
  assert.equal(guest.response.status, 200);
  assert.match(guest.text, /__macchiatoBoot/);
  assert.deepEqual(JSON.parse(domSchema.text).urls, false);
  assert.deepEqual(JSON.parse(cssSchema.text).urls, false);
});

test("dom-use-todos does not expose backend event dispatch", async () => {
  const response = await domUseTodosHandler(new Request("http://dom-use-todos.localhost/event", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  }));

  assert.equal(response.status, 404);
});
