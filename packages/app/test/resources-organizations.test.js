import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { createAccountStore } from "@macchiato-dev/hub/accounts";
import { createContentStore } from "@macchiato-dev/hub/content";
import { createMigrationRunner } from "@macchiato-dev/hub/migrations";
import { createOrganizationStore } from "@macchiato-dev/hub/organizations";
import { createNodeSqliteClient } from "../../../packages/website/adapters/node-sqlite-client.js";

function identity(login, id) {
  return { provider: "github", providerUserId: id, login, name: login, email: `${login}@example.test`, emailVerified: true };
}

async function setup() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  const client = createNodeSqliteClient(db);
  let sequence = 0;
  const ids = () => `id-${++sequence}`;
  const migrations = createMigrationRunner(client, { now: () => 10 });
  await migrations.ready();
  const accounts = createAccountStore(client, { randomId: ids, now: () => 20 });
  const content = createContentStore(client, { randomId: ids, now: () => 30 });
  const organizations = createOrganizationStore(client, { randomId: ids, now: () => 40 });
  const owner = await accounts.authenticateIdentity(identity("owner-name", 1));
  const member = await accounts.authenticateIdentity(identity("member-name", 2));
  const admin = await accounts.authenticateIdentity(identity("admin-name", 3));
  const org = await content.createOrganization(owner.id, { slug: "small-team", name: "Small Team", description: "" });
  return { db, client, migrations, accounts, content, organizations, owner, member, admin, org };
}

test("migration ledger is transparent and idempotent", async (t) => {
  const state = await setup();
  t.after(() => state.db.close());
  assert.equal((await state.migrations.status()).current, true);
  assert.deepEqual(state.db.prepare("SELECT version FROM resource_schema_migrations ORDER BY version").all().map((row) => row.version), [1, 2]);
  await state.migrations.ready();
  assert.equal(state.db.prepare("SELECT COUNT(*) AS count FROM resource_schema_migrations").get().count, 2);
});

test("users can rename their stable personal namespace", async (t) => {
  const state = await setup();
  t.after(() => state.db.close());
  const project = await state.content.createProject(state.owner.id, { namespace: "user", userSlug: state.owner.login, slug: "demo", name: "Demo", template: "blank" });
  const renamed = await state.accounts.updateUsername(state.owner.id, "new-owner");
  assert.equal(renamed.login, "new-owner");
  assert.equal((await state.content.getProject("new-owner", project.slug, state.owner.id)).id, project.id);
  await assert.rejects(state.accounts.updateUsername(state.owner.id, "small-team"), /already in use/);
  await assert.rejects(state.accounts.updateUsername(state.owner.id, "bad--name"), /single hyphens/);
});

test("organization invitations become notifications and accepted memberships", async (t) => {
  const state = await setup();
  t.after(() => state.db.close());
  const invitation = await state.organizations.invite(state.org.slug, state.owner.id, { username: state.member.login, role: "member" });
  let notifications = await state.organizations.listNotifications(state.member.id);
  assert.equal(notifications[0].id, invitation.notificationId);
  assert.equal(notifications[0].read, false);
  await state.organizations.markNotificationRead(state.member.id, invitation.notificationId);
  assert.equal((await state.organizations.listNotifications(state.member.id))[0].read, true);
  assert.equal(await state.organizations.acceptInvitation(state.member.id, invitation.notificationId), state.org.slug);
  assert.equal((await state.organizations.getManagedOrganization(state.org.slug, state.owner.id)).members[0].role, "member");
  assert.equal((await state.content.listForUser(state.member.id)).organizations[0].slug, state.org.slug);
  await state.organizations.deleteNotification(state.member.id, invitation.notificationId);
  assert.equal((await state.organizations.listNotifications(state.member.id)).length, 0);
});

test("deleting a pending invitation notification permits a new invitation", async (t) => {
  const state = await setup();
  t.after(() => state.db.close());
  const first = await state.organizations.invite(state.org.slug, state.owner.id, { username: state.member.login, role: "member" });
  assert.equal(await state.organizations.deleteNotification(state.member.id, first.notificationId), true);
  const second = await state.organizations.invite(state.org.slug, state.owner.id, { username: state.member.login, role: "admin" });
  assert.notEqual(second.id, first.id);
});

test("an organization permits at most one admin", async (t) => {
  const state = await setup();
  t.after(() => state.db.close());
  const first = await state.organizations.invite(state.org.slug, state.owner.id, { username: state.admin.login, role: "admin" });
  await state.organizations.acceptInvitation(state.admin.id, first.notificationId);
  const second = await state.organizations.invite(state.org.slug, state.owner.id, { username: state.member.login, role: "member" });
  await state.organizations.acceptInvitation(state.member.id, second.notificationId);
  await assert.rejects(state.organizations.changeRole(state.org.slug, state.owner.id, state.member.id, "admin"), /already has/);
  await state.organizations.changeRole(state.org.slug, state.owner.id, state.admin.id, "member");
  assert.equal(await state.organizations.changeRole(state.org.slug, state.owner.id, state.member.id, "admin"), true);
});
