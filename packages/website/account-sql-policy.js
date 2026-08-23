import { ACCOUNT_QUERIES, ACCOUNT_SCHEMA } from "@macchiato-dev/hub/accounts";
import { createSqlUseClient } from "../sql-use/src/client.js";

const definitions = [
  ["account.providers", "providersForUser", "read", 1],
  ["account.get", "accountById", "read", 1],
  ["account.organization-slug-exists", "organizationSlugExists", "read", 1],
  ["account.update-username", "updateUsername", "write", 3],
  ["account.update-project-namespace", "updateUserProjectNamespace", "write", 3],
  ["account.identity", "identityByProvider", "read", 2],
  ["account.update-display-name", "updateDisplayName", "write", 3],
  ["account.update-provider-username", "updateProviderUsername", "write", 4],
  ["account.by-email", "accountByEmail", "read", 1],
  ["account.insert-user", "insertUser", "write", 5],
  ["account.insert-email", "insertEmail", "write", 5],
  ["account.insert-identity", "insertIdentity", "write", 6],
];

export const accountSqlOperations = Object.freeze(Object.fromEntries([
  ...ACCOUNT_SCHEMA.map((sql, index) => [`account.schema-${index}`, {
    kind: "write", sql, parameterCount: 0,
  }]),
  ...definitions.map(([name, query, kind, parameterCount]) => [name, {
    kind, sql: ACCOUNT_QUERIES[query], parameterCount,
  }]),
]));

export function createAccountSqlUseClient({ read, write = read }) {
  return createSqlUseClient({ read, write, operations: accountSqlOperations });
}
