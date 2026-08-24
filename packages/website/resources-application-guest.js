import { createAccountStore } from "@macchiato-dev/hub/accounts";
import { createContentStore } from "@macchiato-dev/hub/content";
import { createMigrationRunner } from "@macchiato-dev/hub/migrations";
import { createOrganizationStore } from "@macchiato-dev/hub/organizations";

function compatibleResult(result) {
  const [columns, values, rowsAffected] = result;
  return {
    columns,
    rows: values.map(row => Object.fromEntries(
      columns.map((column, index) => [column, row[index]]))),
    rowsAffected,
    lastInsertRowid: null,
  };
}

const database = Object.freeze({
  async execute(query) {
    return compatibleResult(await hostCall("sql", "execute",
      [query.sql, query.args || []]));
  },
  async batch(queries) {
    const affected = await hostCall("sql", "batch",
      queries.map(query => [query.sql, query.args || []]));
    return affected.map(rowsAffected => ({
      columns: [], rows: [], rowsAffected, lastInsertRowid: null,
    }));
  },
});

const accounts = createAccountStore(database);
const content = createContentStore(database);
const organizations = createOrganizationStore(database);
const migrations = createMigrationRunner(database);
let initialized;

globalThis.serverHandle = async function serverHandle(input) {
  if (!Array.isArray(input)) {
    return ["error", "unknown application operation"];
  }
  if (input[0] !== "initialize") return ["error", "unknown application operation"];
  initialized ||= migrations.ready().then(() => Promise.all([
    accounts.initialize(), content.initialize(), organizations.initialize(),
  ]));
  await initialized;
  return ["ok"];
};
