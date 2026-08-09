import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import {
  AccountConflictError,
  AccountSignupDisabledError,
  createAccountStore,
} from "@macchiato-dev/hub/accounts";
import { createNodeSqliteClient } from "../../../packages/website/adapters/node-sqlite-client.js";

function setup() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  let id = 0;
  const store = createAccountStore(createNodeSqliteClient(db), {
    now: () => 1_000,
    randomId: () => `user-${++id}`,
  });
  return { db, store };
}

const gitlab = {
  provider: "gitlab",
  providerUserId: 84,
  login: "latte-dev",
  name: "Latte Dev",
  email: "Latte@example.com",
  emailVerified: true,
};

test("account store permits existing logins but blocks registration when signups are disabled", async (t) => {
  const { db, store } = setup();
  t.after(() => db.close());
  const created = await store.authenticateIdentity(gitlab);
  assert.equal((await store.authenticateIdentity(gitlab, { allowCreate: false })).id, created.id);
  await assert.rejects(
    store.authenticateIdentity({ ...gitlab, providerUserId: 85, email: "new@example.test" }, { allowCreate: false }),
    AccountSignupDisabledError,
  );
});

test("account model creates a provider-neutral user for a verified identity", async (t) => {
  const { db, store } = setup();
  t.after(() => db.close());
  const account = await store.authenticateIdentity(gitlab);

  assert.deepEqual(account, { id: "user-1", login: "latte-dev", name: "Latte Dev" });
  assert.deepEqual(
    { ...db.prepare("SELECT normalized_email, user_id FROM user_emails").get() },
    { normalized_email: "latte@example.com", user_id: "user-1" },
  );
  assert.equal(db.prepare("SELECT user_id FROM user_identities").get().user_id, "user-1");
});

test("existing provider identities retain their chosen username when provider details change", async (t) => {
  const { db, store } = setup();
  t.after(() => db.close());
  await store.authenticateIdentity(gitlab);
  const account = await store.authenticateIdentity({ ...gitlab, login: "latte-renamed", name: "Latte Renamed" });

  assert.deepEqual(account, { id: "user-1", login: "latte-dev", name: "Latte Renamed" });
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM users").get().count, 1);
});

test("matching email returns a structured conflict without linking identities", async (t) => {
  const { db, store } = setup();
  t.after(() => db.close());
  await store.authenticateIdentity(gitlab);

  await assert.rejects(
    store.authenticateIdentity({
      provider: "github",
      providerUserId: 42,
      login: "latte",
      name: "Latte",
      email: "latte@EXAMPLE.com",
      emailVerified: true,
    }),
    (error) => error instanceof AccountConflictError
      && error.code === "email_taken"
      && error.providers.join(",") === "gitlab",
  );
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM user_identities").get().count, 1);
});

test("an authenticated account can explicitly link a second verified provider", async (t) => {
  const { db, store } = setup();
  t.after(() => db.close());
  const account = await store.authenticateIdentity(gitlab);
  const linked = await store.authenticateIdentity({
    provider: "github",
    providerUserId: 42,
    login: "latte",
    name: "Latte",
    email: "latte@example.com",
    emailVerified: true,
  }, { linkToUserId: account.id });

  assert.equal(linked.id, account.id);
  assert.deepEqual(
    db.prepare("SELECT provider FROM user_identities ORDER BY provider").all().map((row) => row.provider),
    ["github", "gitlab"],
  );
});

test("account model requires a verified email and rejects unknown providers", async (t) => {
  const { db, store } = setup();
  t.after(() => db.close());
  await assert.rejects(store.authenticateIdentity({ ...gitlab, emailVerified: false }), /verified provider email/);
  await assert.rejects(store.authenticateIdentity({ ...gitlab, provider: "unknown" }), /Unsupported identity provider/);
});

test("account model can add authentication methods without changing its schema", async (t) => {
  const db = new DatabaseSync(":memory:");
  t.after(() => db.close());
  const store = createAccountStore(createNodeSqliteClient(db), {
    allowedProviders: ["github", "gitlab", "passkey", "magic-link"],
    randomId: () => "user-1",
  });
  const account = await store.authenticateIdentity({
    provider: "passkey",
    providerUserId: "credential-id",
    login: "latte@example.com",
    name: "Latte",
    email: "latte@example.com",
    emailVerified: true,
  });
  assert.equal(account.id, "user-1");
  assert.equal(db.prepare("SELECT provider FROM user_identities").get().provider, "passkey");
});
