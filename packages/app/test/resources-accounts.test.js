import assert from "node:assert/strict";
import test from "node:test";
import { createAccountStore } from "../../../examples/resources-site/models/accounts.js";

test("account model initializes SQLite-compatible schema and upserts provider identity", async () => {
  const batches = [];
  const client = {
    execute() {},
    async batch(statements) {
      batches.push(statements);
      return [];
    },
  };
  const store = createAccountStore(client, { now: () => 1_000 });
  const account = await store.upsertIdentity({
    provider: "gitlab",
    providerUserId: 84,
    login: "latte-dev",
    name: "Latte Dev",
  });

  assert.deepEqual(account, { id: "gitlab:84", login: "latte-dev", name: "Latte Dev" });
  assert.equal(batches.length, 2);
  assert.match(batches[0][0].sql, /CREATE TABLE IF NOT EXISTS users/);
  assert.match(batches[0][1].sql, /CREATE TABLE IF NOT EXISTS user_identities/);
  assert.deepEqual(batches[1][1].args.slice(0, 4), ["gitlab", "84", "gitlab:84", "latte-dev"]);

  await store.upsertIdentity({
    provider: "gitlab",
    providerUserId: 84,
    login: "latte-renamed",
    name: "Latte Renamed",
  });
  assert.equal(batches.length, 3, "schema initialization is reused by the isolate");
  assert.match(batches[2][0].sql, /ON CONFLICT\(id\) DO UPDATE/);
});

test("account model rejects providers outside the configured identity boundary", async () => {
  const store = createAccountStore({ execute() {}, batch: async () => [] });
  await assert.rejects(store.upsertIdentity({
    provider: "unknown",
    providerUserId: 1,
    login: "x",
    name: "X",
  }), /Unsupported identity provider/);
});
