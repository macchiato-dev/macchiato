import assert from "node:assert/strict";
import test from "node:test";
import { SqlUse } from "../src/index.js";

function client(result) {
  const calls = [];
  return { calls, async execute(query) { calls.push(query); return result; } };
}

test("executes fixed SQL with guest input and host context", async () => {
  const read = client({ rows: [{ id: 3, name: "Article" }] });
  const sql = new SqlUse({ read, operations: {
    "project.get": { kind: "read", sql: "SELECT id, name FROM projects WHERE owner_id = ? AND id = ?",
      parameters: [{ source: "context", name: "owner-id" }, "project-id"], maxRows: 1 },
  } });
  const result = await sql.call("project.get", { "project-id": 3 }, { "owner-id": 7 });
  assert.deepEqual(read.calls, [{
    sql: "SELECT id, name FROM projects WHERE owner_id = ? AND id = ?", args: [7, 3],
  }]);
  assert.deepEqual(result.rows, [{ id: 3, name: "Article" }]);
});

test("separates reads and writes and rejects guest-selected SQL", async () => {
  const read = client({ rows: [] });
  const write = client({ rows: [], rowsAffected: 1 });
  const sql = new SqlUse({ read, write, operations: {
    "project.rename": { kind: "write", sql: "UPDATE projects SET name = ? WHERE owner_id = ? AND id = ?",
      parameters: ["name", { source: "context", name: "owner-id" }, "project-id"] },
  } });
  await sql.call("project.rename", { name: "New", "project-id": 2 }, { "owner-id": 7 });
  assert.equal(read.calls.length, 0);
  assert.deepEqual(write.calls[0].args, ["New", 7, 2]);
  await assert.rejects(sql.call("DROP TABLE projects", {}, {}), /not allowed/);
});

test("fails closed on missing context and excessive results", async () => {
  const read = client({ rows: [{ id: 1 }, { id: 2 }] });
  const sql = new SqlUse({ read, operations: {
    "project.list": { kind: "read", sql: "SELECT id FROM projects WHERE owner_id = ?",
      parameters: [{ source: "context", name: "owner-id" }], maxRows: 1 },
  } });
  await assert.rejects(sql.call("project.list"), /requires context.owner-id/);
  await assert.rejects(sql.call("project.list", {}, { "owner-id": 7 }), /exceeded its 1-row limit/);
});
