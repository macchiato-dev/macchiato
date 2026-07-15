import assert from "node:assert/strict";
import test from "node:test";

import { createSandbox, nodeHttpModuleSource, nodeSqliteModuleSource } from "../src/index.js";

test("loads explicit guest modules", async () => {
  const sandbox = await createSandbox({
    modules: {
      "answer": "export const value = 42;",
    },
  });
  try {
    sandbox.evalModule(`
      import { value } from "answer";
      globalThis.answer = value;
    `);

    assert.equal(sandbox.run("globalThis.answer").value, 42);
  } finally {
    sandbox.dispose();
  }
});

test("rejects modules not provided by the host", async () => {
  const sandbox = await createSandbox({
    modules: {
      "allowed": "export const ok = true;",
    },
  });
  try {
    assert.throws(
      () => sandbox.evalModule('import { readFileSync } from "node:fs"; globalThis.readFileSync = readFileSync;'),
      /Module not allowed: node:fs/,
    );
  } finally {
    sandbox.dispose();
  }
});

test("node:http wrapper delegates server operations to the JSON host", async () => {
  const calls = [];
  const sandbox = await createSandbox({
    modules: {
      "node:http": nodeHttpModuleSource(),
    },
  });
  sandbox.installJsonHostFunction("__macchiatoHost", (message) => {
    calls.push(message);
    if (message.op === "http.createServer") return { id: "server-1" };
    if (message.op === "http.listen") return { listening: true, id: message.id, port: message.port, host: message.host };
    if (message.op === "http.close") return { closed: true, id: message.id };
    throw new Error(`unexpected op: ${message.op}`);
  });

  try {
    sandbox.evalModule(`
      import http, { createServer } from "node:http";
      const first = createServer(() => {});
      const second = http.createServer(() => {});
      globalThis.serverId = first.id;
      globalThis.listenResult = first.listen(8080, "0.0.0.0");
      globalThis.secondId = second.id;
      globalThis.closeResult = first.close();
    `);

    assert.equal(sandbox.run("globalThis.serverId").value, "server-1");
    assert.deepEqual(sandbox.run("globalThis.listenResult").value, {
      listening: true,
      id: "server-1",
      port: 8080,
      host: "0.0.0.0",
    });
    assert.equal(sandbox.run("globalThis.secondId").value, "server-1");
    assert.deepEqual(sandbox.run("globalThis.closeResult").value, {
      closed: true,
      id: "server-1",
    });
    assert.deepEqual(calls.map((call) => call.op), [
      "http.createServer",
      "http.createServer",
      "http.listen",
      "http.close",
    ]);
  } finally {
    sandbox.dispose();
  }
});

test("node:sqlite wrapper delegates database operations to the JSON host", async () => {
  const calls = [];
  const sandbox = await createSandbox({
    modules: {
      "node:sqlite": nodeSqliteModuleSource(),
    },
  });
  sandbox.installJsonHostFunction("__macchiatoHost", (message) => {
    calls.push(message);
    if (message.op === "sqlite.open") return { id: "db-1" };
    if (message.op === "sqlite.all") return [{ id: 1, name: "alpha" }];
    if (message.op === "sqlite.get") return { id: 1, name: "alpha" };
    if (message.op === "sqlite.run") return { changes: 1, lastInsertRowid: 2 };
    if (message.op === "sqlite.close") return { closed: true };
    throw new Error(`unexpected op: ${message.op}`);
  });

  try {
    sandbox.evalModule(`
      import sqlite, { DatabaseSync } from "node:sqlite";
      const db = new DatabaseSync("app");
      const stmt = db.prepare("select * from projects where id = ?");
      globalThis.dbId = db.id;
      globalThis.rows = stmt.all(1);
      globalThis.row = stmt.get(1);
      globalThis.runResult = stmt.run(1);
      globalThis.defaultDb = new sqlite.DatabaseSync("default").id;
      globalThis.closeResult = db.close();
    `);

    assert.equal(sandbox.run("globalThis.dbId").value, "db-1");
    assert.deepEqual(sandbox.run("globalThis.rows").value, [{ id: 1, name: "alpha" }]);
    assert.deepEqual(sandbox.run("globalThis.row").value, { id: 1, name: "alpha" });
    assert.deepEqual(sandbox.run("globalThis.runResult").value, { changes: 1, lastInsertRowid: 2 });
    assert.equal(sandbox.run("globalThis.defaultDb").value, "db-1");
    assert.deepEqual(sandbox.run("globalThis.closeResult").value, { closed: true });
    assert.deepEqual(calls.map((call) => call.op), [
      "sqlite.open",
      "sqlite.all",
      "sqlite.get",
      "sqlite.run",
      "sqlite.open",
      "sqlite.close",
    ]);
    assert.equal(calls[1].sql, "select * from projects where id = ?");
    assert.deepEqual(calls[1].params, [1]);
  } finally {
    sandbox.dispose();
  }
});
