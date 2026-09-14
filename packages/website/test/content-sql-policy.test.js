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
  const output = { format: "resources-project-output-v1", project: first,
    compiled: JSON.stringify({ tree: [], document: {}, stylesheets: [], scripts: [] }) };
  assert.deepEqual(await store.saveProjectBuildOutput(account.id, project.id, first, output), { saved: true });
  assert.deepEqual(await store.getProjectBuildOutput(project.id, account.id), output);

  await store.updateProject(account.id, project.id, {
    namespace: organization.id, userSlug: account.login, slug: "example", name: "Updated",
    description: "", visibility: "public", template: "html",
  });
  await store.saveProjectSnapshot(account.id, project.id, second, { reason: "manual" });
  assert.equal((await store.listProjectVersions(project.id, account.id)).length, 2);
  assert.deepEqual(await store.getProjectVersion(project.id, 1, account.id), first);
  assert.equal(await store.publishProject(account.id, project.id, { title: "Release" }), true);
  const originalTimes = (await store.listProjectVersions(project.id, account.id)).map(version => version.createdAt);
  assert.equal(await store.publishProject(account.id, project.id, { sequence: 1 }), true);
  let versions = await store.listProjectVersions(project.id, account.id);
  assert.deepEqual(versions.map(version => [version.sequence, version.latest]), [[1, true], [2, false]]);
  assert.deepEqual(versions.map(version => version.createdAt), originalTimes.toReversed());
  assert.deepEqual((await store.getProjectWorkspace("coffee", "example", account.id)).snapshot, first);
  assert.deepEqual((await store.getPublicProjectWorkspace("coffee", "example")).snapshot, first);
  assert.deepEqual(await store.getProjectVersion(project.id, 2, account.id), second);
  assert.equal(await store.publishProject(account.id, project.id, { sequence: 1 }), true);
  assert.equal((await store.listProjectVersions(project.id, account.id)).length, 2,
    "saving the same historical selection must not append a duplicate version");
  const third = { files: [{ path: "index.html", content: "<h1>Three</h1>" }], config: {} };
  await store.saveProjectSnapshot(account.id, project.id, third, { reason: "manual" });
  assert.deepEqual(await store.getProjectVersion(project.id, 3, account.id), third);
  assert.deepEqual(await store.getProjectVersion(project.id, 2, account.id), second);
  versions = await store.listProjectVersions(project.id, account.id);
  assert.deepEqual(versions.map(version => version.sequence), [1, 3, 2]);
  assert.equal(await store.publishProject("someone-else", project.id, { sequence: 2 }), false);
  assert.equal(await store.publishProject(account.id, project.id, { sequence: 99 }), false);
  await store.revertProjectToPublished(account.id, project.id);
  assert.equal(await store.deleteProject(account.id, project.id), true);
});
