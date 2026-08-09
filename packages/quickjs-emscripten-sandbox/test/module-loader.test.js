import assert from "node:assert/strict";
import test from "node:test";

import { createSandbox, disposeRoleSandbox, getOrCreateRoleSandbox, nodeHttpModuleSource, nodeSqliteModuleSource } from "../src/index.js";

test("sandbox accepts per-runtime memory and stack limits", async () => {
  const sandbox = await createSandbox({ memoryLimitBytes: 16 * 1024 * 1024, maxStackBytes: 512 * 1024 });
  try {
    assert.deepEqual(sandbox.run("6 * 7"), { ok: true, value: 42 });
  } finally {
    sandbox.dispose();
  }
});

test("sandbox rejects invalid runtime limits", async () => {
  await assert.rejects(createSandbox({ memoryLimitBytes: 0 }), /positive safe integer/);
  await assert.rejects(createSandbox({ maxStackBytes: -1 }), /positive safe integer/);
  await assert.rejects(createSandbox({ wasmMachine: "sometimes" }), /shared or dedicated/);
});

test("dedicated sandboxes use separate WebAssembly machines", async () => {
  const editor = await createSandbox({ wasmMachine: "dedicated", role: "project-editor" });
  const project = await createSandbox({ wasmMachine: "dedicated", role: "project" });
  const sharedA = await createSandbox({ role: "shared-a" });
  const sharedB = await createSandbox({ role: "shared-b" });
  try {
    assert.notEqual(editor.inspectMachine().moduleId, project.inspectMachine().moduleId);
    assert.notEqual(editor.inspectMachine().machineId, project.inspectMachine().machineId);
    assert.equal(sharedA.inspectMachine().moduleId, sharedB.inspectMachine().moduleId);
    assert.notEqual(sharedA.inspectMachine().machineId, sharedB.inspectMachine().machineId);
    assert.equal(editor.inspectMachine().wasmMachine, "dedicated");
    assert.equal(editor.inspectMachine().role, "project-editor");
  } finally {
    editor.dispose();
    project.dispose();
    sharedA.dispose();
    sharedB.dispose();
  }
});

test("explicit application roles reuse one sandbox across components", async () => {
  const first = await getOrCreateRoleSandbox("test-site-frontend", { wasmMachine: "dedicated" });
  const second = await getOrCreateRoleSandbox("test-site-frontend", { wasmMachine: "dedicated" });
  try {
    assert.equal(first, second);
    assert.equal(first.inspectMachine().machineId, second.inspectMachine().machineId);
    assert.equal(first.inspectMachine().role, "test-site-frontend");
  } finally {
    await disposeRoleSandbox("test-site-frontend");
  }
});

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

test("awaits top-level module work and surfaces asynchronous failures", async () => {
  const sandbox = await createSandbox();
  try {
    await sandbox.evalModuleAsync("await Promise.resolve(); globalThis.ready = 42;");
    assert.equal(sandbox.run("globalThis.ready").value, 42);
    await assert.rejects(
      sandbox.evalModuleAsync('await Promise.resolve(); throw new Error("late module failure");'),
      /late module failure/,
    );
  } finally {
    sandbox.dispose();
  }
});

test("executes queued promise jobs on demand", async () => {
  const sandbox = await createSandbox();
  try {
    sandbox.evalGlobal("globalThis.answer = 0; Promise.resolve(42).then(value => { globalThis.answer = value; });");
    assert.equal(sandbox.run("globalThis.answer").value, 0);
    assert.ok(sandbox.executePendingJobs() >= 1);
    assert.equal(sandbox.run("globalThis.answer").value, 42);
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
