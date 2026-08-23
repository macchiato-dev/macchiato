import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { createAccountStore } from "@macchiato-dev/hub/accounts";
import { createContentStore } from "@macchiato-dev/hub/content";
import { createNodeSqliteClient } from "../adapters/node-sqlite-client.js";
import { createAccountSqlUseClient } from "../account-sql-policy.js";

test("the account store is fully covered by its named sql-use policy", async () => {
  const database = createNodeSqliteClient(new DatabaseSync(":memory:"));
  await createContentStore(database).initialize();
  const store = createAccountStore(createAccountSqlUseClient({ read: database, write: database }), {
    now: () => 10,
    randomId: () => "user-1",
  });
  const created = await store.authenticateIdentity({
    provider: "github", providerUserId: "42", login: "macchiato",
    name: "Macchiato", email: "hello@example.test", emailVerified: true,
  });
  assert.deepEqual(created, { id: "user-1", login: "macchiato", name: "Macchiato" });
  assert.deepEqual(await store.getAccount("user-1"), created);
  assert.equal((await store.updateUsername("user-1", "espresso")).login, "espresso");
});
