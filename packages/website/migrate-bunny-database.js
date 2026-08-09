#!/usr/bin/env -S deno run --allow-env --allow-net
import process from "node:process";
import { createClient } from "@libsql/client/web";
import { createAccountStore } from "@macchiato-dev/hub/accounts";
import { createContentStore } from "@macchiato-dev/hub/content";
import { createMigrationRunner } from "@macchiato-dev/hub/migrations";

const url = process.env.BUNNY_DATABASE_URL;
const authToken = process.env.BUNNY_DATABASE_AUTH_TOKEN;
if (!url || !authToken) {
  throw new Error("BUNNY_DATABASE_URL and the full-access BUNNY_DATABASE_AUTH_TOKEN are required");
}

const client = createClient({ url, authToken });
const accounts = createAccountStore(client);
const content = createContentStore(client);

const migrationStatus = await createMigrationRunner(client).ready();
await Promise.all([accounts.initialize(), content.initialize()]);

const expected = [
  "resource_organizations", "resource_project_state", "resource_project_versions",
  "resource_projects", "resource_schema_migrations", "resource_notifications",
  "resource_organization_members", "resource_organization_invitations",
  "user_emails", "user_identities", "users",
];
const result = await client.execute({
  sql: `SELECT name FROM sqlite_schema
        WHERE type = 'table' AND name IN (${expected.map(() => "?").join(", ")})
        ORDER BY name`,
  args: expected,
});
const found = result.rows.map((row) => String(row.name));
const missing = expected.filter((name) => !found.includes(name));
if (missing.length) throw new Error(`Database migration verification failed; missing: ${missing.join(", ")}`);

console.log(`Resources database ready at migration ${migrationStatus.latestVersion}: ${found.join(", ")}`);
client.close();
