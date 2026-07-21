import assert from "node:assert/strict";
import test from "node:test";
import { HttpUse, HttpUseClient } from "../src/index.js";
import { createHttpUseHandler } from "../src/backend.js";

test("http-use only sends response fields selected by its schema", async () => {
  const api = new HttpUse({ operations: { list: {
    method: "GET", path: "/api/items",
    response: { type: "array", items: { type: "object", required: ["id"], properties: { id: { type: "integer" }, title: { type: "string" } } } },
    run: () => [{ id: 1, title: "visible", internal_token: "never sent" }],
  } } });
  const response = await api.handle(new Request("http://example.test/api/items"));
  assert.deepEqual(await response.json(), [{ id: 1, title: "visible" }]);
  assert.deepEqual(api.browserConfig(), { operations: { list: { method: "GET", path: "/api/items" } } });
});

test("http-use client can only call configured operations", async () => {
  const client = new HttpUseClient({ operations: { list: { method: "GET", path: "/api/items" } } }, async () => new Response("[]", { headers: { "content-type": "application/json" } }));
  assert.deepEqual(await client.request("list"), []);
  await assert.rejects(client.request("deleteEverything"), /not allowed/);
});

test("Node-style handler projects output before ending the response", () => {
  const handler = createHttpUseHandler({ operations: { create: {
    method: "POST", path: "/api/items",
    request: { type: "object", required: ["title"], properties: { title: { type: "string" } } },
    response: { type: "object", properties: { id: { type: "integer" }, title: { type: "string" } } },
    run: ({ title }) => ({ id: 2, title, internal_token: "server-only" }),
  } } });
  let body = "";
  const response = { statusCode: 200, headers: {}, setHeader(name, value) { this.headers[name] = value; }, end(value) { body = value; } };
  handler({ method: "POST", url: "/api/items", on(type, callback) { if (type === "data") callback('{"title":"portable"}'); if (type === "end") callback(); } }, response);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(body), { id: 2, title: "portable" });
});
