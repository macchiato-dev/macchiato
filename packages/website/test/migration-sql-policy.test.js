import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { createMigrationRunner } from "@macchiato-dev/hub/migrations";
import { createNodeSqliteClient } from "../adapters/node-sqlite-client.js";
import { createMigrationSqlUseClient, MIGRATION_SQL_OPERATIONS } from
  "../migration-sql-policy.js";

test("migration runner reaches the current schema through fixed sql-use operations", async () => {
  const database = createNodeSqliteClient(new DatabaseSync(":memory:"));
  const client = createMigrationSqlUseClient({ read: database, write: database });
  const runner = createMigrationRunner(client, { now: () => 123 });
  const result = await runner.ready();
  assert.equal(result.current, true);
  assert.deepEqual(result.appliedVersions, [1, 2, 3]);
  assert.ok(Object.keys(MIGRATION_SQL_OPERATIONS).length > 4);
  await assert.rejects(client.execute({ sql: "DROP TABLE users", args: [] }),
    /not in the build-time policy/);
});
