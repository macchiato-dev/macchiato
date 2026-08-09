import { ACCOUNT_SCHEMA } from "./accounts.js";
import { CONTENT_SCHEMA } from "./content.js";
import { ORGANIZATION_SCHEMA } from "./organizations.js";

export const MIGRATION_LEDGER_SCHEMA = `CREATE TABLE IF NOT EXISTS resource_schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  applied_at INTEGER NOT NULL
) STRICT`;

export const HUB_MIGRATIONS = Object.freeze([
  Object.freeze({ version: 1, name: "accounts-and-content", statements: Object.freeze([...ACCOUNT_SCHEMA, ...CONTENT_SCHEMA]) }),
  Object.freeze({ version: 2, name: "organization-memberships-and-notifications", statements: ORGANIZATION_SCHEMA }),
]);

export function createMigrationRunner(client, { migrations = HUB_MIGRATIONS, now = Date.now } = {}) {
  if (!client?.execute || !client?.batch) throw new Error("Migration runner requires a libSQL-compatible client");
  let readyPromise;

  async function status() {
    await client.execute({ sql: MIGRATION_LEDGER_SCHEMA, args: [] });
    const result = await client.execute({
      sql: "SELECT version, name, applied_at FROM resource_schema_migrations ORDER BY version",
      args: [],
    });
    const applied = new Map(result.rows.map((row) => [Number(row.version), String(row.name)]));
    return Object.freeze({
      current: migrations.every((migration) => applied.get(migration.version) === migration.name),
      latestVersion: migrations.at(-1)?.version || 0,
      appliedVersions: Object.freeze([...applied.keys()]),
    });
  }

  async function migrate() {
    const before = await status();
    if (before.current) return before;
    for (const migration of migrations) {
      const found = await client.execute({
        sql: "SELECT name FROM resource_schema_migrations WHERE version = ?",
        args: [migration.version],
      });
      if (found.rows[0]) {
        if (String(found.rows[0].name) !== migration.name) throw new Error(`Migration ${migration.version} has an unexpected name`);
        continue;
      }
      await client.batch([
        ...migration.statements.map((sql) => ({ sql, args: [] })),
        { sql: "INSERT OR IGNORE INTO resource_schema_migrations (version, name, applied_at) VALUES (?, ?, ?)", args: [migration.version, migration.name, now()] },
      ]);
    }
    const after = await status();
    if (!after.current) throw new Error("Database migration did not reach the current version");
    return after;
  }

  return Object.freeze({
    status,
    ready() {
      if (!readyPromise) readyPromise = migrate().catch((error) => { readyPromise = null; throw error; });
      return readyPromise;
    },
  });
}
