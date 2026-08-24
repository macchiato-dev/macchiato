import { readFile } from "node:fs/promises";
import test from "node:test";
import assert from "node:assert/strict";

import { ServerMachineController } from "../../server-use/src/machine-controller.js";
import { ServerUse } from "../../server-use/src/index.js";
import { SqlUse } from "../../sql-use/src/index.js";

async function machine(options = {}) {
  const root = new URL("generated/bytecode/", import.meta.url);
  const [wasm, manifest] = await Promise.all([
    readFile(new URL("generated/microquickjs-server.wasm", import.meta.url)),
    readFile(new URL("manifest.json", root), "utf8").then(JSON.parse),
  ]);
  const bytecodes = await Promise.all(manifest.chunks.map(name => readFile(new URL(name, root))));
  return new ServerMachineController(new WebAssembly.Module(wasm), {
    ...options, bytecodes,
  });
}

test("runs a bounded server route inside MicroQuickJS", async () => {
  const controller = await machine();
  const server = new ServerUse({
    routes: [{ name: "health", method: "GET", path: "/health" }],
    dispatch: async ({ route, request }) => {
      const [status, headerEntries, body] = await controller.request([
        route, request.method, request.path, request.query,
      ]);
      return { status, headers: Object.fromEntries(headerEntries), body };
    },
  });
  const response = await server.handle(new Request("https://resources.co/health"));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "text/plain; charset=utf-8");
  assert.equal(await response.text(), "MicroQuickJS received GET /health");
  assert.deepEqual(await Promise.all([
    controller.request(["health", "GET", "/one", ""]),
    controller.request(["health", "GET", "/two", ""]),
  ]), [
    [200, [["content-type", "text/plain; charset=utf-8"]], "MicroQuickJS received GET /one"],
    [200, [["content-type", "text/plain; charset=utf-8"]], "MicroQuickJS received GET /two"],
  ]);
  assert.deepEqual(await controller.request(["error"]), [500,
    [["content-type", "text/plain; charset=utf-8"]], "deliberate test failure"]);
});

test("resumes MicroQuickJS after an asynchronous named SQL operation", async () => {
  const read = { async execute({ sql, args }) {
    assert.equal(sql, "SELECT title FROM site_settings WHERE name = ?");
    assert.deepEqual(args, ["resources"]);
    return { rows: [{ title: "Resources" }] };
  } };
  const sql = new SqlUse({ read, operations: {
    "site.title": { kind: "read", sql: "SELECT title FROM site_settings WHERE name = ?",
      parameters: ["name"], maxRows: 1 },
  } });
  const controller = await machine({
    devices: { sql: async (operation, input) => {
      const result = await sql.call(operation, { name: input[0] });
      return result.rows.map(row => [row.title]);
    } },
  });
  const server = new ServerUse({
    routes: [{ name: "title", method: "GET", path: "/title" }],
    dispatch: async ({ route, request }) => {
      const [status, headers, body] = await controller.request([
        route, request.method, request.path, request.query, "resources",
      ]);
      return { status, headers: Object.fromEntries(headers), body };
    },
  });
  const response = await server.handle(new Request("https://resources.co/title"));
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "Resources");
});

test("streams a request-scoped body chunk into MicroQuickJS", async () => {
  const controller = await machine();
  const server = new ServerUse({
    routes: [{ name: "body", method: "POST", path: "/body", requestBody: "resource",
      maxRequestBytes: 70 * 1024 * 1024 }],
    dispatch: async ({ route, resources }) => {
      const result = await controller.request([route], { devices: {
        body: (operation, input) => {
          assert.equal(operation, "read");
          return resources.body.read(input[0]);
        },
      } });
      return { status: result[0], headers: Object.fromEntries(result[1]), body: result[2] };
    },
  });
  const response = await server.handle(new Request("https://resources.co/body", {
    method: "POST", body: Uint8Array.of(11, 22, 33, 44, 55),
  }));
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "4:11,22,33,44");
});
