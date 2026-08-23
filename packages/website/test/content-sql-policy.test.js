import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { createAccountStore } from "@macchiato-dev/hub/accounts";
import { createContentStore } from "@macchiato-dev/hub/content";
import { createNodeSqliteClient } from "../adapters/node-sqlite-client.js";
import { createContentSqlUseClient } from "../content-sql-policy.js";

test("project reads, writes, versions, and batches stay inside the content sql-use policy", async () => {
  const database = createNodeSqliteClient(new DatabaseSync(":memory:"));
  const accounts = createAccountStore(database, { now: () => 1, randomId: () => "user" });
  const account = await accounts.authenticateIdentity({
    provider: "github", providerUserId: "1", login: "latte", name: "Latte",
    email: "latte@example.test", emailVerified: true,
  });
  let clock = 10;
  let id = 0;
  const store = createContentStore(createContentSqlUseClient({
    read: database, write: database,
  }), { now: () => ++clock, randomId: () => `content-${++id}` });
  const organization = await store.createOrganization(account.id, {
    slug: "coffee", name: "Coffee", description: "",
  });
  const first = { files: [{ path: "index.html", content: "<h1>One</h1>" }], config: {} };
  const second = { files: [{ path: "index.html", content: "<h1>Two</h1>" }], config: {} };
  const project = await store.createProject(account.id, {
    namespace: organization.id, userSlug: account.login, slug: "example", name: "Example",
    description: "", visibility: "public", template: "html", snapshot: first,
  });

  assert.equal((await store.getProject("coffee", "example")).id, project.id);
  assert.equal((await store.getNamespace("coffee")).projects.length, 1);
  assert.equal((await store.listForUser(account.id)).projects.length, 1);
  assert.equal((await store.listPublicProjects({ namespaces: ["coffee"] })).length, 1);
  assert.equal((await store.listPublicProjects({ namespaces: ["elsewhere"] })).length, 0);
  assert.equal((await store.getPublicProjectWorkspace("coffee", "example")).versionCount, 1);

  await store.updateProject(account.id, project.id, {
    namespace: organization.id, userSlug: account.login, slug: "example", name: "Updated",
    description: "", visibility: "public", template: "html",
  });
  await store.saveProjectSnapshot(account.id, project.id, second, { reason: "manual" });
  assert.equal((await store.listProjectVersions(project.id, account.id)).length, 2);
  assert.deepEqual(await store.getProjectVersion(project.id, 1, account.id), first);
  assert.equal(await store.publishProject(account.id, project.id, { title: "Release" }), true);
  await store.revertProjectToPublished(account.id, project.id);
  assert.equal(await store.deleteProject(account.id, project.id), true);
});
