import assert from "node:assert/strict";
import test from "node:test";
import { httpSqliteCrudHandler, setupHttpSqliteCrud } from "../../../examples/http-sqlite-crud/handler.js";

async function call(path, init) {
  return httpSqliteCrudHandler(new Request(`http://sqlite-notes.localhost${path}`, init));
}

test("http/sqlite example performs schema-filtered CRUD end to end", async () => {
  setupHttpSqliteCrud();

  const home = await call("/");
  assert.equal(home.status, 200);
  assert.match(await home.text(), /QuickJS WASM|quickjs-emscripten-sandbox/);

  const config = await (await call("/api/config")).json();
  assert.deepEqual(Object.keys(config.operations), ["list", "create", "update", "remove"]);

  const created = await (await call("/api/notes", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: "Ship it", internal_token: "attacker value" }),
  })).json();
  assert.equal(created.title, "Ship it");
  assert.equal(created.done, false);
  assert.equal("internal_token" in created, false);

  const updated = await (await call("/api/notes", {
    method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: created.id, done: true }),
  })).json();
  assert.equal(updated.done, true);

  const listed = await (await call("/api/notes")).json();
  assert.equal(listed.some((note) => note.id === created.id), true);
  assert.equal(listed.every((note) => !("internal_token" in note)), true);

  const removed = await (await call("/api/notes", {
    method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: created.id }),
  })).json();
  assert.equal(removed.id, created.id);
  assert.equal((await (await call("/api/notes")).json()).some((note) => note.id === created.id), false);
});
