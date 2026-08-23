import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { createAccountStore } from "@macchiato-dev/hub/accounts";
import { createContentStore } from "@macchiato-dev/hub/content";
import { createOrganizationStore } from "@macchiato-dev/hub/organizations";
import { createNodeSqliteClient } from "../adapters/node-sqlite-client.js";
import { createOrganizationSqlUseClient } from "../organization-sql-policy.js";

test("organization administration is fully covered by named sql-use operations", async () => {
  const database = createNodeSqliteClient(new DatabaseSync(":memory:"));
  await createAccountStore(database).initialize();
  await createContentStore(database).initialize();
  await database.batch([
    { sql: `INSERT INTO users (id, display_name, username, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)`, args: ["owner", "Owner", "owner", 1, 1] },
    { sql: `INSERT INTO users (id, display_name, username, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)`, args: ["member", "Member", "member", 1, 1] },
    { sql: `INSERT INTO resource_organizations
              (id, owner_user_id, slug, name, description, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: ["org", "owner", "coffee", "Coffee", "", 1, 1] },
  ]);
  let nextId = 0;
  const store = createOrganizationStore(createOrganizationSqlUseClient({
    read: database, write: database,
  }), { now: () => 10, randomId: () => `id-${++nextId}` });

  assert.equal((await store.getManagedOrganization("coffee", "owner")).viewerRole, "owner");
  const invite = await store.invite("coffee", "owner", { username: "member", role: "admin" });
  const [notice] = await store.listNotifications("member");
  assert.equal(notice.id, invite.notificationId);
  assert.equal(await store.markNotificationRead("member", notice.id), true);
  assert.equal(await store.acceptInvitation("member", notice.id), "coffee");
  assert.equal((await store.getManagedOrganization("coffee", "member")).viewerRole, "admin");
  assert.equal(await store.changeRole("coffee", "owner", "member", "member"), true);
});
