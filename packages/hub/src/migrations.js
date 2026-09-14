import { ACCOUNT_SCHEMA } from "./accounts.js";
import { CONTENT_SCHEMA } from "./content.js";
import { ORGANIZATION_SCHEMA } from "./organizations.js";

export const MIGRATION_LEDGER_SCHEMA = `CREATE TABLE IF NOT EXISTS resource_schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  applied_at INTEGER NOT NULL
) STRICT`;

export const HUB_MIGRATIONS = Object.freeze([
  // New installations also get this table through CONTENT_SCHEMA below.
  Object.freeze({ version: 1, name: "accounts-and-content", statements: Object.freeze([...ACCOUNT_SCHEMA, ...CONTENT_SCHEMA]) }),
  Object.freeze({ version: 2, name: "organization-memberships-and-notifications", statements: ORGANIZATION_SCHEMA }),
  Object.freeze({ version: 3, name: "project-version-labels", statements: Object.freeze([
    CONTENT_SCHEMA.find((statement) => statement.includes("CREATE TABLE IF NOT EXISTS resource_project_version_labels")),
    CONTENT_SCHEMA.find((statement) => statement.includes("INSERT OR IGNORE INTO resource_project_version_labels")),
  ]) }),
  Object.freeze({ version: 4, name: "latest-successful-project-output", statements: Object.freeze([
    CONTENT_SCHEMA.find(statement => statement.includes("CREATE TABLE IF NOT EXISTS resource_project_build_output")),
  ]) }),
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
    const applied = result.rows.map((row) => Object.freeze({
      version: Number(row.version),
      name: String(row.name),
    }));
    return Object.freeze({
      current: migrations.every((migration) => applied.some((entry) =>
        entry.version === migration.version && entry.name === migration.name)),
      latestVersion: migrations.at(-1)?.version || 0,
      appliedVersions: Object.freeze(applied.map(entry => entry.version)),
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
