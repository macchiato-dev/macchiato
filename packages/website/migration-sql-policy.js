import { HUB_MIGRATIONS, MIGRATION_LEDGER_SCHEMA } from "@macchiato-dev/hub/migrations";
import { createSqlUseClient } from "../sql-use/src/client.js";

const appliedMigrationsSql =
  "SELECT version, name, applied_at FROM resource_schema_migrations ORDER BY version";
const migrationNameSql = "SELECT name FROM resource_schema_migrations WHERE version = ?";
const recordMigrationSql =
  "INSERT OR IGNORE INTO resource_schema_migrations (version, name, applied_at) VALUES (?, ?, ?)";

function migrationOperations() {
  const operations = {
    "migration.ensure-ledger": { kind: "write", sql: MIGRATION_LEDGER_SCHEMA, parameterCount: 0 },
    "migration.list-applied": { kind: "read", sql: appliedMigrationsSql, parameterCount: 0,
      maxRows: 1_000 },
    "migration.find-version": { kind: "read", sql: migrationNameSql, parameterCount: 1,
      maxRows: 1 },
    "migration.record-version": { kind: "write", sql: recordMigrationSql, parameterCount: 3 },
  };
  const seen = new Set(Object.values(operations).map(operation => operation.sql));
  let index = 0;
  for (const migration of HUB_MIGRATIONS) {
    for (const sql of migration.statements) {
      if (seen.has(sql)) continue;
      seen.add(sql);
      operations[`migration.schema-${++index}`] = { kind: "write", sql, parameterCount: 0 };
    }
  }
  return Object.freeze(operations);
}

export const MIGRATION_SQL_OPERATIONS = migrationOperations();

export function createMigrationSqlUseClient({ read, write }) {
  return createSqlUseClient({ read, write, operations: MIGRATION_SQL_OPERATIONS });
}
