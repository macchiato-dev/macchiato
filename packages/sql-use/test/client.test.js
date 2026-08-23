import assert from "node:assert/strict";
import test from "node:test";
import { createSqlUseClient } from "../src/client.js";

test("adapts exact trusted statements and rejects policy drift", async () => {
  const database = {
    async execute(query) { return { rows: [{ id: query.args[0] }] }; },
    async batch(queries) { return queries.map(() => ({ rowsAffected: 1 })); },
  };
  const client = createSqlUseClient({ read: database, write: database, operations: {
    "project.get": { kind: "read", sql: "SELECT id FROM projects WHERE id = ?", parameterCount: 1 },
    "project.rename": { kind: "write", sql: "UPDATE projects SET name = ? WHERE id = ?", parameterCount: 2 },
  } });
  assert.deepEqual((await client.execute({ sql: "SELECT id FROM projects WHERE id = ?", args: [4] })).rows, [{ id: 4 }]);
  assert.equal((await client.batch([{ sql: "UPDATE projects SET name = ? WHERE id = ?", args: ["A", 4] }]))[0].rowsAffected, 1);
  await assert.rejects(client.execute({ sql: "DELETE FROM projects", args: [] }), /not in the build-time policy/);
});
