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

let operationNow = 0;
let randomIds = [];
function nextRandomId() {
  if (!randomIds.length) throw new Error("Application operation lacks a random identifier");
  return randomIds.shift();
}

const accounts = createAccountStore(database, {
  now: () => operationNow,
  randomId: nextRandomId,
});
const content = createContentStore(database);
const organizations = createOrganizationStore(database, {
  now: () => operationNow,
  randomId: nextRandomId,
});
const migrations = createMigrationRunner(database);
let initialized;

function errorValue(error) {
  return {
    name: String(error?.name || "Error"),
    message: String(error?.message || error),
    code: typeof error?.code === "string" ? error.code : "",
    field: typeof error?.field === "string" ? error.field : "",
    providers: Array.isArray(error?.providers) ? [...error.providers] : [],
  };
}

async function storeCall(storeName, method, args) {
  const stores = { account: accounts, content, organization: organizations };
  const store = stores[storeName];
  if (!store || typeof store[method] !== "function" || !Array.isArray(args)) {
    return ["error", { name: "Error", message: "Store operation is not available",
      code: "", field: "", providers: [] }];
  }
  try {
    await initialize();
    operationNow = await hostCall("clock", "now", []);
    randomIds = method === "authenticateIdentity"
      ? [await hostCall("random", "uuid", [])] : [];
    return ["ok", await store[method](...args)];
  } catch (error) {
    return ["error", errorValue(error)];
  } finally {
    randomIds = [];
  }
}

function initialize() {
  initialized ||= migrations.ready().then(() => Promise.all([
    accounts.initialize(), content.initialize(), organizations.initialize(),
  ]));
  return initialized;
}

globalThis.serverHandle = async function serverHandle(input) {
  if (!Array.isArray(input)) {
    return ["error", "unknown application operation"];
  }
  if (input[0] === "initialize") {
    await initialize();
    return ["ok"];
  }
  if (input[0] === "store" && input.length === 4) {
    return storeCall(input[1], input[2], input[3]);
  }
  return ["error", "unknown application operation"];
};
